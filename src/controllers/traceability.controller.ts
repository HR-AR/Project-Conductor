/**
 * Traceability Controller - Request handlers for traceability matrix and analytics
 */

import { Request, Response } from 'express';
import { traceabilityService } from '../services/traceability.service';

class TraceabilityController {

  /**
   * Generate traceability matrix
   * GET /api/v1/traceability/matrix
   */
  async getTraceabilityMatrix(_req: Request, res: Response): Promise<void> {
    try {
      const matrix = await traceabilityService.generateTraceabilityMatrix();

      res.json({
        success: true,
        data: matrix
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate link analytics
   * GET /api/v1/traceability/analytics
   */
  async getLinkAnalytics(_req: Request, res: Response): Promise<void> {
    try {
      const analytics = await traceabilityService.generateLinkAnalytics();

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get coverage report with optional filtering
   * GET /api/v1/traceability/coverage
   */
  async getCoverageReport(req: Request, res: Response): Promise<void> {
    try {
      const filters: {
        status?: string[];
        priority?: string[];
        tags?: string[];
      } = {};

      if (req.query['status']) {
        filters.status = Array.isArray(req.query['status'])
          ? req.query['status'] as string[]
          : [req.query['status'] as string];
      }

      if (req.query['priority']) {
        filters.priority = Array.isArray(req.query['priority'])
          ? req.query['priority'] as string[]
          : [req.query['priority'] as string];
      }

      if (req.query['tags']) {
        filters.tags = Array.isArray(req.query['tags'])
          ? req.query['tags'] as string[]
          : [req.query['tags'] as string];
      }

      const report = await traceabilityService.getCoverageReport(filters);

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get impact analysis for a specific requirement
   * GET /api/v1/traceability/impact/:id
   */
  async getImpactAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const requirementId = req.params['id'];
      if (!requirementId) {
        res.status(400).json({
          success: false,
          error: 'Requirement ID is required'
        });
        return;
      }

      const analysis = await traceabilityService.getImpactAnalysis(requirementId);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get traceability path between two requirements
   * GET /api/v1/traceability/path/:fromId/:toId
   */
  async getTraceabilityPath(req: Request, res: Response): Promise<void> {
    try {
      const fromId = req.params['fromId'];
      const toId = req.params['toId'];

      if (!fromId || !toId) {
        res.status(400).json({
          success: false,
          error: 'Both fromId and toId are required'
        });
        return;
      }

      const pathAnalysis = await traceabilityService.getTraceabilityPath(fromId, toId);

      res.json({
        success: true,
        data: pathAnalysis
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const traceabilityController = new TraceabilityController();
export default TraceabilityController;