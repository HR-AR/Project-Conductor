/**
 * Retry Manager Service
 * Handles retry logic with exponential backoff and circuit breaker pattern
 */

import {
  ErrorType,
  ErrorCategory,
  BackoffStrategy,
  RetryConfig,
  RetryAttempt,
  RetryHistory,
  CircuitBreakerState,
  ErrorContext,
  DEFAULT_RETRY_CONFIGS,
  ERROR_CLASSIFICATION_MATRIX,
  ErrorClassification,
  RecoveryAction
} from '../../models/error-recovery.model';
import { AgentType, PhaseNumber } from '../../../.temp-orchestrator/models/orchestrator.model';
import logger from '../../../.temp-orchestrator/utils/logger';

export class RetryManager {
  private retryHistories: Map<string, RetryHistory> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly defaultConfig: RetryConfig;

  constructor(defaultConfig?: Partial<RetryConfig>) {
    this.defaultConfig = {
      maxAttempts: 5,
      strategy: BackoffStrategy.EXPONENTIAL,
      baseDelay: 1000,
      maxDelay: 16000,
      timeout: 30000,
      retryableErrors: [ErrorType.TRANSIENT, ErrorType.RETRIABLE],
      circuitBreakerThreshold: 10,
      ...defaultConfig
    };
  }

  /**
   * Execute an operation with automatic retry logic
   */
  async executeWithRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: Partial<ErrorContext>
  ): Promise<T> {
    const retryConfig: RetryConfig = { ...this.defaultConfig, ...config };
    const operationContext: ErrorContext = {
      operationId,
      timestamp: new Date(),
      ...context
    };

    // Check circuit breaker
    const circuitBreakerKey = this.getCircuitBreakerKey(context?.agentType);
    if (this.isCircuitOpen(circuitBreakerKey)) {
      const error = new Error('Circuit breaker is open - system unhealthy');
      logger.error('Circuit breaker open', { operationId, circuitBreakerKey });
      throw error;
    }

    // Initialize retry history
    const history: RetryHistory = {
      operationId,
      agentType: context?.agentType,
      phase: context?.phase,
      totalAttempts: 0,
      attempts: [],
      finalSuccess: false,
      totalDuration: 0,
      createdAt: new Date()
    };

    const startTime = Date.now();
    let lastError: Error | undefined;

    // Attempt the operation with retries
    for (let attempt = 1; attempt <= retryConfig.maxAttempts + 1; attempt++) {
      const attemptStartTime = Date.now();

      try {
        logger.info('Executing operation', {
          operationId,
          attempt,
          maxAttempts: retryConfig.maxAttempts + 1
        });

        // Execute with timeout if specified
        const result = retryConfig.timeout
          ? await this.executeWithTimeout(operation, retryConfig.timeout)
          : await operation();

        // Success - record attempt and return
        const attemptDuration = Date.now() - attemptStartTime;
        history.attempts.push({
          attemptNumber: attempt,
          timestamp: new Date(),
          delayMs: 0,
          success: true
        });
        history.totalAttempts = attempt;
        history.finalSuccess = true;
        history.totalDuration = Date.now() - startTime;
        history.completedAt = new Date();

        this.retryHistories.set(operationId, history);

        // Reset circuit breaker on success
        this.recordSuccess(circuitBreakerKey);

        logger.info('Operation succeeded', {
          operationId,
          attempt,
          duration: attemptDuration
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        const attemptDuration = Date.now() - attemptStartTime;

        // Classify error
        const classification = this.classifyError(lastError);

        logger.warn('Operation attempt failed', {
          operationId,
          attempt,
          error: lastError.message,
          errorType: classification.type,
          errorCategory: classification.category,
          duration: attemptDuration
        });

        // Record attempt
        history.attempts.push({
          attemptNumber: attempt,
          timestamp: new Date(),
          delayMs: 0,
          error: lastError.message,
          success: false
        });

        // Check if we should retry
        if (attempt > retryConfig.maxAttempts || !this.shouldRetry(lastError, attempt, retryConfig)) {
          // No more retries - record failure
          history.totalAttempts = attempt;
          history.finalSuccess = false;
          history.totalDuration = Date.now() - startTime;
          history.completedAt = new Date();
          this.retryHistories.set(operationId, history);

          // Record circuit breaker failure
          this.recordFailure(circuitBreakerKey, retryConfig.circuitBreakerThreshold || 10);

          logger.error('Operation failed after retries', {
            operationId,
            totalAttempts: attempt,
            totalDuration: history.totalDuration,
            errorType: classification.type
          });

          // Log error context
          this.logError(lastError, {
            ...operationContext,
            attemptNumber: attempt
          });

          throw lastError;
        }

        // Calculate backoff delay
        const delay = this.getBackoffDelay(attempt, retryConfig.strategy, retryConfig);

        logger.info('Retrying operation after delay', {
          operationId,
          attempt,
          nextAttempt: attempt + 1,
          delayMs: delay
        });

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs this
    throw lastError || new Error('Operation failed with unknown error');
  }

  /**
   * Classify an error into type and category
   */
  classifyError(error: Error): ErrorClassification {
    const errorMessage = error.message;

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

    // Default classification for unknown errors
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
   * Determine if an error should be retried
   */
  shouldRetry(error: Error, attempt: number, config: RetryConfig): boolean {
    // Classify error
    const classification = this.classifyError(error);

    // Check if error type is retryable
    if (!config.retryableErrors.includes(classification.type)) {
      logger.info('Error not retryable', {
        errorType: classification.type,
        category: classification.category
      });
      return false;
    }

    // Check max attempts
    if (attempt >= config.maxAttempts) {
      logger.info('Max retry attempts reached', {
        attempt,
        maxAttempts: config.maxAttempts
      });
      return false;
    }

    return true;
  }

  /**
   * Calculate backoff delay based on strategy
   */
  getBackoffDelay(
    attempt: number,
    strategy: BackoffStrategy,
    config: RetryConfig
  ): number {
    let delay: number;

    switch (strategy) {
      case BackoffStrategy.EXPONENTIAL:
        // 1s, 2s, 4s, 8s, 16s
        delay = config.baseDelay * Math.pow(2, attempt - 1);
        break;

      case BackoffStrategy.LINEAR:
        // 1s, 2s, 3s, 4s, 5s
        delay = config.baseDelay * attempt;
        break;

      case BackoffStrategy.FIBONACCI:
        // 1s, 1s, 2s, 3s, 5s, 8s, 13s
        delay = config.baseDelay * this.fibonacci(attempt);
        break;

      case BackoffStrategy.FIXED:
        // 1s, 1s, 1s, 1s, 1s
        delay = config.baseDelay;
        break;

      default:
        delay = config.baseDelay;
    }

    // Add jitter (random 0-20% variation to prevent thundering herd)
    const jitter = delay * 0.2 * Math.random();
    delay = delay + jitter;

    // Cap at maximum delay
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Calculate Fibonacci number for backoff
   */
  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    if (n === 2) return 1;

    let prev = 1, curr = 1;
    for (let i = 3; i <= n; i++) {
      const next = prev + curr;
      prev = curr;
      curr = next;
    }
    return curr;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(key: string): boolean {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker || !breaker.isOpen) {
      return false;
    }

    // Check if circuit should be reset (5 minutes after opening)
    const resetTime = breaker.openedAt!.getTime() + (breaker.windowMs || 300000);
    if (Date.now() > resetTime) {
      logger.info('Circuit breaker reset', { key });
      this.circuitBreakers.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Record a failure for circuit breaker
   */
  private recordFailure(key: string, threshold: number): void {
    let breaker = this.circuitBreakers.get(key);

    if (!breaker) {
      breaker = {
        isOpen: false,
        failureCount: 0,
        threshold,
        windowMs: 300000  // 5 minutes
      };
      this.circuitBreakers.set(key, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    // Open circuit if threshold exceeded
    if (breaker.failureCount >= threshold && !breaker.isOpen) {
      breaker.isOpen = true;
      breaker.openedAt = new Date();
      logger.warn('Circuit breaker opened', {
        key,
        failureCount: breaker.failureCount,
        threshold
      });
    }
  }

  /**
   * Record a success for circuit breaker
   */
  private recordSuccess(key: string): void {
    const breaker = this.circuitBreakers.get(key);
    if (breaker) {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      if (breaker.failureCount === 0) {
        this.circuitBreakers.delete(key);
        logger.info('Circuit breaker reset after success', { key });
      }
    }
  }

  /**
   * Get circuit breaker key
   */
  private getCircuitBreakerKey(agentType?: AgentType): string {
    return agentType || 'global';
  }

  /**
   * Log error with full context
   */
  private logError(error: Error, context: ErrorContext): void {
    logger.error('Operation error', {
      error: error.message,
      stack: error.stack,
      ...context
    });
  }

  /**
   * Get retry history for an operation
   */
  getRetryHistory(operationId: string): RetryHistory | undefined {
    return this.retryHistories.get(operationId);
  }

  /**
   * Get all retry histories
   */
  getAllRetryHistories(): RetryHistory[] {
    return Array.from(this.retryHistories.values());
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(agentType?: AgentType): CircuitBreakerState | undefined {
    const key = this.getCircuitBreakerKey(agentType);
    return this.circuitBreakers.get(key);
  }

  /**
   * Get all circuit breaker states
   */
  getAllCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Clear retry history
   */
  clearHistory(operationId?: string): void {
    if (operationId) {
      this.retryHistories.delete(operationId);
    } else {
      this.retryHistories.clear();
    }
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(agentType?: AgentType): void {
    const key = this.getCircuitBreakerKey(agentType);
    this.circuitBreakers.delete(key);
    logger.info('Circuit breaker manually reset', { key });
  }

  /**
   * Get recommended retry config for error type
   */
  getRecommendedConfig(errorType: ErrorType): RetryConfig {
    return DEFAULT_RETRY_CONFIGS[errorType];
  }

  /**
   * Get retry statistics
   */
  getStatistics(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageRetries: number;
    averageDuration: number;
    circuitBreakersOpen: number;
  } {
    const histories = Array.from(this.retryHistories.values());
    const successful = histories.filter(h => h.finalSuccess);
    const failed = histories.filter(h => !h.finalSuccess);
    const totalRetries = histories.reduce((sum, h) => sum + (h.totalAttempts - 1), 0);
    const totalDuration = histories.reduce((sum, h) => sum + h.totalDuration, 0);
    const openCircuits = Array.from(this.circuitBreakers.values()).filter(b => b.isOpen).length;

    return {
      totalOperations: histories.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      averageRetries: histories.length > 0 ? totalRetries / histories.length : 0,
      averageDuration: histories.length > 0 ? totalDuration / histories.length : 0,
      circuitBreakersOpen: openCircuits
    };
  }
}
