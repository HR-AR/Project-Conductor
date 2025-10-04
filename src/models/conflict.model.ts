/**
 * Conflict Resolution Model
 * Represents conflicts, discussions, and resolutions in the project workflow
 */

/**
 * Conflict types
 */
export interface ConflictTypes {
  TIMELINE: 'timeline';
  BUDGET: 'budget';
  SCOPE: 'scope';
  TECHNICAL: 'technical';
}

export const CONFLICT_TYPES: ConflictTypes = {
  TIMELINE: 'timeline',
  BUDGET: 'budget',
  SCOPE: 'scope',
  TECHNICAL: 'technical',
} as const;

export type ConflictType = ConflictTypes[keyof ConflictTypes];

/**
 * Conflict severity levels
 */
export interface ConflictSeverity {
  LOW: 'low';
  MEDIUM: 'medium';
  HIGH: 'high';
  CRITICAL: 'critical';
}

export const CONFLICT_SEVERITY: ConflictSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ConflictSeverityType = ConflictSeverity[keyof ConflictSeverity];

/**
 * User role types in conflict resolution
 */
export interface UserRoleTypes {
  BUSINESS: 'business';
  PRODUCT: 'product';
  ENGINEERING: 'engineering';
  TPM: 'tpm';
}

export const USER_ROLE_TYPES: UserRoleTypes = {
  BUSINESS: 'business',
  PRODUCT: 'product',
  ENGINEERING: 'engineering',
  TPM: 'tpm',
} as const;

export type UserRoleType = UserRoleTypes[keyof UserRoleTypes];

/**
 * Conflict status types
 */
export interface ConflictStatus {
  OPEN: 'open';
  DISCUSSING: 'discussing';
  RESOLVED: 'resolved';
  CLOSED: 'closed';
}

export const CONFLICT_STATUS: ConflictStatus = {
  OPEN: 'open',
  DISCUSSING: 'discussing',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export type ConflictStatusType = ConflictStatus[keyof ConflictStatus];

/**
 * Document types that can be affected by conflicts
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
 * Discussion comment in conflict resolution
 */
export interface DiscussionComment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRoleType;
  comment: string;
  timestamp: Date;
}

/**
 * Vote on a resolution option
 */
export interface Vote {
  userId: string;
  userName: string;
  userRole: string;
  timestamp: Date;
}

/**
 * Resolution option for conflict
 */
export interface ResolutionOption {
  id: string;
  description: string;
  impact: string;
  pros: string[];
  cons: string[];
  votes: Vote[];
}

/**
 * Document update record
 */
export interface DocumentUpdate {
  documentType: DocumentType;
  documentId: string;
  changes: string;
  version: number;
}

/**
 * Conflict resolution details
 */
export interface Resolution {
  selectedOptionId: string;
  decision: string;
  approvedBy: Array<{
    stakeholderId: string;
    decision: 'approved' | 'rejected' | 'pending';
    comments?: string | undefined;
    timestamp: Date;
  }>;
  documentsUpdated: DocumentUpdate[];
  implementedAt: Date;
}

/**
 * Affected documents reference
 */
export interface AffectedDocuments {
  brdId?: string | undefined;
  prdId?: string | undefined;
  designId?: string | undefined;
}

/**
 * Base Conflict interface
 */
export interface BaseConflict {
  id: string;
  type: ConflictType;
  title: string;
  description: string;
  severity: ConflictSeverityType;
  raisedBy: string; // User ID or team name
  raisedByRole: UserRoleType;
  affectedDocuments: AffectedDocuments;
  affectedItems: string[]; // Requirement/feature IDs
  discussion: DiscussionComment[];
  options: ResolutionOption[];
  resolution?: Resolution | undefined;
  status: ConflictStatusType;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Conflict with computed fields
 */
export interface Conflict extends BaseConflict {
  // Additional computed fields for API responses
  raisedByUser?: {
    id: string;
    username: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
  } | undefined;
  totalComments?: number | undefined;
  totalOptions?: number | undefined;
  mostVotedOption?: ResolutionOption | undefined;
  participantCount?: number | undefined;
}

/**
 * Request to create a conflict
 */
export interface CreateConflictRequest {
  type: ConflictType;
  title: string;
  description: string;
  severity: ConflictSeverityType;
  raisedBy: string;
  raisedByRole: UserRoleType;
  affectedDocuments: AffectedDocuments;
  affectedItems: string[];
}

/**
 * Request to update a conflict
 */
export interface UpdateConflictRequest {
  title?: string | undefined;
  description?: string | undefined;
  severity?: ConflictSeverityType | undefined;
  status?: ConflictStatusType | undefined;
  affectedItems?: string[] | undefined;
}

/**
 * Request to add a discussion comment
 */
export interface AddCommentRequest {
  userId: string;
  userName: string;
  userRole: UserRoleType;
  comment: string;
}

/**
 * Request to add a resolution option
 */
export interface AddResolutionOptionRequest {
  description: string;
  impact: string;
  pros: string[];
  cons: string[];
}

/**
 * Request to vote on a resolution option
 */
export interface VoteOnOptionRequest {
  optionId: string;
  userId: string;
  userName: string;
  userRole: string;
}

/**
 * Request to resolve a conflict
 */
export interface ResolveConflictRequest {
  selectedOptionId: string;
  decision: string;
  approvedBy: Array<{
    stakeholderId: string;
    decision: 'approved' | 'rejected' | 'pending';
    comments?: string | undefined;
  }>;
  documentsUpdated: Omit<DocumentUpdate, 'version'>[];
}

/**
 * Conflict filters for querying
 */
export interface ConflictFilters {
  status?: ConflictStatusType[] | undefined;
  type?: ConflictType[] | undefined;
  severity?: ConflictSeverityType[] | undefined;
  raisedBy?: string | undefined;
  raisedByRole?: UserRoleType[] | undefined;
  brdId?: string | undefined;
  prdId?: string | undefined;
  designId?: string | undefined;
  hasResolution?: boolean | undefined;
  search?: string | undefined; // searches title and description
}

/**
 * Conflict summary statistics
 */
export interface ConflictSummary {
  total: number;
  byStatus: Record<ConflictStatusType, number>;
  byType: Record<ConflictType, number>;
  bySeverity: Record<ConflictSeverityType, number>;
  byRole: Record<UserRoleType, number>;
  avgResolutionTime: number; // in hours
  totalComments: number;
  totalOptions: number;
  resolvedThisMonth: number;
}

/**
 * Conflict resolution analytics
 */
export interface ConflictResolutionAnalytics {
  conflictId: string;
  timeToResolve?: number | undefined; // in hours
  commentCount: number;
  optionCount: number;
  voteCount: number;
  participantCount: number;
  participantsByRole: Record<UserRoleType, number>;
  winningOptionVotes: number;
  consensusPercentage: number;
}

// WebSocket event types for real-time updates
export const CONFLICT_EVENTS = {
  CREATED: 'conflict:created',
  UPDATED: 'conflict:updated',
  COMMENT_ADDED: 'conflict:comment',
  OPTION_ADDED: 'conflict:option_added',
  VOTE_CAST: 'conflict:vote_cast',
  RESOLVED: 'conflict:resolved',
  CLOSED: 'conflict:closed',
} as const;

export type ConflictEventType = typeof CONFLICT_EVENTS[keyof typeof CONFLICT_EVENTS];
