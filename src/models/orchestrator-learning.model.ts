/**
 * Orchestrator Learning System Models
 * Data structures for self-learning and optimization
 */

// Execution status types
export type ExecutionStatus =
  | 'success'
  | 'failed'
  | 'retried'
  | 'conflict'
  | 'timeout'
  | 'cancelled';

// Lesson types
export type LessonType =
  | 'agent_selection'
  | 'task_ordering'
  | 'time_estimation'
  | 'error_prevention'
  | 'parallel_execution'
  | 'dependency_optimization'
  | 'resource_allocation';

// Agent types
export type AgentType =
  | 'Agent-API'
  | 'Agent-Models'
  | 'Agent-Test'
  | 'Agent-Realtime'
  | 'Agent-Quality'
  | 'Agent-Integration'
  | 'Agent-Frontend'
  | 'Agent-Database'
  | 'Agent-Documentation';

// Task types
export type TaskType =
  | 'api_implementation'
  | 'database_migration'
  | 'testing'
  | 'model_definition'
  | 'websocket_feature'
  | 'ui_implementation'
  | 'integration'
  | 'documentation'
  | 'bug_fix'
  | 'optimization'
  | 'refactoring';

/**
 * Execution Record - Single task execution
 */
export interface ExecutionRecord {
  id?: string;
  goal: string;
  goalHash?: string;
  agentType: AgentType;
  taskDescription: string;
  taskType?: TaskType;
  estimatedDurationMs?: number;
  actualDurationMs?: number;
  startedAt: Date;
  completedAt?: Date;
  status: ExecutionStatus;
  retryCount?: number;
  errorType?: string;
  errorMessage?: string;
  errorStack?: string;
  context?: ExecutionContext;
  dependencies?: string[];
  parallelExecution?: boolean;
  cpuUsagePercent?: number;
  memoryUsageMb?: number;
  orchestratorVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Execution Context - Additional metadata about execution
 */
export interface ExecutionContext {
  environment?: string;
  nodeVersion?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  dependentTasks?: string[];
  prerequisites?: string[];
  resources?: {
    databaseConnections?: number;
    apiCalls?: number;
    fileOperations?: number;
  };
  [key: string]: any;
}

/**
 * Lesson - Learned pattern and recommendation
 */
export interface Lesson {
  id?: string;
  lessonType: LessonType;
  pattern: LessonPattern;
  patternHash?: string;
  recommendation: string;
  alternativeAgent?: AgentType;
  optimalOrder?: number;
  confidenceScore: number; // 0-1
  effectivenessScore?: number; // 0-1
  timesApplied?: number;
  timesSuccessful?: number;
  timesFailed?: number;
  sampleExecutionIds?: string[];
  firstObservedAt?: Date;
  lastAppliedAt?: Date;
  lastSuccessfulAt?: Date;
  createdBy?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Lesson Pattern - Structure describing a recognized pattern
 */
export interface LessonPattern {
  agentType?: AgentType;
  taskType?: TaskType;
  conditions?: {
    minRetryCount?: number;
    maxDurationMs?: number;
    errorPattern?: string;
    contextMatches?: Record<string, any>;
  };
  historicalMetrics?: {
    avgDurationMs?: number;
    successRate?: number;
    commonErrors?: string[];
  };
  [key: string]: any;
}

/**
 * Agent Performance - Aggregated metrics per agent
 */
export interface AgentPerformance {
  id?: string;
  agentType: AgentType;
  taskType: TaskType;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDurationMs?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  p50DurationMs?: number; // Median
  p95DurationMs?: number;
  p99DurationMs?: number;
  successRate: number;
  commonErrors?: ErrorSummary[];
  avgCpuUsagePercent?: number;
  avgMemoryUsageMb?: number;
  lastExecutionAt?: Date;
  metricsUpdatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Error Summary - Common error tracking
 */
export interface ErrorSummary {
  errorType: string;
  count: number;
  lastOccurrence: Date;
  exampleMessage?: string;
}

/**
 * Workflow Pattern - Successful execution sequence
 */
export interface WorkflowPattern {
  id?: string;
  goalHash: string;
  goalDescription: string;
  taskSequence: TaskExecution[];
  totalDurationMs: number;
  parallelSegments?: TaskExecution[][];
  executionCount: number;
  successCount: number;
  avgDurationMs?: number;
  optimizationScore?: number; // 0-1
  bottleneckTasks?: string[];
  firstExecutionId?: string;
  lastExecutionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Task Execution - Single task in a workflow
 */
export interface TaskExecution {
  agentType: AgentType;
  taskType: TaskType;
  taskDescription: string;
  durationMs: number;
  order: number;
  parallelGroup?: number; // Tasks with same group number run in parallel
}

/**
 * Recommendation - Optimization suggestion
 */
export interface Recommendation {
  type: LessonType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  currentApproach?: string;
  suggestedApproach: string;
  expectedImprovement?: {
    timeReduction?: string;
    successRateIncrease?: string;
    resourceSavings?: string;
  };
  confidenceScore: number;
  lessonId?: string;
  applicableContext?: Record<string, any>;
}

/**
 * Failure Pattern - Common failure scenario
 */
export interface FailurePattern {
  pattern: string;
  agentType?: AgentType;
  taskType?: TaskType;
  occurrences: number;
  errorType: string;
  commonContext?: Record<string, any>;
  recommendedFix?: string;
  preventionLesson?: Lesson;
}

/**
 * Learning Stats - Overall learning system statistics
 */
export interface LearningStats {
  totalExecutions: number;
  totalLessons: number;
  avgConfidenceScore: number;
  avgEffectivenessScore: number;
  topPerformingAgents: Array<{
    agentType: AgentType;
    successRate: number;
    avgDurationMs: number;
  }>;
  commonFailurePatterns: FailurePattern[];
  recentImprovements: Array<{
    lessonType: LessonType;
    improvementPercent: number;
    description: string;
  }>;
  optimizationPotential: number; // 0-100, how much room for improvement
}

/**
 * Task Prediction - Predicted execution metrics
 */
export interface TaskPrediction {
  agentType: AgentType;
  taskType: TaskType;
  predictedDurationMs: number;
  confidenceInterval: {
    min: number;
    max: number;
  };
  successProbability: number;
  riskFactors?: string[];
  alternativeAgents?: Array<{
    agentType: AgentType;
    predictedDurationMs: number;
    successProbability: number;
  }>;
}

/**
 * Optimization Opportunity - Identified improvement area
 */
export interface OptimizationOpportunity {
  type: 'parallelization' | 'agent_switch' | 'task_reorder' | 'caching' | 'skip';
  title: string;
  description: string;
  currentCost: number; // Time in ms
  optimizedCost: number; // Time in ms after optimization
  savings: number; // Time saved in ms
  savingsPercent: number;
  difficulty: 'easy' | 'medium' | 'hard';
  recommendation: string;
  confidence: number;
}

/**
 * Create Execution Record Request
 */
export interface CreateExecutionRecordRequest {
  goal: string;
  agentType: AgentType;
  taskDescription: string;
  taskType?: TaskType;
  estimatedDurationMs?: number;
  context?: ExecutionContext;
  dependencies?: string[];
  parallelExecution?: boolean;
}

/**
 * Update Execution Record Request
 */
export interface UpdateExecutionRecordRequest {
  actualDurationMs: number;
  status: ExecutionStatus;
  completedAt: Date;
  errorType?: string;
  errorMessage?: string;
  errorStack?: string;
  cpuUsagePercent?: number;
  memoryUsageMb?: number;
}

/**
 * Get Recommendations Request
 */
export interface GetRecommendationsRequest {
  goal: string;
  taskType?: TaskType;
  context?: Record<string, any>;
  limit?: number;
}

/**
 * Analysis Options
 */
export interface AnalysisOptions {
  lookbackDays?: number;
  minConfidence?: number;
  includeFailures?: boolean;
  agentTypes?: AgentType[];
  taskTypes?: TaskType[];
}
