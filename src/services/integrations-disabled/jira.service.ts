/**
 * Jira Integration Service
 *
 * Complete Jira Cloud API client with OAuth 2.0 support, resource management,
 * issue operations, and sync capabilities.
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import crypto from 'crypto';
import { db } from '../../config/database';
import logger from '../../utils/logger';
import {
  JiraProject,
  JiraEpic,
  JiraIssue,
  JiraIssueType,
  JiraUser,
  JiraCreateIssueRequest,
  JiraUpdateIssueRequest,
  JiraJQLSearchRequest,
  JiraJQLSearchResponse,
  JiraIssueMapping,
  JiraSyncLog,
  JiraSyncResult,
  JiraIntegrationError,
  JiraIntegrationErrorCode,
  JiraConnection,
} from '../../models/jira-integration.model';
import JiraOAuthService from './jira-oauth.service';
import JiraWebhookService from './jira-webhook.service';

/**
 * Rate limiter for Jira API requests
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      logger.debug({ waitTime }, 'Rate limit reached, waiting');

      await new Promise(resolve => setTimeout(resolve, waitTime));

      return this.acquire();
    }

    this.requests.push(now);
  }
}

export class JiraService {
  private readonly oauthService: JiraOAuthService;
  private readonly webhookService: JiraWebhookService;
  private readonly rateLimiter: RateLimiter;
  private readonly baseApiUrl = 'https://api.atlassian.com/ex/jira';

  constructor() {
    this.oauthService = new JiraOAuthService();
    this.webhookService = new JiraWebhookService(this.oauthService);

    // Jira Cloud rate limit: 100 requests per minute per connection
    const rateLimit = parseInt(process.env['JIRA_RATE_LIMIT_PER_MINUTE'] || '100', 10);
    this.rateLimiter = new RateLimiter(rateLimit, 60 * 1000);
  }

  // ============================================================================
  // OAuth & Connection Management
  // ============================================================================

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(userId: string): { url: string; state: string } {
    return this.oauthService.generateAuthorizationUrl(userId);
  }

  /**
   * Complete OAuth flow with authorization code
   */
  async completeOAuthFlow(code: string, state: string): Promise<JiraConnection> {
    const userId = this.oauthService.verifyState(state);

    if (!userId) {
      throw new JiraIntegrationError(
        JiraIntegrationErrorCode.OAUTH_FAILED,
        'Invalid or expired OAuth state'
      );
    }

    const connection = await this.oauthService.exchangeCodeForToken(code, userId);

    // Auto-register webhooks if enabled
    if (process.env['JIRA_AUTO_REGISTER_WEBHOOKS'] !== 'false') {
      try {
        await this.webhookService.registerWebhook(connection.id);
        logger.info({ connectionId: connection.id }, 'Webhooks auto-registered');
      } catch (error) {
        logger.error({ error, connectionId: connection.id }, 'Failed to auto-register webhooks');
        // Don't fail the OAuth flow if webhook registration fails
      }
    }

    return connection;
  }

  /**
   * Disconnect Jira integration
   */
  async disconnect(connectionId: string): Promise<void> {
    logger.info({ connectionId }, 'Disconnecting Jira integration');

    // Deregister all webhooks
    const webhooks = await this.webhookService.getWebhooksByConnectionId(connectionId);

    for (const webhook of webhooks) {
      try {
        await this.webhookService.deregisterWebhook(webhook.id);
      } catch (error) {
        logger.error({ error, webhookId: webhook.id }, 'Failed to deregister webhook');
      }
    }

    // Revoke connection
    await this.oauthService.revokeConnection(connectionId);

    logger.info({ connectionId }, 'Jira integration disconnected');
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(userId: string): Promise<{
    isConnected: boolean;
    connection?: JiraConnection;
  }> {
    const connection = await this.oauthService.getConnectionByUserId(userId);

    return {
      isConnected: !!connection && connection.isActive,
      connection: connection || undefined,
    };
  }

  /**
   * Test connection by making an API call
   */
  async testConnection(connectionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getCurrentUser(connectionId);

      logger.info(
        { connectionId, userAccountId: user.accountId },
        'Connection test successful'
      );

      return {
        success: true,
        message: `Connected as ${user.displayName} (${user.emailAddress || user.accountId})`,
      };
    } catch (error) {
      logger.error({ error, connectionId }, 'Connection test failed');

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // Jira API Client Methods
  // ============================================================================

  /**
   * Create authenticated API client for a connection
   */
  private async createApiClient(connectionId: string): Promise<AxiosInstance> {
    const connection = await this.oauthService.getConnection(connectionId);

    if (!connection) {
      throw new JiraIntegrationError(
        JiraIntegrationErrorCode.CONNECTION_NOT_FOUND,
        `Connection not found: ${connectionId}`
      );
    }

    const accessToken = await this.oauthService.getValidAccessToken(connectionId);

    const client = axios.create({
      baseURL: `${this.baseApiUrl}/${connection.cloudId}/rest/api/3`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add request interceptor for rate limiting
    client.interceptors.request.use(async (config) => {
      await this.rateLimiter.acquire();
      return config;
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, try refreshing
          logger.warn({ connectionId }, 'Access token expired, refreshing');

          try {
            await this.oauthService.refreshAccessToken(connectionId);
            // Retry the request with new token
            if (error.config) {
              const newToken = await this.oauthService.getValidAccessToken(connectionId);
              error.config.headers.Authorization = `Bearer ${newToken}`;
              return axios.request(error.config);
            }
          } catch (refreshError) {
            logger.error({ error: refreshError, connectionId }, 'Token refresh failed');
            throw new JiraIntegrationError(
              JiraIntegrationErrorCode.TOKEN_REFRESH_FAILED,
              'Failed to refresh access token'
            );
          }
        }

        throw error;
      }
    );

    return client;
  }

  /**
   * Get current user information
   */
  async getCurrentUser(connectionId: string): Promise<JiraUser> {
    const client = await this.createApiClient(connectionId);

    try {
      const response = await client.get<JiraUser>('/myself');
      return response.data;
    } catch (error) {
      logger.error({ error, connectionId }, 'Failed to get current user');
      throw this.handleApiError(error, 'Failed to get current user');
    }
  }

  /**
   * Get all projects
   */
  async getProjects(connectionId: string): Promise<JiraProject[]> {
    const client = await this.createApiClient(connectionId);

    try {
      const response = await client.get<JiraProject[]>('/project/search', {
        params: {
          expand: 'description,lead',
        },
      });

      return response.data;
    } catch (error) {
      logger.error({ error, connectionId }, 'Failed to get projects');
      throw this.handleApiError(error, 'Failed to get projects');
    }
  }

  /**
   * Get project by key
   */
  async getProject(connectionId: string, projectKey: string): Promise<JiraProject> {
    const client = await this.createApiClient(connectionId);

    try {
      const response = await client.get<JiraProject>(`/project/${projectKey}`, {
        params: {
          expand: 'description,lead',
        },
      });

      return response.data;
    } catch (error) {
      logger.error({ error, connectionId, projectKey }, 'Failed to get project');
      throw this.handleApiError(error, 'Failed to get project');
    }
  }

  /**
   * Get issue types for a project
   */
  async getIssueTypes(connectionId: string, projectKey: string): Promise<JiraIssueType[]> {
    const client = await this.createApiClient(connectionId);

    try {
      const response = await client.get<JiraIssueType[]>(
        `/project/${projectKey}/statuses`
      );

      // Extract unique issue types
      const issueTypes = new Map<string, JiraIssueType>();

      response.data.forEach((status: any) => {
        status.issueTypes?.forEach((issueType: JiraIssueType) => {
          if (!issueTypes.has(issueType.id)) {
            issueTypes.set(issueType.id, issueType);
          }
        });
      });

      return Array.from(issueTypes.values());
    } catch (error) {
      logger.error({ error, connectionId, projectKey }, 'Failed to get issue types');
      throw this.handleApiError(error, 'Failed to get issue types');
    }
  }

  /**
   * Get issue by key
   */
  async getIssue(connectionId: string, issueKey: string): Promise<JiraIssue> {
    const client = await this.createApiClient(connectionId);

    try {
      const response = await client.get<JiraIssue>(`/issue/${issueKey}`, {
        params: {
          expand: 'names,schema,operations,transitions',
        },
      });

      return response.data;
    } catch (error) {
      logger.error({ error, connectionId, issueKey }, 'Failed to get issue');
      throw this.handleApiError(error, 'Failed to get issue');
    }
  }

  /**
   * Create issue
   */
  async createIssue(
    connectionId: string,
    request: JiraCreateIssueRequest
  ): Promise<JiraIssue> {
    const client = await this.createApiClient(connectionId);

    try {
      logger.info(
        { connectionId, projectKey: request.fields.project.key, summary: request.fields.summary },
        'Creating Jira issue'
      );

      const response = await client.post<{ key: string; id: string }>('/issue', request);

      logger.info(
        { connectionId, issueKey: response.data.key },
        'Jira issue created successfully'
      );

      // Fetch the created issue with full details
      return await this.getIssue(connectionId, response.data.key);
    } catch (error) {
      logger.error({ error, connectionId }, 'Failed to create issue');
      throw this.handleApiError(error, 'Failed to create issue');
    }
  }

  /**
   * Update issue
   */
  async updateIssue(
    connectionId: string,
    issueKey: string,
    request: JiraUpdateIssueRequest
  ): Promise<JiraIssue> {
    const client = await this.createApiClient(connectionId);

    try {
      logger.info({ connectionId, issueKey }, 'Updating Jira issue');

      await client.put(`/issue/${issueKey}`, request);

      logger.info({ connectionId, issueKey }, 'Jira issue updated successfully');

      // Fetch the updated issue
      return await this.getIssue(connectionId, issueKey);
    } catch (error) {
      logger.error({ error, connectionId, issueKey }, 'Failed to update issue');
      throw this.handleApiError(error, 'Failed to update issue');
    }
  }

  /**
   * Delete issue
   */
  async deleteIssue(connectionId: string, issueKey: string): Promise<void> {
    const client = await this.createApiClient(connectionId);

    try {
      logger.info({ connectionId, issueKey }, 'Deleting Jira issue');

      await client.delete(`/issue/${issueKey}`);

      logger.info({ connectionId, issueKey }, 'Jira issue deleted successfully');
    } catch (error) {
      logger.error({ error, connectionId, issueKey }, 'Failed to delete issue');
      throw this.handleApiError(error, 'Failed to delete issue');
    }
  }

  /**
   * Search issues using JQL
   */
  async searchIssues(
    connectionId: string,
    request: JiraJQLSearchRequest
  ): Promise<JiraJQLSearchResponse> {
    const client = await this.createApiClient(connectionId);

    try {
      logger.debug({ connectionId, jql: request.jql }, 'Searching issues with JQL');

      const response = await client.get<JiraJQLSearchResponse>('/search', {
        params: {
          jql: request.jql,
          startAt: request.startAt || 0,
          maxResults: request.maxResults || 50,
          fields: request.fields?.join(','),
          expand: request.expand?.join(','),
        },
      });

      logger.debug(
        { connectionId, total: response.data.total },
        'JQL search completed'
      );

      return response.data;
    } catch (error) {
      logger.error({ error, connectionId, jql: request.jql }, 'JQL search failed');
      throw this.handleApiError(error, 'JQL search failed');
    }
  }

  /**
   * Get epics for a project
   */
  async getEpics(connectionId: string, projectKey: string): Promise<JiraEpic[]> {
    const jql = `project = "${projectKey}" AND type = Epic ORDER BY created DESC`;

    try {
      const searchResult = await this.searchIssues(connectionId, {
        jql,
        maxResults: 100,
      });

      return searchResult.issues.map(issue => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status,
        color: { key: 'default' },
        done: issue.fields.status.statusCategory.key === 'done',
      }));
    } catch (error) {
      logger.error({ error, connectionId, projectKey }, 'Failed to get epics');
      throw this.handleApiError(error, 'Failed to get epics');
    }
  }

  /**
   * Get issues for an epic
   */
  async getEpicIssues(connectionId: string, epicKey: string): Promise<JiraIssue[]> {
    const jql = `parent = "${epicKey}" ORDER BY created DESC`;

    try {
      const searchResult = await this.searchIssues(connectionId, {
        jql,
        maxResults: 100,
      });

      return searchResult.issues;
    } catch (error) {
      logger.error({ error, connectionId, epicKey }, 'Failed to get epic issues');
      throw this.handleApiError(error, 'Failed to get epic issues');
    }
  }

  /**
   * Link issue to epic
   */
  async linkIssueToEpic(
    connectionId: string,
    issueKey: string,
    epicKey: string
  ): Promise<void> {
    const client = await this.createApiClient(connectionId);

    try {
      logger.info({ connectionId, issueKey, epicKey }, 'Linking issue to epic');

      await client.put(`/issue/${issueKey}`, {
        fields: {
          parent: {
            key: epicKey,
          },
        },
      });

      logger.info({ connectionId, issueKey, epicKey }, 'Issue linked to epic successfully');
    } catch (error) {
      logger.error({ error, connectionId, issueKey, epicKey }, 'Failed to link issue to epic');
      throw this.handleApiError(error, 'Failed to link issue to epic');
    }
  }

  // ============================================================================
  // Integration & Sync Methods
  // ============================================================================

  /**
   * Export requirement to Jira as an issue
   */
  async exportRequirement(
    connectionId: string,
    requirementId: string,
    projectKey: string,
    issueTypeId: string
  ): Promise<JiraSyncResult> {
    logger.info(
      { connectionId, requirementId, projectKey, issueTypeId },
      'Exporting requirement to Jira'
    );

    try {
      // Get requirement details (stub - integrate with RequirementsService)
      const requirement = await this.getRequirement(requirementId);

      if (!requirement) {
        throw new Error(`Requirement not found: ${requirementId}`);
      }

      // Create Jira issue
      const createRequest: JiraCreateIssueRequest = {
        fields: {
          project: { key: projectKey },
          summary: requirement.title,
          description: this.convertToADF(requirement.description || ''),
          issuetype: { id: issueTypeId },
          priority: requirement.priority ? { id: this.mapPriority(requirement.priority) } : undefined,
          labels: requirement.tags || [],
        },
      };

      const issue = await this.createIssue(connectionId, createRequest);

      // Create mapping
      await this.createIssueMapping({
        connectionId,
        requirementId,
        jiraIssueId: issue.id,
        jiraIssueKey: issue.key,
        jiraProjectKey: projectKey,
        syncEnabled: true,
        syncDirection: 'bidirectional',
      });

      // Log sync
      await this.logSync({
        connectionId,
        requirementId,
        jiraIssueKey: issue.key,
        operation: 'export',
        status: 'success',
        direction: 'to_jira',
      });

      logger.info(
        { connectionId, requirementId, issueKey: issue.key },
        'Requirement exported successfully'
      );

      return {
        success: true,
        requirementId,
        jiraIssueKey: issue.key,
        operation: 'export',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error({ error, connectionId, requirementId }, 'Failed to export requirement');

      await this.logSync({
        connectionId,
        requirementId,
        operation: 'export',
        status: 'failed',
        direction: 'to_jira',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        requirementId,
        operation: 'export',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Import Jira issue as requirement
   */
  async importIssue(
    connectionId: string,
    issueKey: string
  ): Promise<JiraSyncResult> {
    logger.info({ connectionId, issueKey }, 'Importing Jira issue as requirement');

    try {
      const issue = await this.getIssue(connectionId, issueKey);

      // Create requirement (stub - integrate with RequirementsService)
      const requirementId = await this.createRequirement({
        title: issue.fields.summary,
        description: this.convertFromADF(issue.fields.description),
        priority: this.unmapPriority(issue.fields.priority?.name || 'Medium'),
        tags: issue.fields.labels,
        metadata: {
          jiraIssueKey: issue.key,
          jiraIssueId: issue.id,
          importedFrom: 'jira',
          importedAt: new Date().toISOString(),
        },
      });

      // Create mapping
      await this.createIssueMapping({
        connectionId,
        requirementId,
        jiraIssueId: issue.id,
        jiraIssueKey: issue.key,
        jiraProjectKey: issue.fields.project.key,
        syncEnabled: true,
        syncDirection: 'bidirectional',
      });

      // Log sync
      await this.logSync({
        connectionId,
        requirementId,
        jiraIssueKey: issue.key,
        operation: 'import',
        status: 'success',
        direction: 'from_jira',
      });

      logger.info(
        { connectionId, issueKey, requirementId },
        'Issue imported successfully'
      );

      return {
        success: true,
        requirementId,
        jiraIssueKey: issue.key,
        operation: 'import',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error({ error, connectionId, issueKey }, 'Failed to import issue');

      await this.logSync({
        connectionId,
        jiraIssueKey: issueKey,
        operation: 'import',
        status: 'failed',
        direction: 'from_jira',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        jiraIssueKey: issueKey,
        operation: 'import',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  // ============================================================================
  // Database Operations
  // ============================================================================

  /**
   * Create issue mapping
   */
  private async createIssueMapping(
    data: Omit<JiraIssueMapping, 'id' | 'lastSyncedAt' | 'createdAt' | 'updatedAt'>
  ): Promise<JiraIssueMapping> {
    const now = new Date();
    const id = `jira_mapping_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const query = `
      INSERT INTO jira_issue_mappings (
        id, connection_id, requirement_id, jira_issue_id, jira_issue_key,
        jira_project_key, sync_enabled, sync_direction, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      data.connectionId,
      data.requirementId,
      data.jiraIssueId,
      data.jiraIssueKey,
      data.jiraProjectKey,
      data.syncEnabled,
      data.syncDirection,
      now,
      now,
    ]);

    return this.mapRowToIssueMapping(result.rows[0]);
  }

  /**
   * Log sync operation
   */
  private async logSync(
    data: Omit<JiraSyncLog, 'id' | 'createdAt' | 'metadata' | 'changesApplied'>
  ): Promise<JiraSyncLog> {
    const now = new Date();
    const id = `jira_sync_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const query = `
      INSERT INTO jira_sync_log (
        id, connection_id, requirement_id, jira_issue_key, operation,
        status, direction, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      data.connectionId,
      data.requirementId || null,
      data.jiraIssueKey || null,
      data.operation,
      data.status,
      data.direction,
      data.errorMessage || null,
      now,
    ]);

    return this.mapRowToSyncLog(result.rows[0]);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Convert text to Atlassian Document Format (ADF)
   */
  private convertToADF(text: string): any {
    // Simple conversion - in production, use a proper ADF converter
    return {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text,
            },
          ],
        },
      ],
    };
  }

  /**
   * Convert ADF to plain text
   */
  private convertFromADF(adf: any): string {
    if (!adf || typeof adf === 'string') {
      return adf || '';
    }

    // Simple extraction - in production, use a proper ADF parser
    try {
      return JSON.stringify(adf);
    } catch {
      return '';
    }
  }

  /**
   * Map Conductor priority to Jira priority ID
   */
  private mapPriority(priority: string): string {
    const mapping: Record<string, string> = {
      critical: '1',
      high: '2',
      medium: '3',
      low: '4',
    };

    return mapping[priority.toLowerCase()] || '3';
  }

  /**
   * Map Jira priority to Conductor priority
   */
  private unmapPriority(jiraPriority: string): string {
    const mapping: Record<string, string> = {
      highest: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
      lowest: 'low',
    };

    return mapping[jiraPriority.toLowerCase()] || 'medium';
  }

  /**
   * Handle Axios errors
   */
  private handleApiError(error: unknown, context: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data as any;

      let message = context;

      if (data?.errorMessages?.length > 0) {
        message += `: ${data.errorMessages.join(', ')}`;
      } else if (data?.errors) {
        message += `: ${JSON.stringify(data.errors)}`;
      } else if (axiosError.message) {
        message += `: ${axiosError.message}`;
      }

      if (status === 429) {
        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.RATE_LIMIT_EXCEEDED,
          'Jira API rate limit exceeded',
          data
        );
      }

      throw new JiraIntegrationError(
        JiraIntegrationErrorCode.API_REQUEST_FAILED,
        message,
        data
      );
    }

    return error instanceof Error ? error : new Error(context);
  }

  /**
   * Map database row to JiraIssueMapping
   */
  private mapRowToIssueMapping(row: any): JiraIssueMapping {
    return {
      id: row.id,
      connectionId: row.connection_id,
      requirementId: row.requirement_id,
      jiraIssueId: row.jira_issue_id,
      jiraIssueKey: row.jira_issue_key,
      jiraProjectKey: row.jira_project_key,
      syncEnabled: row.sync_enabled,
      lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
      syncDirection: row.sync_direction,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to JiraSyncLog
   */
  private mapRowToSyncLog(row: any): JiraSyncLog {
    return {
      id: row.id,
      connectionId: row.connection_id,
      requirementId: row.requirement_id,
      jiraIssueKey: row.jira_issue_key,
      operation: row.operation,
      status: row.status,
      direction: row.direction,
      changesApplied: row.changes_applied,
      errorMessage: row.error_message,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
    };
  }

  // Stub methods for requirement operations (to be integrated with RequirementsService)
  private async getRequirement(requirementId: string): Promise<any> {
    // TODO: Integrate with RequirementsService
    return {
      id: requirementId,
      title: 'Stub Requirement',
      description: 'This is a stub requirement',
      priority: 'medium',
      tags: [],
    };
  }

  private async createRequirement(data: any): Promise<string> {
    // TODO: Integrate with RequirementsService
    return `REQ-${Date.now()}`;
  }
}

export default JiraService;
