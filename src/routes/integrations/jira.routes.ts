/**
 * Jira Integration Routes
 *
 * Defines all routes for Jira OAuth 2.0 integration, connection management,
 * and webhook endpoints.
 */

import { Router } from 'express';
import JiraController from '../../controllers/integrations/jira.controller';

const router = Router();
const controller = new JiraController();

// ============================================================================
// OAuth 2.0 Flow
// ============================================================================

/**
 * Start OAuth authorization flow
 * GET /api/v1/integrations/jira/auth
 *
 * Returns authorization URL for user to redirect to Jira
 */
router.get('/auth', controller.startAuth);

/**
 * OAuth callback endpoint
 * GET /api/v1/integrations/jira/callback
 *
 * Jira redirects here after user authorizes the app
 * Query params: code, state, error (optional)
 */
router.get('/callback', controller.handleCallback);

// ============================================================================
// Connection Management
// ============================================================================

/**
 * Get connection status for current user
 * GET /api/v1/integrations/jira/status
 *
 * Returns whether user has an active Jira connection
 */
router.get('/status', controller.getStatus);

/**
 * Test Jira connection
 * POST /api/v1/integrations/jira/test
 *
 * Makes an API call to Jira to verify connection is working
 * Body: { connectionId: string }
 */
router.post('/test', controller.testConnection);

/**
 * Disconnect from Jira
 * DELETE /api/v1/integrations/jira/disconnect
 *
 * Revokes access token and deactivates connection
 * Body: { connectionId: string }
 */
router.delete('/disconnect', controller.disconnect);

// ============================================================================
// Jira Resources
// ============================================================================

/**
 * Get all projects
 * GET /api/v1/integrations/jira/projects
 *
 * Query params: connectionId (required)
 * Returns list of accessible Jira projects
 */
router.get('/projects', controller.getProjects);

/**
 * Get issue types for a project
 * GET /api/v1/integrations/jira/projects/:projectKey/issuetypes
 *
 * Query params: connectionId (required)
 * Returns list of issue types (Story, Task, Bug, etc.)
 */
router.get('/projects/:projectKey/issuetypes', controller.getIssueTypes);

// ============================================================================
// Import/Export
// ============================================================================

/**
 * Export requirement to Jira
 * POST /api/v1/integrations/jira/export
 *
 * Creates a Jira issue from a Project Conductor requirement
 * Body: {
 *   connectionId: string,
 *   requirementId: string,
 *   projectKey: string,
 *   issueTypeId: string
 * }
 */
router.post('/export', controller.exportRequirement);

/**
 * Import Jira issue as requirement
 * POST /api/v1/integrations/jira/import
 *
 * Creates a Project Conductor requirement from a Jira issue
 * Body: {
 *   connectionId: string,
 *   issueKey: string (e.g., "PROJ-123")
 * }
 */
router.post('/import', controller.importIssue);

// ============================================================================
// Webhooks
// ============================================================================

/**
 * Register webhook
 * POST /api/v1/integrations/jira/webhooks
 *
 * Registers a webhook with Jira for live updates
 * Body: {
 *   connectionId: string,
 *   events?: string[] (optional, defaults to all),
 *   jqlFilter?: string (optional)
 * }
 */
router.post('/webhooks', controller.registerWebhook);

/**
 * Get all webhooks for a connection
 * GET /api/v1/integrations/jira/webhooks
 *
 * Query params: connectionId (required)
 * Returns list of registered webhooks
 */
router.get('/webhooks', controller.getWebhooks);

/**
 * Webhook receiver endpoint
 * POST /api/v1/integrations/jira/webhooks/:connectionId
 *
 * Receives webhook events from Jira
 * Headers: X-Hub-Signature (HMAC-SHA256 signature)
 * Body: JiraWebhookPayload
 */
router.post('/webhooks/:connectionId', controller.receiveWebhook);

/**
 * Deregister webhook
 * DELETE /api/v1/integrations/jira/webhooks/:webhookId
 *
 * Removes webhook registration from Jira
 */
router.delete('/webhooks/:webhookId', controller.deregisterWebhook);

export default router;
