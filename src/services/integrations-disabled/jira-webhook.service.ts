/**
 * Jira Webhook Service
 *
 * Manages webhook registration, signature verification, and event processing
 * for Jira Cloud webhooks.
 */

import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { db } from '../../config/database';
import logger from '../../utils/logger';
import {
  JiraWebhook,
  JiraWebhookConfig,
  JiraWebhookEvent,
  JiraWebhookPayload,
  JiraWebhookRegistration,
  JIRA_WEBHOOK_EVENTS,
  JiraIntegrationError,
  JiraIntegrationErrorCode,
} from '../../models/jira-integration.model';
import JiraOAuthService from './jira-oauth.service';

export class JiraWebhookService {
  private readonly webhookSecret: string;
  private readonly oauthService: JiraOAuthService;

  constructor(oauthService: JiraOAuthService) {
    this.oauthService = oauthService;
    this.webhookSecret = process.env['JIRA_WEBHOOK_SECRET'] || crypto.randomBytes(32).toString('hex');

    if (!process.env['JIRA_WEBHOOK_SECRET']) {
      logger.warn('JIRA_WEBHOOK_SECRET not configured. Using generated secret (will not persist across restarts).');
    }
  }

  /**
   * Register webhook with Jira
   *
   * @param connectionId - Jira connection ID
   * @param events - Events to subscribe to
   * @param jqlFilter - Optional JQL filter for issue events
   * @returns Registered webhook configuration
   */
  async registerWebhook(
    connectionId: string,
    events: JiraWebhookEvent[] = [...JIRA_WEBHOOK_EVENTS],
    jqlFilter?: string
  ): Promise<JiraWebhookConfig> {
    logger.info({ connectionId, events }, 'Registering Jira webhook');

    try {
      // Get connection details
      const connection = await this.oauthService.getConnection(connectionId);

      if (!connection) {
        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.CONNECTION_NOT_FOUND,
          `Connection not found: ${connectionId}`
        );
      }

      // Get valid access token
      const accessToken = await this.oauthService.getValidAccessToken(connectionId);

      // Construct webhook URL
      const webhookUrl = this.getWebhookUrl(connectionId);

      // Prepare webhook registration request
      const registration: JiraWebhookRegistration = {
        name: `Project Conductor - ${connection.siteName}`,
        url: webhookUrl,
        events,
        excludeBody: false,
      };

      // Add JQL filter if provided
      if (jqlFilter) {
        registration.filters = {
          issue_related_events_section: jqlFilter,
        };
      }

      // Register webhook with Jira
      const response = await axios.post<JiraWebhook>(
        `https://api.atlassian.com/ex/jira/${connection.cloudId}/rest/api/3/webhook`,
        registration,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      const jiraWebhook = response.data;

      logger.info(
        { connectionId, webhookId: jiraWebhook.id, events },
        'Webhook registered successfully with Jira'
      );

      // Store webhook configuration in database
      const webhookConfig = await this.storeWebhookConfig({
        connectionId,
        webhookId: jiraWebhook.id,
        name: jiraWebhook.name,
        url: webhookUrl,
        events,
        secret: this.webhookSecret,
      });

      logger.info(
        { connectionId, webhookConfigId: webhookConfig.id },
        'Webhook configuration stored successfully'
      );

      return webhookConfig;
    } catch (error) {
      logger.error({ error, connectionId }, 'Failed to register webhook');

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.WEBHOOK_REGISTRATION_FAILED,
          `Webhook registration failed: ${axiosError.response?.data || axiosError.message}`,
          axiosError.response?.data
        );
      }

      throw error;
    }
  }

  /**
   * Deregister webhook from Jira
   *
   * @param webhookConfigId - Webhook configuration ID
   */
  async deregisterWebhook(webhookConfigId: string): Promise<void> {
    logger.info({ webhookConfigId }, 'Deregistering Jira webhook');

    try {
      // Get webhook configuration
      const webhookConfig = await this.getWebhookConfig(webhookConfigId);

      if (!webhookConfig) {
        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.CONNECTION_NOT_FOUND,
          `Webhook configuration not found: ${webhookConfigId}`
        );
      }

      // Get connection
      const connection = await this.oauthService.getConnection(webhookConfig.connectionId);

      if (!connection) {
        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.CONNECTION_NOT_FOUND,
          `Connection not found: ${webhookConfig.connectionId}`
        );
      }

      // Get valid access token
      const accessToken = await this.oauthService.getValidAccessToken(webhookConfig.connectionId);

      // Deregister webhook from Jira
      await axios.delete(
        `https://api.atlassian.com/ex/jira/${connection.cloudId}/rest/api/3/webhook/${webhookConfig.webhookId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      logger.info(
        { webhookConfigId, webhookId: webhookConfig.webhookId },
        'Webhook deregistered from Jira'
      );

      // Mark webhook as inactive in database
      await this.deactivateWebhookConfig(webhookConfigId);

      logger.info({ webhookConfigId }, 'Webhook configuration deactivated');
    } catch (error) {
      logger.error({ error, webhookConfigId }, 'Failed to deregister webhook');

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // If webhook not found (404), still deactivate locally
        if (axiosError.response?.status === 404) {
          logger.warn({ webhookConfigId }, 'Webhook not found in Jira, deactivating locally');
          await this.deactivateWebhookConfig(webhookConfigId);
          return;
        }

        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.WEBHOOK_REGISTRATION_FAILED,
          `Webhook deregistration failed: ${axiosError.response?.data || axiosError.message}`,
          axiosError.response?.data
        );
      }

      throw error;
    }
  }

  /**
   * Verify webhook signature
   *
   * @param payload - Raw webhook payload (string)
   * @param signature - Signature from X-Hub-Signature header
   * @returns True if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) {
      logger.warn('Webhook signature missing');
      return false;
    }

    // Jira uses HMAC-SHA256 with format: sha256=<hash>
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload, 'utf8')
      .digest('hex')}`;

    // Timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn({ providedSignature: signature }, 'Invalid webhook signature');
    }

    return isValid;
  }

  /**
   * Process webhook payload
   *
   * @param connectionId - Connection ID from webhook URL
   * @param payload - Webhook payload
   * @returns Processing result
   */
  async processWebhookPayload(
    connectionId: string,
    payload: JiraWebhookPayload
  ): Promise<{ success: boolean; message: string }> {
    logger.info(
      { connectionId, event: payload.webhookEvent, issueKey: payload.issue?.key },
      'Processing Jira webhook payload'
    );

    try {
      // Find webhook configuration
      const webhookConfig = await this.getWebhookConfigByConnectionId(connectionId);

      if (!webhookConfig || !webhookConfig.isActive) {
        logger.warn({ connectionId }, 'No active webhook configuration found');
        return {
          success: false,
          message: 'No active webhook configuration',
        };
      }

      // Update last triggered timestamp
      await this.updateWebhookLastTriggered(webhookConfig.id);

      // Route to appropriate handler based on event type
      const event = payload.webhookEvent;

      if (event === 'jira:issue_created') {
        await this.handleIssueCreated(connectionId, payload);
      } else if (event === 'jira:issue_updated') {
        await this.handleIssueUpdated(connectionId, payload);
      } else if (event === 'jira:issue_deleted') {
        await this.handleIssueDeleted(connectionId, payload);
      } else if (event === 'comment_created') {
        await this.handleCommentCreated(connectionId, payload);
      } else if (event === 'comment_updated') {
        await this.handleCommentUpdated(connectionId, payload);
      } else if (event === 'comment_deleted') {
        await this.handleCommentDeleted(connectionId, payload);
      } else {
        logger.info({ event }, 'Unhandled webhook event type');
      }

      logger.info({ connectionId, event }, 'Webhook payload processed successfully');

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      logger.error({ error, connectionId }, 'Failed to process webhook payload');

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all webhooks for a connection
   */
  async getWebhooksByConnectionId(connectionId: string): Promise<JiraWebhookConfig[]> {
    const query = 'SELECT * FROM jira_webhooks WHERE connection_id = $1 AND is_active = true';
    const result = await db.query(query, [connectionId]);

    return result.rows.map(this.mapRowToWebhookConfig);
  }

  /**
   * Construct webhook URL for a connection
   */
  private getWebhookUrl(connectionId: string): string {
    const baseUrl = process.env['JIRA_WEBHOOK_BASE_URL'] || 'http://localhost:3000';
    return `${baseUrl}/api/v1/integrations/jira/webhooks/${connectionId}`;
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle issue created event
   */
  private async handleIssueCreated(
    connectionId: string,
    payload: JiraWebhookPayload
  ): Promise<void> {
    logger.info(
      { connectionId, issueKey: payload.issue?.key },
      'Handling issue created event'
    );

    // TODO: Implement issue import logic
    // - Check if issue should be imported based on configuration
    // - Create corresponding requirement in Project Conductor
    // - Link issue to requirement
  }

  /**
   * Handle issue updated event
   */
  private async handleIssueUpdated(
    connectionId: string,
    payload: JiraWebhookPayload
  ): Promise<void> {
    logger.info(
      { connectionId, issueKey: payload.issue?.key },
      'Handling issue updated event'
    );

    // TODO: Implement issue sync logic
    // - Find linked requirement
    // - Apply changes based on field mappings
    // - Handle conflicts based on sync configuration
  }

  /**
   * Handle issue deleted event
   */
  private async handleIssueDeleted(
    connectionId: string,
    payload: JiraWebhookPayload
  ): Promise<void> {
    logger.info(
      { connectionId, issueKey: payload.issue?.key },
      'Handling issue deleted event'
    );

    // TODO: Implement issue deletion logic
    // - Find linked requirement
    // - Decide: archive requirement or just remove link?
    // - Log the deletion event
  }

  /**
   * Handle comment created event
   */
  private async handleCommentCreated(
    connectionId: string,
    payload: JiraWebhookPayload
  ): Promise<void> {
    logger.info(
      { connectionId, issueKey: payload.issue?.key, commentId: payload.comment?.id },
      'Handling comment created event'
    );

    // TODO: Implement comment sync logic
    // - Find linked requirement
    // - Add comment to requirement
    // - Preserve author information
  }

  /**
   * Handle comment updated event
   */
  private async handleCommentUpdated(
    connectionId: string,
    payload: JiraWebhookPayload
  ): Promise<void> {
    logger.info(
      { connectionId, issueKey: payload.issue?.key, commentId: payload.comment?.id },
      'Handling comment updated event'
    );

    // TODO: Implement comment update logic
  }

  /**
   * Handle comment deleted event
   */
  private async handleCommentDeleted(
    connectionId: string,
    payload: JiraWebhookPayload
  ): Promise<void> {
    logger.info(
      { connectionId, issueKey: payload.issue?.key, commentId: payload.comment?.id },
      'Handling comment deleted event'
    );

    // TODO: Implement comment deletion logic
  }

  // ============================================================================
  // Database Operations
  // ============================================================================

  /**
   * Store webhook configuration
   */
  private async storeWebhookConfig(
    data: Omit<JiraWebhookConfig, 'id' | 'isActive' | 'lastTriggeredAt' | 'createdAt' | 'updatedAt'>
  ): Promise<JiraWebhookConfig> {
    const now = new Date();
    const id = `jira_webhook_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const query = `
      INSERT INTO jira_webhooks (
        id, connection_id, webhook_id, name, url,
        events, secret, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      data.connectionId,
      data.webhookId,
      data.name,
      data.url,
      data.events,
      data.secret,
      true,
      now,
      now,
    ]);

    return this.mapRowToWebhookConfig(result.rows[0]);
  }

  /**
   * Get webhook configuration by ID
   */
  private async getWebhookConfig(id: string): Promise<JiraWebhookConfig | null> {
    const query = 'SELECT * FROM jira_webhooks WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWebhookConfig(result.rows[0]);
  }

  /**
   * Get webhook configuration by connection ID
   */
  private async getWebhookConfigByConnectionId(connectionId: string): Promise<JiraWebhookConfig | null> {
    const query = 'SELECT * FROM jira_webhooks WHERE connection_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(query, [connectionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWebhookConfig(result.rows[0]);
  }

  /**
   * Deactivate webhook configuration
   */
  private async deactivateWebhookConfig(id: string): Promise<void> {
    const query = `
      UPDATE jira_webhooks
      SET is_active = false,
          updated_at = $2
      WHERE id = $1
    `;

    await db.query(query, [id, new Date()]);
  }

  /**
   * Update webhook last triggered timestamp
   */
  private async updateWebhookLastTriggered(id: string): Promise<void> {
    const now = new Date();

    const query = `
      UPDATE jira_webhooks
      SET last_triggered_at = $2,
          updated_at = $3
      WHERE id = $1
    `;

    await db.query(query, [id, now, now]);
  }

  /**
   * Map database row to JiraWebhookConfig
   */
  private mapRowToWebhookConfig(row: any): JiraWebhookConfig {
    return {
      id: row.id,
      connectionId: row.connection_id,
      webhookId: row.webhook_id,
      name: row.name,
      url: row.url,
      events: row.events,
      secret: row.secret,
      isActive: row.is_active,
      lastTriggeredAt: row.last_triggered_at ? new Date(row.last_triggered_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default JiraWebhookService;
