/**
 * Error Handler Service
 * Handles error classification, recovery strategies, and checkpoint management
 */

import {
  AgentError,
  ErrorType,
  ErrorCategory,
  ErrorClassification,
  RecoveryAction,
  RecoveryResult,
  Checkpoint,
  ErrorContext,
  ERROR_CLASSIFICATION_MATRIX
} from '../../models/error-recovery.model';
import {
  AgentType,
  PhaseNumber,
  OrchestratorState,
  ErrorLog
} from '../../../.temp-orchestrator/models/orchestrator.model';
import logger from '../../../.temp-orchestrator/utils/logger';

export class ErrorHandler {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private checkpointSequence: number = 0;
  private maxCheckpoints: number = 10;

  constructor(maxCheckpoints?: number) {
    if (maxCheckpoints) {
      this.maxCheckpoints = maxCheckpoints;
    }
  }

  /**
   * Handle an agent error and determine recovery action
   */
  handleAgentError(error: Error, context?: Partial<ErrorContext>): RecoveryResult {
    // Classify the error
    const classification = this.classifyError(error);

    logger.info('Handling agent error', {
      errorType: classification.type,
      category: classification.category,
      severity: classification.severity,
      recoveryAction: classification.recoveryAction,
      ...context
    });

    // Log the error with full context
    this.logError(error, {
      operationId: context?.operationId || 'unknown',
      timestamp: new Date(),
      ...context
    });

    // Determine and execute recovery action
    return this.executeRecoveryAction(classification, error, context);
  }

  /**
   * Classify an error
   */
  classifyError(error: Error): ErrorClassification {
    const errorMessage = error.message;

    // Check if error is already classified
    if (this.isAgentError(error)) {
      const agentError = error as AgentError;
      return {
        type: agentError.type,
        category: agentError.category,
        severity: this.getSeverityForCategory(agentError.category),
        recoveryAction: this.getRecoveryActionForType(agentError.type),
        retryable: agentError.retryable,
        requiresHumanIntervention: agentError.type === ErrorType.CONFLICT || agentError.type === ErrorType.FATAL,
        message: errorMessage,
        context: agentError.metadata
      };
    }

    // Check against classification matrix
    for (const rule of ERROR_CLASSIFICATION_MATRIX) {
      const pattern = typeof rule.pattern === 'string'
        ? new RegExp(rule.pattern, 'i')
        : rule.pattern;

      if (pattern.test(errorMessage)) {
        return {
          type: rule.type,
          category: rule.category,
          severity: rule.severity,
          recoveryAction: rule.recoveryAction,
          retryable: rule.type === ErrorType.TRANSIENT || rule.type === ErrorType.RETRIABLE,
          requiresHumanIntervention: rule.type === ErrorType.CONFLICT || rule.type === ErrorType.FATAL,
          message: errorMessage
        };
      }
    }

    // Default classification
    return {
      type: ErrorType.RETRIABLE,
      category: ErrorCategory.UNKNOWN,
      severity: 'medium',
      recoveryAction: RecoveryAction.RETRY,
      retryable: true,
      requiresHumanIntervention: false,
      message: errorMessage
    };
  }

  /**
   * Execute recovery action based on error classification
   */
  private executeRecoveryAction(
    classification: ErrorClassification,
    error: Error,
    context?: Partial<ErrorContext>
  ): RecoveryResult {
    switch (classification.recoveryAction) {
      case RecoveryAction.RETRY:
      case RecoveryAction.RETRY_WITH_BACKOFF:
        return {
          success: false,
          action: classification.recoveryAction,
          message: `Will retry operation (error type: ${classification.type})`,
          error: error.message
        };

      case RecoveryAction.FAIL_IMMEDIATELY:
        logger.error('Fatal error - failing immediately', {
          errorType: classification.type,
          category: classification.category,
          ...context
        });
        return {
          success: false,
          action: RecoveryAction.FAIL_IMMEDIATELY,
          message: `Fatal error: ${error.message}`,
          error: error.message
        };

      case RecoveryAction.PAUSE_WORKFLOW:
        logger.warn('Conflict detected - pausing workflow', {
          errorType: classification.type,
          category: classification.category,
          ...context
        });
        return {
          success: false,
          action: RecoveryAction.PAUSE_WORKFLOW,
          message: `Workflow paused due to ${classification.category}`,
          error: error.message,
          metadata: {
            requiresHumanIntervention: true,
            severity: classification.severity
          }
        };

      case RecoveryAction.ROLLBACK:
        logger.info('Attempting rollback to last checkpoint', context);
        const rollbackResult = this.rollbackToLastCheckpoint();
        return {
          success: rollbackResult !== null,
          action: RecoveryAction.ROLLBACK,
          message: rollbackResult
            ? `Rolled back to checkpoint ${rollbackResult.id}`
            : 'No checkpoint available for rollback',
          checkpointRestored: rollbackResult?.id,
          error: rollbackResult ? undefined : 'No checkpoint available'
        };

      case RecoveryAction.ALTERNATIVE_PATH:
        logger.info('Attempting alternative path', context);
        return {
          success: false,
          action: RecoveryAction.ALTERNATIVE_PATH,
          message: 'Will attempt alternative approach',
          alternativePathUsed: true,
          error: error.message
        };

      case RecoveryAction.CIRCUIT_BREAK:
        logger.error('Circuit breaker triggered - system unhealthy', {
          errorType: classification.type,
          category: classification.category,
          ...context
        });
        return {
          success: false,
          action: RecoveryAction.CIRCUIT_BREAK,
          message: 'System unhealthy - circuit breaker activated',
          error: error.message
        };

      case RecoveryAction.SKIP:
        logger.warn('Skipping operation', context);
        return {
          success: true,  // Consider skip as success
          action: RecoveryAction.SKIP,
          message: 'Operation skipped',
          error: error.message
        };

      default:
        return {
          success: false,
          action: RecoveryAction.FAIL_IMMEDIATELY,
          message: `Unknown recovery action: ${classification.recoveryAction}`,
          error: error.message
        };
    }
  }

  /**
   * Create a checkpoint for potential rollback
   */
  createCheckpoint(
    state: OrchestratorState,
    description: string,
    automatic: boolean = true,
    triggeredBy?: string
  ): Checkpoint {
    this.checkpointSequence++;
    const checkpoint: Checkpoint = {
      id: `checkpoint-${this.checkpointSequence}`,
      timestamp: new Date(),
      phase: state.currentPhase,
      state: this.serializeState(state),
      agentStates: new Map(),  // Could be extended to store agent-specific state
      metadata: {
        description,
        automatic,
        triggeredBy
      }
    };

    this.checkpoints.set(checkpoint.id, checkpoint);

    // Maintain max checkpoints limit
    if (this.checkpoints.size > this.maxCheckpoints) {
      const oldestKey = Array.from(this.checkpoints.keys())[0];
      this.checkpoints.delete(oldestKey);
      logger.info('Removed oldest checkpoint', { checkpointId: oldestKey });
    }

    logger.info('Checkpoint created', {
      checkpointId: checkpoint.id,
      phase: checkpoint.phase,
      description
    });

    return checkpoint;
  }

  /**
   * Rollback to a specific checkpoint
   */
  async rollback(checkpointId: string): Promise<OrchestratorState | null> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      logger.error('Checkpoint not found', { checkpointId });
      return null;
    }

    logger.info('Rolling back to checkpoint', {
      checkpointId: checkpoint.id,
      phase: checkpoint.phase,
      timestamp: checkpoint.timestamp
    });

    // Deserialize state
    const state = this.deserializeState(checkpoint.state);

    return state;
  }

  /**
   * Rollback to the last checkpoint
   */
  rollbackToLastCheckpoint(): Checkpoint | null {
    const checkpoints = Array.from(this.checkpoints.values());
    if (checkpoints.length === 0) {
      return null;
    }

    // Get most recent checkpoint
    const lastCheckpoint = checkpoints[checkpoints.length - 1];
    logger.info('Rolling back to last checkpoint', {
      checkpointId: lastCheckpoint.id,
      phase: lastCheckpoint.phase
    });

    return lastCheckpoint;
  }

  /**
   * Get all checkpoints
   */
  getCheckpoints(): Checkpoint[] {
    return Array.from(this.checkpoints.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get checkpoint by ID
   */
  getCheckpoint(checkpointId: string): Checkpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * Delete a checkpoint
   */
  deleteCheckpoint(checkpointId: string): boolean {
    return this.checkpoints.delete(checkpointId);
  }

  /**
   * Clear all checkpoints
   */
  clearCheckpoints(): void {
    this.checkpoints.clear();
    this.checkpointSequence = 0;
    logger.info('All checkpoints cleared');
  }

  /**
   * Log error with full context
   */
  logError(error: Error, context: ErrorContext): void {
    const classification = this.classifyError(error);

    logger.error('Error logged', {
      error: error.message,
      stack: error.stack,
      errorType: classification.type,
      category: classification.category,
      severity: classification.severity,
      ...context
    });
  }

  /**
   * Convert error to ErrorLog format
   */
  toErrorLog(error: Error, context: Partial<ErrorContext>): ErrorLog {
    const classification = this.classifyError(error);

    return {
      timestamp: context.timestamp || new Date(),
      phase: context.phase || (0 as PhaseNumber),
      agent: context.agentType,
      error: error.message,
      stack: error.stack,
      severity: classification.severity
    };
  }

  /**
   * Create an AgentError
   */
  createAgentError(
    message: string,
    type: ErrorType,
    category: ErrorCategory,
    agentType?: AgentType,
    taskId?: string,
    metadata?: Record<string, unknown>
  ): AgentError {
    const error = new Error(message) as AgentError;
    error.type = type;
    error.category = category;
    error.agentType = agentType;
    error.taskId = taskId;
    error.retryable = type === ErrorType.TRANSIENT || type === ErrorType.RETRIABLE;
    error.metadata = metadata;

    return error;
  }

  /**
   * Check if error is an AgentError
   */
  private isAgentError(error: Error): boolean {
    return 'type' in error && 'category' in error && 'retryable' in error;
  }

  /**
   * Get severity for error category
   */
  private getSeverityForCategory(category: ErrorCategory): 'low' | 'medium' | 'high' | 'critical' {
    const categorySeverityMap: Record<ErrorCategory, 'low' | 'medium' | 'high' | 'critical'> = {
      [ErrorCategory.NETWORK_TIMEOUT]: 'low',
      [ErrorCategory.RATE_LIMIT]: 'medium',
      [ErrorCategory.CONNECTION_RESET]: 'medium',
      [ErrorCategory.SERVICE_UNAVAILABLE]: 'medium',
      [ErrorCategory.RESOURCE_LOCKED]: 'medium',
      [ErrorCategory.DEPENDENCY_MISSING]: 'medium',
      [ErrorCategory.TEMPORARY_FAILURE]: 'low',
      [ErrorCategory.VALIDATION_ERROR]: 'medium',
      [ErrorCategory.INVALID_CONFIGURATION]: 'critical',
      [ErrorCategory.PERMISSION_DENIED]: 'critical',
      [ErrorCategory.RESOURCE_NOT_FOUND]: 'high',
      [ErrorCategory.SYNTAX_ERROR]: 'high',
      [ErrorCategory.OUT_OF_MEMORY]: 'critical',
      [ErrorCategory.SECURITY_VULNERABILITY]: 'critical',
      [ErrorCategory.BUSINESS_RULE_VIOLATION]: 'high',
      [ErrorCategory.DATA_INTEGRITY_ISSUE]: 'high',
      [ErrorCategory.POLICY_VIOLATION]: 'high',
      [ErrorCategory.UNKNOWN]: 'medium'
    };

    return categorySeverityMap[category] || 'medium';
  }

  /**
   * Get recovery action for error type
   */
  private getRecoveryActionForType(type: ErrorType): RecoveryAction {
    const typeActionMap: Record<ErrorType, RecoveryAction> = {
      [ErrorType.TRANSIENT]: RecoveryAction.RETRY_WITH_BACKOFF,
      [ErrorType.RETRIABLE]: RecoveryAction.RETRY,
      [ErrorType.FATAL]: RecoveryAction.FAIL_IMMEDIATELY,
      [ErrorType.CONFLICT]: RecoveryAction.PAUSE_WORKFLOW
    };

    return typeActionMap[type];
  }

  /**
   * Serialize orchestrator state for checkpoint
   */
  private serializeState(state: OrchestratorState): Record<string, unknown> {
    return {
      currentPhase: state.currentPhase,
      completedPhases: state.completedPhases,
      activeAgents: state.activeAgents,
      phaseStatuses: state.phaseStatuses,
      milestones: state.milestones,
      tasks: state.tasks,
      metrics: state.metrics,
      startedAt: state.startedAt,
      lastUpdated: state.lastUpdated,
      autoAdvanceEnabled: state.autoAdvanceEnabled
    };
  }

  /**
   * Deserialize orchestrator state from checkpoint
   */
  private deserializeState(serialized: Record<string, unknown>): OrchestratorState {
    return serialized as unknown as OrchestratorState;
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    totalCheckpoints: number;
    oldestCheckpoint?: Date;
    newestCheckpoint?: Date;
  } {
    const checkpoints = Array.from(this.checkpoints.values());
    const timestamps = checkpoints.map(c => c.timestamp.getTime());

    return {
      totalCheckpoints: checkpoints.length,
      oldestCheckpoint: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
      newestCheckpoint: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined
    };
  }
}
