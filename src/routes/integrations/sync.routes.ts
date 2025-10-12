/**
 * Sync Routes
 * Routes for bi-directional synchronization between Jira and BRDs
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { SyncController } from '../../controllers/integrations/sync.controller';

export function createSyncRoutes(pool: Pool): Router {
  const router = Router();
  const controller = new SyncController(pool);

  /**
   * Import/Export Operations
   */

  // Import Jira Epic as BRD
  router.post('/jira-to-brd', controller.importFromJira);

  // Export BRD to Jira Epic
  router.post('/brd-to-jira', controller.exportToJira);

  // Bulk import Jira Epics
  router.post('/bulk-import', controller.bulkImport);

  // Bulk export BRDs
  router.post('/bulk-export', controller.bulkExport);

  // Sync existing mapping
  router.post('/mapping/:mappingId', controller.syncMapping);

  /**
   * Job Management
   */

  // Get sync job status
  router.get('/status/:jobId', controller.getSyncStatus);

  // Get all sync jobs
  router.get('/jobs', controller.getJobs);

  // Get queue statistics
  router.get('/stats', controller.getStats);

  // Cancel a sync job
  router.post('/jobs/:jobId/cancel', controller.cancelJob);

  // Retry a failed job
  router.post('/jobs/:jobId/retry', controller.retryJob);

  /**
   * Conflict Management
   */

  // Get all conflicts (requires ?brdId= query param)
  router.get('/conflicts', controller.getConflicts);

  // Resolve a conflict
  router.post('/conflicts/:conflictId/resolve', controller.resolveConflict);

  // Ignore a conflict
  router.post('/conflicts/:conflictId/ignore', controller.ignoreConflict);

  /**
   * Mappings
   */

  // Get all sync mappings
  router.get('/mappings', controller.getMappings);

  // Get mapping by BRD ID
  router.get('/mappings/brd/:brdId', controller.getMappingByBRD);

  // Get mapping by Jira key
  router.get('/mappings/jira/:jiraKey', controller.getMappingByJira);

  /**
   * Webhook
   */

  // Handle Jira webhook
  router.post('/webhook', controller.handleWebhook);

  return router;
}
