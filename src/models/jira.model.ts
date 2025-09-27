/**
 * Jira Integration Models
 */

// Jira issue types that can be linked to requirements
export type JiraIssueType = 'Story' | 'Epic' | 'Bug' | 'Task' | 'Sub-task';

// Jira issue priority levels
export type JiraPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

// Jira issue status
export type JiraStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Closed';

// Jira field mapping configuration
export interface JiraFieldMapping {
  requirementId?: string;
  jiraField: string;
  conductorField: string;
  transformFunction?: string;
  bidirectional: boolean;
}

// Jira project configuration
export interface JiraProjectConfig {
  projectKey: string;
  projectName: string;
  issueTypes: JiraIssueType[];
  customFields: Record<string, string>;
  fieldMappings: JiraFieldMapping[];
  webhookUrl?: string;
  active: boolean;
}

// Jira issue representation
export interface JiraIssue {
  key: string;
  id: string;
  projectKey: string;
  issueType: JiraIssueType;
  summary: string;
  description?: string;
  priority: JiraPriority;
  status: JiraStatus;
  assignee?: {
    accountId: string;
    displayName: string;
    email: string;
  };
  reporter: {
    accountId: string;
    displayName: string;
    email: string;
  };
  created: Date;
  updated: Date;
  dueDate?: Date;
  labels: string[];
  customFields: Record<string, any>;
  linkedRequirementId?: string;
}

// Jira export request
export interface JiraExportRequest {
  requirementId: string;
  projectKey: string;
  issueType: JiraIssueType;
  fieldMappings?: JiraFieldMapping[];
  linkBack: boolean;
  createEpic?: boolean;
}

// Jira export response
export interface JiraExportResponse {
  success: boolean;
  jiraKey?: string;
  jiraId?: string;
  jiraUrl?: string;
  linkedRequirementId?: string;
  error?: string;
  details?: any;
}

// Jira import request
export interface JiraImportRequest {
  jiraKey: string;
  createAsRequirement: boolean;
  projectId?: string;
  fieldMappings?: JiraFieldMapping[];
  importAttachments?: boolean;
  importComments?: boolean;
}

// Jira sync status
export interface JiraSyncStatus {
  requirementId: string;
  jiraKey: string;
  lastSyncedAt: Date;
  syncDirection: 'conductor_to_jira' | 'jira_to_conductor' | 'bidirectional';
  status: 'synced' | 'pending' | 'conflict' | 'error';
  conflictDetails?: string[];
  nextSyncScheduled?: Date;
}

// Jira webhook payload
export interface JiraWebhookPayload {
  timestamp: number;
  webhookEvent: string;
  issue?: {
    key: string;
    fields: Record<string, any>;
  };
  changelog?: {
    items: Array<{
      field: string;
      fromString: string;
      toString: string;
    }>;
  };
}

// Jira connection settings
export interface JiraConnectionSettings {
  baseUrl: string;
  email: string;
  apiToken: string;
  cloudId?: string;
  projects: JiraProjectConfig[];
  syncEnabled: boolean;
  syncInterval: number; // in minutes
  webhookSecret?: string;
}

// Jira sync configuration
export interface JiraSyncConfig {
  autoSync: boolean;
  syncInterval: number;
  conflictResolution: 'conductor_wins' | 'jira_wins' | 'manual';
  fieldMappings: JiraFieldMapping[];
  includeComments: boolean;
  includeAttachments: boolean;
  syncOnCreate: boolean;
  syncOnUpdate: boolean;
  syncOnDelete: boolean;
}

// Jira bulk export request
export interface JiraBulkExportRequest {
  requirementIds: string[];
  projectKey: string;
  issueType: JiraIssueType;
  epicKey?: string;
  fieldMappings?: JiraFieldMapping[];
  linkBack: boolean;
}

// Jira bulk export response
export interface JiraBulkExportResponse {
  totalRequirements: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    requirementId: string;
    success: boolean;
    jiraKey?: string;
    error?: string;
  }>;
}