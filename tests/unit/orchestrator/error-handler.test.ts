/**
 * Error Handler Tests
 */

import { ErrorHandler } from '../../../src/services/orchestrator/error-handler.service';
import {
  ErrorType,
  ErrorCategory,
  RecoveryAction
} from '../../../src/models/error-recovery.model';
import {
  AgentType,
  PhaseNumber,
  OrchestratorState,
  PhaseStatus,
  MilestoneStatus
} from '../../../.temp-orchestrator/models/orchestrator.model';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockState: OrchestratorState;

  beforeEach(() => {
    errorHandler = new ErrorHandler(5);  // Keep 5 checkpoints max

    mockState = {
      currentPhase: PhaseNumber.PHASE_1,
      completedPhases: [PhaseNumber.PHASE_0],
      activeAgents: [],
      phaseStatuses: {
        [PhaseNumber.PHASE_0]: PhaseStatus.COMPLETED,
        [PhaseNumber.PHASE_1]: PhaseStatus.IN_PROGRESS,
        [PhaseNumber.PHASE_2]: PhaseStatus.NOT_STARTED,
        [PhaseNumber.PHASE_3]: PhaseStatus.NOT_STARTED,
        [PhaseNumber.PHASE_4]: PhaseStatus.NOT_STARTED,
        [PhaseNumber.PHASE_5]: PhaseStatus.NOT_STARTED
      },
      milestones: {},
      tasks: [],
      metrics: {} as any,
      startedAt: new Date(),
      lastUpdated: new Date(),
      autoAdvanceEnabled: true,
      errors: []
    };
  });

  describe('classifyError', () => {
    it('should classify transient errors', () => {
      const errors = [
        new Error('Connection timeout'),
        new Error('Rate limit exceeded'),
        new Error('ECONNRESET'),
        new Error('503 Service Unavailable')
      ];

      errors.forEach(error => {
        const classification = errorHandler.classifyError(error);
        expect(classification.type).toBe(ErrorType.TRANSIENT);
        expect(classification.retryable).toBe(true);
        expect(classification.requiresHumanIntervention).toBe(false);
      });
    });

    it('should classify retriable errors', () => {
      const errors = [
        new Error('Resource locked'),
        new Error('Dependency missing'),
        new Error('Validation failed'),
        new Error('Temporary failure')
      ];

      errors.forEach(error => {
        const classification = errorHandler.classifyError(error);
        expect(classification.type).toBe(ErrorType.RETRIABLE);
        expect(classification.retryable).toBe(true);
      });
    });

    it('should classify fatal errors', () => {
      const errors = [
        new Error('Permission denied'),
        new Error('Invalid configuration'),
        new Error('ENOENT'),
        new Error('Syntax error'),
        new Error('Out of memory')
      ];

      errors.forEach(error => {
        const classification = errorHandler.classifyError(error);
        expect(classification.type).toBe(ErrorType.FATAL);
        expect(classification.retryable).toBe(false);
        expect(classification.requiresHumanIntervention).toBe(true);
      });
    });

    it('should classify conflict errors', () => {
      const errors = [
        new Error('Security vulnerability CVE-2023-1234'),
        new Error('Business rule violation'),
        new Error('Data integrity issue'),
        new Error('Policy violation')
      ];

      errors.forEach(error => {
        const classification = errorHandler.classifyError(error);
        expect(classification.type).toBe(ErrorType.CONFLICT);
        expect(classification.retryable).toBe(false);
        expect(classification.requiresHumanIntervention).toBe(true);
      });
    });
  });

  describe('handleAgentError', () => {
    it('should handle transient errors with retry action', () => {
      const error = new Error('Connection timeout');
      const result = errorHandler.handleAgentError(error, {
        operationId: 'test-op-1',
        agentType: AgentType.API,
        phase: PhaseNumber.PHASE_1
      });

      expect(result.success).toBe(false);
      expect(result.action).toBe(RecoveryAction.RETRY_WITH_BACKOFF);
      expect(result.error).toBe('Connection timeout');
    });

    it('should handle fatal errors with fail immediately action', () => {
      const error = new Error('Permission denied');
      const result = errorHandler.handleAgentError(error, {
        operationId: 'test-op-2',
        agentType: AgentType.API,
        phase: PhaseNumber.PHASE_1
      });

      expect(result.success).toBe(false);
      expect(result.action).toBe(RecoveryAction.FAIL_IMMEDIATELY);
      expect(result.error).toBe('Permission denied');
    });

    it('should handle conflict errors with pause workflow action', () => {
      const error = new Error('Security vulnerability detected');
      const result = errorHandler.handleAgentError(error, {
        operationId: 'test-op-3',
        agentType: AgentType.SECURITY,
        phase: PhaseNumber.PHASE_1
      });

      expect(result.success).toBe(false);
      expect(result.action).toBe(RecoveryAction.PAUSE_WORKFLOW);
      expect(result.metadata?.requiresHumanIntervention).toBe(true);
    });
  });

  describe('checkpoints', () => {
    it('should create checkpoint', () => {
      const checkpoint = errorHandler.createCheckpoint(
        mockState,
        'Test checkpoint',
        true,
        'test-trigger'
      );

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.phase).toBe(PhaseNumber.PHASE_1);
      expect(checkpoint.metadata.description).toBe('Test checkpoint');
      expect(checkpoint.metadata.automatic).toBe(true);

      const checkpoints = errorHandler.getCheckpoints();
      expect(checkpoints).toHaveLength(1);
    });

    it('should limit number of checkpoints', () => {
      // Create 10 checkpoints (max is 5)
      for (let i = 0; i < 10; i++) {
        errorHandler.createCheckpoint(
          mockState,
          `Checkpoint ${i}`,
          true
        );
      }

      const checkpoints = errorHandler.getCheckpoints();
      expect(checkpoints).toHaveLength(5);
    });

    it('should rollback to checkpoint', async () => {
      const checkpoint = errorHandler.createCheckpoint(
        mockState,
        'Before operation',
        true
      );

      const restoredState = await errorHandler.rollback(checkpoint.id);
      expect(restoredState).toBeDefined();
      expect(restoredState?.currentPhase).toBe(PhaseNumber.PHASE_1);
    });

    it('should rollback to last checkpoint', () => {
      errorHandler.createCheckpoint(mockState, 'Checkpoint 1', true);
      errorHandler.createCheckpoint(mockState, 'Checkpoint 2', true);
      const lastCheckpoint = errorHandler.createCheckpoint(mockState, 'Checkpoint 3', true);

      const rollbackCheckpoint = errorHandler.rollbackToLastCheckpoint();
      expect(rollbackCheckpoint?.id).toBe(lastCheckpoint.id);
    });

    it('should return null when rolling back with no checkpoints', async () => {
      const restoredState = await errorHandler.rollback('non-existent');
      expect(restoredState).toBeNull();
    });

    it('should delete checkpoint', () => {
      const checkpoint = errorHandler.createCheckpoint(mockState, 'Test', true);
      const deleted = errorHandler.deleteCheckpoint(checkpoint.id);
      expect(deleted).toBe(true);

      const checkpoints = errorHandler.getCheckpoints();
      expect(checkpoints).toHaveLength(0);
    });

    it('should clear all checkpoints', () => {
      errorHandler.createCheckpoint(mockState, 'Checkpoint 1', true);
      errorHandler.createCheckpoint(mockState, 'Checkpoint 2', true);
      errorHandler.createCheckpoint(mockState, 'Checkpoint 3', true);

      errorHandler.clearCheckpoints();

      const checkpoints = errorHandler.getCheckpoints();
      expect(checkpoints).toHaveLength(0);
    });

    it('should get checkpoint statistics', () => {
      errorHandler.createCheckpoint(mockState, 'Checkpoint 1', true);
      errorHandler.createCheckpoint(mockState, 'Checkpoint 2', true);

      const stats = errorHandler.getStatistics();
      expect(stats.totalCheckpoints).toBe(2);
      expect(stats.oldestCheckpoint).toBeDefined();
      expect(stats.newestCheckpoint).toBeDefined();
    });
  });

  describe('createAgentError', () => {
    it('should create agent error with metadata', () => {
      const agentError = errorHandler.createAgentError(
        'Test error',
        ErrorType.TRANSIENT,
        ErrorCategory.NETWORK_TIMEOUT,
        AgentType.API,
        'task-123',
        { additionalInfo: 'test' }
      );

      expect(agentError.message).toBe('Test error');
      expect(agentError.type).toBe(ErrorType.TRANSIENT);
      expect(agentError.category).toBe(ErrorCategory.NETWORK_TIMEOUT);
      expect(agentError.agentType).toBe(AgentType.API);
      expect(agentError.taskId).toBe('task-123');
      expect(agentError.retryable).toBe(true);
      expect(agentError.metadata?.additionalInfo).toBe('test');
    });

    it('should mark fatal errors as not retryable', () => {
      const agentError = errorHandler.createAgentError(
        'Fatal error',
        ErrorType.FATAL,
        ErrorCategory.PERMISSION_DENIED,
        AgentType.API,
        'task-123'
      );

      expect(agentError.retryable).toBe(false);
    });
  });

  describe('toErrorLog', () => {
    it('should convert error to ErrorLog format', () => {
      const error = new Error('Test error');
      const errorLog = errorHandler.toErrorLog(error, {
        phase: PhaseNumber.PHASE_1,
        agentType: AgentType.API
      });

      expect(errorLog.error).toBe('Test error');
      expect(errorLog.phase).toBe(PhaseNumber.PHASE_1);
      expect(errorLog.agent).toBe(AgentType.API);
      expect(errorLog.severity).toBeDefined();
      expect(errorLog.timestamp).toBeDefined();
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');

      // Should not throw
      expect(() => {
        errorHandler.logError(error, {
          operationId: 'test-op',
          agentType: AgentType.API,
          phase: PhaseNumber.PHASE_1,
          timestamp: new Date()
        });
      }).not.toThrow();
    });
  });
});
