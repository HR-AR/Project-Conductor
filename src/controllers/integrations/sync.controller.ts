/**
 * Sync Controller
 * Handles HTTP requests for bi-directional synchronization
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { SyncService } from '../../services/integrations/sync.service';
import {
  CreateSyncJobRequest,
  BulkSyncRequest,
  ResolveConflictRequest,
  SyncDirection,
  WebhookSyncRequest,
} from '../../models/sync.model';
import pino from 'pino';

const logger = pino({ name: 'SyncController' });

export class SyncController {
  private syncService: SyncService;

  constructor(pool: Pool) {
    this.syncService = new SyncService(pool);
  }

  /**
   * Import Jira Epic as BRD
   * POST /api/v1/integrations/sync/jira-to-brd
   */
  importFromJira = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jiraKey, projectKey } = req.body;
      const userId = (req as any).user?.id || 'system';

      if (!jiraKey) {
        res.status(400).json({
          success: false,
          message: 'jiraKey is required',
        });
        return;
      }

      if (!projectKey) {
        res.status(400).json({
          success: false,
          message: 'projectKey is required',
        });
        return;
      }

      const result = await this.syncService.importFromJira(jiraKey, projectKey, userId);

      res.json({
        success: true,
        message: `Import job created for Jira Epic ${jiraKey}`,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error importing from Jira:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to import from Jira',
      });
    }
  };

  /**
   * Export BRD to Jira Epic
   * POST /api/v1/integrations/sync/brd-to-jira
   */
  exportToJira = async (req: Request, res: Response): Promise<void> => {
    try {
      const { brdId, projectKey } = req.body;
      const userId = (req as any).user?.id || 'system';

      if (!brdId) {
        res.status(400).json({
          success: false,
          message: 'brdId is required',
        });
        return;
      }

      if (!projectKey) {
        res.status(400).json({
          success: false,
          message: 'projectKey is required',
        });
        return;
      }

      const result = await this.syncService.exportToJira(brdId, projectKey, userId);

      res.json({
        success: true,
        message: `Export job created for BRD ${brdId}`,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error exporting to Jira:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export to Jira',
      });
    }
  };

  /**
   * Bulk import Jira Epics
   * POST /api/v1/integrations/sync/bulk-import
   */
  bulkImport = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: BulkSyncRequest = req.body;
      const userId = (req as any).user?.id || 'system';

      if (!request.jiraKeys || request.jiraKeys.length === 0) {
        res.status(400).json({
          success: false,
          message: 'jiraKeys array is required',
        });
        return;
      }

      if (!request.projectKey) {
        res.status(400).json({
          success: false,
          message: 'projectKey is required',
        });
        return;
      }

      request.direction = SyncDirection.JIRA_TO_BRD;

      const result = await this.syncService.bulkImport(request, userId);

      res.json({
        success: true,
        message: `Bulk import job created for ${request.jiraKeys.length} Jira Epics`,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error in bulk import:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create bulk import job',
      });
    }
  };

  /**
   * Bulk export BRDs
   * POST /api/v1/integrations/sync/bulk-export
   */
  bulkExport = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: BulkSyncRequest = req.body;
      const userId = (req as any).user?.id || 'system';

      if (!request.brdIds || request.brdIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'brdIds array is required',
        });
        return;
      }

      if (!request.projectKey) {
        res.status(400).json({
          success: false,
          message: 'projectKey is required',
        });
        return;
      }

      request.direction = SyncDirection.BRD_TO_JIRA;

      const result = await this.syncService.bulkExport(request, userId);

      res.json({
        success: true,
        message: `Bulk export job created for ${request.brdIds.length} BRDs`,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error in bulk export:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create bulk export job',
      });
    }
  };

  /**
   * Sync existing mapping
   * POST /api/v1/integrations/sync/mapping/:mappingId
   */
  syncMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const { mappingId } = req.params;
      const { direction } = req.body;
      const userId = (req as any).user?.id || 'system';

      if (!direction || !Object.values(SyncDirection).includes(direction)) {
        res.status(400).json({
          success: false,
          message: 'Valid direction is required (jira_to_brd, brd_to_jira, bidirectional)',
        });
        return;
      }

      const result = await this.syncService.syncMapping(mappingId, direction, userId);

      res.json({
        success: true,
        message: `Sync job created for mapping ${mappingId}`,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error syncing mapping:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to sync mapping',
      });
    }
  };

  /**
   * Get sync job status
   * GET /api/v1/integrations/sync/status/:jobId
   */
  getSyncStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;
      const queue = this.syncService.getQueueService();
      const conflictResolver = this.syncService.getConflictResolverService();

      const job = await queue.getJob(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          message: `Job not found: ${jobId}`,
        });
        return;
      }

      // Get conflicts for this job
      const conflicts = await conflictResolver.getConflictsByJob(jobId);

      // Get job history
      const history = await queue.getHistory(jobId);

      res.json({
        success: true,
        data: {
          job,
          conflicts,
          history,
        },
      });
    } catch (error: any) {
      logger.error('Error getting sync status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get sync status',
      });
    }
  };

  /**
   * Get all sync jobs
   * GET /api/v1/integrations/sync/jobs
   */
  getJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, direction, limit = 50, offset = 0 } = req.query;
      const queue = this.syncService.getQueueService();

      const filters: any = {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      };

      if (status) {
        filters.status = Array.isArray(status) ? status : [status];
      }

      if (direction) {
        filters.direction = direction as string;
      }

      const result = await queue.getJobs(filters);

      res.json({
        success: true,
        data: result.jobs,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    } catch (error: any) {
      logger.error('Error getting jobs:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get jobs',
      });
    }
  };

  /**
   * Get queue statistics
   * GET /api/v1/integrations/sync/stats
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const queue = this.syncService.getQueueService();
      const stats = await queue.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get statistics',
      });
    }
  };

  /**
   * Get all conflicts
   * GET /api/v1/integrations/sync/conflicts
   */
  getConflicts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { brdId, status } = req.query;
      const conflictResolver = this.syncService.getConflictResolverService();

      let conflicts;

      if (brdId) {
        conflicts = await conflictResolver.getConflictsByBRD(
          brdId as string,
          status as string | undefined
        );
      } else {
        // Get all pending conflicts if no brdId specified
        const count = await conflictResolver.getPendingConflictsCount();
        res.json({
          success: true,
          data: {
            pendingCount: count,
            message: 'Use ?brdId= to get conflicts for a specific BRD',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: conflicts,
      });
    } catch (error: any) {
      logger.error('Error getting conflicts:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get conflicts',
      });
    }
  };

  /**
   * Resolve a conflict
   * POST /api/v1/integrations/sync/conflicts/:conflictId/resolve
   */
  resolveConflict = async (req: Request, res: Response): Promise<void> => {
    try {
      const { conflictId } = req.params;
      const request: ResolveConflictRequest = {
        conflictId,
        ...req.body,
      };
      const userId = (req as any).user?.id || 'system';

      if (!request.strategy) {
        res.status(400).json({
          success: false,
          message: 'Resolution strategy is required',
        });
        return;
      }

      const conflictResolver = this.syncService.getConflictResolverService();
      const resolved = await conflictResolver.resolveConflict(request, userId);

      res.json({
        success: true,
        message: 'Conflict resolved',
        data: resolved,
      });
    } catch (error: any) {
      logger.error('Error resolving conflict:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to resolve conflict',
      });
    }
  };

  /**
   * Ignore a conflict
   * POST /api/v1/integrations/sync/conflicts/:conflictId/ignore
   */
  ignoreConflict = async (req: Request, res: Response): Promise<void> => {
    try {
      const { conflictId } = req.params;
      const userId = (req as any).user?.id || 'system';

      const conflictResolver = this.syncService.getConflictResolverService();
      const ignored = await conflictResolver.ignoreConflict(conflictId, userId);

      res.json({
        success: true,
        message: 'Conflict ignored',
        data: ignored,
      });
    } catch (error: any) {
      logger.error('Error ignoring conflict:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to ignore conflict',
      });
    }
  };

  /**
   * Get all sync mappings
   * GET /api/v1/integrations/sync/mappings
   */
  getMappings = async (req: Request, res: Response): Promise<void> => {
    try {
      const mappings = await this.syncService.getAllMappings();

      res.json({
        success: true,
        data: mappings,
      });
    } catch (error: any) {
      logger.error('Error getting mappings:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get mappings',
      });
    }
  };

  /**
   * Get mapping by BRD ID
   * GET /api/v1/integrations/sync/mappings/brd/:brdId
   */
  getMappingByBRD = async (req: Request, res: Response): Promise<void> => {
    try {
      const { brdId } = req.params;
      const mapping = await this.syncService.getMappingByBRDId(brdId);

      if (!mapping) {
        res.status(404).json({
          success: false,
          message: `No mapping found for BRD: ${brdId}`,
        });
        return;
      }

      res.json({
        success: true,
        data: mapping,
      });
    } catch (error: any) {
      logger.error('Error getting mapping:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get mapping',
      });
    }
  };

  /**
   * Get mapping by Jira key
   * GET /api/v1/integrations/sync/mappings/jira/:jiraKey
   */
  getMappingByJira = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jiraKey } = req.params;
      const mapping = await this.syncService.getMappingByJiraKey(jiraKey);

      if (!mapping) {
        res.status(404).json({
          success: false,
          message: `No mapping found for Jira key: ${jiraKey}`,
        });
        return;
      }

      res.json({
        success: true,
        data: mapping,
      });
    } catch (error: any) {
      logger.error('Error getting mapping:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get mapping',
      });
    }
  };

  /**
   * Handle Jira webhook
   * POST /api/v1/integrations/sync/webhook
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload: WebhookSyncRequest = req.body;

      if (!payload.issueKey) {
        res.status(400).json({
          success: false,
          message: 'issueKey is required in webhook payload',
        });
        return;
      }

      const result = await this.syncService.handleWebhook(payload);

      res.json({
        success: result.success,
        message: result.success
          ? `Webhook processed for ${payload.issueKey}`
          : result.error,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error handling webhook:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to handle webhook',
      });
    }
  };

  /**
   * Cancel a sync job
   * POST /api/v1/integrations/sync/jobs/:jobId/cancel
   */
  cancelJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user?.id || 'system';

      const queue = this.syncService.getQueueService();
      const job = await queue.cancelJob(jobId, userId);

      res.json({
        success: true,
        message: `Job ${jobId} cancelled`,
        data: job,
      });
    } catch (error: any) {
      logger.error('Error cancelling job:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel job',
      });
    }
  };

  /**
   * Retry a failed job
   * POST /api/v1/integrations/sync/jobs/:jobId/retry
   */
  retryJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;

      const queue = this.syncService.getQueueService();
      const job = await queue.retryJob(jobId);

      res.json({
        success: true,
        message: `Job ${jobId} queued for retry`,
        data: job,
      });
    } catch (error: any) {
      logger.error('Error retrying job:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retry job',
      });
    }
  };
}
