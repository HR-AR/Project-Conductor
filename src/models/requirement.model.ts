/**
 * Requirement Model - TypeScript interfaces and database models
 */

export interface RequirementStatus {
  DRAFT: 'draft';
  UNDER_REVIEW: 'under_review';
  APPROVED: 'approved';
  REJECTED: 'rejected';
  CHANGES_REQUESTED: 'changes_requested';
  ACTIVE: 'active';
  COMPLETED: 'completed';
  ARCHIVED: 'archived';
  CANCELLED: 'cancelled';
}

export const REQUIREMENT_STATUS: RequirementStatus = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes_requested',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  CANCELLED: 'cancelled',
} as const;

export type RequirementStatusType = RequirementStatus[keyof RequirementStatus];

export interface RequirementPriority {
  LOW: 'low';
  MEDIUM: 'medium';
  HIGH: 'high';
  CRITICAL: 'critical';
}

export const REQUIREMENT_PRIORITY: RequirementPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type RequirementPriorityType = RequirementPriority[keyof RequirementPriority];

export interface BaseRequirement {
  id: string;
  title: string;
  description?: string;
  status: RequirementStatusType;
  priority: RequirementPriorityType;
  assignedTo?: string;
  createdBy: string;
  dueDate?: Date;
  estimatedEffort?: number; // in hours
  actualEffort?: number; // in hours
  completionPercentage: number;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface Requirement extends BaseRequirement {
  // Additional computed fields for API responses
  assignedToUser?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdByUser?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreateRequirementRequest {
  title: string;
  description?: string;
  priority?: RequirementPriorityType;
  assignedTo?: string;
  dueDate?: string; // ISO date string
  estimatedEffort?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateRequirementRequest {
  title?: string;
  description?: string;
  status?: RequirementStatusType;
  priority?: RequirementPriorityType;
  assignedTo?: string;
  dueDate?: string; // ISO date string
  estimatedEffort?: number;
  actualEffort?: number;
  completionPercentage?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface RequirementFilters {
  status?: RequirementStatusType[] | undefined;
  priority?: RequirementPriorityType[] | undefined;
  assignedTo?: string[] | undefined;
  createdBy?: string[] | undefined;
  tags?: string[] | undefined;
  dueDateFrom?: string | undefined;
  dueDateTo?: string | undefined;
  search?: string | undefined; // searches title and description
}

export interface RequirementVersion {
  id: string;
  requirementId: string;
  versionNumber: number;
  title: string;
  description?: string;
  status: RequirementStatusType;
  priority: RequirementPriorityType;
  assignedTo?: string;
  dueDate?: Date;
  estimatedEffort?: number;
  actualEffort?: number;
  completionPercentage: number;
  tags?: string[];
  metadata?: Record<string, any>;
  changedBy: string;
  changeReason?: string;
  createdAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RequirementSummary {
  total: number;
  byStatus: Record<RequirementStatusType, number>;
  byPriority: Record<RequirementPriorityType, number>;
  overdue: number;
  completedThisMonth: number;
}