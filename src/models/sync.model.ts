/**
 * Sync Models and Types
 * Defines all types for bi-directional synchronization between Jira and BRDs
 */

// Sync job status
export enum SyncJobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

// Sync direction
export enum SyncDirection {
  JIRA_TO_BRD = 'jira_to_brd',
  BRD_TO_JIRA = 'brd_to_jira',
  BIDIRECTIONAL = 'bidirectional',
}

// Sync operation type
export enum SyncOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  BULK_IMPORT = 'bulk_import',
  BULK_EXPORT = 'bulk_export',
  SCHEDULED_SYNC = 'scheduled_sync',
  WEBHOOK_SYNC = 'webhook_sync',
}

// Conflict resolution strategy
export enum ConflictResolutionStrategy {
  KEEP_LOCAL = 'keep_local',
  KEEP_REMOTE = 'keep_remote',
  MERGE = 'merge',
  MANUAL = 'manual',
}

// Conflict type
export enum ConflictType {
  FIELD_CHANGE = 'field_change',
  STATUS_MISMATCH = 'status_mismatch',
  DELETION = 'deletion',
  CONCURRENT_MODIFICATION = 'concurrent_modification',
}

// Sync job interface
export interface SyncJob {
  id: string;
  direction: SyncDirection;
  operationType: SyncOperationType;
  status: SyncJobStatus;
  progress: number; // 0-100
  totalItems: number;
  processedItems: number;
  failedItems: number;
  brdIds?: string[];
  jiraKeys?: string[];
  epicKey?: string;
  projectKey?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, any>;
}

// Sync mapping (BRD <-> Jira Epic)
export interface SyncMapping {
  id: string;
  brdId: string;
  jiraKey: string;
  jiraId: string;
  jiraEpicName?: string;
  lastSyncedAt: Date;
  lastModifiedLocal: Date;
  lastModifiedRemote: Date;
  syncEnabled: boolean;
  autoSync: boolean;
  conflictCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Field mapping definition
export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  direction: SyncDirection;
  transformFunction?: string;
  isCustomField: boolean;
  jiraFieldId?: string; // e.g., customfield_10011
  defaultValue?: any;
  required: boolean;
  active: boolean;
}

// Conflict record
export interface SyncConflict {
  id: string;
  syncJobId?: string;
  mappingId: string;
  brdId: string;
  jiraKey: string;
  conflictType: ConflictType;
  field: string;
  baseValue: any;
  localValue: any;
  remoteValue: any;
  resolutionStrategy?: ConflictResolutionStrategy;
  resolvedValue?: any;
  resolvedBy?: string;
  resolvedAt?: Date;
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: Date;
  metadata?: Record<string, any>;
}

// Field change diff
export interface FieldDiff {
  field: string;
  baseValue: any;
  localValue: any;
  remoteValue: any;
  hasConflict: boolean;
  conflictType?: ConflictType;
}

// Sync result
export interface SyncResult {
  success: boolean;
  jobId: string;
  direction: SyncDirection;
  processedItems: number;
  failedItems: number;
  conflictCount: number;
  conflicts?: SyncConflict[];
  error?: string;
  details?: {
    created: number;
    updated: number;
    skipped: number;
    failed: string[];
  };
}

// Jira Epic data structure
export interface JiraEpic {
  key: string;
  id: string;
  summary: string;
  description?: string;
  status: string;
  epicName?: string; // customfield_10011
  storyPoints?: number; // customfield_10014
  reporter: {
    accountId: string;
    displayName: string;
    email: string;
  };
  assignee?: {
    accountId: string;
    displayName: string;
    email: string;
  };
  created: string; // ISO date
  updated: string; // ISO date
  dueDate?: string; // ISO date
  labels: string[];
  watchers?: string[];
  customFields?: Record<string, any>;
}

// BRD sync data (subset for sync operations)
export interface BRDSyncData {
  id: string;
  title: string;
  problemStatement: string;
  businessImpact: string;
  successCriteria: string[];
  timeline: {
    startDate: Date;
    targetDate: Date;
  };
  budget: number;
  stakeholders: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    isOwner: boolean;
  }>;
  status: string;
  version: number;
  approvals: Array<{
    stakeholderId: string;
    decision: string;
    comments?: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Sync job create request
export interface CreateSyncJobRequest {
  direction: SyncDirection;
  operationType: SyncOperationType;
  brdIds?: string[];
  jiraKeys?: string[];
  epicKey?: string;
  projectKey?: string;
  autoResolveConflicts?: boolean;
  conflictStrategy?: ConflictResolutionStrategy;
  fieldMappings?: FieldMapping[];
}

// Sync job update request
export interface UpdateSyncJobRequest {
  status?: SyncJobStatus;
  progress?: number;
  processedItems?: number;
  failedItems?: number;
  error?: string;
}

// Conflict resolution request
export interface ResolveConflictRequest {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedValue?: any;
  applyToSimilar?: boolean;
}

// Sync status response
export interface SyncStatusResponse {
  job: SyncJob;
  conflicts?: SyncConflict[];
  mapping?: SyncMapping;
  logs?: string[];
}

// Sync history entry
export interface SyncHistoryEntry {
  id: string;
  jobId: string;
  timestamp: Date;
  action: string;
  details: Record<string, any>;
  performedBy?: string;
}

// Bulk sync request
export interface BulkSyncRequest {
  direction: SyncDirection;
  projectKey: string;
  epicKey?: string;
  brdIds?: string[];
  jiraKeys?: string[];
  createMissing?: boolean;
  updateExisting?: boolean;
  autoResolveConflicts?: boolean;
  conflictStrategy?: ConflictResolutionStrategy;
}

// Bulk sync response
export interface BulkSyncResponse {
  jobId: string;
  totalItems: number;
  successful: Array<{
    brdId?: string;
    jiraKey?: string;
    action: 'created' | 'updated' | 'skipped';
  }>;
  failed: Array<{
    brdId?: string;
    jiraKey?: string;
    error: string;
  }>;
  conflicts: SyncConflict[];
}

// Sync configuration
export interface SyncConfiguration {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // minutes
  conflictStrategy: ConflictResolutionStrategy;
  retryAttempts: number;
  retryDelay: number; // seconds
  batchSize: number;
  fieldMappings: FieldMapping[];
  webhookEnabled: boolean;
  webhookUrl?: string;
  jiraProjectKey: string;
}

// Webhook sync request
export interface WebhookSyncRequest {
  webhookEvent: string;
  issueKey: string;
  issueId: string;
  changelog?: Array<{
    field: string;
    fromString: string;
    toString: string;
  }>;
  timestamp: number;
}

// Field mapping preset (common mappings)
export const DEFAULT_FIELD_MAPPINGS: FieldMapping[] = [
  {
    id: 'map-title-summary',
    sourceField: 'title',
    targetField: 'summary',
    direction: SyncDirection.BIDIRECTIONAL,
    isCustomField: false,
    required: true,
    active: true,
  },
  {
    id: 'map-problem-description',
    sourceField: 'problemStatement',
    targetField: 'description',
    direction: SyncDirection.BIDIRECTIONAL,
    isCustomField: false,
    required: false,
    active: true,
  },
  {
    id: 'map-status',
    sourceField: 'status',
    targetField: 'status',
    direction: SyncDirection.BIDIRECTIONAL,
    transformFunction: 'mapBRDStatusToJira',
    isCustomField: false,
    required: true,
    active: true,
  },
  {
    id: 'map-epicname',
    sourceField: 'title',
    targetField: 'customfield_10011', // Epic Name
    direction: SyncDirection.BRD_TO_JIRA,
    isCustomField: true,
    jiraFieldId: 'customfield_10011',
    required: false,
    active: true,
  },
  {
    id: 'map-storypoints',
    sourceField: 'budget',
    targetField: 'customfield_10014', // Story Points (approximate)
    direction: SyncDirection.BRD_TO_JIRA,
    transformFunction: 'budgetToStoryPoints',
    isCustomField: true,
    jiraFieldId: 'customfield_10014',
    required: false,
    active: false, // disabled by default
  },
  {
    id: 'map-reporter',
    sourceField: 'createdBy',
    targetField: 'reporter',
    direction: SyncDirection.BRD_TO_JIRA,
    transformFunction: 'userIdToJiraAccountId',
    isCustomField: false,
    required: false,
    active: true,
  },
  {
    id: 'map-created',
    sourceField: 'createdAt',
    targetField: 'created',
    direction: SyncDirection.JIRA_TO_BRD,
    isCustomField: false,
    required: false,
    active: true,
  },
  {
    id: 'map-updated',
    sourceField: 'updatedAt',
    targetField: 'updated',
    direction: SyncDirection.BIDIRECTIONAL,
    isCustomField: false,
    required: false,
    active: true,
  },
];

// Status mapping between BRD and Jira
export const BRD_TO_JIRA_STATUS_MAP: Record<string, string> = {
  draft: 'To Do',
  under_review: 'In Review',
  approved: 'Done',
  rejected: 'Closed',
};

export const JIRA_TO_BRD_STATUS_MAP: Record<string, string> = {
  'To Do': 'draft',
  'In Progress': 'under_review',
  'In Review': 'under_review',
  'Done': 'approved',
  'Closed': 'rejected',
};

// Sync events for WebSocket
export const SYNC_EVENTS = {
  JOB_CREATED: 'sync:job_created',
  JOB_STARTED: 'sync:job_started',
  JOB_PROGRESS: 'sync:job_progress',
  JOB_COMPLETED: 'sync:job_completed',
  JOB_FAILED: 'sync:job_failed',
  CONFLICT_DETECTED: 'sync:conflict_detected',
  CONFLICT_RESOLVED: 'sync:conflict_resolved',
} as const;

export type SyncEventType = typeof SYNC_EVENTS[keyof typeof SYNC_EVENTS];
