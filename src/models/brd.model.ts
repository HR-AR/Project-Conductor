/**
 * Business Requirements Document (BRD) Model
 * Represents the initial business requirements phase of the project workflow
 */

/**
 * BRD status types
 */
export interface BRDStatus {
  DRAFT: 'draft';
  UNDER_REVIEW: 'under_review';
  APPROVED: 'approved';
  REJECTED: 'rejected';
}

export const BRD_STATUS: BRDStatus = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type BRDStatusType = BRDStatus[keyof BRDStatus];

/**
 * Department types for stakeholders
 */
export interface DepartmentTypes {
  BUSINESS: 'business';
  PRODUCT: 'product';
  ENGINEERING: 'engineering';
  MARKETING: 'marketing';
  SALES: 'sales';
}

export const DEPARTMENT_TYPES: DepartmentTypes = {
  BUSINESS: 'business',
  PRODUCT: 'product',
  ENGINEERING: 'engineering',
  MARKETING: 'marketing',
  SALES: 'sales',
} as const;

export type DepartmentType = DepartmentTypes[keyof DepartmentTypes];

/**
 * Approval decision types
 */
export interface ApprovalDecision {
  APPROVED: 'approved';
  REJECTED: 'rejected';
  PENDING: 'pending';
}

export const APPROVAL_DECISION: ApprovalDecision = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PENDING: 'pending',
} as const;

export type ApprovalDecisionType = ApprovalDecision[keyof ApprovalDecision];

/**
 * Stakeholder information
 */
export interface Stakeholder {
  id: string;
  name: string;
  email: string;
  role: string;
  department: DepartmentType;
  isOwner: boolean;
}

/**
 * Approval record for BRD
 */
export interface Approval {
  stakeholderId: string;
  decision: ApprovalDecisionType;
  comments?: string | undefined;
  timestamp: Date;
}

/**
 * Timeline information for BRD
 */
export interface BRDTimeline {
  startDate: Date;
  targetDate: Date;
}

/**
 * Base BRD interface
 */
export interface BaseBRD {
  id: string;
  title: string;
  problemStatement: string;
  businessImpact: string;
  successCriteria: string[];
  timeline: BRDTimeline;
  budget: number;
  stakeholders: Stakeholder[];
  status: BRDStatusType;
  version: number;
  approvals: Approval[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * BRD interface with computed fields
 */
export interface BRD extends BaseBRD {
  // Additional computed fields for API responses
  createdByUser?: {
    id: string;
    username: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
  } | undefined;
  isFullyApproved?: boolean | undefined;
  pendingApprovals?: Stakeholder[] | undefined;
  approvedStakeholders?: Stakeholder[] | undefined;
}

/**
 * Request to create a new BRD
 */
export interface CreateBRDRequest {
  title: string;
  problemStatement: string;
  businessImpact: string;
  successCriteria: string[];
  timeline: {
    startDate: string; // ISO date string
    targetDate: string; // ISO date string
  };
  budget: number;
  stakeholders: Omit<Stakeholder, 'id'>[];
}

/**
 * Request to update an existing BRD
 */
export interface UpdateBRDRequest {
  title?: string | undefined;
  problemStatement?: string | undefined;
  businessImpact?: string | undefined;
  successCriteria?: string[] | undefined;
  timeline?: {
    startDate: string; // ISO date string
    targetDate: string; // ISO date string
  } | undefined;
  budget?: number | undefined;
  stakeholders?: Omit<Stakeholder, 'id'>[] | undefined;
  status?: BRDStatusType | undefined;
}

/**
 * Request to approve or reject a BRD
 */
export interface ApproveBRDRequest {
  stakeholderId: string;
  decision: 'approved' | 'rejected';
  comments?: string | undefined;
}

/**
 * BRD approval status response
 */
export interface BRDApprovalStatus {
  brdId: string;
  isFullyApproved: boolean;
  totalStakeholders: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  pending: Stakeholder[];
  approved: Stakeholder[];
  rejected: Stakeholder[];
}

/**
 * BRD filters for querying
 */
export interface BRDFilters {
  status?: BRDStatusType[] | undefined;
  createdBy?: string | undefined;
  stakeholderEmail?: string | undefined;
  department?: DepartmentType[] | undefined;
  minBudget?: number | undefined;
  maxBudget?: number | undefined;
  startDateFrom?: string | undefined;
  startDateTo?: string | undefined;
  search?: string | undefined; // searches title and problemStatement
}

/**
 * BRD summary statistics
 */
export interface BRDSummary {
  total: number;
  byStatus: Record<BRDStatusType, number>;
  byDepartment: Record<DepartmentType, number>;
  totalBudget: number;
  averageBudget: number;
  fullyApproved: number;
  pendingApproval: number;
}

// WebSocket event types for real-time updates
export const BRD_EVENTS = {
  CREATED: 'brd:created',
  UPDATED: 'brd:updated',
  APPROVED: 'brd:approved',
  REJECTED: 'brd:rejected',
  FULLY_APPROVED: 'brd:fully_approved',
} as const;

export type BRDEventType = typeof BRD_EVENTS[keyof typeof BRD_EVENTS];
