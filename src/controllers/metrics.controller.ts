/**
 * Quality Metrics Controller - REST API endpoints for dashboard and reporting
 */

import { Request, Response } from 'express';
import { metricsService } from '../services/metrics.service';
import { QualityFilters, QualityReportOptions } from '../models/metrics.model';

export class MetricsController {
  /**
   * Get overall quality metrics
   * GET /api/v1/metrics/quality
   */
  async getQualityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const filters: QualityFilters = {};
      if (req.query['dateFrom']) filters.dateFrom = req.query['dateFrom'] as string;
      if (req.query['dateTo']) filters.dateTo = req.query['dateTo'] as string;
      if (req.query['status']) filters.status = (req.query['status'] as string).split(',');
      if (req.query['priority']) filters.priority = (req.query['priority'] as string).split(',');
      if (req.query['scoreMin']) filters.scoreMin = parseInt(req.query['scoreMin'] as string);
      if (req.query['scoreMax']) filters.scoreMax = parseInt(req.query['scoreMax'] as string);
      if (req.query['issueTypes']) filters.issueTypes = (req.query['issueTypes'] as string).split(',');
      if (req.query['assignedTo']) filters.assignedTo = (req.query['assignedTo'] as string).split(',');

      const metrics = await metricsService.calculateQualityMetrics(filters);

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting quality metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get quality trends over time
   * GET /api/v1/metrics/quality/trends
   */
  async getQualityTrends(req: Request, res: Response): Promise<void> {
    try {
      const days = req.query['days'] ? parseInt(req.query['days'] as string) : 30;

      if (days < 1 || days > 365) {
        res.status(400).json({
          success: false,
          error: 'Days parameter must be between 1 and 365'
        });
        return;
      }

      const trends = await metricsService.getQualityTrends(days);

      res.json({
        success: true,
        data: trends,
        period: {
          days,
          from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Error getting quality trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get issue type distribution
   * GET /api/v1/metrics/quality/issues
   */
  async getIssueDistribution(req: Request, res: Response): Promise<void> {
    try {
      const filters: QualityFilters = {};
      if (req.query['dateFrom']) filters.dateFrom = req.query['dateFrom'] as string;
      if (req.query['dateTo']) filters.dateTo = req.query['dateTo'] as string;
      if (req.query['status']) filters.status = (req.query['status'] as string).split(',');
      if (req.query['priority']) filters.priority = (req.query['priority'] as string).split(',');
      if (req.query['assignedTo']) filters.assignedTo = (req.query['assignedTo'] as string).split(',');

      const distribution = await metricsService.getIssueDistribution(filters);

      // Calculate percentages and format for chart display
      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      const formattedDistribution = Object.entries(distribution).map(([type, count]) => ({
        type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      })).sort((a, b) => b.count - a.count);

      res.json({
        success: true,
        data: {
          distribution: formattedDistribution,
          total,
          summary: {
            mostCommon: formattedDistribution[0]?.type || 'None',
            totalIssues: total,
            uniqueTypes: formattedDistribution.length
          }
        }
      });
    } catch (error) {
      console.error('Error getting issue distribution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve issue distribution',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get low quality requirements that need attention
   * GET /api/v1/metrics/quality/low
   */
  async getLowQualityRequirements(req: Request, res: Response): Promise<void> {
    try {
      const threshold = req.query['threshold'] ? parseInt(req.query['threshold'] as string) : 60;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 20;

      if (threshold < 0 || threshold > 100) {
        res.status(400).json({
          success: false,
          error: 'Threshold must be between 0 and 100'
        });
        return;
      }

      const lowQualityReqs = await metricsService.getLowQualityRequirements(threshold);
      const limitedResults = lowQualityReqs.slice(0, limit);

      // Enrich with additional data for display
      const enrichedResults = limitedResults.map(req => ({
        ...req,
        title: `Requirement ${req.requirementId.replace('REQ-', '')}`, // Mock title
        issueCount: req.issues.length,
        topIssueTypes: [...new Set(req.issues.map(i => i.type))].slice(0, 3),
        priority: req.overallScore < 30 ? 'critical' :
                 req.overallScore < 50 ? 'high' : 'medium',
        daysSinceAnalysis: Math.floor((Date.now() - req.analyzedAt.getTime()) / (1000 * 60 * 60 * 24))
      }));

      res.json({
        success: true,
        data: enrichedResults,
        summary: {
          total: lowQualityReqs.length,
          threshold,
          averageScore: limitedResults.length > 0
            ? Math.round((limitedResults.reduce((sum, r) => sum + r.overallScore, 0) / limitedResults.length) * 100) / 100
            : 0,
          criticalCount: limitedResults.filter(r => r.overallScore < 30).length,
          highPriorityCount: limitedResults.filter(r => r.overallScore >= 30 && r.overallScore < 50).length
        }
      });
    } catch (error) {
      console.error('Error getting low quality requirements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve low quality requirements',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get quality leaderboard (best and worst requirements)
   * GET /api/v1/metrics/quality/leaderboard
   */
  async getQualityLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 10;

      if (limit < 1 || limit > 50) {
        res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 50'
        });
        return;
      }

      const leaderboard = await metricsService.getQualityLeaderboard(limit);

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error('Error getting quality leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get comprehensive quality dashboard
   * GET /api/v1/metrics/quality/dashboard
   */
  async getQualityDashboard(req: Request, res: Response): Promise<void> {
    try {
      const filters: QualityFilters = {};
      if (req.query['dateFrom']) filters.dateFrom = req.query['dateFrom'] as string;
      if (req.query['dateTo']) filters.dateTo = req.query['dateTo'] as string;
      if (req.query['status']) filters.status = (req.query['status'] as string).split(',');
      if (req.query['priority']) filters.priority = (req.query['priority'] as string).split(',');
      if (req.query['scoreMin']) filters.scoreMin = parseInt(req.query['scoreMin'] as string);
      if (req.query['scoreMax']) filters.scoreMax = parseInt(req.query['scoreMax'] as string);
      if (req.query['assignedTo']) filters.assignedTo = (req.query['assignedTo'] as string).split(',');

      const dashboard = await metricsService.getQualityDashboard(filters);

      res.json({
        success: true,
        data: dashboard,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting quality dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get detailed quality report with insights and recommendations
   * GET /api/v1/metrics/quality/report
   */
  async getDetailedQualityReport(req: Request, res: Response): Promise<void> {
    try {
      const options: QualityReportOptions = {};
      if (req.query['dateFrom']) options.dateFrom = req.query['dateFrom'] as string;
      if (req.query['dateTo']) options.dateTo = req.query['dateTo'] as string;
      if (req.query['status']) options.status = (req.query['status'] as string).split(',');
      if (req.query['priority']) options.priority = (req.query['priority'] as string).split(',');
      if (req.query['scoreMin']) options.scoreMin = parseInt(req.query['scoreMin'] as string);
      if (req.query['scoreMax']) options.scoreMax = parseInt(req.query['scoreMax'] as string);
      if (req.query['assignedTo']) options.assignedTo = (req.query['assignedTo'] as string).split(',');
      if (req.query['groupBy']) options.groupBy = req.query['groupBy'] as 'status' | 'priority' | 'assignee' | 'week' | 'month';
      if (req.query['includeDetails']) options.includeDetails = req.query['includeDetails'] === 'true';
      if (req.query['limit']) options.limit = parseInt(req.query['limit'] as string);

      const report = await metricsService.getDetailedQualityReport(options);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error getting detailed quality report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate quality report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get quality metrics by score ranges
   * GET /api/v1/metrics/quality/by-score
   */
  async getRequirementsByQuality(req: Request, res: Response): Promise<void> {
    try {
      const filters: QualityFilters = {};
      if (req.query['dateFrom']) filters.dateFrom = req.query['dateFrom'] as string;
      if (req.query['dateTo']) filters.dateTo = req.query['dateTo'] as string;
      if (req.query['status']) filters.status = (req.query['status'] as string).split(',');
      if (req.query['priority']) filters.priority = (req.query['priority'] as string).split(',');
      if (req.query['assignedTo']) filters.assignedTo = (req.query['assignedTo'] as string).split(',');

      const requirementsByQuality = await metricsService.getRequirementsByQuality(filters);

      // Add summary statistics
      const summary = {
        total: Object.values(requirementsByQuality).reduce((sum: number, arr) => sum + (arr as any[]).length, 0),
        excellent: requirementsByQuality.excellent.length,
        good: requirementsByQuality.good.length,
        fair: requirementsByQuality.fair.length,
        poor: requirementsByQuality.poor.length,
      };

      res.json({
        success: true,
        data: {
          ...requirementsByQuality,
          summary
        }
      });
    } catch (error) {
      console.error('Error getting requirements by quality:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve requirements by quality',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const metricsController = new MetricsController();
export default MetricsController;