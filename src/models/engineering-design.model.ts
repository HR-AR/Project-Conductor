/**
 * Engineering Design Model
 * Represents engineering design documents, estimates, and technical planning
 */

/**
 * Engineering team types
 */
export interface TeamTypes {
  FRONTEND: 'frontend';
  BACKEND: 'backend';
  MOBILE: 'mobile';
  DEVOPS: 'devops';
  QA: 'qa';
}

export const TEAM_TYPES: TeamTypes = {
  FRONTEND: 'frontend',
  BACKEND: 'backend',
  MOBILE: 'mobile',
  DEVOPS: 'devops',
  QA: 'qa',
} as const;

export type TeamType = TeamTypes[keyof TeamTypes];

/**
 * Design status types
 */
export interface DesignStatus {
  DRAFT: 'draft';
  UNDER_REVIEW: 'under_review';
  APPROVED: 'approved';
  REJECTED: 'rejected';
}

export const DESIGN_STATUS: DesignStatus = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type DesignStatusType = DesignStatus[keyof DesignStatus];

/**
 * Risk severity levels
 */
export interface RiskSeverity {
  LOW: 'low';
  MEDIUM: 'medium';
  HIGH: 'high';
  CRITICAL: 'critical';
}

export const RISK_SEVERITY: RiskSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type RiskSeverityType = RiskSeverity[keyof RiskSeverity];

/**
 * Design conflict types
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
 * Effort estimate for a feature
 */
export interface Estimate {
  featureId: string;
  featureTitle: string;
  hours: number;
  engineers: number;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

/**
 * Risk assessment
 */
export interface Risk {
  id: string;
  description: string;
  severity: RiskSeverityType;
  mitigation?: string | undefined;
}

/**
 * Design conflict that needs resolution
 */
export interface DesignConflict {
  id: string;
  type: ConflictType;
  description: string;
  impact: string;
  alternatives: string[];
}

/**
 * Base Engineering Design interface
 */
export interface BaseEngineeringDesign {
  id: string;
  prdId: string;
  team: TeamType;
  approach: string;
  architecture: string;
  estimates: Estimate[];
  risks: Risk[];
  dependencies: string[];
  conflicts: DesignConflict[];
  status: DesignStatusType;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Engineering Design with computed fields
 */
export interface EngineeringDesign extends BaseEngineeringDesign {
  // Additional computed fields for API responses
  sourcePRD?: {
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
  totalEstimatedHours?: number | undefined;
  totalEngineers?: number | undefined;
  estimatedDuration?: number | undefined; // in days
  hasConflicts?: boolean | undefined;
  criticalRisks?: number | undefined;
}

/**
 * Request to create engineering design
 */
export interface CreateEngineeringDesignRequest {
  prdId: string;
  team: TeamType;
  approach: string;
  architecture: string;
  estimates: Omit<Estimate, 'startDate' | 'endDate'> & {
    startDate?: string | undefined; // ISO date string
    endDate?: string | undefined; // ISO date string
  }[];
  risks: Omit<Risk, 'id'>[];
  dependencies: string[];
}

/**
 * Request to update engineering design
 */
export interface UpdateEngineeringDesignRequest {
  approach?: string | undefined;
  architecture?: string | undefined;
  estimates?: Omit<Estimate, 'startDate' | 'endDate'> & {
    startDate?: string | undefined; // ISO date string
    endDate?: string | undefined; // ISO date string
  }[] | undefined;
  risks?: Omit<Risk, 'id'>[] | undefined;
  dependencies?: string[] | undefined;
  status?: DesignStatusType | undefined;
}

/**
 * Request to add a risk
 */
export interface AddRiskRequest {
  description: string;
  severity: RiskSeverityType;
  mitigation?: string | undefined;
}

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: DesignConflict[];
  summary: {
    timeline: number;
    budget: number;
    scope: number;
    technical: number;
  };
}

/**
 * Engineering design filters
 */
export interface EngineeringDesignFilters {
  prdId?: string | undefined;
  team?: TeamType[] | undefined;
  status?: DesignStatusType[] | undefined;
  createdBy?: string | undefined;
  hasConflicts?: boolean | undefined;
  riskSeverity?: RiskSeverityType[] | undefined;
  minEstimatedHours?: number | undefined;
  maxEstimatedHours?: number | undefined;
  search?: string | undefined; // searches approach and architecture
}

/**
 * Engineering design summary
 */
export interface EngineeringDesignSummary {
  total: number;
  byTeam: Record<TeamType, number>;
  byStatus: Record<DesignStatusType, number>;
  totalEstimatedHours: number;
  totalEngineers: number;
  averageEstimatePerDesign: number;
  designsWithConflicts: number;
  totalRisks: number;
  criticalRisks: number;
}

/**
 * Team capacity and availability
 */
export interface TeamCapacity {
  team: TeamType;
  availableEngineers: number;
  currentWorkload: number; // hours
  availableCapacity: number; // hours
  utilizationPercentage: number;
}

/**
 * Cross-team design analysis
 */
export interface CrossTeamAnalysis {
  prdId: string;
  designs: EngineeringDesign[];
  totalEstimatedHours: number;
  totalEngineers: number;
  estimatedDuration: number; // days
  conflictingSections: string[];
  sharedDependencies: string[];
  teamCapacities: TeamCapacity[];
}

// WebSocket event types for real-time updates
export const ENGINEERING_DESIGN_EVENTS = {
  CREATED: 'design:created',
  UPDATED: 'design:updated',
  SUBMITTED: 'design:submitted',
  APPROVED: 'design:approved',
  REJECTED: 'design:rejected',
  CONFLICT_DETECTED: 'design:conflict_detected',
  RISK_ADDED: 'design:risk_added',
} as const;

export type EngineeringDesignEventType = typeof ENGINEERING_DESIGN_EVENTS[keyof typeof ENGINEERING_DESIGN_EVENTS];
