/**
 * Error Recovery Models
 * Type definitions for error handling and recovery strategies
 */

import { AgentType, PhaseNumber } from '../../.temp-orchestrator/models/orchestrator.model';

/**
 * Error type classification
 */
export enum ErrorType {
  TRANSIENT = 'transient',           // Network timeout, rate limit - auto retry
  RETRIABLE = 'retriable',           // Missing dependency, resource locked - retry after delay
  FATAL = 'fatal',                   // Invalid config, permission denied - fail immediately
  CONFLICT = 'conflict'              // Security issue, business rule - pause for human
}

/**
 * Error category for detailed classification
 */
export enum ErrorCategory {
  // Transient errors
  NETWORK_TIMEOUT = 'network_timeout',
  RATE_LIMIT = 'rate_limit',
  CONNECTION_RESET = 'connection_reset',
  SERVICE_UNAVAILABLE = 'service_unavailable',

  // Retriable errors
  RESOURCE_LOCKED = 'resource_locked',
  DEPENDENCY_MISSING = 'dependency_missing',
  TEMPORARY_FAILURE = 'temporary_failure',
  VALIDATION_ERROR = 'validation_error',

  // Fatal errors
  INVALID_CONFIGURATION = 'invalid_configuration',
  PERMISSION_DENIED = 'permission_denied',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  SYNTAX_ERROR = 'syntax_error',
  OUT_OF_MEMORY = 'out_of_memory',

  // Conflict errors
  SECURITY_VULNERABILITY = 'security_vulnerability',
  BUSINESS_RULE_VIOLATION = 'business_rule_violation',
  DATA_INTEGRITY_ISSUE = 'data_integrity_issue',
  POLICY_VIOLATION = 'policy_violation',

  // Unknown
  UNKNOWN = 'unknown'
}

/**
 * Backoff strategy for retries
 */
export enum BackoffStrategy {
  EXPONENTIAL = 'exponential',     // 1s, 2s, 4s, 8s, 16s
  LINEAR = 'linear',               // 1s, 2s, 3s, 4s, 5s
  FIXED = 'fixed',                 // 1s, 1s, 1s, 1s, 1s
  FIBONACCI = 'fibonacci'          // 1s, 1s, 2s, 3s, 5s
}

/**
 * Recovery action to take
 */
export enum RecoveryAction {
  RETRY = 'retry',                   // Retry the operation
  RETRY_WITH_BACKOFF = 'retry_with_backoff',  // Retry with exponential backoff
  SKIP = 'skip',                     // Skip this operation
  ROLLBACK = 'rollback',             // Rollback to checkpoint
  ALTERNATIVE_PATH = 'alternative_path',  // Try different approach
  PAUSE_WORKFLOW = 'pause_workflow', // Pause and notify human
  FAIL_IMMEDIATELY = 'fail_immediately',  // Fail without retry
  CIRCUIT_BREAK = 'circuit_break'    // Stop all retries, system unhealthy
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  strategy: BackoffStrategy;
  baseDelay: number;           // Base delay in milliseconds
  maxDelay: number;            // Maximum delay in milliseconds
  timeout?: number;            // Timeout per attempt in milliseconds
  retryableErrors: ErrorType[];
  circuitBreakerThreshold?: number;  // Number of failures before circuit break
}

/**
 * Default retry configurations by error type
 */
export const DEFAULT_RETRY_CONFIGS: Record<ErrorType, RetryConfig> = {
  [ErrorType.TRANSIENT]: {
    maxAttempts: 5,
    strategy: BackoffStrategy.EXPONENTIAL,
    baseDelay: 1000,
    maxDelay: 16000,
    timeout: 30000,
    retryableErrors: [ErrorType.TRANSIENT],
    circuitBreakerThreshold: 10
  },
  [ErrorType.RETRIABLE]: {
    maxAttempts: 3,
    strategy: BackoffStrategy.LINEAR,
    baseDelay: 2000,
    maxDelay: 10000,
    timeout: 60000,
    retryableErrors: [ErrorType.RETRIABLE],
    circuitBreakerThreshold: 5
  },
  [ErrorType.FATAL]: {
    maxAttempts: 0,  // No retries for fatal errors
    strategy: BackoffStrategy.FIXED,
    baseDelay: 0,
    maxDelay: 0,
    retryableErrors: []
  },
  [ErrorType.CONFLICT]: {
    maxAttempts: 0,  // No retries for conflicts
    strategy: BackoffStrategy.FIXED,
    baseDelay: 0,
    maxDelay: 0,
    retryableErrors: []
  }
};

/**
 * Error classification result
 */
export interface ErrorClassification {
  type: ErrorType;
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoveryAction: RecoveryAction;
  retryable: boolean;
  requiresHumanIntervention: boolean;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Retry attempt record
 */
export interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  delayMs: number;
  error?: string;
  success: boolean;
}

/**
 * Retry history for tracking all attempts
 */
export interface RetryHistory {
  operationId: string;
  agentType?: AgentType;
  phase?: PhaseNumber;
  totalAttempts: number;
  attempts: RetryAttempt[];
  finalSuccess: boolean;
  totalDuration: number;  // Total time in milliseconds
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Checkpoint for state rollback
 */
export interface Checkpoint {
  id: string;
  timestamp: Date;
  phase: PhaseNumber;
  state: Record<string, unknown>;  // Serialized state
  agentStates: Map<AgentType, unknown>;
  metadata: {
    description: string;
    automatic: boolean;
    triggeredBy?: string;
  };
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  agentType?: AgentType;
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: Date;
  openedAt?: Date;
  resetAt?: Date;
  threshold: number;
  windowMs: number;  // Time window for counting failures
}

/**
 * Error context for logging
 */
export interface ErrorContext {
  operationId: string;
  agentType?: AgentType;
  phase?: PhaseNumber;
  taskId?: string;
  timestamp: Date;
  attemptNumber?: number;
  additionalData?: Record<string, unknown>;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message: string;
  retriesUsed?: number;
  checkpointRestored?: string;
  alternativePathUsed?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent error details
 */
export interface AgentError extends Error {
  type: ErrorType;
  category: ErrorCategory;
  agentType?: AgentType;
  taskId?: string;
  phase?: PhaseNumber;
  retryable: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Error classification matrix entry
 */
export interface ErrorClassificationRule {
  pattern: RegExp | string;
  type: ErrorType;
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoveryAction: RecoveryAction;
}

/**
 * Error classification matrix
 */
export const ERROR_CLASSIFICATION_MATRIX: ErrorClassificationRule[] = [
  // Transient errors
  {
    pattern: /timeout|timed out|ETIMEDOUT|ECONNRESET/i,
    type: ErrorType.TRANSIENT,
    category: ErrorCategory.NETWORK_TIMEOUT,
    severity: 'low',
    recoveryAction: RecoveryAction.RETRY_WITH_BACKOFF
  },
  {
    pattern: /rate limit|too many requests|429/i,
    type: ErrorType.TRANSIENT,
    category: ErrorCategory.RATE_LIMIT,
    severity: 'medium',
    recoveryAction: RecoveryAction.RETRY_WITH_BACKOFF
  },
  {
    pattern: /connection reset|ECONNREFUSED|ENOTFOUND/i,
    type: ErrorType.TRANSIENT,
    category: ErrorCategory.CONNECTION_RESET,
    severity: 'medium',
    recoveryAction: RecoveryAction.RETRY_WITH_BACKOFF
  },
  {
    pattern: /service unavailable|503|502|504/i,
    type: ErrorType.TRANSIENT,
    category: ErrorCategory.SERVICE_UNAVAILABLE,
    severity: 'medium',
    recoveryAction: RecoveryAction.RETRY_WITH_BACKOFF
  },

  // Retriable errors
  {
    pattern: /locked|EBUSY|resource busy/i,
    type: ErrorType.RETRIABLE,
    category: ErrorCategory.RESOURCE_LOCKED,
    severity: 'medium',
    recoveryAction: RecoveryAction.RETRY_WITH_BACKOFF
  },
  {
    pattern: /dependency|prerequisite|not found/i,
    type: ErrorType.RETRIABLE,
    category: ErrorCategory.DEPENDENCY_MISSING,
    severity: 'medium',
    recoveryAction: RecoveryAction.RETRY
  },
  {
    pattern: /validation failed|invalid input/i,
    type: ErrorType.RETRIABLE,
    category: ErrorCategory.VALIDATION_ERROR,
    severity: 'medium',
    recoveryAction: RecoveryAction.ALTERNATIVE_PATH
  },
  {
    pattern: /temporary failure|try again/i,
    type: ErrorType.RETRIABLE,
    category: ErrorCategory.TEMPORARY_FAILURE,
    severity: 'low',
    recoveryAction: RecoveryAction.RETRY
  },

  // Fatal errors
  {
    pattern: /permission denied|EACCES|unauthorized|403|401/i,
    type: ErrorType.FATAL,
    category: ErrorCategory.PERMISSION_DENIED,
    severity: 'critical',
    recoveryAction: RecoveryAction.FAIL_IMMEDIATELY
  },
  {
    pattern: /invalid config|configuration error|EINVAL/i,
    type: ErrorType.FATAL,
    category: ErrorCategory.INVALID_CONFIGURATION,
    severity: 'critical',
    recoveryAction: RecoveryAction.FAIL_IMMEDIATELY
  },
  {
    pattern: /not found|ENOENT|404/i,
    type: ErrorType.FATAL,
    category: ErrorCategory.RESOURCE_NOT_FOUND,
    severity: 'high',
    recoveryAction: RecoveryAction.FAIL_IMMEDIATELY
  },
  {
    pattern: /syntax error|parse error|malformed/i,
    type: ErrorType.FATAL,
    category: ErrorCategory.SYNTAX_ERROR,
    severity: 'high',
    recoveryAction: RecoveryAction.FAIL_IMMEDIATELY
  },
  {
    pattern: /out of memory|ENOMEM|heap|memory limit/i,
    type: ErrorType.FATAL,
    category: ErrorCategory.OUT_OF_MEMORY,
    severity: 'critical',
    recoveryAction: RecoveryAction.CIRCUIT_BREAK
  },

  // Conflict errors
  {
    pattern: /security|vulnerability|CVE|exploit/i,
    type: ErrorType.CONFLICT,
    category: ErrorCategory.SECURITY_VULNERABILITY,
    severity: 'critical',
    recoveryAction: RecoveryAction.PAUSE_WORKFLOW
  },
  {
    pattern: /business rule|policy|compliance/i,
    type: ErrorType.CONFLICT,
    category: ErrorCategory.BUSINESS_RULE_VIOLATION,
    severity: 'high',
    recoveryAction: RecoveryAction.PAUSE_WORKFLOW
  },
  {
    pattern: /integrity|constraint|conflict/i,
    type: ErrorType.CONFLICT,
    category: ErrorCategory.DATA_INTEGRITY_ISSUE,
    severity: 'high',
    recoveryAction: RecoveryAction.PAUSE_WORKFLOW
  }
];
