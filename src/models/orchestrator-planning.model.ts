/**
 * Orchestrator Planning Models
 * Defines types for goal-based task planning, execution, and optimization
 */

/**
 * Agent types available for task execution
 */
export enum AgentType {
  API = 'agent-api',
  MODELS = 'agent-models',
  TEST = 'agent-test',
  REALTIME = 'agent-realtime',
  QUALITY = 'agent-quality',
  INTEGRATION = 'agent-integration',
  SECURITY = 'agent-security',
  AUTH = 'agent-auth',
  RBAC = 'agent-rbac',
  DATABASE = 'agent-database',
  UI = 'agent-ui',
  DOCUMENTATION = 'agent-documentation'
}

/**
 * Required capabilities that can be extracted from goals
 */
export enum RequiredCapability {
  CRUD = 'crud',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  REAL_TIME = 'real_time',
  TESTING = 'testing',
  INTEGRATION = 'integration',
  SECURITY = 'security',
  DATABASE = 'database',
  UI = 'ui',
  DOCUMENTATION = 'documentation',
  API = 'api',
  WEBSOCKET = 'websocket',
  CACHING = 'caching',
  LOGGING = 'logging'
}

/**
 * Task status in execution plan
 */
export enum TaskStatus {
  PENDING = 'pending',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped'
}

/**
 * Task priority levels
 */
export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Parsed goal entity (extracted from natural language)
 */
export interface GoalEntity {
  type: 'resource' | 'feature' | 'integration' | 'security' | 'performance';
  name: string;
  description: string;
  confidence: number; // 0-1
}

/**
 * Parsed goal structure
 */
export interface ParsedGoal {
  originalGoal: string;
  normalizedGoal: string;
  intent: string; // e.g., "build", "add", "integrate", "improve"
  entities: GoalEntity[];
  capabilities: RequiredCapability[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  confidence: number; // 0-1, overall parsing confidence
  suggestedAgents: AgentType[];
  metadata: {
    requiresAuth?: boolean;
    requiresDatabase?: boolean;
    requiresUI?: boolean;
    requiresTesting?: boolean;
    requiresDocumentation?: boolean;
    isIntegration?: boolean;
    affectsExistingCode?: boolean;
  };
}

/**
 * Task in execution plan
 */
export interface Task {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes
  dependencies: string[]; // task IDs that must complete first
  outputs: string[]; // expected outputs (files, endpoints, etc.)
  acceptanceCriteria: string[];
  canRunInParallel: boolean;
  metadata: {
    phase?: string;
    milestone?: string;
    tags?: string[];
    complexity?: number; // 1-10
  };
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

/**
 * Milestone in execution plan
 */
export interface Milestone {
  id: string;
  name: string;
  description: string;
  tasks: string[]; // task IDs
  completionCriteria: string[];
  estimatedCompletion: Date;
  actualCompletion?: Date;
  progress: number; // 0-100
  isBlocking: boolean; // if true, subsequent milestones wait
}

/**
 * Dependency relationship between tasks
 */
export interface TaskDependency {
  fromTaskId: string;
  toTaskId: string;
  type: 'requires' | 'blocks' | 'soft_dependency';
  reason: string;
}

/**
 * Dependency graph for task execution
 */
export interface DependencyGraph {
  nodes: Task[];
  edges: TaskDependency[];
  layers: string[][]; // task IDs grouped by execution layer
  criticalPath: string[]; // task IDs on critical path
}

/**
 * Parallelization opportunity
 */
export interface ParallelizationOpportunity {
  tasks: string[]; // task IDs that can run in parallel
  estimatedTimeSaved: number; // minutes
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Execution plan for a goal
 */
export interface ExecutionPlan {
  id: string;
  goal: string;
  parsedGoal: ParsedGoal;
  tasks: Task[];
  milestones: Milestone[];
  estimatedDuration: number; // total minutes
  estimatedCost?: number; // if applicable
  dependencies: DependencyGraph;
  parallelizationOpportunities: ParallelizationOpportunity[];
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    risks: Array<{
      type: string;
      description: string;
      mitigation: string;
      probability: number; // 0-1
      impact: number; // 0-1
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
}

/**
 * Goal template for common patterns
 */
export interface GoalTemplate {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
  requiredCapabilities: RequiredCapability[];
  suggestedAgents: AgentType[];
  taskTemplate: Omit<Task, 'id' | 'status' | 'startTime' | 'endTime'>[];
  estimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  examples: string[];
}

/**
 * Agent capability mapping
 */
export interface AgentCapability {
  agentType: AgentType;
  capabilities: RequiredCapability[];
  estimatedSpeed: number; // tasks per hour
  successRate: number; // 0-1
  averageDuration: number; // minutes per task
  parallelCapacity: number; // max parallel tasks
}

/**
 * Execution context for plan
 */
export interface ExecutionContext {
  planId: string;
  currentTask?: string; // task ID
  completedTasks: string[]; // task IDs
  failedTasks: string[]; // task IDs
  blockedTasks: string[]; // task IDs
  activeAgents: Array<{
    agentType: AgentType;
    taskId: string;
    startTime: Date;
  }>;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    skippedTasks: number;
    averageTaskDuration: number;
    planProgress: number; // 0-100
    estimatedTimeRemaining: number; // minutes
  };
  events: Array<{
    timestamp: Date;
    type: string;
    taskId?: string;
    message: string;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Plan adaptation event (triggered during execution)
 */
export interface PlanAdaptation {
  id: string;
  planId: string;
  timestamp: Date;
  trigger: 'task_failure' | 'dependency_change' | 'conflict_detected' | 'time_overrun' | 'manual';
  description: string;
  changes: {
    tasksAdded?: Task[];
    tasksRemoved?: string[]; // task IDs
    tasksModified?: Partial<Task>[];
    dependenciesAdded?: TaskDependency[];
    dependenciesRemoved?: string[]; // edge IDs
  };
  reason: string;
  impact: {
    estimatedDurationChange: number; // minutes (+ or -)
    tasksAffected: number;
    riskChange: 'increased' | 'decreased' | 'unchanged';
  };
}

/**
 * Optimization strategy for execution
 */
export interface OptimizationStrategy {
  strategy: 'minimize_duration' | 'minimize_risk' | 'maximize_parallelization' | 'balanced';
  parameters: {
    maxParallelTasks?: number;
    riskTolerance?: 'low' | 'medium' | 'high';
    prioritizeQuality?: boolean;
    allowExperimentalAgents?: boolean;
  };
}

/**
 * Plan validation result
 */
export interface PlanValidationResult {
  isValid: boolean;
  errors: Array<{
    type: 'circular_dependency' | 'missing_dependency' | 'invalid_agent' | 'missing_capability' | 'other';
    message: string;
    taskId?: string;
    severity: 'error' | 'warning';
  }>;
  warnings: string[];
  suggestions: string[];
}

/**
 * Plan execution options
 */
export interface PlanExecutionOptions {
  dryRun?: boolean;
  pauseOnError?: boolean;
  pauseOnConflict?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  notifyOnMilestone?: boolean;
  notifyOnCompletion?: boolean;
  saveCheckpoints?: boolean;
  checkpointInterval?: number; // minutes
}

/**
 * Plan comparison result (for optimization)
 */
export interface PlanComparison {
  plans: ExecutionPlan[];
  comparison: {
    duration: number[]; // minutes for each plan
    risk: string[]; // risk level for each plan
    parallelization: number[]; // percentage for each plan
    cost?: number[]; // if applicable
  };
  recommendation: {
    bestPlanId: string;
    reason: string;
    tradeoffs: string[];
  };
}
