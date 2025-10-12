/**
 * Activity Model
 * Defines types for agent activity logging and orchestrator event tracking
 */

/**
 * Agent activity event types
 */
export enum AgentActivityEventType {
  STARTED = 'agent.started',
  PROGRESS = 'agent.progress',
  COMPLETED = 'agent.completed',
  CONFLICT_DETECTED = 'agent.conflict_detected',
  PAUSED = 'agent.paused',
  ERROR = 'agent.error'
}

/**
 * Agent activity severity levels
 */
export enum ActivitySeverity {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Agent activity status
 */
export enum ActivityStatus {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  FAILED = 'failed',
  CONFLICT = 'conflict'
}

/**
 * Base interface for agent activity events
 */
export interface AgentActivityEvent {
  id: string;
  eventType: AgentActivityEventType;
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string;
  status: ActivityStatus;
  severity: ActivitySeverity;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Agent started event payload
 */
export interface AgentStartedEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string;
  phase?: string;
  milestone?: string;
  estimatedDuration?: number;
  timestamp: Date;
}

/**
 * Agent progress event payload
 */
export interface AgentProgressEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string;
  progress: number; // 0-100
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  message?: string;
  timestamp: Date;
}

/**
 * Agent completed event payload
 */
export interface AgentCompletedEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string;
  result: {
    success: boolean;
    output?: string;
    filesCreated?: string[];
    filesModified?: string[];
    testsRun?: number;
    testsPassed?: number;
    testsFailed?: number;
    metadata?: Record<string, unknown>;
  };
  duration?: number; // milliseconds
  timestamp: Date;
}

/**
 * Agent conflict detected event payload
 */
export interface AgentConflictDetectedEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string;
  conflictType: string;
  conflictDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedItems: string[];
  recommendedActions?: string[];
  requiresHumanInput: boolean;
  timestamp: Date;
}

/**
 * Agent paused event payload
 */
export interface AgentPausedEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string;
  reason: string;
  pauseType: 'manual' | 'conflict' | 'dependency' | 'error' | 'approval_required';
  requiresAction?: string;
  actionUrl?: string;
  timestamp: Date;
}

/**
 * Agent error event payload
 */
export interface AgentErrorEventData {
  agentType: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  projectId?: string;
  error: string;
  errorType: 'validation' | 'execution' | 'dependency' | 'timeout' | 'system' | 'unknown';
  stack?: string;
  canRetry: boolean;
  retryCount?: number;
  timestamp: Date;
}

/**
 * Database record for activity log
 */
export interface ActivityLogRecord {
  id: string;
  event_type: AgentActivityEventType;
  agent_type: string;
  agent_name: string;
  task_id: string;
  task_description: string;
  project_id?: string;
  status: ActivityStatus;
  severity: ActivitySeverity;
  payload: Record<string, unknown>;
  timestamp: Date;
  created_at: Date;
}

/**
 * Activity log filters for querying
 */
export interface ActivityLogFilters {
  projectId?: string;
  agentType?: string;
  eventType?: AgentActivityEventType;
  status?: ActivityStatus;
  severity?: ActivitySeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Activity log query result
 */
export interface ActivityLogQueryResult {
  activities: ActivityLogRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Activity statistics
 */
export interface ActivityStats {
  totalEvents: number;
  eventsByType: Record<AgentActivityEventType, number>;
  eventsBySeverity: Record<ActivitySeverity, number>;
  eventsByStatus: Record<ActivityStatus, number>;
  agentStats: Array<{
    agentType: string;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageDuration: number;
    successRate: number;
  }>;
  recentErrors: ActivityLogRecord[];
  recentConflicts: ActivityLogRecord[];
}
