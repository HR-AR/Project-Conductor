/**
 * Review Model - TypeScript interfaces for review and approval workflow
 */

export interface ReviewDecision {
  APPROVED: 'approved';
  REJECTED: 'rejected';
  CHANGES_REQUESTED: 'changes_requested';
}

export const REVIEW_DECISION: ReviewDecision = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes_requested',
} as const;

export type ReviewDecisionType = ReviewDecision[keyof ReviewDecision];

export interface ReviewStatus {
  PENDING: 'pending';
  APPROVED: 'approved';
  REJECTED: 'rejected';
  CHANGES_REQUESTED: 'changes_requested';
}

export const REVIEW_STATUS: ReviewStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes_requested',
} as const;

export type ReviewStatusType = ReviewStatus[keyof ReviewStatus];

export interface BaseReview {
  id: string;
  requirementId: string;
  reviewerId: string;
  status: ReviewStatusType;
  decision: ReviewDecisionType | null;
  comments: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review extends BaseReview {
  // Additional computed fields for API responses
  reviewer?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  requirement?: {
    id: string;
    title: string;
    status: string;
  };
}

export interface CreateReviewRequest {
  reviewerId: string;
  comments?: string;
}

export interface SubmitReviewRequest {
  decision: ReviewDecisionType;
  comments: string;
}

export interface ReviewSummary {
  requirementId: string;
  totalReviews: number;
  approved: number;
  rejected: number;
  changesRequested: number;
  pending: number;
  canApprove: boolean; // Based on workflow rules
  canReject: boolean;
  canRequestChanges: boolean;
  overallStatus: 'pending' | 'approved' | 'rejected' | 'changes_requested';
}

export interface ReviewFilters {
  requirementId?: string;
  reviewerId?: string;
  status?: ReviewStatusType[];
  decision?: ReviewDecisionType[];
  createdFrom?: string;
  createdTo?: string;
}

export interface WorkflowTransition {
  from: string;
  to: string;
  condition: (reviews: Review[]) => boolean;
  description: string;
}

export interface WorkflowRule {
  requirementStatus: string;
  allowedTransitions: string[];
  reviewRequired: boolean;
  approvalThreshold?: number; // Number of approvals required
  blockOnRejection?: boolean; // Block if any rejection exists
}

// Workflow configuration
export const WORKFLOW_RULES: Record<string, WorkflowRule> = {
  'draft': {
    requirementStatus: 'draft',
    allowedTransitions: ['under_review'],
    reviewRequired: false,
  },
  'under_review': {
    requirementStatus: 'under_review',
    allowedTransitions: ['approved', 'rejected', 'changes_requested', 'draft'],
    reviewRequired: true,
    approvalThreshold: 1,
    blockOnRejection: true,
  },
  'approved': {
    requirementStatus: 'approved',
    allowedTransitions: ['active', 'archived'],
    reviewRequired: false,
  },
  'rejected': {
    requirementStatus: 'rejected',
    allowedTransitions: ['draft'],
    reviewRequired: false,
  },
  'changes_requested': {
    requirementStatus: 'changes_requested',
    allowedTransitions: ['draft'],
    reviewRequired: false,
  },
  'active': {
    requirementStatus: 'active',
    allowedTransitions: ['completed', 'cancelled', 'archived'],
    reviewRequired: false,
  },
  'completed': {
    requirementStatus: 'completed',
    allowedTransitions: ['archived'],
    reviewRequired: false,
  },
  'cancelled': {
    requirementStatus: 'cancelled',
    allowedTransitions: ['archived'],
    reviewRequired: false,
  },
  'archived': {
    requirementStatus: 'archived',
    allowedTransitions: [],
    reviewRequired: false,
  },
};

export interface ReviewHistoryEntry {
  id: string;
  reviewId: string;
  requirementId: string;
  reviewerId: string;
  action: 'created' | 'submitted' | 'updated';
  previousStatus?: ReviewStatusType;
  newStatus: ReviewStatusType;
  decision?: ReviewDecisionType;
  comments?: string;
  createdAt: Date;
}