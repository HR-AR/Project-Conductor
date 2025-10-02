/**
 * Orchestrator Models
 * Type definitions for the autonomous orchestration engine
 */

export enum PhaseNumber {
  PHASE_0 = 0,
  PHASE_1 = 1,
  PHASE_2 = 2,
  PHASE_3 = 3,
  PHASE_4 = 4,
  PHASE_5 = 5
}

export enum PhaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked'
}

export enum AgentType {
  API = 'agent-api',
  MODELS = 'agent-models',
  TEST = 'agent-test',
  REALTIME = 'agent-realtime',
  QUALITY = 'agent-quality',
  INTEGRATION = 'agent-integration'
}

export enum AgentStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WAITING = 'waiting'
}

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  status: MilestoneStatus;
  requiredAgents: AgentType[];
  validationFn?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface PhaseDefinition {
  phase: PhaseNumber;
  name: string;
  description: string;
  milestones: Milestone[];
  requiredAgents: AgentType[];
  testCommand: string;
  exitCriteria: string[];
  dependencies: PhaseNumber[];
}

export interface AgentTask {
  id: string;
  agentType: AgentType;
  phase: PhaseNumber;
  milestone: string;
  description: string;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: AgentStatus;
  result?: AgentTaskResult;
  error?: string;
}

export interface AgentTaskResult {
  success: boolean;
  output?: string;
  error?: string;
  filesCreated?: string[];
  filesModified?: string[];
  testsRun?: number;
  testsPassed?: number;
  testsFailed?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentMetrics {
  agentType: AgentType;
  tasksCompleted: number;
  tasksFailed: number;
  averageCompletionTime: number;
  successRate: number;
  lastActiveAt?: Date;
}

export interface OrchestratorState {
  currentPhase: PhaseNumber;
  completedPhases: PhaseNumber[];
  activeAgents: AgentType[];
  phaseStatuses: Record<PhaseNumber, PhaseStatus>;
  milestones: Record<string, Milestone>;
  tasks: AgentTask[];
  metrics: Record<AgentType, AgentMetrics>;
  startedAt: Date;
  lastUpdated: Date;
  autoAdvanceEnabled: boolean;
  errors: ErrorLog[];
}

export interface ErrorLog {
  timestamp: Date;
  phase: PhaseNumber;
  agent?: AgentType;
  milestone?: string;
  error: string;
  stack?: string | undefined;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Lesson {
  id: string;
  timestamp: Date;
  phase: PhaseNumber;
  agent?: AgentType;
  category: 'success' | 'failure' | 'optimization' | 'pattern';
  description: string;
  impact: string;
  actionTaken?: string;
  metadata?: Record<string, unknown>;
}

export interface ProgressSnapshot {
  timestamp: Date;
  phase: PhaseNumber;
  phaseProgress: number;
  overallProgress: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  estimatedCompletion?: Date | undefined;
}

export interface DashboardData {
  currentPhase: PhaseDefinition;
  progress: ProgressSnapshot;
  activeAgents: AgentMetrics[];
  recentMilestones: Milestone[];
  recentErrors: ErrorLog[];
  recentLessons: Lesson[];
  systemHealth: SystemHealth;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  lastHealthCheck: Date;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export interface PhaseTransition {
  from: PhaseNumber;
  to: PhaseNumber;
  timestamp: Date;
  automatic: boolean;
  reason: string;
  testsRun: boolean;
  testsPassed: boolean;
}

export interface AgentConfig {
  type: AgentType;
  enabled: boolean;
  maxConcurrentTasks: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  dependencies: AgentType[];
}

export interface OrchestratorConfig {
  autoAdvance: boolean;
  autoRetry: boolean;
  maxRetries: number;
  phaseTimeout: number;
  healthCheckInterval: number;
  stateBackupInterval: number;
  agents: Record<AgentType, AgentConfig>;
}
