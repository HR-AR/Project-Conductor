/**
 * Jira OAuth 2.0 Integration Models
 *
 * Complete type definitions for Jira Cloud OAuth integration,
 * including OAuth tokens, webhook events, and API resources.
 */

// ============================================================================
// OAuth 2.0 Types
// ============================================================================

/**
 * OAuth 2.0 authorization request parameters
 */
export interface JiraOAuthAuthorizationParams {
  audience: string; // 'api.atlassian.com'
  client_id: string;
  scope: string; // Space-separated scopes
  redirect_uri: string;
  state: string; // CSRF protection token
  response_type: 'code';
  prompt: 'consent'; // Force consent screen
}

/**
 * OAuth 2.0 token exchange request
 */
export interface JiraOAuthTokenRequest {
  grant_type: 'authorization_code' | 'refresh_token';
  client_id: string;
  client_secret: string;
  code?: string; // For authorization_code grant
  refresh_token?: string; // For refresh_token grant
  redirect_uri?: string; // Required for authorization_code grant
}

/**
 * OAuth 2.0 token response from Jira
 */
export interface JiraOAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number; // Seconds until expiry (typically 3600)
  refresh_token: string;
  scope: string;
}

/**
 * Stored OAuth connection in database
 */
export interface JiraConnection {
  id: string;
  userId: string; // User who authorized the connection
  cloudId: string; // Atlassian cloud ID
  siteUrl: string; // e.g., 'https://yoursite.atlassian.net'
  siteName: string; // Display name
  accessToken: string; // Encrypted in database
  refreshToken: string; // Encrypted in database
  tokenExpiresAt: Date;
  scopes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
}

/**
 * OAuth scopes required for Jira integration
 */
export const JIRA_OAUTH_SCOPES = [
  'read:jira-work', // Read issues, projects, etc.
  'write:jira-work', // Create/update issues
  'read:jira-user', // Read user information
  'offline_access', // Refresh token support
] as const;

export type JiraOAuthScope = typeof JIRA_OAUTH_SCOPES[number];

// ============================================================================
// Jira API Resource Types
// ============================================================================

/**
 * Jira Cloud site (accessible resources)
 */
export interface JiraCloudResource {
  id: string; // Cloud ID
  url: string; // Site URL
  name: string; // Site name
  scopes: string[];
  avatarUrl: string;
}

/**
 * Jira Project
 */
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: 'software' | 'business' | 'service_desk';
  simplified: boolean;
  style: 'classic' | 'next-gen';
  isPrivate: boolean;
  lead: {
    accountId: string;
    displayName: string;
    avatarUrls: Record<string, string>;
  };
  description?: string;
  url: string;
}

/**
 * Jira Epic
 */
export interface JiraEpic {
  id: string;
  key: string;
  summary: string;
  status: {
    id: string;
    name: string;
    statusCategory: {
      key: string;
      colorName: string;
    };
  };
  color: {
    key: string;
  };
  done: boolean;
}

/**
 * Jira Issue (Story, Task, Bug, etc.)
 */
export interface JiraIssue {
  id: string;
  key: string;
  self: string; // API URL
  fields: {
    summary: string;
    description?: any; // ADF (Atlassian Document Format) or string
    issuetype: {
      id: string;
      name: string;
      iconUrl: string;
      subtask: boolean;
    };
    project: {
      id: string;
      key: string;
      name: string;
    };
    status: {
      id: string;
      name: string;
      statusCategory: {
        id: number;
        key: string;
        colorName: string;
        name: string;
      };
    };
    priority?: {
      id: string;
      name: string;
      iconUrl: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress?: string;
      avatarUrls: Record<string, string>;
    };
    reporter: {
      accountId: string;
      displayName: string;
      emailAddress?: string;
      avatarUrls: Record<string, string>;
    };
    created: string; // ISO 8601
    updated: string; // ISO 8601
    duedate?: string; // YYYY-MM-DD
    labels: string[];
    parent?: {
      id: string;
      key: string;
      fields: {
        summary: string;
      };
    };
    customfield_10014?: string; // Epic Link (varies by instance)
    [key: string]: any; // Custom fields
  };
}

/**
 * Jira Issue Type
 */
export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  subtask: boolean;
  avatarId?: number;
}

/**
 * Jira User (current user)
 */
export interface JiraUser {
  accountId: string;
  accountType: 'atlassian' | 'app' | 'customer';
  displayName: string;
  emailAddress?: string;
  avatarUrls: Record<string, string>;
  active: boolean;
  timeZone: string;
  locale: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook registration request
 */
export interface JiraWebhookRegistration {
  name: string;
  url: string; // Project Conductor webhook endpoint
  events: JiraWebhookEvent[];
  filters?: {
    issue_related_events_section?: string; // JQL filter
  };
  excludeBody?: boolean;
}

/**
 * Registered webhook response
 */
export interface JiraWebhook {
  id: string;
  name: string;
  url: string;
  events: JiraWebhookEvent[];
  filters?: Record<string, string>;
  excludeBody: boolean;
  enabled: boolean;
  lastUpdated: string; // ISO 8601
}

/**
 * Webhook events we support
 */
export const JIRA_WEBHOOK_EVENTS = [
  'jira:issue_created',
  'jira:issue_updated',
  'jira:issue_deleted',
  'comment_created',
  'comment_updated',
  'comment_deleted',
  'worklog_updated',
] as const;

export type JiraWebhookEvent = typeof JIRA_WEBHOOK_EVENTS[number];

/**
 * Webhook payload structure
 */
export interface JiraWebhookPayload {
  timestamp: number;
  webhookEvent: string;
  issue_event_type_name?: string;
  user: {
    accountId: string;
    displayName: string;
    emailAddress?: string;
  };
  issue?: {
    id: string;
    key: string;
    self: string;
    fields: Record<string, any>;
  };
  changelog?: {
    id: string;
    items: Array<{
      field: string;
      fieldtype: string;
      fieldId?: string;
      from: string | null;
      fromString: string | null;
      to: string | null;
      toString: string | null;
    }>;
  };
  comment?: {
    id: string;
    body: any; // ADF format
    author: {
      accountId: string;
      displayName: string;
    };
    created: string;
    updated: string;
  };
}

/**
 * Stored webhook configuration
 */
export interface JiraWebhookConfig {
  id: string;
  connectionId: string; // References jira_connections.id
  webhookId: string; // Jira webhook ID
  name: string;
  url: string;
  events: JiraWebhookEvent[];
  secret: string; // Webhook signature secret
  isActive: boolean;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Sync & Integration Types
// ============================================================================

/**
 * Sync operation result
 */
export interface JiraSyncResult {
  success: boolean;
  requirementId?: string;
  jiraIssueKey?: string;
  operation: 'import' | 'export' | 'update' | 'link';
  error?: string;
  timestamp: Date;
}

/**
 * Sync log entry
 */
export interface JiraSyncLog {
  id: string;
  connectionId: string;
  requirementId?: string;
  jiraIssueKey?: string;
  operation: 'import' | 'export' | 'update' | 'sync' | 'webhook';
  status: 'success' | 'failed' | 'partial';
  direction: 'to_jira' | 'from_jira' | 'bidirectional';
  changesApplied?: string[]; // List of fields changed
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Issue mapping between Conductor and Jira
 */
export interface JiraIssueMapping {
  id: string;
  connectionId: string;
  requirementId: string;
  jiraIssueId: string;
  jiraIssueKey: string;
  jiraProjectKey: string;
  syncEnabled: boolean;
  lastSyncedAt?: Date;
  syncDirection: 'to_jira' | 'from_jira' | 'bidirectional';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Field mapping configuration
 */
export interface JiraFieldMapping {
  conductorField: string; // e.g., 'title', 'description', 'priority'
  jiraField: string; // e.g., 'summary', 'description', 'priority.name'
  direction: 'to_jira' | 'from_jira' | 'bidirectional';
  transformFunction?: string; // Optional transformation function name
  isRequired: boolean;
  defaultValue?: any;
}

/**
 * Project mapping configuration
 */
export interface JiraProjectMapping {
  id: string;
  connectionId: string;
  conductorProjectId?: string;
  jiraProjectKey: string;
  jiraProjectId: string;
  issueTypeMapping: Record<string, string>; // Conductor type -> Jira issue type ID
  fieldMappings: JiraFieldMapping[];
  autoSync: boolean;
  syncInterval?: number; // Minutes
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Create issue request
 */
export interface JiraCreateIssueRequest {
  fields: {
    project: {
      key: string;
    };
    summary: string;
    description?: any; // ADF format
    issuetype: {
      id: string;
    };
    priority?: {
      id: string;
    };
    labels?: string[];
    parent?: {
      key: string; // For sub-tasks
    };
    duedate?: string; // YYYY-MM-DD
    [key: string]: any; // Custom fields
  };
}

/**
 * Update issue request
 */
export interface JiraUpdateIssueRequest {
  fields?: {
    summary?: string;
    description?: any;
    priority?: {
      id: string;
    };
    labels?: string[];
    [key: string]: any;
  };
  update?: Record<string, Array<{
    set?: any;
    add?: any;
    remove?: any;
  }>>;
}

/**
 * JQL search request
 */
export interface JiraJQLSearchRequest {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
}

/**
 * JQL search response
 */
export interface JiraJQLSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

// ============================================================================
// Integration Configuration
// ============================================================================

/**
 * Jira integration settings
 */
export interface JiraIntegrationConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webhookSecret: string;
  defaultScopes: JiraOAuthScope[];
  apiVersion: '3'; // Jira Cloud REST API version
  rateLimitPerMinute: number;
  syncInterval: number; // Minutes
  autoRegisterWebhooks: boolean;
  encryptionKey: string; // For encrypting tokens
}

/**
 * Connection status
 */
export interface JiraConnectionStatus {
  isConnected: boolean;
  connectionId?: string;
  siteUrl?: string;
  siteName?: string;
  userId?: string;
  scopes?: string[];
  tokenExpiresAt?: Date;
  lastSyncAt?: Date;
  activeWebhooks?: number;
  errorMessage?: string;
}

/**
 * Integration statistics
 */
export interface JiraIntegrationStats {
  totalConnections: number;
  activeConnections: number;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalWebhooks: number;
  activeWebhooks: number;
  lastSyncAt?: Date;
  averageSyncDuration?: number; // Milliseconds
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Jira API error response
 */
export interface JiraAPIError {
  errorMessages: string[];
  errors: Record<string, string>;
}

/**
 * Integration error codes
 */
export enum JiraIntegrationErrorCode {
  OAUTH_FAILED = 'OAUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  CONNECTION_NOT_FOUND = 'CONNECTION_NOT_FOUND',
  WEBHOOK_REGISTRATION_FAILED = 'WEBHOOK_REGISTRATION_FAILED',
  WEBHOOK_VERIFICATION_FAILED = 'WEBHOOK_VERIFICATION_FAILED',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  SYNC_FAILED = 'SYNC_FAILED',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Integration error
 */
export class JiraIntegrationError extends Error {
  constructor(
    public code: JiraIntegrationErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'JiraIntegrationError';
    Object.setPrototypeOf(this, JiraIntegrationError.prototype);
  }
}
