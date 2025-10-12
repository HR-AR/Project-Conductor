/**
 * Jira Integration Controller
 *
 * Handles HTTP requests for Jira OAuth flow, connection management,
 * and webhook endpoints.
 */

import { Request, Response } from 'express';
import { asyncHandler, BadRequestError } from '../../middleware/error-handler';
import logger from '../../utils/logger';
import JiraService from '../../services/integrations/jira.service';
import JiraWebhookService from '../../services/integrations/jira-webhook.service';
import JiraOAuthService from '../../services/integrations/jira-oauth.service';
import { JiraWebhookPayload } from '../../models/jira-integration.model';

export class JiraController {
  private jiraService: JiraService;
  private oauthService: JiraOAuthService;
  private webhookService: JiraWebhookService;

  constructor() {
    this.oauthService = new JiraOAuthService();
    this.webhookService = new JiraWebhookService(this.oauthService);
    this.jiraService = new JiraService();

    logger.info('Jira Integration Controller initialized');
  }

  /**
   * Start OAuth authorization flow
   * GET /api/v1/integrations/jira/auth
   */
  startAuth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = this.resolveRequestUserId(req);

    logger.info({ userId }, 'Starting Jira OAuth flow');

    const { url, state } = this.jiraService.getAuthorizationUrl(userId);

    logger.info({ userId, state }, 'OAuth authorization URL generated');

    res.json({
      success: true,
      data: {
        authorizationUrl: url,
        state,
      },
      message: 'Redirect user to authorizationUrl to complete OAuth flow',
    });
  });

  /**
   * OAuth callback endpoint
   * GET /api/v1/integrations/jira/callback
   */
  handleCallback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      logger.error({ error, error_description }, 'OAuth authorization failed');

      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Jira Integration - Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background-color: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
            h1 { color: #c00; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Authorization Failed</h1>
            <p><strong>Error:</strong> ${error}</p>
            <p><strong>Description:</strong> ${error_description || 'No description provided'}</p>
            <p><a href="/demo">Return to Dashboard</a></p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    if (!code || !state) {
      throw new BadRequestError('Missing authorization code or state');
    }

    logger.info({ state }, 'Processing OAuth callback');

    try {
      const connection = await this.jiraService.completeOAuthFlow(
        code as string,
        state as string
      );

      logger.info(
        { userId: connection.userId, connectionId: connection.id, siteName: connection.siteName },
        'OAuth flow completed successfully'
      );

      // Return success page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Jira Integration - Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { background-color: #efe; border: 1px solid #cfc; padding: 20px; border-radius: 5px; }
            h1 { color: #090; }
            .info { margin-top: 20px; }
            .info-item { margin: 10px 0; }
            .label { font-weight: bold; }
            a.button {
              display: inline-block;
              background-color: #007bff;
              color: white;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✓ Jira Integration Connected!</h1>
            <p>Your Jira account has been successfully connected to Project Conductor.</p>
            <div class="info">
              <div class="info-item">
                <span class="label">Site:</span> ${connection.siteName}
              </div>
              <div class="info-item">
                <span class="label">URL:</span> ${connection.siteUrl}
              </div>
              <div class="info-item">
                <span class="label">Connection ID:</span> ${connection.id}
              </div>
            </div>
            <a href="/demo" class="button">Return to Dashboard</a>
          </div>
          <script>
            // Auto-close window after 5 seconds if opened in popup
            if (window.opener) {
              window.opener.postMessage({ type: 'jira-oauth-success', connection: ${JSON.stringify({ id: connection.id, siteName: connection.siteName })} }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      logger.error({ error, state }, 'OAuth callback processing failed');

      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Jira Integration - Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background-color: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
            h1 { color: #c00; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Connection Failed</h1>
            <p>${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
            <p><a href="/demo">Return to Dashboard</a></p>
          </div>
        </body>
        </html>
      `);
    }
  });

  /**
   * Get connection status
   * GET /api/v1/integrations/jira/status
   */
  getStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = this.resolveRequestUserId(req);

    logger.debug({ userId }, 'Getting Jira connection status');

    const status = await this.jiraService.getConnectionStatus(userId);

    res.json({
      success: true,
      data: status,
      message: status.isConnected ? 'Connected to Jira' : 'Not connected to Jira',
    });
  });

  /**
   * Test connection
   * POST /api/v1/integrations/jira/test
   */
  testConnection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { connectionId } = req.body;

    if (!connectionId) {
      throw new BadRequestError('connectionId is required');
    }

    logger.info({ connectionId }, 'Testing Jira connection');

    const result = await this.jiraService.testConnection(connectionId);

    res.json({
      success: result.success,
      data: result,
      message: result.message,
    });
  });

  /**
   * Disconnect from Jira
   * DELETE /api/v1/integrations/jira/disconnect
   */
  disconnect = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { connectionId } = req.body;

    if (!connectionId) {
      throw new BadRequestError('connectionId is required');
    }

    logger.info({ connectionId }, 'Disconnecting from Jira');

    await this.jiraService.disconnect(connectionId);

    res.json({
      success: true,
      message: 'Successfully disconnected from Jira',
    });
  });

  /**
   * Get projects
   * GET /api/v1/integrations/jira/projects
   */
  getProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const connectionId = req.query['connectionId'] as string;

    if (!connectionId) {
      throw new BadRequestError('connectionId is required');
    }

    logger.debug({ connectionId }, 'Getting Jira projects');

    const projects = await this.jiraService.getProjects(connectionId);

    res.json({
      success: true,
      data: projects,
      message: `Retrieved ${projects.length} projects`,
    });
  });

  /**
   * Get issue types for a project
   * GET /api/v1/integrations/jira/projects/:projectKey/issuetypes
   */
  getIssueTypes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { projectKey } = req.params;
    const connectionId = req.query['connectionId'] as string;

    if (!connectionId) {
      throw new BadRequestError('connectionId is required');
    }

    logger.debug({ connectionId, projectKey }, 'Getting Jira issue types');

    const issueTypes = await this.jiraService.getIssueTypes(connectionId, projectKey);

    res.json({
      success: true,
      data: issueTypes,
      message: `Retrieved ${issueTypes.length} issue types`,
    });
  });

  /**
   * Export requirement to Jira
   * POST /api/v1/integrations/jira/export
   */
  exportRequirement = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { connectionId, requirementId, projectKey, issueTypeId } = req.body;

    if (!connectionId || !requirementId || !projectKey || !issueTypeId) {
      throw new BadRequestError('connectionId, requirementId, projectKey, and issueTypeId are required');
    }

    logger.info({ connectionId, requirementId, projectKey }, 'Exporting requirement to Jira');

    const result = await this.jiraService.exportRequirement(
      connectionId,
      requirementId,
      projectKey,
      issueTypeId
    );

    res.json({
      success: result.success,
      data: result,
      message: result.success
        ? `Requirement exported as ${result.jiraIssueKey}`
        : `Export failed: ${result.error}`,
    });
  });

  /**
   * Import Jira issue as requirement
   * POST /api/v1/integrations/jira/import
   */
  importIssue = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { connectionId, issueKey } = req.body;

    if (!connectionId || !issueKey) {
      throw new BadRequestError('connectionId and issueKey are required');
    }

    logger.info({ connectionId, issueKey }, 'Importing Jira issue as requirement');

    const result = await this.jiraService.importIssue(connectionId, issueKey);

    res.json({
      success: result.success,
      data: result,
      message: result.success
        ? `Issue imported as ${result.requirementId}`
        : `Import failed: ${result.error}`,
    });
  });

  /**
   * Register webhook
   * POST /api/v1/integrations/jira/webhooks
   */
  registerWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { connectionId, events, jqlFilter } = req.body;

    if (!connectionId) {
      throw new BadRequestError('connectionId is required');
    }

    logger.info({ connectionId, events }, 'Registering Jira webhook');

    const webhook = await this.webhookService.registerWebhook(
      connectionId,
      events,
      jqlFilter
    );

    res.json({
      success: true,
      data: webhook,
      message: 'Webhook registered successfully',
    });
  });

  /**
   * Webhook endpoint - receive events from Jira
   * POST /api/v1/integrations/jira/webhooks/:connectionId
   */
  receiveWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { connectionId } = req.params;
    const signature = req.headers['x-hub-signature'] as string;
    const payload: JiraWebhookPayload = req.body;

    logger.info(
      { connectionId, event: payload.webhookEvent, issueKey: payload.issue?.key },
      'Received Jira webhook'
    );

    // Verify webhook signature
    const rawBody = JSON.stringify(req.body);
    const isValid = this.webhookService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      logger.warn({ connectionId }, 'Invalid webhook signature');
      res.status(403).json({
        success: false,
        message: 'Invalid webhook signature',
      });
      return;
    }

    // Process webhook asynchronously
    this.webhookService.processWebhookPayload(connectionId, payload)
      .catch(error => {
        logger.error({ error, connectionId }, 'Failed to process webhook payload');
      });

    // Return 200 immediately to acknowledge receipt
    res.json({
      success: true,
      message: 'Webhook received',
    });
  });

  /**
   * Deregister webhook
   * DELETE /api/v1/integrations/jira/webhooks/:webhookId
   */
  deregisterWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { webhookId } = req.params;

    logger.info({ webhookId }, 'Deregistering Jira webhook');

    await this.webhookService.deregisterWebhook(webhookId);

    res.json({
      success: true,
      message: 'Webhook deregistered successfully',
    });
  });

  /**
   * Get all webhooks for a connection
   * GET /api/v1/integrations/jira/webhooks
   */
  getWebhooks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const connectionId = req.query['connectionId'] as string;

    if (!connectionId) {
      throw new BadRequestError('connectionId is required');
    }

    logger.debug({ connectionId }, 'Getting Jira webhooks');

    const webhooks = await this.webhookService.getWebhooksByConnectionId(connectionId);

    res.json({
      success: true,
      data: webhooks,
      message: `Retrieved ${webhooks.length} webhooks`,
    });
  });

  /**
   * Resolve user ID from request
   * In production, extract from JWT token
   */
  private resolveRequestUserId(req: Request): string {
    // TODO: Extract from JWT token in req.user
    // For now, use header or default value
    return req.headers['x-user-id'] as string || 'demo-user';
  }
}

export default JiraController;
