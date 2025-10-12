/**
 * Orchestrator Engine Service (Learning-Enhanced)
 * Main orchestration engine with integrated self-learning capabilities
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { LearningService } from './learning.service';
import { AnalyticsService } from './analytics.service';
import {
  AgentType,
  TaskType,
  ExecutionRecord,
  CreateExecutionRecordRequest,
  Recommendation,
  LearningStats,
  OptimizationOpportunity,
} from '../../models/orchestrator-learning.model';

export interface Task {
  id: string;
  description: string;
  agentType: AgentType;
  taskType: TaskType;
  estimatedDurationMs?: number;
  dependencies?: string[];
  context?: Record<string, any>;
}

export interface OrchestratorConfig {
  enableLearning: boolean;
  autoOptimize: boolean;
  minConfidence: number;
  parallelExecutionEnabled: boolean;
}

export class OrchestratorEngineService extends EventEmitter {
  private learning: LearningService;
  private analytics: AnalyticsService;
  private pool: Pool;
  private config: OrchestratorConfig;
  private activeExecutions: Map<string, ExecutionRecord>;

  constructor(config?: Partial<OrchestratorConfig>) {
    super();

    this.config = {
      enableLearning: true,
      autoOptimize: true,
      minConfidence: 0.6,
      parallelExecutionEnabled: true,
      ...config,
    };

    this.pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
    });

    this.learning = new LearningService(this.pool);
    this.analytics = new AnalyticsService(this.pool);
    this.activeExecutions = new Map();
  }

  /**
   * Execute a task with learning
   */
  async executeTask(task: Task, goal: string): Promise<{ success: boolean; duration: number }> {
    const startTime = Date.now();

    // Get recommendations before execution
    if (this.config.enableLearning && this.config.autoOptimize) {
      const recommendations = await this.learning.getRecommendations({
        goal,
        taskType: task.taskType,
        context: task.context,
        limit: 1,
      });

      if (recommendations.length > 0 && recommendations[0].priority === 'high') {
        this.emit('recommendation', recommendations[0]);

        // Apply recommendation if confidence is high
        if (recommendations[0].confidenceScore >= this.config.minConfidence) {
          const lesson = await this.getLessonById(recommendations[0].lessonId!);
          if (lesson?.alternativeAgent) {
            task.agentType = lesson.alternativeAgent;
            this.emit('agent-switched', {
              from: task.agentType,
              to: lesson.alternativeAgent,
              reason: recommendations[0].description,
            });
          }
        }
      }
    }

    // Get predicted duration
    const prediction = await this.learning.getPredictedDuration(
      task.agentType,
      task.taskType
    );

    task.estimatedDurationMs = prediction.predictedDurationMs;

    // Record execution start
    const executionRecord = await this.learning.recordExecution({
      goal,
      agentType: task.agentType,
      taskDescription: task.description,
      taskType: task.taskType,
      estimatedDurationMs: task.estimatedDurationMs,
      context: task.context,
      dependencies: task.dependencies,
    });

    this.activeExecutions.set(task.id, executionRecord);
    this.emit('task-started', { task, executionRecord });

    try {
      // Simulate task execution (in real implementation, this would call actual agent)
      await this.simulateTaskExecution(task);

      const duration = Date.now() - startTime;

      // Record successful execution
      await this.learning.updateExecution(executionRecord.id!, {
        actualDurationMs: duration,
        status: 'success',
        completedAt: new Date(),
      });

      this.activeExecutions.delete(task.id);
      this.emit('task-completed', { task, duration });

      return { success: true, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Record failed execution
      await this.learning.updateExecution(executionRecord.id!, {
        actualDurationMs: duration,
        status: 'failed',
        completedAt: new Date(),
        errorType: error.name || 'UnknownError',
        errorMessage: error.message,
        errorStack: error.stack,
      });

      this.activeExecutions.delete(task.id);
      this.emit('task-failed', { task, error, duration });

      throw error;
    }
  }

  /**
   * Execute multiple tasks with intelligent ordering
   */
  async executeTasks(
    tasks: Task[],
    goal: string
  ): Promise<{ successful: number; failed: number; totalDuration: number }> {
    const startTime = Date.now();

    // Get optimal ordering
    if (this.config.autoOptimize) {
      tasks = await this.optimizeTaskOrder(tasks);
    }

    let successful = 0;
    let failed = 0;

    // Execute tasks (respecting dependencies)
    for (const task of tasks) {
      try {
        await this.executeTask(task, goal);
        successful++;
      } catch (error) {
        failed++;
      }
    }

    const totalDuration = Date.now() - startTime;

    // Analyze patterns after execution
    if (this.config.enableLearning) {
      await this.learning.analyzePatterns();
      await this.learning.updateConfidenceScores();
    }

    return { successful, failed, totalDuration };
  }

  /**
   * Get learning statistics
   */
  async getLearningStats(): Promise<LearningStats> {
    return this.learning.getLearningStats();
  }

  /**
   * Get optimization opportunities
   */
  async getOptimizationOpportunities(): Promise<OptimizationOpportunity[]> {
    return this.learning.identifyOptimizationOpportunities();
  }

  /**
   * Get recommendations for a goal
   */
  async getRecommendations(goal: string, taskType?: TaskType): Promise<Recommendation[]> {
    return this.learning.getRecommendations({
      goal,
      taskType,
      limit: 10,
    });
  }

  /**
   * Get agent success rate
   */
  async getAgentSuccessRate(agentType: AgentType): Promise<number> {
    return this.analytics.getAgentSuccessRate(agentType);
  }

  /**
   * Optimize task order based on historical performance
   */
  private async optimizeTaskOrder(tasks: Task[]): Promise<Task[]> {
    const taskExecutions = tasks.map((task, index) => ({
      agentType: task.agentType,
      taskType: task.taskType,
      taskDescription: task.description,
      durationMs: task.estimatedDurationMs || 60000,
      order: index,
      parallelGroup: task.context?.parallelGroup,
    }));

    const optimized = await this.analytics.getOptimalTaskOrdering(taskExecutions);

    // Map back to original tasks
    return optimized.map(te => {
      const originalTask = tasks.find(
        t => t.description === te.taskDescription
      );
      return originalTask!;
    });
  }

  /**
   * Simulate task execution (replace with actual agent execution)
   */
  private async simulateTaskExecution(task: Task): Promise<void> {
    const duration = task.estimatedDurationMs || 60000;

    // Simulate some random failure rate based on historical data
    const successRate = await this.analytics.getAgentSuccessRate(task.agentType);
    const shouldFail = Math.random() > (successRate || 0.8);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail && successRate < 0.9) {
          reject(new Error(`Task execution failed: ${task.description}`));
        } else {
          resolve();
        }
      }, Math.min(duration, 1000)); // Cap at 1 second for simulation
    });
  }

  /**
   * Get lesson by ID
   */
  private async getLessonById(lessonId: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM orchestrator_lessons WHERE id = $1',
      [lessonId]
    );

    if (result.rows.length === 0) return null;

    return result.rows[0];
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.learning.close();
    await this.pool.end();
  }
}
