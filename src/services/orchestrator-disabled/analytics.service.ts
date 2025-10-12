/**
 * Orchestrator Analytics Service
 * Provides execution metrics and performance analytics
 */

import { Pool } from 'pg';
import {
  AgentType,
  TaskType,
  AgentPerformance,
  FailurePattern,
  TaskExecution,
  AnalysisOptions,
  ExecutionRecord,
  ErrorSummary,
} from '../../models/orchestrator-learning.model';

export class AnalyticsService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || new Pool({
      connectionString: process.env['DATABASE_URL'],
    });
  }

  /**
   * Get success rate for a specific agent type
   */
  async getAgentSuccessRate(
    agentType: AgentType,
    options: AnalysisOptions = {}
  ): Promise<number> {
    const { lookbackDays = 30, taskTypes } = options;

    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'success') as successful,
        COUNT(*) as total
      FROM orchestrator_execution_history
      WHERE agent_type = $1
        AND started_at > NOW() - INTERVAL '${lookbackDays} days'
        ${taskTypes ? 'AND task_type = ANY($2)' : ''}
    `;

    const params = taskTypes ? [agentType, taskTypes] : [agentType];
    const result = await this.pool.query(query, params);

    if (result.rows[0].total === 0) return 0;

    return parseFloat(result.rows[0].successful) / parseFloat(result.rows[0].total);
  }

  /**
   * Get average task duration for a specific task type
   */
  async getAverageTaskDuration(
    taskType: TaskType,
    options: AnalysisOptions = {}
  ): Promise<number> {
    const { lookbackDays = 30, agentTypes } = options;

    const query = `
      SELECT AVG(actual_duration_ms) as avg_duration
      FROM orchestrator_execution_history
      WHERE task_type = $1
        AND status = 'success'
        AND actual_duration_ms IS NOT NULL
        AND started_at > NOW() - INTERVAL '${lookbackDays} days'
        ${agentTypes ? 'AND agent_type = ANY($2)' : ''}
    `;

    const params = agentTypes ? [taskType, agentTypes] : [taskType];
    const result = await this.pool.query(query, params);

    return result.rows[0]?.avg_duration || 0;
  }

  /**
   * Get common failure patterns
   */
  async getCommonFailurePatterns(
    options: AnalysisOptions = {}
  ): Promise<FailurePattern[]> {
    const { lookbackDays = 30, minConfidence = 0.5 } = options;

    const query = `
      SELECT
        agent_type,
        task_type,
        error_type,
        COUNT(*) as occurrences,
        ARRAY_AGG(DISTINCT error_message) as error_messages,
        AVG(CASE WHEN context IS NOT NULL THEN 1 ELSE 0 END) as context_freq
      FROM orchestrator_execution_history
      WHERE status IN ('failed', 'timeout')
        AND started_at > NOW() - INTERVAL '${lookbackDays} days'
      GROUP BY agent_type, task_type, error_type
      HAVING COUNT(*) >= 3
      ORDER BY occurrences DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query);

    return result.rows.map(row => ({
      pattern: `${row.agent_type} fails on ${row.task_type} with ${row.error_type}`,
      agentType: row.agent_type as AgentType,
      taskType: row.task_type as TaskType,
      occurrences: parseInt(row.occurrences),
      errorType: row.error_type,
      commonContext: {},
      recommendedFix: this.generateFixRecommendation(row),
    }));
  }

  /**
   * Get optimal task ordering based on historical performance
   */
  async getOptimalTaskOrdering(tasks: TaskExecution[]): Promise<TaskExecution[]> {
    // Get historical performance for each task type
    const performanceMap = new Map<string, number>();

    for (const task of tasks) {
      const key = `${task.agentType}:${task.taskType}`;
      if (!performanceMap.has(key)) {
        const avgDuration = await this.getAverageTaskDuration(task.taskType, {
          agentTypes: [task.agentType],
        });
        performanceMap.set(key, avgDuration);
      }
    }

    // Sort tasks by:
    // 1. Parallelizable tasks first (if in same parallel group)
    // 2. Fastest tasks first
    // 3. Highest success rate tasks first

    const sortedTasks = [...tasks].sort((a, b) => {
      // Keep parallel groups together
      if (a.parallelGroup !== undefined && b.parallelGroup !== undefined) {
        if (a.parallelGroup !== b.parallelGroup) {
          return a.parallelGroup - b.parallelGroup;
        }
      }

      // Sort by duration
      const aDuration = performanceMap.get(`${a.agentType}:${a.taskType}`) || a.durationMs;
      const bDuration = performanceMap.get(`${b.agentType}:${b.taskType}`) || b.durationMs;

      return aDuration - bDuration;
    });

    // Update order numbers
    return sortedTasks.map((task, index) => ({
      ...task,
      order: index,
    }));
  }

  /**
   * Calculate agent performance metrics
   */
  async calculateAgentPerformance(
    agentType: AgentType,
    taskType: TaskType,
    lookbackDays: number = 30
  ): Promise<AgentPerformance | null> {
    const query = `
      WITH execution_stats AS (
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'success') as successful,
          COUNT(*) FILTER (WHERE status IN ('failed', 'timeout')) as failed,
          AVG(actual_duration_ms) FILTER (WHERE status = 'success' AND actual_duration_ms IS NOT NULL) as avg_duration,
          MIN(actual_duration_ms) FILTER (WHERE status = 'success' AND actual_duration_ms IS NOT NULL) as min_duration,
          MAX(actual_duration_ms) FILTER (WHERE status = 'success' AND actual_duration_ms IS NOT NULL) as max_duration,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_duration_ms) FILTER (WHERE status = 'success' AND actual_duration_ms IS NOT NULL) as p50_duration,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY actual_duration_ms) FILTER (WHERE status = 'success' AND actual_duration_ms IS NOT NULL) as p95_duration,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY actual_duration_ms) FILTER (WHERE status = 'success' AND actual_duration_ms IS NOT NULL) as p99_duration,
          AVG(cpu_usage_percent) as avg_cpu,
          AVG(memory_usage_mb) as avg_memory,
          MAX(started_at) as last_execution
        FROM orchestrator_execution_history
        WHERE agent_type = $1
          AND task_type = $2
          AND started_at > NOW() - INTERVAL '${lookbackDays} days'
      ),
      error_stats AS (
        SELECT
          error_type,
          COUNT(*) as count,
          MAX(started_at) as last_occurrence,
          (ARRAY_AGG(error_message ORDER BY started_at DESC))[1] as example_message
        FROM orchestrator_execution_history
        WHERE agent_type = $1
          AND task_type = $2
          AND status IN ('failed', 'timeout')
          AND started_at > NOW() - INTERVAL '${lookbackDays} days'
        GROUP BY error_type
        ORDER BY count DESC
        LIMIT 5
      )
      SELECT
        es.*,
        COALESCE(json_agg(
          json_build_object(
            'errorType', err.error_type,
            'count', err.count,
            'lastOccurrence', err.last_occurrence,
            'exampleMessage', err.example_message
          )
        ) FILTER (WHERE err.error_type IS NOT NULL), '[]'::json) as common_errors
      FROM execution_stats es
      LEFT JOIN error_stats err ON true
      GROUP BY es.total, es.successful, es.failed, es.avg_duration, es.min_duration,
               es.max_duration, es.p50_duration, es.p95_duration, es.p99_duration,
               es.avg_cpu, es.avg_memory, es.last_execution
    `;

    const result = await this.pool.query(query, [agentType, taskType]);

    if (result.rows.length === 0 || result.rows[0].total === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      agentType,
      taskType,
      totalExecutions: parseInt(row.total),
      successfulExecutions: parseInt(row.successful),
      failedExecutions: parseInt(row.failed),
      avgDurationMs: row.avg_duration ? Math.round(row.avg_duration) : undefined,
      minDurationMs: row.min_duration ? Math.round(row.min_duration) : undefined,
      maxDurationMs: row.max_duration ? Math.round(row.max_duration) : undefined,
      p50DurationMs: row.p50_duration ? Math.round(row.p50_duration) : undefined,
      p95DurationMs: row.p95_duration ? Math.round(row.p95_duration) : undefined,
      p99DurationMs: row.p99_duration ? Math.round(row.p99_duration) : undefined,
      successRate: parseFloat(row.successful) / parseFloat(row.total),
      commonErrors: row.common_errors || [],
      avgCpuUsagePercent: row.avg_cpu,
      avgMemoryUsageMb: row.avg_memory,
      lastExecutionAt: row.last_execution,
      metricsUpdatedAt: new Date(),
    };
  }

  /**
   * Update aggregated agent performance metrics
   */
  async updateAgentPerformanceMetrics(
    agentType: AgentType,
    taskType: TaskType
  ): Promise<void> {
    const performance = await this.calculateAgentPerformance(agentType, taskType);

    if (!performance) {
      return;
    }

    const query = `
      INSERT INTO orchestrator_agent_performance (
        agent_type, task_type, total_executions, successful_executions,
        failed_executions, avg_duration_ms, min_duration_ms, max_duration_ms,
        p50_duration_ms, p95_duration_ms, p99_duration_ms, success_rate,
        common_errors, avg_cpu_usage_percent, avg_memory_usage_mb,
        last_execution_at, metrics_updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (agent_type, task_type)
      DO UPDATE SET
        total_executions = EXCLUDED.total_executions,
        successful_executions = EXCLUDED.successful_executions,
        failed_executions = EXCLUDED.failed_executions,
        avg_duration_ms = EXCLUDED.avg_duration_ms,
        min_duration_ms = EXCLUDED.min_duration_ms,
        max_duration_ms = EXCLUDED.max_duration_ms,
        p50_duration_ms = EXCLUDED.p50_duration_ms,
        p95_duration_ms = EXCLUDED.p95_duration_ms,
        p99_duration_ms = EXCLUDED.p99_duration_ms,
        success_rate = EXCLUDED.success_rate,
        common_errors = EXCLUDED.common_errors,
        avg_cpu_usage_percent = EXCLUDED.avg_cpu_usage_percent,
        avg_memory_usage_mb = EXCLUDED.avg_memory_usage_mb,
        last_execution_at = EXCLUDED.last_execution_at,
        metrics_updated_at = EXCLUDED.metrics_updated_at
    `;

    await this.pool.query(query, [
      performance.agentType,
      performance.taskType,
      performance.totalExecutions,
      performance.successfulExecutions,
      performance.failedExecutions,
      performance.avgDurationMs,
      performance.minDurationMs,
      performance.maxDurationMs,
      performance.p50DurationMs,
      performance.p95DurationMs,
      performance.p99DurationMs,
      performance.successRate,
      JSON.stringify(performance.commonErrors),
      performance.avgCpuUsagePercent,
      performance.avgMemoryUsageMb,
      performance.lastExecutionAt,
      performance.metricsUpdatedAt,
    ]);
  }

  /**
   * Get execution history for analysis
   */
  async getExecutionHistory(
    options: AnalysisOptions & { limit?: number } = {}
  ): Promise<ExecutionRecord[]> {
    const {
      lookbackDays = 30,
      agentTypes,
      taskTypes,
      includeFailures = true,
      limit = 100,
    } = options;

    const conditions = ['started_at > NOW() - INTERVAL $1'];
    const params: any[] = [`${lookbackDays} days`];

    if (agentTypes && agentTypes.length > 0) {
      params.push(agentTypes);
      conditions.push(`agent_type = ANY($${params.length})`);
    }

    if (taskTypes && taskTypes.length > 0) {
      params.push(taskTypes);
      conditions.push(`task_type = ANY($${params.length})`);
    }

    if (!includeFailures) {
      conditions.push("status = 'success'");
    }

    const query = `
      SELECT *
      FROM orchestrator_execution_history
      WHERE ${conditions.join(' AND ')}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;

    const result = await this.pool.query(query, params);

    return result.rows.map(this.mapRowToExecutionRecord);
  }

  /**
   * Calculate time estimation accuracy
   */
  async getTimeEstimationAccuracy(
    agentType?: AgentType,
    taskType?: TaskType
  ): Promise<{
    avgAccuracy: number;
    overestimatePercent: number;
    underestimatePercent: number;
  }> {
    const conditions = [
      'status = $1',
      'estimated_duration_ms IS NOT NULL',
      'actual_duration_ms IS NOT NULL',
    ];
    const params: any[] = ['success'];

    if (agentType) {
      params.push(agentType);
      conditions.push(`agent_type = $${params.length}`);
    }

    if (taskType) {
      params.push(taskType);
      conditions.push(`task_type = $${params.length}`);
    }

    const query = `
      SELECT
        AVG(ABS(actual_duration_ms - estimated_duration_ms)::FLOAT / NULLIF(estimated_duration_ms, 0)) as avg_accuracy,
        AVG(CASE WHEN estimated_duration_ms > actual_duration_ms THEN 1.0 ELSE 0.0 END) as overestimate_rate,
        AVG(CASE WHEN estimated_duration_ms < actual_duration_ms THEN 1.0 ELSE 0.0 END) as underestimate_rate
      FROM orchestrator_execution_history
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await this.pool.query(query, params);
    const row = result.rows[0];

    return {
      avgAccuracy: 1 - (row.avg_accuracy || 0),
      overestimatePercent: (row.overestimate_rate || 0) * 100,
      underestimatePercent: (row.underestimate_rate || 0) * 100,
    };
  }

  /**
   * Helper: Generate fix recommendation based on failure pattern
   */
  private generateFixRecommendation(failureRow: any): string {
    const { agent_type, task_type, error_type } = failureRow;

    const recommendations: Record<string, string> = {
      timeout: `Increase timeout threshold for ${agent_type} ${task_type} tasks`,
      connection_error: `Check database/service connectivity before ${task_type}`,
      validation_error: `Add input validation before executing ${task_type}`,
      memory_error: `Optimize memory usage or allocate more resources for ${agent_type}`,
      dependency_error: `Ensure all dependencies are available before ${task_type}`,
    };

    return recommendations[error_type] || `Review and fix ${error_type} in ${agent_type}`;
  }

  /**
   * Helper: Map database row to ExecutionRecord
   */
  private mapRowToExecutionRecord(row: any): ExecutionRecord {
    return {
      id: row.id,
      goal: row.goal,
      goalHash: row.goal_hash,
      agentType: row.agent_type,
      taskDescription: row.task_description,
      taskType: row.task_type,
      estimatedDurationMs: row.estimated_duration_ms,
      actualDurationMs: row.actual_duration_ms,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      retryCount: row.retry_count,
      errorType: row.error_type,
      errorMessage: row.error_message,
      errorStack: row.error_stack,
      context: row.context,
      dependencies: row.dependencies,
      parallelExecution: row.parallel_execution,
      cpuUsagePercent: row.cpu_usage_percent,
      memoryUsageMb: row.memory_usage_mb,
      orchestratorVersion: row.orchestrator_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
