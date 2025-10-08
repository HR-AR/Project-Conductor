/**
 * Project Model
 * Unified model that groups all workflow documents (BRD → PRD → Engineering Design)
 * Enables project history tracking and comparison
 */

import type { Stakeholder } from './brd.model';

/**
 * Project scope types
 */
export interface ProjectScope {
  FEATURE: 'feature';
  PLATFORM: 'platform';
  INTEGRATION: 'integration';
  OPTIMIZATION: 'optimization';
  BUGFIX: 'bugfix';
  MAINTENANCE: 'maintenance';
  RESEARCH: 'research';
}

export const PROJECT_SCOPE: ProjectScope = {
  FEATURE: 'feature',
  PLATFORM: 'platform',
  INTEGRATION: 'integration',
  OPTIMIZATION: 'optimization',
  BUGFIX: 'bugfix',
  MAINTENANCE: 'maintenance',
  RESEARCH: 'research',
} as const;

export type ProjectScopeType = ProjectScope[keyof ProjectScope];

/**
 * Project status types
 */
export interface ProjectStatus {
  DRAFT: 'draft';
  BRD_APPROVAL: 'brd_approval';
  PRD_ALIGNMENT: 'prd_alignment';
  DESIGN: 'design';
  IMPLEMENTATION: 'implementation';
  COMPLETED: 'completed';
  ARCHIVED: 'archived';
}

export const PROJECT_STATUS: ProjectStatus = {
  DRAFT: 'draft',
  BRD_APPROVAL: 'brd_approval',
  PRD_ALIGNMENT: 'prd_alignment',
  DESIGN: 'design',
  IMPLEMENTATION: 'implementation',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export type ProjectStatusType = ProjectStatus[keyof ProjectStatus];

/**
 * Project timeline
 */
export interface ProjectTimeline {
  startDate: Date;
  targetDate: Date;
  actualCompletionDate?: Date | undefined;
}

/**
 * Base Project interface
 */
export interface BaseProject {
  id: string;
  title: string;
  description: string;
  scope: ProjectScopeType;
  status: ProjectStatusType;

  // Document References (traceability chain)
  brdId?: string | undefined;
  prdId?: string | undefined;
  designIds: string[];
  conflictIds: string[];
  changeLogIds: string[];

  // Business Context
  businessImpact: string;
  budget: number;
  timeline: ProjectTimeline;
  stakeholders: Stakeholder[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | undefined;
  createdBy: string;

  // Version tracking - link to previous iteration of same project
  previousVersionId?: string | undefined;
  tags: string[];
}

/**
 * Project with computed fields
 */
export interface Project extends BaseProject {
  // Additional computed fields for API responses
  createdByUser?: {
    id: string;
    username: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
  } | undefined;

  // Completion metrics
  daysInProgress?: number | undefined;
  isOnTime?: boolean | undefined;
  isOverBudget?: boolean | undefined;

  // Traceability summary
  totalFeatures?: number | undefined;
  totalConflicts?: number | undefined;
  totalChanges?: number | undefined;

  // Related projects (for "previous asks")
  similarProjects?: Project[] | undefined;
}

/**
 * Request to create a new project
 */
export interface CreateProjectRequest {
  title: string;
  description: string;
  scope: ProjectScopeType;
  businessImpact: string;
  budget: number;
  timeline: {
    startDate: string; // ISO date string
    targetDate: string; // ISO date string
  };
  stakeholders: Omit<Stakeholder, 'id'>[];
  tags?: string[] | undefined;
  previousVersionId?: string | undefined;
}

/**
 * Request to update an existing project
 */
export interface UpdateProjectRequest {
  title?: string | undefined;
  description?: string | undefined;
  scope?: ProjectScopeType | undefined;
  status?: ProjectStatusType | undefined;
  businessImpact?: string | undefined;
  budget?: number | undefined;
  timeline?: {
    startDate: string;
    targetDate: string;
  } | undefined;
  stakeholders?: Omit<Stakeholder, 'id'>[] | undefined;
  tags?: string[] | undefined;
  brdId?: string | undefined;
  prdId?: string | undefined;
}

/**
 * Project filters for querying
 */
export interface ProjectFilters {
  scope?: ProjectScopeType[] | undefined;
  status?: ProjectStatusType[] | undefined;
  createdBy?: string | undefined;
  stakeholderEmail?: string | undefined;
  minBudget?: number | undefined;
  maxBudget?: number | undefined;
  startDateFrom?: string | undefined;
  startDateTo?: string | undefined;
  tags?: string[] | undefined;
  search?: string | undefined; // searches title and description
}

/**
 * Project details (full traceability)
 */
export interface ProjectDetails {
  project: Project;
  brd?: any | undefined; // Full BRD document
  prd?: any | undefined; // Full PRD document
  designs: any[]; // Engineering designs
  conflicts: any[]; // Resolved conflicts
  changeLogs: any[]; // Change history
}

/**
 * Project comparison result
 */
export interface ProjectComparison {
  project1: Project;
  project2: Project;

  // Differences
  scopeChange?: {
    from: ProjectScopeType;
    to: ProjectScopeType;
  } | undefined;
  budgetDiff: number; // positive = increased, negative = decreased
  timelineDiff: number; // days difference

  // Feature changes
  features: {
    added: string[];
    removed: string[];
    modified: string[];
  };

  // Change summary
  totalChanges: number;
  majorChanges: Array<{
    category: string;
    description: string;
    impact: string;
  }>;
}

/**
 * Timeline event for project history
 */
export interface ProjectTimelineEvent {
  timestamp: Date;
  type: 'created' | 'brd_submitted' | 'brd_approved' | 'prd_created' | 'prd_aligned' | 'design_submitted' | 'conflict_raised' | 'conflict_resolved' | 'change_logged' | 'completed' | 'archived';
  description: string;
  documentId?: string | undefined;
  userId?: string | undefined;
}

/**
 * Project summary statistics
 */
export interface ProjectSummary {
  total: number;
  byScope: Record<ProjectScopeType, number>;
  byStatus: Record<ProjectStatusType, number>;
  totalBudget: number;
  averageBudget: number;
  completed: number;
  active: number;
  successRate: number; // percentage of completed projects
  averageDuration: number; // average days from start to completion
  mostCommonScope: ProjectScopeType;
}

/**
 * Similar projects result (for "previous asks")
 */
export interface SimilarProjectsResult {
  project: Project;
  similarProjects: Array<{
    project: Project;
    similarityScore: number; // 0-100
    similarityReasons: string[];
  }>;
}

// WebSocket event types for real-time updates
export const PROJECT_EVENTS = {
  CREATED: 'project:created',
  UPDATED: 'project:updated',
  STATUS_CHANGED: 'project:status_changed',
  COMPLETED: 'project:completed',
  ARCHIVED: 'project:archived',
} as const;

export type ProjectEventType = typeof PROJECT_EVENTS[keyof typeof PROJECT_EVENTS];