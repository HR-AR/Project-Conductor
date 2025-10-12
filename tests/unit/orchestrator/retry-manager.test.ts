/**
 * Retry Manager Tests
 */

import { RetryManager } from '../../../src/services/orchestrator/retry-manager.service';
import {
  ErrorType,
  ErrorCategory,
  BackoffStrategy
} from '../../../src/models/error-recovery.model';
import { AgentType, PhaseNumber } from '../../../.temp-orchestrator/models/orchestrator.model';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager({
      maxAttempts: 3,
      strategy: BackoffStrategy.EXPONENTIAL,
      baseDelay: 100,  // Short delays for tests
      maxDelay: 1000,
      circuitBreakerThreshold: 5
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(
        'test-op-1',
        operation
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);

      const history = retryManager.getRetryHistory('test-op-1');
      expect(history).toBeDefined();
      expect(history?.finalSuccess).toBe(true);
      expect(history?.totalAttempts).toBe(1);
    });

    it('should retry transient errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(
        'test-op-2',
        operation,
        {
          maxAttempts: 3,
          strategy: BackoffStrategy.EXPONENTIAL,
          baseDelay: 10,
          maxDelay: 100,
          retryableErrors: [ErrorType.TRANSIENT, ErrorType.RETRIABLE]
        }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);

      const history = retryManager.getRetryHistory('test-op-2');
      expect(history?.finalSuccess).toBe(true);
      expect(history?.totalAttempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('persistent error'));

      await expect(
        retryManager.executeWithRetry(
          'test-op-3',
          operation,
          {
            maxAttempts: 0,  // 0 retries = 1 attempt total
            strategy: BackoffStrategy.FIXED,
            baseDelay: 10,
            maxDelay: 100,
            retryableErrors: [ErrorType.TRANSIENT, ErrorType.RETRIABLE]
          }
        )
      ).rejects.toThrow('persistent error');

      expect(operation).toHaveBeenCalledTimes(1); // Initial attempt only

      const history = retryManager.getRetryHistory('test-op-3');
      expect(history?.finalSuccess).toBe(false);
      expect(history?.totalAttempts).toBe(1);
    });

    it('should not retry fatal errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('permission denied'));

      await expect(
        retryManager.executeWithRetry(
          'test-op-4',
          operation,
          {
            maxAttempts: 3,
            strategy: BackoffStrategy.EXPONENTIAL,
            baseDelay: 10,
            maxDelay: 100,
            retryableErrors: []  // No retryable errors
          }
        )
      ).rejects.toThrow('permission denied');

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should respect circuit breaker', async () => {
      // Trigger circuit breaker
      for (let i = 0; i < 10; i++) {
        try {
          await retryManager.executeWithRetry(
            `test-op-cb-${i}`,
            () => Promise.reject(new Error('error')),
            {
              maxAttempts: 0,
              strategy: BackoffStrategy.FIXED,
              baseDelay: 1,
              maxDelay: 10,
              retryableErrors: [],
              circuitBreakerThreshold: 5
            },
            { agentType: AgentType.API }
          );
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit breaker should be open now
      await expect(
        retryManager.executeWithRetry(
          'test-op-cb-final',
          () => Promise.resolve('success'),
          {
            maxAttempts: 3,
            strategy: BackoffStrategy.EXPONENTIAL,
            baseDelay: 10,
            maxDelay: 100,
            retryableErrors: [ErrorType.TRANSIENT]
          },
          { agentType: AgentType.API }
        )
      ).rejects.toThrow('Circuit breaker is open');

      const cbState = retryManager.getCircuitBreakerState(AgentType.API);
      expect(cbState?.isOpen).toBe(true);
    });
  });

  describe('classifyError', () => {
    it('should classify transient errors', () => {
      const errors = [
        new Error('Connection timeout'),
        new Error('ETIMEDOUT'),
        new Error('Rate limit exceeded'),
        new Error('429 Too Many Requests'),
        new Error('Service unavailable'),
        new Error('503')
      ];

      errors.forEach(error => {
        const classification = retryManager.classifyError(error);
        expect(classification.type).toBe(ErrorType.TRANSIENT);
      });
    });

    it('should classify retriable errors', () => {
      const errors = [
        new Error('Resource locked'),
        new Error('EBUSY'),
        new Error('Dependency not found'),
        new Error('Validation failed')
      ];

      errors.forEach(error => {
        const classification = retryManager.classifyError(error);
        expect(classification.type).toBe(ErrorType.RETRIABLE);
      });
    });

    it('should classify fatal errors', () => {
      const errors = [
        new Error('Permission denied'),
        new Error('EACCES'),
        new Error('Invalid configuration'),
        new Error('ENOENT'),
        new Error('Syntax error')
      ];

      errors.forEach(error => {
        const classification = retryManager.classifyError(error);
        expect(classification.type).toBe(ErrorType.FATAL);
      });
    });

    it('should classify conflict errors', () => {
      const errors = [
        new Error('Security vulnerability detected'),
        new Error('CVE-2023-1234'),
        new Error('Business rule violation'),
        new Error('Data integrity issue')
      ];

      errors.forEach(error => {
        const classification = retryManager.classifyError(error);
        expect(classification.type).toBe(ErrorType.CONFLICT);
      });
    });

    it('should classify unknown errors as retriable', () => {
      const error = new Error('Some unknown error');
      const classification = retryManager.classifyError(error);
      expect(classification.type).toBe(ErrorType.RETRIABLE);
      expect(classification.category).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('getBackoffDelay', () => {
    it('should calculate exponential backoff', () => {
      const delays = [];
      for (let i = 1; i <= 5; i++) {
        const delay = retryManager.getBackoffDelay(
          i,
          BackoffStrategy.EXPONENTIAL,
          { baseDelay: 1000, maxDelay: 16000 } as any
        );
        delays.push(Math.floor(delay / 1000)); // Convert to seconds for comparison
      }

      // Should be approximately 1s, 2s, 4s, 8s, 16s (with jitter)
      expect(delays[0]).toBeGreaterThanOrEqual(0);
      expect(delays[0]).toBeLessThan(2);
      expect(delays[1]).toBeGreaterThanOrEqual(1);
      expect(delays[1]).toBeLessThan(3);
      expect(delays[4]).toBeGreaterThanOrEqual(15);
    });

    it('should calculate linear backoff', () => {
      const delays = [];
      for (let i = 1; i <= 5; i++) {
        const delay = retryManager.getBackoffDelay(
          i,
          BackoffStrategy.LINEAR,
          { baseDelay: 1000, maxDelay: 10000 } as any
        );
        delays.push(Math.floor(delay / 1000)); // Convert to seconds for comparison
      }

      // Should be approximately 1s, 2s, 3s, 4s, 5s (with jitter)
      expect(delays[0]).toBeGreaterThanOrEqual(0);
      expect(delays[0]).toBeLessThan(2);
      expect(delays[4]).toBeGreaterThanOrEqual(4);
      expect(delays[4]).toBeLessThan(7);
    });

    it('should calculate fixed backoff', () => {
      const delays = [];
      for (let i = 1; i <= 5; i++) {
        const delay = retryManager.getBackoffDelay(
          i,
          BackoffStrategy.FIXED,
          { baseDelay: 1000, maxDelay: 10000 } as any
        );
        delays.push(Math.floor(delay / 1000)); // Convert to seconds for comparison
      }

      // Should all be approximately 1s (with jitter)
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThan(2);
      });
    });

    it('should calculate fibonacci backoff', () => {
      const delays = [];
      for (let i = 1; i <= 6; i++) {
        const delay = retryManager.getBackoffDelay(
          i,
          BackoffStrategy.FIBONACCI,
          { baseDelay: 1000, maxDelay: 20000 } as any
        );
        delays.push(Math.floor(delay / 1000)); // Convert to seconds for comparison
      }

      // Should be approximately 1s, 1s, 2s, 3s, 5s, 8s (with jitter)
      expect(delays[0]).toBeGreaterThanOrEqual(0);
      expect(delays[0]).toBeLessThan(2);
      expect(delays[5]).toBeGreaterThanOrEqual(7);
      expect(delays[5]).toBeLessThan(10);
    });

    it('should respect max delay', () => {
      const delay = retryManager.getBackoffDelay(
        10,
        BackoffStrategy.EXPONENTIAL,
        { baseDelay: 1000, maxDelay: 5000 } as any
      );

      expect(delay).toBeLessThanOrEqual(6000); // maxDelay + jitter
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      // Successful operation
      await retryManager.executeWithRetry(
        'stat-op-1',
        () => Promise.resolve('success')
      );

      // Failed operation
      try {
        await retryManager.executeWithRetry(
          'stat-op-2',
          () => Promise.reject(new Error('error')),
          { maxAttempts: 1, baseDelay: 1, maxDelay: 10, retryableErrors: [], strategy: BackoffStrategy.FIXED }
        );
      } catch (error) {
        // Expected
      }

      const stats = retryManager.getStatistics();
      expect(stats.totalOperations).toBe(2);
      expect(stats.successfulOperations).toBe(1);
      expect(stats.failedOperations).toBe(1);
    });
  });

  describe('circuit breaker', () => {
    it('should reset circuit breaker', () => {
      retryManager.resetCircuitBreaker(AgentType.API);
      const cbState = retryManager.getCircuitBreakerState(AgentType.API);
      expect(cbState).toBeUndefined();
    });
  });
});
