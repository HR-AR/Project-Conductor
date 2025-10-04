/**
 * Product Requirements Document (PRD) Model
 * Represents the product requirements phase generated from approved BRDs
 */

/**
 * PRD status types
 */
export interface PRDStatus {
  DRAFT: 'draft';
  UNDER_REVIEW: 'under_review';
  ALIGNED: 'aligned';
  LOCKED: 'locked';
}

export const PRD_STATUS: PRDStatus = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  ALIGNED: 'aligned',
  LOCKED: 'locked',
} as const;

export type PRDStatusType = PRDStatus[keyof PRDStatus];

/**
 * Feature priority types
 */
export interface FeaturePriority {
  CRITICAL: 'critical';
  HIGH: 'high';
  MEDIUM: 'medium';
  LOW: 'low';
}

export const FEATURE_PRIORITY: FeaturePriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type FeaturePriorityType = FeaturePriority[keyof FeaturePriority];

/**
 * Alignment status types
 */
export interface AlignmentStatus {
  ALIGNED: 'aligned';
  ALIGN_BUT: 'align_but';
  NOT_ALIGNED: 'not_aligned';
}

export const ALIGNMENT_STATUS: AlignmentStatus = {
  ALIGNED: 'aligned',
  ALIGN_BUT: 'align_but',
  NOT_ALIGNED: 'not_aligned',
} as const;

export type AlignmentStatusType = AlignmentStatus[keyof AlignmentStatus];

/**
 * Feature definition within a PRD
 */
export interface Feature {
  id: string;
  title: string;
  description: string;
  priority: FeaturePriorityType;
  acceptanceCriteria: string[];
}

/**
 * User story within a feature
 */
export interface UserStory {
  id: string;
  featureId: string;
  asA: string; // "As a returning customer"
  iWant: string; // "I want to save my payment method"
  soThat: string; // "So that I can checkout faster"
  acceptanceCriteria: string[];
}

/**
 * Stakeholder alignment record for PRD
 */
export interface Alignment {
  stakeholderId: string;
  status: AlignmentStatusType;
  concerns?: string | undefined;
  timestamp: Date;
}

/**
 * Base PRD interface
 */
export interface BasePRD {
  id: string;
  brdId: string; // Links back to source BRD
  title: string;
  features: Feature[];
  userStories: UserStory[];
  technicalRequirements: string[];
  dependencies: string[];
  status: PRDStatusType;
  version: number;
  alignments: Alignment[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * PRD interface with computed fields
 */
export interface PRD extends BasePRD {
  // Additional computed fields for API responses
  sourceBRD?: {
    id: string;
    title: string;
    status: string;
  } | undefined;
  createdByUser?: {
    id: string;
    username: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
  } | undefined;
  isFullyAligned?: boolean | undefined;
  alignmentSummary?: {
    aligned: number;
    alignBut: number;
    notAligned: number;
    pending: number;
  } | undefined;
}

/**
 * Request to create a new PRD
 */
export interface CreatePRDRequest {
  brdId: string;
  title: string;
  features: Omit<Feature, 'id'>[];
  userStories: Omit<UserStory, 'id'>[];
  technicalRequirements: string[];
  dependencies: string[];
}

/**
 * Request to update an existing PRD
 */
export interface UpdatePRDRequest {
  title?: string | undefined;
  features?: Omit<Feature, 'id'>[] | undefined;
  userStories?: Omit<UserStory, 'id'>[] | undefined;
  technicalRequirements?: string[] | undefined;
  dependencies?: string[] | undefined;
  status?: PRDStatusType | undefined;
}

/**
 * Request to record stakeholder alignment on PRD
 */
export interface AlignPRDRequest {
  stakeholderId: string;
  status: AlignmentStatusType;
  concerns?: string | undefined;
}

/**
 * Request to add a feature to PRD
 */
export interface AddFeatureRequest {
  title: string;
  description: string;
  priority: FeaturePriorityType;
  acceptanceCriteria: string[];
}

/**
 * Request to add a user story to a feature
 */
export interface AddUserStoryRequest {
  featureId: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
}

/**
 * PRD filters for querying
 */
export interface PRDFilters {
  status?: PRDStatusType[] | undefined;
  brdId?: string | undefined;
  createdBy?: string | undefined;
  featurePriority?: FeaturePriorityType[] | undefined;
  hasUnresolvedConcerns?: boolean | undefined;
  search?: string | undefined; // searches title, features, and user stories
}

/**
 * PRD alignment status response
 */
export interface PRDAlignmentStatus {
  prdId: string;
  isFullyAligned: boolean;
  totalStakeholders: number;
  aligned: number;
  alignBut: number;
  notAligned: number;
  pending: number;
  stakeholdersWithConcerns: Array<{
    stakeholderId: string;
    status: AlignmentStatusType;
    concerns: string;
  }>;
}

/**
 * PRD summary statistics
 */
export interface PRDSummary {
  total: number;
  byStatus: Record<PRDStatusType, number>;
  totalFeatures: number;
  totalUserStories: number;
  byFeaturePriority: Record<FeaturePriorityType, number>;
  fullyAligned: number;
  needsAlignment: number;
}

/**
 * PRD generation result from BRD
 */
export interface GeneratePRDResult {
  success: boolean;
  prd?: PRD | undefined;
  errors?: string[] | undefined;
  warnings?: string[] | undefined;
}

// WebSocket event types for real-time updates
export const PRD_EVENTS = {
  CREATED: 'prd:created',
  UPDATED: 'prd:updated',
  GENERATED: 'prd:generated',
  ALIGNED: 'prd:aligned',
  LOCKED: 'prd:locked',
  FEATURE_ADDED: 'prd:feature_added',
  USER_STORY_ADDED: 'prd:user_story_added',
} as const;

export type PRDEventType = typeof PRD_EVENTS[keyof typeof PRD_EVENTS];
