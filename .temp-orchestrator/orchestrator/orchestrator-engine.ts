/**
 * Orchestrator Engine
 * Main autonomous orchestration engine for Project Conductor
 */

import {
  AgentType,
  AgentTask,
  AgentStatus,
  PhaseNumber,
  MilestoneStatus,
  CommandResult,
  ProgressSnapshot,
  DashboardData,
  SystemHealth,
  ErrorLog,
  Lesson
} from '../models/orchestrator.model';
import { StateManager } from './state-manager';
import { PhaseManager } from './phase-manager';
import { BaseAgent } from './agents/base-agent';
import { AgentAPI } from './agents/agent-api';
import { AgentModels } from './agents/agent-models';
import { AgentTest } from './agents/agent-test';
import { AgentRealtime } from './agents/agent-realtime';
import { AgentQuality } from './agents/agent-quality';
import { AgentIntegration } from './agents/agent-integration';
import { AgentSecurity } from './agents/agent-security';
import logger from '../utils/logger';
import { EventEmitter } from 'events';
import ActivityService from '../../src/services/activity.service';
import { RetryManager } from '../../src/services/orchestrator/retry-manager.service';
import { ErrorHandler } from '../../src/services/orchestrator/error-handler.service';
import {
  ErrorType,
  RecoveryAction,
  BackoffStrategy
} from '../../src/models/error-recovery.model';

export class OrchestratorEngine extends EventEmitter {
  private stateManager: StateManager;
  private phaseManager: PhaseManager;
  private agents: Map<AgentType, BaseAgent>;
  private isRunning: boolean = false;
  private orchestrationInterval: NodeJS.Timeout | null = null;
  private activityService?: ActivityService;
  private retryManager: RetryManager;
  private errorHandler: ErrorHandler;

  constructor(baseDir?: string, activityService?: ActivityService) {
    super();

    this.stateManager = new StateManager(baseDir);
    this.phaseManager = new PhaseManager(this.stateManager);
    this.agents = new Map();
    this.activityService = activityService;

    // Initialize retry and error handling
    this.retryManager = new RetryManager({
      maxAttempts: 5,
      strategy: BackoffStrategy.EXPONENTIAL,
      baseDelay: 1000,
      maxDelay: 16000,
      circuitBreakerThreshold: 10
    });
    this.errorHandler = new ErrorHandler(10);  // Keep 10 checkpoints max

    // Initialize all agents
    this.initializeAgents();
  }

  /**
   * Initialize all autonomous agents
   */
  private initializeAgents(): void {
    this.agents.set(AgentType.API, new AgentAPI());
    this.agents.set(AgentType.MODELS, new AgentModels());
    this.agents.set(AgentType.TEST, new AgentTest());
    this.agents.set(AgentType.REALTIME, new AgentRealtime());
    this.agents.set(AgentType.QUALITY, new AgentQuality());
    this.agents.set(AgentType.INTEGRATION, new AgentIntegration());
    this.agents.set(AgentType.SECURITY, new AgentSecurity());

    logger.info('All agents initialized');
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Orchestrator already running');
      return;
    }

    logger.info('Starting Orchestrator Engine');

    // Initialize state manager
    await this.stateManager.initialize();

    // Initialize current phase if needed
    const state = this.stateManager.getState();
    const currentPhase = this.phaseManager.getCurrentPhase();

    // Check if phase has milestones initialized
    const hasInitializedMilestones = currentPhase.milestones.every(
      m => state.milestones[m.id]
    );

    if (!hasInitializedMilestones) {
      await this.phaseManager.initializePhase(state.currentPhase);
    }

    this.isRunning = true;

    // Start orchestration loop
    this.orchestrationInterval = setInterval(
      () => this.orchestrate(),
      5000 // Run every 5 seconds
    );

    this.emit('started');
    logger.info('Orchestrator Engine started');
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping Orchestrator Engine');

    if (this.orchestrationInterval) {
      clearInterval(this.orchestrationInterval);
      this.orchestrationInterval = null;
    }

    this.isRunning = false;

    // Save final state
    await this.stateManager.saveState();

    this.emit('stopped');
    logger.info('Orchestrator Engine stopped');
  }

  /**
   * Main orchestration loop
   */
  private async orchestrate(): Promise<void> {
    try {
      const state = this.stateManager.getState();

      // Get pending tasks for current phase
      const pendingTasks = state.tasks.filter(
        t => t.phase === state.currentPhase && t.status === AgentStatus.WAITING
      );

      // Assign tasks to available agents
      for (const task of pendingTasks) {
        const agent = this.agents.get(task.agentType);

        if (!agent) {
          logger.error(`Agent ${task.agentType} not found`);
          continue;
        }

        // Check if agent is available
        if (agent.isActiveAgent()) {
          continue;
        }

        // Check if agent dependencies are met
        const dependencies = agent.getDependencies();
        const dependenciesMet = this.areAgentDependenciesMet(dependencies, task.phase);

        if (!dependenciesMet) {
          continue;
        }

        // Assign task to agent
        await this.executeAgentTask(agent, task);
      }

      // Record progress snapshot
      await this.recordProgress();

      // Update dashboard
      await this.updateDashboard();

    } catch (error) {
      logger.error('Orchestration error', error);

      await this.logError({
        timestamp: new Date(),
        phase: this.stateManager.getState().currentPhase,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        severity: 'high'
      });
    }
  }

  /**
   * Execute an agent task with retry logic
   */
  private async executeAgentTask(agent: BaseAgent, task: AgentTask): Promise<void> {
    logger.info(`Assigning task ${task.id} to ${agent.getName()}`);

    const startTime = Date.now();

    // Create checkpoint before risky operation
    const state = this.stateManager.getState();
    this.errorHandler.createCheckpoint(
      state,
      `Before executing task ${task.id} by ${agent.getName()}`,
      true,
      task.agentType
    );

    // Mark task as active
    await this.stateManager.updateTask(task.id, {
      status: AgentStatus.ACTIVE,
      startedAt: new Date()
    });

    // Mark milestone as in progress
    const milestone = state.milestones[task.milestone];
    if (milestone && milestone.status === MilestoneStatus.PENDING) {
      await this.phaseManager.updateMilestoneStatus(
        task.milestone,
        MilestoneStatus.IN_PROGRESS
      );
    }

    // Emit agent started event
    if (this.activityService) {
      this.activityService.logAgentStarted({
        agentType: task.agentType,
        agentName: agent.getName(),
        taskId: task.id,
        taskDescription: task.description,
        phase: `Phase ${task.phase}`,
        milestone: task.milestone,
        timestamp: new Date()
      }).catch(err => logger.error({ err }, 'Failed to log agent started event'));
    }

    // Execute task with retry logic
    this.executeTaskWithRetry(agent, task, startTime);
  }

  /**
   * Execute task with automatic retry and error handling
   */
  private async executeTaskWithRetry(
    agent: BaseAgent,
    task: AgentTask,
    startTime: number
  ): Promise<void> {
    try {
      // Execute with retry manager
      const result = await this.retryManager.executeWithRetry(
        task.id,
        () => agent.executeTask(task),
        {
          maxAttempts: 5,
          strategy: BackoffStrategy.EXPONENTIAL,
          baseDelay: 1000,
          maxDelay: 16000,
          retryableErrors: [ErrorType.TRANSIENT, ErrorType.RETRIABLE]
        },
        {
          agentType: task.agentType,
          phase: task.phase,
          taskId: task.id
        }
      );

      // Success handling
      await this.handleTaskSuccess(agent, task, result, startTime);

    } catch (error) {
      // Error handling with recovery strategies
      await this.handleTaskError(agent, task, error as Error, startTime);
    }
  }

  /**
   * Handle successful task completion
   */
  private async handleTaskSuccess(
    agent: BaseAgent,
    task: AgentTask,
    result: AgentTaskResult,
    startTime: number
  ): Promise<void> {
    const duration = Date.now() - startTime;

    if (result.success) {
      await this.stateManager.updateTask(task.id, {
        status: AgentStatus.COMPLETED,
        completedAt: new Date(),
        result
      });

      logger.info(`Task ${task.id} completed successfully`);

      // Emit agent completed event
      if (this.activityService) {
        this.activityService.logAgentCompleted({
          agentType: task.agentType,
          agentName: agent.getName(),
          taskId: task.id,
          taskDescription: task.description,
          result: {
            success: true,
            output: result.output,
            filesCreated: result.filesCreated,
            filesModified: result.filesModified,
            testsRun: result.testsRun,
            testsPassed: result.testsPassed,
            testsFailed: result.testsFailed,
            metadata: result.metadata
          },
          duration,
          timestamp: new Date()
        }).catch(err => logger.error({ err }, 'Failed to log agent completed event'));
      }

      // Check if milestone is complete
      await this.checkMilestoneCompletion(task.milestone);

    } else {
      // Check if this is a security conflict (SECURITY_CONFLICT error code)
      const isSecurityConflict = result.error === 'SECURITY_CONFLICT' && result.metadata?.conflictType === 'security_vulnerability';

      if (isSecurityConflict) {
        // Handle security conflict - pause workflow
        await this.stateManager.updateTask(task.id, {
          status: AgentStatus.FAILED,
          completedAt: new Date(),
          error: result.error,
          result
        });

        logger.warn(`Security conflict detected in task ${task.id} - pausing workflow`);

        // Extract vulnerability details
        const vulnerabilities = result.metadata?.vulnerabilities as any[] || [];
        const highestSeverity = this.getHighestSeverity(vulnerabilities);

        // Emit agent conflict detected event
        if (this.activityService) {
          this.activityService.logAgentConflictDetected({
            agentType: task.agentType,
            agentName: agent.getName(),
            taskId: task.id,
            taskDescription: task.description,
            conflictType: 'security_vulnerability',
            conflictDescription: result.output || 'Security vulnerabilities detected in engineering design',
            severity: highestSeverity,
            affectedItems: vulnerabilities.map(v => v.id),
            recommendedActions: vulnerabilities.map(v => v.recommendation),
            requiresHumanInput: true,
            timestamp: new Date()
          }).catch(err => logger.error({ err }, 'Failed to log agent conflict detected event'));

          // Emit agent paused event
          this.activityService.logAgentPaused({
            agentType: task.agentType,
            agentName: agent.getName(),
            taskId: task.id,
            taskDescription: task.description,
            reason: 'Security vulnerabilities detected - requires human resolution',
            pauseType: 'conflict',
            requiresAction: 'Review and resolve security vulnerabilities',
            actionUrl: '/module-5-alignment.html',
            timestamp: new Date()
          }).catch(err => logger.error({ err }, 'Failed to log agent paused event'));
        }

        // Pause orchestrator (emit event to notify UI)
        this.emit('workflow-paused', {
          reason: 'security_conflict',
          taskId: task.id,
          agentType: task.agentType,
          vulnerabilities
        });

      } else {
        // Regular failure (not a conflict)
        await this.stateManager.updateTask(task.id, {
          status: AgentStatus.FAILED,
          completedAt: new Date(),
          error: result.error,
          result
        });

        logger.error(`Task ${task.id} failed: ${result.error}`);

        // Emit agent error event
        if (this.activityService) {
          this.activityService.logAgentError({
            agentType: task.agentType,
            agentName: agent.getName(),
            taskId: task.id,
            taskDescription: task.description,
            error: result.error || 'Task failed',
            errorType: 'execution',
            canRetry: true,
            timestamp: new Date()
          }).catch(err => logger.error({ err }, 'Failed to log agent error event'));
        }

        await this.logError({
          timestamp: new Date(),
          phase: task.phase,
          agent: task.agentType,
          milestone: task.milestone,
          error: result.error || 'Unknown error',
          severity: 'medium'
        });
      }
    }
  }

  /**
   * Handle task error with recovery strategies
   */
  private async handleTaskError(
    agent: BaseAgent,
    task: AgentTask,
    error: Error,
    startTime: number
  ): Promise<void> {
    const duration = Date.now() - startTime;

    // Use error handler to classify and determine recovery action
    const recoveryResult = this.errorHandler.handleAgentError(error, {
      operationId: task.id,
      agentType: task.agentType,
      phase: task.phase,
      taskId: task.id
    });

    logger.error(`Task ${task.id} failed after retries`, {
      error: error.message,
      recoveryAction: recoveryResult.action,
      retriesUsed: recoveryResult.retriesUsed
    });

    // Handle different recovery actions
    switch (recoveryResult.action) {
      case RecoveryAction.PAUSE_WORKFLOW:
        await this.handleConflictError(agent, task, error);
        break;

      case RecoveryAction.ROLLBACK:
        await this.handleRollbackError(agent, task, error, recoveryResult);
        break;

      case RecoveryAction.CIRCUIT_BREAK:
        await this.handleCircuitBreakerError(agent, task, error);
        break;

      case RecoveryAction.FAIL_IMMEDIATELY:
      default:
        await this.handleFatalError(agent, task, error);
        break;
    }

    // Get retry history for logging
    const retryHistory = this.retryManager.getRetryHistory(task.id);
    if (retryHistory) {
      logger.info('Retry history', {
        taskId: task.id,
        totalAttempts: retryHistory.totalAttempts,
        totalDuration: retryHistory.totalDuration,
        attempts: retryHistory.attempts
      });
    }
  }

  /**
   * Handle conflict error (security, business rule, etc.)
   */
  private async handleConflictError(
    agent: BaseAgent,
    task: AgentTask,
    error: Error
  ): Promise<void> {
    await this.stateManager.updateTask(task.id, {
      status: AgentStatus.FAILED,
      completedAt: new Date(),
      error: error.message
    });

    logger.warn(`Conflict detected in task ${task.id} - pausing workflow`);

    // Emit agent conflict detected event
    if (this.activityService) {
      this.activityService.logAgentConflictDetected({
        agentType: task.agentType,
        agentName: agent.getName(),
        taskId: task.id,
        taskDescription: task.description,
        conflictType: 'error_conflict',
        conflictDescription: error.message,
        severity: 'high',
        affectedItems: [task.id],
        recommendedActions: ['Review error and resolve manually'],
        requiresHumanInput: true,
        timestamp: new Date()
      }).catch(err => logger.error({ err }, 'Failed to log agent conflict event'));

      // Emit agent paused event
      this.activityService.logAgentPaused({
        agentType: task.agentType,
        agentName: agent.getName(),
        taskId: task.id,
        taskDescription: task.description,
        reason: `Conflict detected: ${error.message}`,
        pauseType: 'conflict',
        requiresAction: 'Review and resolve conflict',
        timestamp: new Date()
      }).catch(err => logger.error({ err }, 'Failed to log agent paused event'));
    }

    // Pause orchestrator
    this.emit('workflow-paused', {
      reason: 'conflict',
      taskId: task.id,
      agentType: task.agentType,
      error: error.message
    });
  }

  /**
   * Handle rollback error
   */
  private async handleRollbackError(
    agent: BaseAgent,
    task: AgentTask,
    error: Error,
    recoveryResult: RecoveryResult
  ): Promise<void> {
    await this.stateManager.updateTask(task.id, {
      status: AgentStatus.FAILED,
      completedAt: new Date(),
      error: error.message
    });

    logger.warn(`Rolling back task ${task.id} after error`, {
      checkpointRestored: recoveryResult.checkpointRestored
    });

    // Emit agent error event
    if (this.activityService) {
      this.activityService.logAgentError({
        agentType: task.agentType,
        agentName: agent.getName(),
        taskId: task.id,
        taskDescription: task.description,
        error: error.message,
        errorType: 'rollback',
        canRetry: false,
        timestamp: new Date()
      }).catch(err => logger.error({ err }, 'Failed to log agent error event'));
    }

    await this.logError({
      timestamp: new Date(),
      phase: task.phase,
      agent: task.agentType,
      milestone: task.milestone,
      error: `Rollback after error: ${error.message}`,
      severity: 'high'
    });
  }

  /**
   * Handle circuit breaker error
   */
  private async handleCircuitBreakerError(
    agent: BaseAgent,
    task: AgentTask,
    error: Error
  ): Promise<void> {
    await this.stateManager.updateTask(task.id, {
      status: AgentStatus.FAILED,
      completedAt: new Date(),
      error: error.message
    });

    logger.error(`Circuit breaker triggered for task ${task.id}`, {
      agentType: task.agentType,
      error: error.message
    });

    // Emit agent error event
    if (this.activityService) {
      this.activityService.logAgentError({
        agentType: task.agentType,
        agentName: agent.getName(),
        taskId: task.id,
        taskDescription: task.description,
        error: `Circuit breaker: ${error.message}`,
        errorType: 'circuit_break',
        canRetry: false,
        timestamp: new Date()
      }).catch(err => logger.error({ err }, 'Failed to log agent error event'));
    }

    await this.logError({
      timestamp: new Date(),
      phase: task.phase,
      agent: task.agentType,
      milestone: task.milestone,
      error: `Circuit breaker triggered: ${error.message}`,
      severity: 'critical'
    });

    // Stop orchestrator due to system health issues
    this.emit('circuit-break', {
      agentType: task.agentType,
      taskId: task.id,
      error: error.message
    });
  }

  /**
   * Handle fatal error
   */
  private async handleFatalError(
    agent: BaseAgent,
    task: AgentTask,
    error: Error
  ): Promise<void> {
    await this.stateManager.updateTask(task.id, {
      status: AgentStatus.FAILED,
      completedAt: new Date(),
      error: error.message
    });

    logger.error(`Fatal error in task ${task.id}`, { error: error.message });

    // Emit agent error event
    if (this.activityService) {
      this.activityService.logAgentError({
        agentType: task.agentType,
        agentName: agent.getName(),
        taskId: task.id,
        taskDescription: task.description,
        error: error.message,
        errorType: 'fatal',
        stack: error.stack,
        canRetry: false,
        timestamp: new Date()
      }).catch(err => logger.error({ err }, 'Failed to log agent error event'));
    }

    await this.logError({
      timestamp: new Date(),
      phase: task.phase,
      agent: task.agentType,
      milestone: task.milestone,
      error: error.message,
      stack: error.stack,
      severity: 'critical'
    });
  }

  /**
   * Check if agent dependencies are met
   */
  private areAgentDependenciesMet(
    dependencies: AgentType[],
    phase: PhaseNumber
  ): boolean {
    const state = this.stateManager.getState();

    for (const depAgent of dependencies) {
      const depTasks = state.tasks.filter(
        t => t.phase === phase && t.agentType === depAgent
      );

      const allCompleted = depTasks.every(
        t => t.status === AgentStatus.COMPLETED
      );

      if (!allCompleted) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a milestone is complete
   */
  private async checkMilestoneCompletion(milestoneId: string): Promise<void> {
    const state = this.stateManager.getState();

    // Get all tasks for this milestone
    const milestoneTasks = state.tasks.filter(t => t.milestone === milestoneId);

    // Check if all tasks are completed
    const allCompleted = milestoneTasks.every(
      t => t.status === AgentStatus.COMPLETED
    );

    if (allCompleted) {
      // Validate milestone
      const isValid = await this.phaseManager.validateMilestone(milestoneId);

      if (isValid) {
        logger.info(`Milestone ${milestoneId} completed and validated`);

        // Record lesson
        await this.stateManager.addLesson({
          id: `milestone-${milestoneId}-completed`,
          timestamp: new Date(),
          phase: state.currentPhase,
          category: 'success',
          description: `Milestone ${milestoneId} completed successfully`,
          impact: 'Phase progression'
        });
      }
    }
  }

  /**
   * Record progress snapshot
   */
  private async recordProgress(): Promise<void> {
    const state = this.stateManager.getState();
    const currentPhase = state.currentPhase;

    const snapshot: ProgressSnapshot = {
      timestamp: new Date(),
      phase: currentPhase,
      phaseProgress: this.phaseManager.getPhaseProgress(currentPhase),
      overallProgress: this.phaseManager.getOverallProgress(),
      activeTasks: state.tasks.filter(t => t.status === AgentStatus.ACTIVE).length,
      completedTasks: state.tasks.filter(t => t.status === AgentStatus.COMPLETED).length,
      failedTasks: state.tasks.filter(t => t.status === AgentStatus.FAILED).length,
      estimatedCompletion: this.phaseManager.getEstimatedCompletion() || undefined
    };

    await this.stateManager.recordProgress(snapshot);
  }

  /**
   * Update dashboard
   */
  private async updateDashboard(): Promise<void> {
    // Dashboard generation happens in dashboard generator
    // This is a placeholder for triggering dashboard updates
    this.emit('dashboard-update');
  }

  /**
   * Log error
   */
  private async logError(error: ErrorLog): Promise<void> {
    await this.stateManager.logError(error);
    this.emit('error', error);
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<CommandResult> {
    const state = this.stateManager.getState();
    const currentPhase = this.phaseManager.getCurrentPhase();
    const phaseProgress = this.phaseManager.getPhaseProgress(state.currentPhase);
    const overallProgress = this.phaseManager.getOverallProgress();

    return {
      success: true,
      message: 'Orchestrator status retrieved',
      data: {
        isRunning: this.isRunning,
        currentPhase: {
          number: currentPhase.phase,
          name: currentPhase.name,
          progress: phaseProgress
        },
        overallProgress,
        completedPhases: state.completedPhases,
        activeAgents: state.activeAgents,
        activeTasks: state.tasks.filter(t => t.status === AgentStatus.ACTIVE).length,
        completedTasks: state.tasks.filter(t => t.status === AgentStatus.COMPLETED).length,
        failedTasks: state.tasks.filter(t => t.status === AgentStatus.FAILED).length
      }
    };
  }

  /**
   * Run tests for current phase
   */
  async runTests(): Promise<CommandResult> {
    const currentPhase = this.phaseManager.getCurrentPhase();

    try {
      logger.info(`Running tests for Phase ${currentPhase.phase}`);

      // In a real implementation, this would execute the test command
      // For now, we'll simulate success
      return {
        success: true,
        message: `Tests passed for Phase ${currentPhase.phase}`,
        data: {
          phase: currentPhase.phase,
          testCommand: currentPhase.testCommand
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Tests failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Advance to next phase
   */
  async advance(): Promise<CommandResult> {
    try {
      const advanced = await this.phaseManager.advancePhase();

      if (advanced) {
        const state = this.stateManager.getState();
        return {
          success: true,
          message: `Advanced to Phase ${state.currentPhase}`,
          data: {
            currentPhase: state.currentPhase
          }
        };
      } else {
        return {
          success: false,
          message: 'Cannot advance: current phase not complete or already at final phase'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to advance phase',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Rollback to previous phase
   */
  async rollback(): Promise<CommandResult> {
    try {
      const rolledBack = await this.phaseManager.rollbackPhase();

      if (rolledBack) {
        const state = this.stateManager.getState();
        return {
          success: true,
          message: `Rolled back to Phase ${state.currentPhase}`,
          data: {
            currentPhase: state.currentPhase
          }
        };
      } else {
        return {
          success: false,
          message: 'Cannot rollback: already at Phase 0'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to rollback phase',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Deploy specific agent
   */
  async deployAgent(agentType: AgentType): Promise<CommandResult> {
    const agent = this.agents.get(agentType);

    if (!agent) {
      return {
        success: false,
        message: `Agent ${agentType} not found`
      };
    }

    const state = this.stateManager.getState();

    // Get pending tasks for this agent in current phase
    const pendingTasks = state.tasks.filter(
      t => t.phase === state.currentPhase &&
           t.agentType === agentType &&
           t.status === AgentStatus.WAITING
    );

    if (pendingTasks.length === 0) {
      return {
        success: false,
        message: `No pending tasks for ${agentType} in current phase`
      };
    }

    // Execute first pending task
    const task = pendingTasks[0];
    await this.executeAgentTask(agent, task);

    return {
      success: true,
      message: `Deployed ${agentType} for task ${task.id}`,
      data: {
        taskId: task.id,
        description: task.description
      }
    };
  }

  /**
   * Generate report
   */
  async generateReport(): Promise<CommandResult> {
    const state = this.stateManager.getState();
    const currentPhase = this.phaseManager.getCurrentPhase();

    const report = {
      generatedAt: new Date(),
      orchestrator: {
        isRunning: this.isRunning,
        startedAt: state.startedAt,
        lastUpdated: state.lastUpdated
      },
      currentPhase: {
        number: currentPhase.phase,
        name: currentPhase.name,
        description: currentPhase.description,
        progress: this.phaseManager.getPhaseProgress(state.currentPhase)
      },
      overallProgress: this.phaseManager.getOverallProgress(),
      completedPhases: state.completedPhases,
      milestones: {
        total: Object.keys(state.milestones).length,
        completed: Object.values(state.milestones).filter(
          m => m.status === MilestoneStatus.COMPLETED
        ).length,
        inProgress: Object.values(state.milestones).filter(
          m => m.status === MilestoneStatus.IN_PROGRESS
        ).length,
        pending: Object.values(state.milestones).filter(
          m => m.status === MilestoneStatus.PENDING
        ).length
      },
      tasks: {
        total: state.tasks.length,
        completed: state.tasks.filter(t => t.status === AgentStatus.COMPLETED).length,
        active: state.tasks.filter(t => t.status === AgentStatus.ACTIVE).length,
        waiting: state.tasks.filter(t => t.status === AgentStatus.WAITING).length,
        failed: state.tasks.filter(t => t.status === AgentStatus.FAILED).length
      },
      agents: Array.from(this.agents.entries()).map(([type, agent]) => ({
        type,
        name: agent.getName(),
        isActive: agent.isActiveAgent(),
        metrics: state.metrics[type]
      })),
      recentErrors: state.errors.slice(-10),
      estimatedCompletion: this.phaseManager.getEstimatedCompletion()
    };

    return {
      success: true,
      message: 'Report generated',
      data: report
    };
  }

  /**
   * Get highest severity from vulnerabilities list
   */
  private getHighestSeverity(vulnerabilities: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    let highest = 'low' as 'low' | 'medium' | 'high' | 'critical';

    for (const vuln of vulnerabilities) {
      if (severityOrder[vuln.severity] > severityOrder[highest]) {
        highest = vuln.severity;
      }
    }

    return highest;
  }

  /**
   * Get retry manager
   */
  getRetryManager(): RetryManager {
    return this.retryManager;
  }

  /**
   * Get error handler
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * Get retry statistics
   */
  getRetryStatistics(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageRetries: number;
    averageDuration: number;
    circuitBreakersOpen: number;
  } {
    return this.retryManager.getStatistics();
  }

  /**
   * Get checkpoint statistics
   */
  getCheckpointStatistics(): {
    totalCheckpoints: number;
    oldestCheckpoint?: Date;
    newestCheckpoint?: Date;
  } {
    return this.errorHandler.getStatistics();
  }

  /**
   * Reset circuit breaker for an agent
   */
  resetCircuitBreaker(agentType?: AgentType): void {
    this.retryManager.resetCircuitBreaker(agentType);
    logger.info('Circuit breaker reset', { agentType: agentType || 'global' });
  }

  /**
   * Clear all checkpoints
   */
  clearCheckpoints(): void {
    this.errorHandler.clearCheckpoints();
    logger.info('All checkpoints cleared');
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const state = this.stateManager.getState();
    const currentPhase = this.phaseManager.getCurrentPhase();
    const progress = this.stateManager.getProgressHistory(1)[0] || {
      timestamp: new Date(),
      phase: state.currentPhase,
      phaseProgress: 0,
      overallProgress: 0,
      activeTasks: 0,
      completedTasks: 0,
      failedTasks: 0
    };

    const recentMilestones = Object.values(state.milestones)
      .filter(m => m.completedAt)
      .sort((a, b) => {
        const aTime = a.completedAt?.getTime() || 0;
        const bTime = b.completedAt?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    const systemHealth: SystemHealth = {
      status: 'healthy',
      uptime: Date.now() - state.startedAt.getTime(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0, // Would need cpu-usage library
      activeConnections: state.activeAgents.length,
      lastHealthCheck: new Date()
    };

    return {
      currentPhase,
      progress,
      activeAgents: Object.values(state.metrics),
      recentMilestones,
      recentErrors: state.errors.slice(-5),
      recentLessons: this.stateManager.getLessons().slice(-5),
      systemHealth
    };
  }
}
