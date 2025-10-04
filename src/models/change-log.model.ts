/**
 * Change Log Model
 * Tracks all changes, their reasons, and impacts throughout the project lifecycle
 */

/**
 * Change category types
 */
export interface ChangeCategory {
  SCOPE: 'scope';
  TIMELINE: 'timeline';
  BUDGET: 'budget';
  TECHNICAL: 'technical';
  PROCESS: 'process';
}

export const CHANGE_CATEGORY: ChangeCategory = {
  SCOPE: 'scope',
  TIMELINE: 'timeline',
  BUDGET: 'budget',
  TECHNICAL: 'technical',
  PROCESS: 'process',
} as const;

export type ChangeCategoryType = ChangeCategory[keyof ChangeCategory];

/**
 * Change phase types
 */
export interface ChangePhase {
  PUSHED_TO_PHASE_2: 'pushed_to_phase_2';
  SIMPLIFIED: 'simplified';
  REMOVED: 'removed';
  ADDED: 'added';
  MODIFIED: 'modified';
}

export const CHANGE_PHASE: ChangePhase = {
  PUSHED_TO_PHASE_2: 'pushed_to_phase_2',
  SIMPLIFIED: 'simplified',
  REMOVED: 'removed',
  ADDED: 'added',
  MODIFIED: 'modified',
} as const;

export type ChangePhaseType = ChangePhase[keyof ChangePhase];

/**
 * Document types for versioning
 */
export interface DocumentTypes {
  BRD: 'BRD';
  PRD: 'PRD';
  ENGINEERING_DESIGN: 'EngineeringDesign';
}

export const DOCUMENT_TYPES: DocumentTypes = {
  BRD: 'BRD',
  PRD: 'PRD',
  ENGINEERING_DESIGN: 'EngineeringDesign',
} as const;

export type DocumentType = DocumentTypes[keyof DocumentTypes];

/**
 * Approval record for change log
 */
export interface ChangeApproval {
  stakeholderId: string;
  decision: 'approved' | 'rejected' | 'pending';
  comments?: string | undefined;
  timestamp: Date;
}

/**
 * Document version snapshot
 */
export interface DocumentVersion {
  documentType: DocumentType;
  documentId: string;
  version: number;
  snapshot: any; // Full document state - using 'any' as per requirement
}

/**
 * Base Change Log Entry interface
 */
export interface BaseChangeLogEntry {
  id: string;
  projectId: string;
  item: string; // What changed
  change: string; // What happened
  reason: string; // Why it changed
  impact: string; // Effect of the change
  category: ChangeCategoryType;
  phase: ChangePhaseType;
  approvedBy: ChangeApproval[];
  relatedConflictId?: string | undefined;
  documentsBefore: DocumentVersion[];
  documentsAfter: DocumentVersion[];
  timestamp: Date;
  createdBy: string;
}

/**
 * Change Log Entry with computed fields
 */
export interface ChangeLogEntry extends BaseChangeLogEntry {
  // Additional computed fields for API responses
  createdByUser?: {
    id: string;
    username: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
  } | undefined;
  relatedConflict?: {
    id: string;
    title: string;
    type: string;
    status: string;
  } | undefined;
  isApproved?: boolean | undefined;
  approvalCount?: number | undefined;
  rejectionCount?: number | undefined;
}

/**
 * Request to create a change log entry
 */
export interface CreateChangeLogRequest {
  projectId: string;
  item: string;
  change: string;
  reason: string;
  impact: string;
  category: ChangeCategoryType;
  phase: ChangePhaseType;
  relatedConflictId?: string | undefined;
  documentsBefore: DocumentVersion[];
  documentsAfter: DocumentVersion[];
}

/**
 * Request to update a change log entry
 */
export interface UpdateChangeLogRequest {
  item?: string | undefined;
  change?: string | undefined;
  reason?: string | undefined;
  impact?: string | undefined;
  category?: ChangeCategoryType | undefined;
  phase?: ChangePhaseType | undefined;
}

/**
 * Request to add approval to change log
 */
export interface ApproveChangeRequest {
  stakeholderId: string;
  decision: 'approved' | 'rejected';
  comments?: string | undefined;
}

/**
 * Change log filters for querying
 */
export interface ChangeLogFilters {
  projectId?: string | undefined;
  category?: ChangeCategoryType[] | undefined;
  phase?: ChangePhaseType[] | undefined;
  createdBy?: string | undefined;
  relatedConflictId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  isApproved?: boolean | undefined;
  search?: string | undefined; // searches item, change, reason, and impact
}

/**
 * Change log summary statistics
 */
export interface ChangeLogSummary {
  total: number;
  byCategory: Record<ChangeCategoryType, number>;
  byPhase: Record<ChangePhaseType, number>;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  changesThisWeek: number;
  changesThisMonth: number;
  mostActiveCategory: ChangeCategoryType;
  mostCommonPhase: ChangePhaseType;
}

/**
 * Document comparison result
 */
export interface DocumentComparison {
  documentType: DocumentType;
  documentId: string;
  versionBefore: number;
  versionAfter: number;
  changes: Array<{
    field: string;
    valueBefore: any;
    valueAfter: any;
    changeType: 'added' | 'modified' | 'removed';
  }>;
}

/**
 * Change impact analysis
 */
export interface ChangeImpactAnalysis {
  changeLogId: string;
  item: string;
  category: ChangeCategoryType;
  phase: ChangePhaseType;
  directImpacts: string[];
  indirectImpacts: string[];
  affectedDocuments: string[];
  affectedStakeholders: string[];
  estimatedEffort?: number | undefined; // hours
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Change timeline entry
 */
export interface ChangeTimelineEntry {
  timestamp: Date;
  item: string;
  change: string;
  category: ChangeCategoryType;
  phase: ChangePhaseType;
  impact: string;
}

/**
 * Project change history
 */
export interface ProjectChangeHistory {
  projectId: string;
  totalChanges: number;
  timeline: ChangeTimelineEntry[];
  summary: ChangeLogSummary;
  majorMilestones: Array<{
    date: Date;
    description: string;
    changesCount: number;
  }>;
}

// WebSocket event types for real-time updates
export const CHANGE_LOG_EVENTS = {
  CREATED: 'change:logged',
  UPDATED: 'change:updated',
  APPROVED: 'change:approved',
  REJECTED: 'change:rejected',
  IMPACT_ANALYZED: 'change:impact_analyzed',
} as const;

export type ChangeLogEventType = typeof CHANGE_LOG_EVENTS[keyof typeof CHANGE_LOG_EVENTS];
