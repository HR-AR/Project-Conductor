/**
 * Quality Controller - Request handlers for quality analysis API
 */

import { Request, Response } from 'express';
import { QualityService } from '../services/quality.service';
import { simpleMockService } from '../services/simple-mock.service';
import { BatchAnalysisRequest } from '../models/quality.model';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler';

export class QualityController {
  private qualityService: QualityService;
  private mockService: any;

  constructor() {
    this.qualityService = new QualityService();
    this.mockService = simpleMockService;
  }

  /**
   * Analyze quality of a single requirement
   * POST /api/v1/requirements/:id/analyze
   */
  analyzeRequirement = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      // Get the requirement
      const requirement = await this.mockService.getRequirementById(id);
      if (!requirement) {
        throw new NotFoundError('Requirement not found');
      }

      // Perform quality analysis
      const analysis = this.qualityService.analyzeRequirement(requirement);

      // Store the analysis in mock service
      await this.mockService.storeQualityAnalysis(id, analysis);

      res.json({
        success: true,
        data: analysis,
        message: 'Quality analysis completed successfully',
      });
    }
  );

  /**
   * Analyze multiple requirements in batch
   * POST /api/v1/quality/analyze-batch
   */
  analyzeBatch = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const requestData: BatchAnalysisRequest = req.body;

      if (!requestData.requirementIds || !Array.isArray(requestData.requirementIds)) {
        throw new BadRequestError('requirementIds array is required');
      }

      if (requestData.requirementIds.length === 0) {
        throw new BadRequestError('requirementIds array cannot be empty');
      }

      if (requestData.requirementIds.length > 100) {
        throw new BadRequestError('Cannot analyze more than 100 requirements at once');
      }

      // Perform batch analysis
      const batchResult = await this.qualityService.analyzeBatch(
        requestData,
        async (id: string) => {
          return await this.mockService.getRequirementById(id);
        }
      );

      // Store analyses in mock service
      for (const analysis of batchResult.analyses) {
        await this.mockService.storeQualityAnalysis(analysis.requirementId, analysis);
      }

      res.json({
        success: true,
        data: batchResult,
        message: `Batch analysis completed: ${batchResult.summary.totalAnalyzed} requirements analyzed`,
      });
    }
  );

  /**
   * Get quality report and metrics
   * GET /api/v1/quality/report
   */
  getQualityReport = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Parse query parameters for filtering
      const startDate = req.query['startDate'] as string | undefined;
      const endDate = req.query['endDate'] as string | undefined;
      const minScore = req.query['minScore'] ? parseInt(req.query['minScore'] as string) : undefined;
      const maxScore = req.query['maxScore'] ? parseInt(req.query['maxScore'] as string) : undefined;
      const includeDetails = req.query['includeDetails'] === 'true';

      const filters = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        minScore,
        maxScore,
      };

      // Get quality report from mock service
      const report = await this.mockService.getQualityReport(filters);

      // If details requested, include recent analyses
      let recentAnalyses = [];
      if (includeDetails) {
        recentAnalyses = await this.mockService.getRecentQualityAnalyses(10);
      }

      res.json({
        success: true,
        data: {
          report,
          ...(includeDetails && { recentAnalyses }),
        },
        message: 'Quality report generated successfully',
      });
    }
  );

  /**
   * Get quality analysis for a specific requirement
   * GET /api/v1/requirements/:id/quality
   */
  getRequirementQuality = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      // Check if requirement exists
      const requirement = await this.mockService.getRequirementById(id);
      if (!requirement) {
        throw new NotFoundError('Requirement not found');
      }

      // Get stored quality analysis
      const analysis = await this.mockService.getQualityAnalysis(id);

      if (!analysis) {
        // If no analysis exists, perform one now
        const newAnalysis = this.qualityService.analyzeRequirement(requirement);
        await this.mockService.storeQualityAnalysis(id, newAnalysis);

        res.json({
          success: true,
          data: newAnalysis,
          message: 'Quality analysis generated successfully',
        });
      } else {
        res.json({
          success: true,
          data: analysis,
          message: 'Quality analysis retrieved successfully',
        });
      }
    }
  );

  /**
   * Get quality trends over time
   * GET /api/v1/quality/trends
   */
  getQualityTrends = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const days = req.query['days'] ? parseInt(req.query['days'] as string) : 30;
      const groupBy = (req.query['groupBy'] as string) || 'day'; // day, week, month

      if (days < 1 || days > 365) {
        throw new BadRequestError('Days parameter must be between 1 and 365');
      }

      if (!['day', 'week', 'month'].includes(groupBy)) {
        throw new BadRequestError('groupBy must be one of: day, week, month');
      }

      const trends = await this.mockService.getQualityTrends(days, groupBy);

      res.json({
        success: true,
        data: trends,
        message: `Quality trends retrieved for last ${days} days`,
      });
    }
  );

  /**
   * Get requirements with low quality scores
   * GET /api/v1/quality/low-quality
   */
  getLowQualityRequirements = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const threshold = req.query['threshold'] ? parseInt(req.query['threshold'] as string) : 60;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 20;

      if (threshold < 0 || threshold > 100) {
        throw new BadRequestError('Threshold must be between 0 and 100');
      }

      if (limit < 1 || limit > 100) {
        throw new BadRequestError('Limit must be between 1 and 100');
      }

      const lowQualityRequirements = await this.mockService.getLowQualityRequirements(threshold, limit);

      res.json({
        success: true,
        data: lowQualityRequirements,
        message: `Found ${lowQualityRequirements.length} requirements with quality score below ${threshold}`,
      });
    }
  );

  /**
   * Re-analyze all requirements
   * POST /api/v1/quality/reanalyze-all
   */
  reanalyzeAll = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const force = req.query['force'] === 'true';

      // Get all requirements
      const allRequirements = await this.mockService.getAllRequirements();

      let analyzedCount = 0;
      const results = [];

      for (const requirement of allRequirements) {
        // Skip if already analyzed recently (unless force is true)
        if (!force) {
          const existingAnalysis = await this.mockService.getQualityAnalysis(requirement.id);
          if (existingAnalysis) {
            const hoursSinceAnalysis = (Date.now() - existingAnalysis.analyzedAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceAnalysis < 24) {
              continue; // Skip requirements analyzed within 24 hours
            }
          }
        }

        const analysis = this.qualityService.analyzeRequirement(requirement);
        await this.mockService.storeQualityAnalysis(requirement.id, analysis);

        results.push({
          requirementId: requirement.id,
          qualityScore: analysis.qualityScore,
          issueCount: analysis.issues.length,
        });

        analyzedCount++;
      }

      res.json({
        success: true,
        data: {
          totalRequirements: allRequirements.length,
          analyzedCount,
          results,
        },
        message: `Re-analysis completed: ${analyzedCount} requirements analyzed`,
      });
    }
  );
}

export default QualityController;