import { Request, Response } from 'express';
import documentIndexService from '../services/document-index.service';

export class DashboardController {
  /**
   * GET /api/v1/dashboard/projects
   * Get all projects or filter by query params
   */
  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const { status, blocked, search } = req.query;

      let projects;

      if (search && typeof search === 'string') {
        projects = await documentIndexService.searchProjects(search);
      } else if (blocked === 'true') {
        projects = await documentIndexService.getBlockedProjects();
      } else if (status && typeof status === 'string') {
        projects = await documentIndexService.getProjectsByStatus(status);
      } else {
        projects = await documentIndexService.getAllProjects();
      }

      res.json({
        success: true,
        data: projects,
        count: projects.length
      });
    } catch (error) {
      console.error('[DashboardController] Failed to get projects:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get projects'
      });
    }
  }

  /**
   * GET /api/v1/dashboard/my-approvals
   * Get projects pending my approval
   */
  async getMyApprovals(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Get user ID from authenticated session
      const userId = 1;

      const projects = await documentIndexService.getMyProjects(userId);

      res.json({
        success: true,
        data: projects,
        count: projects.length
      });
    } catch (error) {
      console.error('[DashboardController] Failed to get my approvals:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get approvals'
      });
    }
  }

  /**
   * GET /api/v1/dashboard/stats
   * Get dashboard statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await documentIndexService.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('[DashboardController] Failed to get stats:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get stats'
      });
    }
  }

  /**
   * POST /api/v1/dashboard/rebuild-index
   * Rebuild the entire document index
   */
  async rebuildIndex(req: Request, res: Response): Promise<void> {
    try {
      await documentIndexService.rebuildIndex();

      res.json({
        success: true,
        message: 'Index rebuilt successfully'
      });
    } catch (error) {
      console.error('[DashboardController] Failed to rebuild index:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rebuild index'
      });
    }
  }
}

export default new DashboardController();
