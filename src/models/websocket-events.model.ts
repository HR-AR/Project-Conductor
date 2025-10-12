/**
 * WebSocket Event Types and Payloads
 * Defines all real-time event types for the complete workflow
 */

// WebSocket Event Type Constants
export const WS_EVENTS = {
  // BRD Events
  BRD_CREATED: 'brd:created',
  BRD_UPDATED: 'brd:updated',
  BRD_APPROVED: 'brd:approved',
  BRD_REJECTED: 'brd:rejected',
  BRD_STATUS_CHANGED: 'brd:status_changed',
  BRD_FULLY_APPROVED: 'brd:fully_approved',

  // PRD Events
  PRD_CREATED: 'prd:created',
  PRD_GENERATED: 'prd:generated',
  PRD_UPDATED: 'prd:updated',
  PRD_ALIGNED: 'prd:aligned',
  PRD_LOCKED: 'prd:locked',
  PRD_FEATURE_ADDED: 'prd:feature_added',
  PRD_STORY_ADDED: 'prd:story_added',
  PRD_STATUS_CHANGED: 'prd:status_changed',

  // Engineering Design Events
  DESIGN_SUBMITTED: 'design:submitted',
  DESIGN_UPDATED: 'design:updated',
  DESIGN_APPROVED: 'design:approved',
  DESIGN_REJECTED: 'design:rejected',
  DESIGN_CONFLICT_DETECTED: 'design:conflict_detected',
  DESIGN_STATUS_CHANGED: 'design:status_changed',

  // Conflict Events
  CONFLICT_CREATED: 'conflict:created',
  CONFLICT_COMMENT_ADDED: 'conflict:comment_added',
  CONFLICT_OPTION_ADDED: 'conflict:option_added',
  CONFLICT_VOTED: 'conflict:voted',
  CONFLICT_RESOLVED: 'conflict:resolved',
  CONFLICT_STATUS_CHANGED: 'conflict:status_changed',

  // Change Log Events
  CHANGE_LOGGED: 'change:logged',
  CHANGE_APPROVED: 'change:approved',
  CHANGE_REJECTED: 'change:rejected',

  // Room Events
  JOIN_PROJECT: 'join:project',
  LEAVE_PROJECT: 'leave:project',

  // Presence Events (existing)
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  PRESENCE_UPDATE: 'presence:update',

  // Agent Activity Events (orchestrator visibility)
  AGENT_STARTED: 'agent:started',
  AGENT_PROGRESS: 'agent:progress',
  AGENT_COMPLETED: 'agent:completed',
  AGENT_CONFLICT_DETECTED: 'agent:conflict_detected',
  AGENT_PAUSED: 'agent:paused',
  AGENT_ERROR: 'agent:error'
} as const;

export type WSEventType = typeof WS_EVENTS[keyof typeof WS_EVENTS];

// ===== BRD Event Payloads =====

export interface BRDCreatedEventData {
  brdId: string;
  title: string;
  createdBy: string;
  createdAt: Date;
  problemStatement: string;
}

export interface BRDUpdatedEventData {
  brdId: string;
  title: string;
  updatedBy: string;
  updatedAt: Date;
  changes: string[];
}

export interface BRDApprovedEventData {
  brdId: string;
  approvedBy: string;
  stakeholder: string;
  stakeholderName: string;
  timestamp: Date;
}

export interface BRDRejectedEventData {
  brdId: string;
  rejectedBy: string;
  stakeholder: string;
  stakeholderName: string;
  reason?: string | undefined;
  timestamp: Date;
}

export interface BRDStatusChangedEventData {
  brdId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  timestamp: Date;
}

export interface BRDFullyApprovedEventData {
  brdId: string;
  title: string;
  totalApprovals: number;
  timestamp: Date;
}

// ===== PRD Event Payloads =====

export interface PRDCreatedEventData {
  prdId: string;
  title: string;
  brdId?: string | undefined;
  createdBy: string;
  createdAt: Date;
}

export interface PRDGeneratedEventData {
  prdId: string;
  brdId: string;
  title: string;
  generatedBy: string;
  featureCount: number;
  timestamp: Date;
}

export interface PRDUpdatedEventData {
  prdId: string;
  title: string;
  updatedBy: string;
  updatedAt: Date;
  changes: string[];
}

export interface PRDAlignedEventData {
  prdId: string;
  featureId: string;
  featureName: string;
  alignedBy: string;
  alignmentStatus: string;
  timestamp: Date;
}

export interface PRDLockedEventData {
  prdId: string;
  lockedBy: string;
  reason: string;
  timestamp: Date;
}

export interface PRDFeatureAddedEventData {
  prdId: string;
  featureId: string;
  featureName: string;
  addedBy: string;
  timestamp: Date;
}

export interface PRDStoryAddedEventData {
  prdId: string;
  featureId: string;
  storyId: string;
  storyTitle: string;
  addedBy: string;
  timestamp: Date;
}

export interface PRDStatusChangedEventData {
  prdId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  timestamp: Date;
}

// ===== Engineering Design Event Payloads =====

export interface DesignSubmittedEventData {
  designId: string;
  team: string;
  title: string;
  createdBy: string;
  timestamp: Date;
}

export interface DesignUpdatedEventData {
  designId: string;
  team: string;
  updatedBy: string;
  changes: string[];
  timestamp: Date;
}

export interface DesignApprovedEventData {
  designId: string;
  team: string;
  approvedBy: string;
  timestamp: Date;
}

export interface DesignRejectedEventData {
  designId: string;
  team: string;
  rejectedBy: string;
  reason?: string | undefined;
  timestamp: Date;
}

export interface DesignConflictDetectedEventData {
  designId: string;
  team: string;
  conflictType: string;
  description: string;
  severity: string;
  detectedBy: string;
  timestamp: Date;
}

export interface DesignStatusChangedEventData {
  designId: string;
  team: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  timestamp: Date;
}

// ===== Conflict Event Payloads =====

export interface ConflictCreatedEventData {
  conflictId: string;
  title: string;
  type: string;
  severity: string;
  raisedBy: string;
  raisedByName: string;
  affectedItems: string[];
  timestamp: Date;
}

export interface ConflictCommentAddedEventData {
  conflictId: string;
  commentId: string;
  commentText: string;
  addedBy: string;
  addedByName: string;
  timestamp: Date;
}

export interface ConflictOptionAddedEventData {
  conflictId: string;
  optionId: string;
  optionTitle: string;
  addedBy: string;
  timestamp: Date;
}

export interface ConflictVotedEventData {
  conflictId: string;
  optionId: string;
  votedBy: string;
  votedByName: string;
  timestamp: Date;
}

export interface ConflictResolvedEventData {
  conflictId: string;
  resolution: string;
  selectedOption?: string | undefined;
  approvedBy: string[];
  documentsUpdated: string[];
  timestamp: Date;
}

export interface ConflictStatusChangedEventData {
  conflictId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  timestamp: Date;
}

// ===== Change Log Event Payloads =====

export interface ChangeLoggedEventData {
  changeId: string;
  item: string;
  itemType: string;
  change: string;
  reason: string;
  phase: string;
  loggedBy: string;
  timestamp: Date;
}

export interface ChangeApprovedEventData {
  changeId: string;
  approvedBy: string;
  timestamp: Date;
}

export interface ChangeRejectedEventData {
  changeId: string;
  rejectedBy: string;
  reason?: string | undefined;
  timestamp: Date;
}

// ===== Room Event Payloads =====

export interface JoinProjectEventData {
  projectId: string;
  userId: string;
  username: string;
  timestamp: Date;
}

export interface LeaveProjectEventData {
  projectId: string;
  userId: string;
  username: string;
  timestamp: Date;
}

// ===== Presence Event Payloads =====

export interface UserJoinedEventData {
  projectId?: string | undefined;
  requirementId?: string | undefined;
  userId: string;
  username: string;
  timestamp: Date;
}

export interface UserLeftEventData {
  projectId?: string | undefined;
  requirementId?: string | undefined;
  userId: string;
  username: string;
  timestamp: Date;
}

export interface PresenceUpdateEventData {
  userId: string;
  username: string;
  status: 'online' | 'away' | 'offline';
  currentLocation?: string | undefined;
  timestamp: Date;
}

// ===== Agent Activity Event Payloads =====

export interface AgentStartedEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string | undefined;
  phase?: string | undefined;
  milestone?: string | undefined;
  estimatedDuration?: number | undefined;
  timestamp: Date;
}

export interface AgentProgressEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string | undefined;
  progress: number;
  currentStep?: string | undefined;
  totalSteps?: number | undefined;
  completedSteps?: number | undefined;
  message?: string | undefined;
  timestamp: Date;
}

export interface AgentCompletedEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string | undefined;
  result: {
    success: boolean;
    output?: string | undefined;
    filesCreated?: string[] | undefined;
    filesModified?: string[] | undefined;
    testsRun?: number | undefined;
    testsPassed?: number | undefined;
    testsFailed?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
  };
  duration?: number | undefined;
  timestamp: Date;
}

export interface AgentConflictDetectedEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string | undefined;
  conflictType: string;
  conflictDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedItems: string[];
  recommendedActions?: string[] | undefined;
  requiresHumanInput: boolean;
  timestamp: Date;
}

export interface AgentPausedEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string | undefined;
  reason: string;
  pauseType: 'manual' | 'conflict' | 'dependency' | 'error' | 'approval_required';
  requiresAction?: string | undefined;
  actionUrl?: string | undefined;
  timestamp: Date;
}

export interface AgentErrorEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string | undefined;
  error: string;
  errorType: 'validation' | 'execution' | 'dependency' | 'timeout' | 'system' | 'unknown';
  stack?: string | undefined;
  canRetry: boolean;
  retryCount?: number | undefined;
  timestamp: Date;
}

// ===== Union Type for All Events =====

export type WSEventData =
  | BRDCreatedEventData
  | BRDUpdatedEventData
  | BRDApprovedEventData
  | BRDRejectedEventData
  | BRDStatusChangedEventData
  | BRDFullyApprovedEventData
  | PRDCreatedEventData
  | PRDGeneratedEventData
  | PRDUpdatedEventData
  | PRDAlignedEventData
  | PRDLockedEventData
  | PRDFeatureAddedEventData
  | PRDStoryAddedEventData
  | PRDStatusChangedEventData
  | DesignSubmittedEventData
  | DesignUpdatedEventData
  | DesignApprovedEventData
  | DesignRejectedEventData
  | DesignConflictDetectedEventData
  | DesignStatusChangedEventData
  | ConflictCreatedEventData
  | ConflictCommentAddedEventData
  | ConflictOptionAddedEventData
  | ConflictVotedEventData
  | ConflictResolvedEventData
  | ConflictStatusChangedEventData
  | ChangeLoggedEventData
  | ChangeApprovedEventData
  | ChangeRejectedEventData
  | JoinProjectEventData
  | LeaveProjectEventData
  | UserJoinedEventData
  | UserLeftEventData
  | PresenceUpdateEventData
  | AgentStartedEventData
  | AgentProgressEventData
  | AgentCompletedEventData
  | AgentConflictDetectedEventData
  | AgentPausedEventData
  | AgentErrorEventData;
