/**
 * Approval Model - Decision Register & Approval Workflow
 * Implements immutable approval tracking system for narratives
 */

/**
 * Approval status types
 */
export interface ApprovalStatus {
  PENDING: 'pending';
  APPROVED: 'approved';
  REJECTED: 'rejected';
  CONDITIONAL: 'conditional';
}

export const APPROVAL_STATUS: ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CONDITIONAL: 'conditional',
} as const;

export type ApprovalStatusType = ApprovalStatus[keyof ApprovalStatus];

/**
 * Vote types for decision making
 */
export interface VoteType {
  APPROVE: 'approve';
  REJECT: 'reject';
  CONDITIONAL: 'conditional';
}

export const VOTE_TYPE: VoteType = {
  APPROVE: 'approve',
  REJECT: 'reject',
  CONDITIONAL: 'conditional',
} as const;

export type VoteTypeValue = VoteType[keyof VoteType];

/**
 * Approval record for a narrative
 */
export interface Approval {
  id: number;
  narrative_id: number;
  narrative_version: number;
  reviewer_id: number;
  status: ApprovalStatusType;
  due_date: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Decision record - immutable append-only log
 */
export interface Decision {
  id: number;
  narrative_id: number;
  narrative_version: number;
  reviewer_id: number;
  vote: VoteTypeValue;
  reasoning: string;
  conditions?: string[] | undefined;
  created_at: Date;
}

/**
 * Create approval request
 */
export interface CreateApprovalRequest {
  narrative_id: number;
  narrative_version: number;
  reviewer_ids: number[];
  due_date: string; // ISO date string
}

/**
 * Vote request
 */
export interface VoteRequest {
  reviewer_id: number;
  vote: VoteTypeValue;
  reasoning: string;
  conditions?: string[] | undefined;
}

/**
 * Approval status response
 */
export interface ApprovalStatusResponse {
  approval_id: number;
  narrative_id: number;
  narrative_version: number;
  status: ApprovalStatusType;
  total_reviewers: number;
  approved_count: number;
  rejected_count: number;
  conditional_count: number;
  pending_count: number;
  all_voted: boolean;
  is_approved: boolean;
  decisions: Decision[];
}

/**
 * Pending approval for a reviewer
 */
export interface PendingApproval {
  approval_id: number;
  narrative_id: number;
  narrative_version: number;
  narrative_title?: string | undefined;
  status: ApprovalStatusType;
  due_date: Date;
  created_at: Date;
  has_voted: boolean;
  vote?: VoteTypeValue | undefined;
}

/**
 * Approval filters
 */
export interface ApprovalFilters {
  narrative_id?: number | undefined;
  reviewer_id?: number | undefined;
  status?: ApprovalStatusType[] | undefined;
  overdue?: boolean | undefined;
}

/**
 * Decision register entry - full history view
 */
export interface DecisionRegisterEntry {
  decision_id: number;
  narrative_id: number;
  narrative_version: number;
  reviewer_id: number;
  reviewer_name?: string | undefined;
  vote: VoteTypeValue;
  reasoning: string;
  conditions?: string[] | undefined;
  created_at: Date;
}

/**
 * Approval initiation response
 */
export interface ApprovalInitiationResponse {
  approval: Approval;
  reviewers: Array<{
    reviewer_id: number;
    status: ApprovalStatusType;
  }>;
  message: string;
}

/**
 * Finalized approval result
 */
export interface FinalizedApprovalResult {
  approval_id: number;
  narrative_id: number;
  final_status: ApprovalStatusType;
  total_reviewers: number;
  approved_count: number;
  rejected_count: number;
  conditional_count: number;
  all_voted: boolean;
  is_approved: boolean;
  conditional_tasks?: string[] | undefined;
}

// WebSocket event types for real-time updates
export const APPROVAL_EVENTS = {
  INITIATED: 'approval:initiated',
  VOTED: 'approval:voted',
  FINALIZED: 'approval:finalized',
  CONDITIONAL_TASK_CREATED: 'approval:conditional_task_created',
} as const;

export type ApprovalEventType = typeof APPROVAL_EVENTS[keyof typeof APPROVAL_EVENTS];
