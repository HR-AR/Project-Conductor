/**
 * Base Agent
 * Abstract base class for all autonomous agents
 */

import {
  AgentType,
  AgentTask,
  AgentTaskResult,
  AgentStatus,
  PhaseNumber
} from '../../models/orchestrator.model';
import logger from '../../utils/logger';

export interface AgentContext {
  projectRoot: string;
  srcDir: string;
  testDir: string;
  configDir: string;
  docsDir: string;
}

export abstract class BaseAgent {
  protected readonly type: AgentType;
  protected readonly name: string;
  protected readonly description: string;
  protected context: AgentContext;
  protected currentTask: AgentTask | null = null;
  protected isActive: boolean = false;

  constructor(type: AgentType, name: string, description: string) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.context = this.initializeContext();
  }

  /**
   * Initialize agent context
   */
  private initializeContext(): AgentContext {
    const projectRoot = process.cwd();
    return {
      projectRoot,
      srcDir: `${projectRoot}/src`,
      testDir: `${projectRoot}/tests`,
      configDir: `${projectRoot}/config`,
      docsDir: `${projectRoot}/docs`
    };
  }

  /**
   * Get agent type
   */
  getType(): AgentType {
    return this.type;
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get agent description
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Check if agent is currently active
   */
  isActiveAgent(): boolean {
    return this.isActive;
  }

  /**
   * Execute a task
   */
  async executeTask(task: AgentTask): Promise<AgentTaskResult> {
    if (this.isActive) {
      throw new Error(`Agent ${this.name} is already executing a task`);
    }

    this.currentTask = task;
    this.isActive = true;

    logger.info(`[${this.name}] Starting task: ${task.description}`);

    try {
      const result = await this.performTask(task);

      logger.info(`[${this.name}] Task completed successfully`, {
        taskId: task.id,
        filesCreated: result.filesCreated?.length || 0,
        filesModified: result.filesModified?.length || 0
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`[${this.name}] Task failed: ${errorMessage}`, {
        taskId: task.id,
        error
      });

      return {
        success: false,
        error: errorMessage,
        filesCreated: [],
        filesModified: []
      };
    } finally {
      this.isActive = false;
      this.currentTask = null;
    }
  }

  /**
   * Perform the actual task (implemented by subclasses)
   */
  protected abstract performTask(task: AgentTask): Promise<AgentTaskResult>;

  /**
   * Validate task before execution
   */
  protected validateTask(task: AgentTask): void {
    if (task.agentType !== this.type) {
      throw new Error(
        `Task agent type mismatch: expected ${this.type}, got ${task.agentType}`
      );
    }

    if (task.status !== AgentStatus.WAITING) {
      throw new Error(`Task is not in waiting state: ${task.status}`);
    }
  }

  /**
   * Get agent capabilities for a specific phase
   */
  abstract getCapabilities(phase: PhaseNumber): string[];

  /**
   * Check if agent can handle a specific task
   */
  abstract canHandleTask(task: AgentTask): boolean;

  /**
   * Estimate task duration in milliseconds
   */
  abstract estimateTaskDuration(task: AgentTask): number;

  /**
   * Get agent dependencies (other agents this agent relies on)
   */
  getDependencies(): AgentType[] {
    return [];
  }

  /**
   * Check if agent is ready to execute (dependencies met)
   */
  async isReady(): Promise<boolean> {
    return true;
  }

  /**
   * Get current task
   */
  getCurrentTask(): AgentTask | null {
    return this.currentTask;
  }

  /**
   * Log agent activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    const logMessage = `[${this.name}] ${message}`;

    switch (level) {
      case 'info':
        logger.info(logMessage, meta);
        break;
      case 'warn':
        logger.warn(logMessage, meta);
        break;
      case 'error':
        logger.error(logMessage, meta);
        break;
    }
  }

  /**
   * Create task result
   */
  protected createResult(
    success: boolean,
    options: Partial<AgentTaskResult> = {}
  ): AgentTaskResult {
    return {
      success,
      filesCreated: [],
      filesModified: [],
      ...options
    };
  }

  /**
   * Sleep utility for delayed operations
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
