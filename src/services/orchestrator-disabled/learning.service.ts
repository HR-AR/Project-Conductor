/**
 * Orchestrator Learning Service
 * Implements machine learning-inspired pattern recognition and optimization
 */

import { Pool } from 'pg';
import crypto from 'crypto';
import {
  AgentType,
  TaskType,
  ExecutionRecord,
  Lesson,
  LessonType,
  LessonPattern,
  Recommendation,
  CreateExecutionRecordRequest,
  UpdateExecutionRecordRequest,
  GetRecommendationsRequest,
  TaskPrediction,
  LearningStats,
  OptimizationOpportunity,
  FailurePattern,
} from '../../models/orchestrator-learning.model';
import { AnalyticsService } from './analytics.service';

export class LearningService {
  private pool: Pool;
  private analytics: AnalyticsService;

  // Configuration
  private readonly MIN_CONFIDENCE = 0.6;
  private readonly MIN_SAMPLE_SIZE = 5;
  private readonly LOOKBACK_DAYS = 30;

  constructor(pool?: Pool) {
    this.pool = pool || new Pool({
      connectionString: process.env['DATABASE_URL'],
    });
    this.analytics = new AnalyticsService(this.pool);
  }

  /**
   * Record a new task execution
   */
  async recordExecution(
    request: CreateExecutionRecordRequest
  ): Promise<ExecutionRecord> {
    const goalHash = this.hashGoal(request.goal);

    const query = `
      INSERT INTO orchestrator_execution_history (
        goal, goal_hash, agent_type, task_description, task_type,
        estimated_duration_ms, context, dependencies, parallel_execution,
        status, started_at, orchestrator_version
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      request.goal,
      goalHash,
      request.agentType,
      request.taskDescription,
      request.taskType,
      request.estimatedDurationMs,
      JSON.stringify(request.context || {}),
      JSON.stringify(request.dependencies || []),
      request.parallelExecution || false,
      'success', // Will be updated when completed
      new Date(),
      process.env['npm_package_version'] || '1.0.0',
    ]);

    return this.mapRowToExecutionRecord(result.rows[0]);
  }

  /**
   * Update execution record when task completes
   */
  async updateExecution(
    executionId: string,
    update: UpdateExecutionRecordRequest
  ): Promise<void> {
    const query = `
      UPDATE orchestrator_execution_history
      SET
        actual_duration_ms = $2,
        status = $3,
        completed_at = $4,
        error_type = $5,
        error_message = $6,
        error_stack = $7,
        cpu_usage_percent = $8,
        memory_usage_mb = $9
      WHERE id = $1
    `;

    await this.pool.query(query, [
      executionId,
      update.actualDurationMs,
      update.status,
      update.completedAt,
      update.errorType,
      update.errorMessage,
      update.errorStack,
      update.cpuUsagePercent,
      update.memoryUsageMb,
    ]);

    // Trigger pattern analysis if this was a failure
    if (update.status === 'failed' || update.status === 'timeout') {
      await this.analyzePatterns();
    }

    // Update agent performance metrics
    const execution = await this.getExecutionById(executionId);
    if (execution && execution.taskType) {
      await this.analytics.updateAgentPerformanceMetrics(
        execution.agentType,
        execution.taskType
      );
    }
  }

  /**
   * Analyze execution history for patterns and generate lessons
   */
  async analyzePatterns(): Promise<Lesson[]> {
    const newLessons: Lesson[] = [];

    // Run different pattern detection algorithms
    const agentSelectionLessons = await this.detectAgentSelectionPatterns();
    const taskOrderingLessons = await this.detectTaskOrderingPatterns();
    const timeEstimationLessons = await this.detectTimeEstimationPatterns();
    const errorPreventionLessons = await this.detectErrorPreventionPatterns();
    const parallelExecutionLessons = await this.detectParallelExecutionPatterns();

    newLessons.push(
      ...agentSelectionLessons,
      ...taskOrderingLessons,
      ...timeEstimationLessons,
      ...errorPreventionLessons,
      ...parallelExecutionLessons
    );

    // Store new lessons (avoiding duplicates)
    for (const lesson of newLessons) {
      await this.storeLesson(lesson);
    }

    return newLessons;
  }

  /**
   * Get recommendations for a specific goal
   */
  async getRecommendations(
    request: GetRecommendationsRequest
  ): Promise<Recommendation[]> {
    const goalHash = this.hashGoal(request.goal);
    const limit = request.limit || 10;

    // Get relevant lessons
    const query = `
      SELECT *
      FROM orchestrator_lessons
      WHERE confidence_score >= $1
        AND (
          pattern->>'goalHash' = $2
          OR pattern->>'taskType' = $3
          OR lesson_type IN ('agent_selection', 'time_estimation', 'error_prevention')
        )
      ORDER BY
        confidence_score DESC,
        effectiveness_score DESC,
        times_successful DESC
      LIMIT $4
    `;

    const result = await this.pool.query(query, [
      this.MIN_CONFIDENCE,
      goalHash,
      request.taskType,
      limit,
    ]);

    return result.rows.map(row => this.lessonToRecommendation(row));
  }

  /**
   * Get best agent for a specific task type
   */
  async getBestAgentForTask(taskType: TaskType): Promise<AgentType> {
    const query = `
      SELECT agent_type, success_rate, avg_duration_ms
      FROM orchestrator_agent_performance
      WHERE task_type = $1
      ORDER BY
        success_rate DESC,
        avg_duration_ms ASC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [taskType]);

    if (result.rows.length === 0) {
      // Default mapping if no historical data
      return this.getDefaultAgentForTask(taskType);
    }

    return result.rows[0].agent_type as AgentType;
  }

  /**
   * Predict execution duration for an agent/task combination
   */
  async getPredictedDuration(
    agentType: AgentType,
    taskType: TaskType
  ): Promise<TaskPrediction> {
    const performance = await this.analytics.calculateAgentPerformance(
      agentType,
      taskType,
      this.LOOKBACK_DAYS
    );

    if (!performance || performance.totalExecutions < this.MIN_SAMPLE_SIZE) {
      return {
        agentType,
        taskType,
        predictedDurationMs: 60000, // Default 1 minute
        confidenceInterval: { min: 30000, max: 120000 },
        successProbability: 0.7,
        riskFactors: ['Insufficient historical data'],
      };
    }

    // Calculate confidence interval using percentiles
    const confidenceInterval = {
      min: performance.p50DurationMs || performance.avgDurationMs || 30000,
      max: performance.p95DurationMs || (performance.avgDurationMs || 60000) * 2,
    };

    // Get alternative agents
    const alternatives = await this.getAlternativeAgents(taskType, agentType);

    return {
      agentType,
      taskType,
      predictedDurationMs: performance.avgDurationMs || 60000,
      confidenceInterval,
      successProbability: performance.successRate,
      riskFactors: this.identifyRiskFactors(performance),
      alternativeAgents: alternatives,
    };
  }

  /**
   * Update confidence scores based on application results
   */
  async updateConfidenceScores(): Promise<void> {
    const query = `
      UPDATE orchestrator_lessons
      SET
        confidence_score = CASE
          WHEN times_applied = 0 THEN confidence_score
          ELSE LEAST(1.0, (times_successful::FLOAT / times_applied) * 1.2)
        END,
        effectiveness_score = CASE
          WHEN times_applied = 0 THEN NULL
          ELSE times_successful::FLOAT / times_applied
        END
      WHERE times_applied > 0
    `;

    await this.pool.query(query);
  }

  /**
   * Get learning statistics
   */
  async getLearningStats(): Promise<LearningStats> {
    // Total executions
    const execQuery = 'SELECT COUNT(*) as total FROM orchestrator_execution_history';
    const execResult = await this.pool.query(execQuery);

    // Total lessons
    const lessonQuery = `
      SELECT
        COUNT(*) as total,
        AVG(confidence_score) as avg_confidence,
        AVG(effectiveness_score) as avg_effectiveness
      FROM orchestrator_lessons
    `;
    const lessonResult = await this.pool.query(lessonQuery);

    // Top performing agents
    const agentQuery = `
      SELECT agent_type, success_rate, avg_duration_ms
      FROM orchestrator_agent_performance
      ORDER BY success_rate DESC, avg_duration_ms ASC
      LIMIT 5
    `;
    const agentResult = await this.pool.query(agentQuery);

    // Common failure patterns
    const failurePatterns = await this.analytics.getCommonFailurePatterns({
      lookbackDays: this.LOOKBACK_DAYS,
    });

    // Recent improvements
    const improvementQuery = `
      SELECT
        lesson_type,
        recommendation,
        confidence_score,
        effectiveness_score,
        times_applied
      FROM orchestrator_lessons
      WHERE last_applied_at > NOW() - INTERVAL '7 days'
        AND effectiveness_score > 0.7
      ORDER BY effectiveness_score DESC
      LIMIT 5
    `;
    const improvementResult = await this.pool.query(improvementQuery);

    return {
      totalExecutions: parseInt(execResult.rows[0].total),
      totalLessons: parseInt(lessonResult.rows[0].total),
      avgConfidenceScore: lessonResult.rows[0].avg_confidence || 0,
      avgEffectivenessScore: lessonResult.rows[0].avg_effectiveness || 0,
      topPerformingAgents: agentResult.rows.map(row => ({
        agentType: row.agent_type,
        successRate: row.success_rate,
        avgDurationMs: row.avg_duration_ms,
      })),
      commonFailurePatterns: failurePatterns.slice(0, 5),
      recentImprovements: improvementResult.rows.map(row => ({
        lessonType: row.lesson_type,
        improvementPercent: (row.effectiveness_score || 0) * 100,
        description: row.recommendation,
      })),
      optimizationPotential: await this.calculateOptimizationPotential(),
    };
  }

  /**
   * Identify optimization opportunities
   */
  async identifyOptimizationOpportunities(): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Find tasks that could be parallelized
    const parallelOps = await this.findParallelizationOpportunities();
    opportunities.push(...parallelOps);

    // Find suboptimal agent selections
    const agentOps = await this.findAgentSwitchOpportunities();
    opportunities.push(...agentOps);

    // Find tasks that could be reordered
    const orderOps = await this.findTaskReorderOpportunities();
    opportunities.push(...orderOps);

    return opportunities.sort((a, b) => b.savingsPercent - a.savingsPercent);
  }

  // ========== PATTERN DETECTION ALGORITHMS ==========

  /**
   * Detect agent selection patterns
   */
  private async detectAgentSelectionPatterns(): Promise<Lesson[]> {
    const query = `
      WITH agent_task_performance AS (
        SELECT
          task_type,
          agent_type,
          COUNT(*) as executions,
          AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END) as success_rate,
          AVG(actual_duration_ms) as avg_duration
        FROM orchestrator_execution_history
        WHERE started_at > NOW() - INTERVAL '${this.LOOKBACK_DAYS} days'
          AND actual_duration_ms IS NOT NULL
        GROUP BY task_type, agent_type
        HAVING COUNT(*) >= ${this.MIN_SAMPLE_SIZE}
      ),
      ranked_agents AS (
        SELECT
          task_type,
          agent_type,
          success_rate,
          avg_duration,
          ROW_NUMBER() OVER (PARTITION BY task_type ORDER BY success_rate DESC, avg_duration ASC) as rank
        FROM agent_task_performance
      )
      SELECT
        r1.task_type,
        r1.agent_type as best_agent,
        r1.success_rate as best_rate,
        r2.agent_type as alternative_agent,
        r2.success_rate as alternative_rate
      FROM ranked_agents r1
      LEFT JOIN ranked_agents r2 ON r1.task_type = r2.task_type AND r2.rank = 2
      WHERE r1.rank = 1
        AND r1.success_rate > 0.8
        AND (r2.agent_type IS NULL OR r1.success_rate - r2.success_rate > 0.1)
    `;

    const result = await this.pool.query(query);
    const lessons: Lesson[] = [];

    for (const row of result.rows) {
      const pattern: LessonPattern = {
        taskType: row.task_type,
        agentType: row.best_agent,
        historicalMetrics: {
          successRate: row.best_rate,
        },
      };

      lessons.push({
        lessonType: 'agent_selection',
        pattern,
        patternHash: this.hashPattern(pattern),
        recommendation: `Use ${row.best_agent} for ${row.task_type} tasks (${(row.best_rate * 100).toFixed(1)}% success rate)`,
        alternativeAgent: row.best_agent,
        confidenceScore: Math.min(row.best_rate * 1.2, 1.0),
        createdBy: 'system',
      });
    }

    return lessons;
  }

  /**
   * Detect task ordering patterns
   */
  private async detectTaskOrderingPatterns(): Promise<Lesson[]> {
    // Find workflows where task ordering correlates with success
    const query = `
      WITH workflow_sequences AS (
        SELECT
          goal_hash,
          array_agg(task_type ORDER BY started_at) as task_sequence,
          AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END) as success_rate,
          COUNT(*) as executions
        FROM orchestrator_execution_history
        WHERE started_at > NOW() - INTERVAL '${this.LOOKBACK_DAYS} days'
        GROUP BY goal_hash
        HAVING COUNT(*) >= ${this.MIN_SAMPLE_SIZE}
      )
      SELECT *
      FROM workflow_sequences
      WHERE success_rate > 0.85
      ORDER BY success_rate DESC, executions DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query);
    const lessons: Lesson[] = [];

    for (const row of result.rows) {
      const pattern: LessonPattern = {
        conditions: {
          contextMatches: { goalHash: row.goal_hash },
        },
        historicalMetrics: {
          successRate: row.success_rate,
        },
      };

      lessons.push({
        lessonType: 'task_ordering',
        pattern,
        patternHash: this.hashPattern(pattern),
        recommendation: `Follow task sequence: ${row.task_sequence.join(' → ')} for optimal results`,
        confidenceScore: row.success_rate,
        createdBy: 'system',
      });
    }

    return lessons;
  }

  /**
   * Detect time estimation patterns
   */
  private async detectTimeEstimationPatterns(): Promise<Lesson[]> {
    const query = `
      SELECT
        agent_type,
        task_type,
        AVG(actual_duration_ms) as avg_actual,
        STDDEV(actual_duration_ms) as stddev_actual,
        AVG(estimated_duration_ms) as avg_estimated,
        COUNT(*) as executions
      FROM orchestrator_execution_history
      WHERE started_at > NOW() - INTERVAL '${this.LOOKBACK_DAYS} days'
        AND status = 'success'
        AND estimated_duration_ms IS NOT NULL
        AND actual_duration_ms IS NOT NULL
      GROUP BY agent_type, task_type
      HAVING COUNT(*) >= ${this.MIN_SAMPLE_SIZE}
        AND ABS(AVG(actual_duration_ms) - AVG(estimated_duration_ms)) > AVG(estimated_duration_ms) * 0.2
    `;

    const result = await this.pool.query(query);
    const lessons: Lesson[] = [];

    for (const row of result.rows) {
      const estimationError = Math.abs(row.avg_actual - row.avg_estimated) / row.avg_estimated;

      const pattern: LessonPattern = {
        agentType: row.agent_type,
        taskType: row.task_type,
        historicalMetrics: {
          avgDurationMs: row.avg_actual,
        },
      };

      const direction = row.avg_actual > row.avg_estimated ? 'increase' : 'decrease';

      lessons.push({
        lessonType: 'time_estimation',
        pattern,
        patternHash: this.hashPattern(pattern),
        recommendation: `${direction.charAt(0).toUpperCase() + direction.slice(1)} time estimate for ${row.agent_type} ${row.task_type} to ${Math.round(row.avg_actual)}ms (currently off by ${(estimationError * 100).toFixed(1)}%)`,
        confidenceScore: Math.max(0.6, 1 - estimationError),
        createdBy: 'system',
      });
    }

    return lessons;
  }

  /**
   * Detect error prevention patterns
   */
  private async detectErrorPreventionPatterns(): Promise<Lesson[]> {
    const failurePatterns = await this.analytics.getCommonFailurePatterns({
      lookbackDays: this.LOOKBACK_DAYS,
    });

    const lessons: Lesson[] = [];

    for (const fp of failurePatterns) {
      if (fp.occurrences < 3) continue;

      const pattern: LessonPattern = {
        agentType: fp.agentType,
        taskType: fp.taskType,
        conditions: {
          errorPattern: fp.errorType,
        },
      };

      lessons.push({
        lessonType: 'error_prevention',
        pattern,
        patternHash: this.hashPattern(pattern),
        recommendation: fp.recommendedFix || `Prevent ${fp.errorType} in ${fp.agentType}`,
        confidenceScore: Math.min(0.9, fp.occurrences / 10),
        createdBy: 'system',
      });
    }

    return lessons;
  }

  /**
   * Detect parallel execution patterns
   */
  private async detectParallelExecutionPatterns(): Promise<Lesson[]> {
    // Find tasks that often run at similar times and could be parallelized
    const query = `
      WITH task_pairs AS (
        SELECT
          e1.task_type as task1,
          e2.task_type as task2,
          COUNT(*) as co_occurrences,
          AVG(ABS(EXTRACT(EPOCH FROM (e1.started_at - e2.started_at)))) as avg_time_diff
        FROM orchestrator_execution_history e1
        JOIN orchestrator_execution_history e2
          ON e1.goal_hash = e2.goal_hash
          AND e1.id < e2.id
          AND ABS(EXTRACT(EPOCH FROM (e1.started_at - e2.started_at))) < 300
        WHERE e1.started_at > NOW() - INTERVAL '${this.LOOKBACK_DAYS} days'
        GROUP BY e1.task_type, e2.task_type
        HAVING COUNT(*) >= ${this.MIN_SAMPLE_SIZE}
          AND AVG(ABS(EXTRACT(EPOCH FROM (e1.started_at - e2.started_at)))) < 60
      )
      SELECT * FROM task_pairs
      ORDER BY co_occurrences DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query);
    const lessons: Lesson[] = [];

    for (const row of result.rows) {
      const pattern: LessonPattern = {
        taskType: row.task1,
        conditions: {
          contextMatches: { relatedTask: row.task2 },
        },
      };

      lessons.push({
        lessonType: 'parallel_execution',
        pattern,
        patternHash: this.hashPattern(pattern),
        recommendation: `Execute ${row.task1} and ${row.task2} in parallel (co-occur ${row.co_occurrences} times within ${Math.round(row.avg_time_diff)}s)`,
        confidenceScore: Math.min(0.9, row.co_occurrences / 20),
        createdBy: 'system',
      });
    }

    return lessons;
  }

  // ========== OPTIMIZATION DETECTION ==========

  private async findParallelizationOpportunities(): Promise<OptimizationOpportunity[]> {
    // Implementation would analyze task dependencies
    return [];
  }

  private async findAgentSwitchOpportunities(): Promise<OptimizationOpportunity[]> {
    // Implementation would compare agent performance
    return [];
  }

  private async findTaskReorderOpportunities(): Promise<OptimizationOpportunity[]> {
    // Implementation would analyze task sequences
    return [];
  }

  // ========== HELPER METHODS ==========

  private async storeLesson(lesson: Lesson): Promise<void> {
    const patternHash = lesson.patternHash || this.hashPattern(lesson.pattern);

    const query = `
      INSERT INTO orchestrator_lessons (
        lesson_type, pattern, pattern_hash, recommendation,
        alternative_agent, optimal_order, confidence_score,
        created_by, tags, first_observed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (pattern_hash)
      DO UPDATE SET
        confidence_score = GREATEST(orchestrator_lessons.confidence_score, EXCLUDED.confidence_score),
        recommendation = EXCLUDED.recommendation
    `;

    await this.pool.query(query, [
      lesson.lessonType,
      JSON.stringify(lesson.pattern),
      patternHash,
      lesson.recommendation,
      lesson.alternativeAgent,
      lesson.optimalOrder,
      lesson.confidenceScore,
      lesson.createdBy || 'system',
      JSON.stringify(lesson.tags || []),
      new Date(),
    ]);
  }

  private async getExecutionById(id: string): Promise<ExecutionRecord | null> {
    const result = await this.pool.query(
      'SELECT * FROM orchestrator_execution_history WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    return this.mapRowToExecutionRecord(result.rows[0]);
  }

  private lessonToRecommendation(lessonRow: any): Recommendation {
    const effectiveness = lessonRow.effectiveness_score || lessonRow.confidence_score;

    return {
      type: lessonRow.lesson_type,
      priority: effectiveness > 0.8 ? 'high' : effectiveness > 0.6 ? 'medium' : 'low',
      title: `${lessonRow.lesson_type.replace('_', ' ')} optimization`,
      description: lessonRow.recommendation,
      suggestedApproach: lessonRow.recommendation,
      expectedImprovement: this.estimateImprovement(lessonRow),
      confidenceScore: lessonRow.confidence_score,
      lessonId: lessonRow.id,
    };
  }

  private estimateImprovement(lessonRow: any): any {
    const pattern = lessonRow.pattern;

    if (lessonRow.lesson_type === 'time_estimation' && pattern.historicalMetrics) {
      return {
        timeReduction: `${Math.round((pattern.historicalMetrics.avgDurationMs || 0) / 1000)}s more accurate`,
      };
    }

    return { successRateIncrease: '10-20%' };
  }

  private getDefaultAgentForTask(taskType: TaskType): AgentType {
    const mapping: Record<TaskType, AgentType> = {
      api_implementation: 'Agent-API',
      database_migration: 'Agent-Database',
      testing: 'Agent-Test',
      model_definition: 'Agent-Models',
      websocket_feature: 'Agent-Realtime',
      ui_implementation: 'Agent-Frontend',
      integration: 'Agent-Integration',
      documentation: 'Agent-Documentation',
      bug_fix: 'Agent-API',
      optimization: 'Agent-Quality',
      refactoring: 'Agent-Quality',
    };

    return mapping[taskType] || 'Agent-API';
  }

  private async getAlternativeAgents(
    taskType: TaskType,
    excludeAgent: AgentType
  ): Promise<Array<{ agentType: AgentType; predictedDurationMs: number; successProbability: number }>> {
    const query = `
      SELECT agent_type, avg_duration_ms, success_rate
      FROM orchestrator_agent_performance
      WHERE task_type = $1
        AND agent_type != $2
      ORDER BY success_rate DESC, avg_duration_ms ASC
      LIMIT 3
    `;

    const result = await this.pool.query(query, [taskType, excludeAgent]);

    return result.rows.map(row => ({
      agentType: row.agent_type,
      predictedDurationMs: row.avg_duration_ms || 60000,
      successProbability: row.success_rate,
    }));
  }

  private identifyRiskFactors(performance: any): string[] {
    const risks: string[] = [];

    if (performance.successRate < 0.7) {
      risks.push('Low historical success rate');
    }

    if (performance.commonErrors && performance.commonErrors.length > 0) {
      risks.push(`Common errors: ${performance.commonErrors[0].errorType}`);
    }

    if (performance.p95DurationMs && performance.avgDurationMs) {
      const variability = performance.p95DurationMs / performance.avgDurationMs;
      if (variability > 2) {
        risks.push('High duration variability');
      }
    }

    return risks;
  }

  private async calculateOptimizationPotential(): Promise<number> {
    const query = `
      SELECT
        AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END) as success_rate,
        AVG(CASE
          WHEN estimated_duration_ms IS NOT NULL AND actual_duration_ms IS NOT NULL
          THEN ABS(actual_duration_ms - estimated_duration_ms)::FLOAT / NULLIF(estimated_duration_ms, 0)
          ELSE 0
        END) as estimation_error
      FROM orchestrator_execution_history
      WHERE started_at > NOW() - INTERVAL '30 days'
    `;

    const result = await this.pool.query(query);
    const row = result.rows[0];

    const successGap = 1.0 - (row.success_rate || 0.7);
    const estimationGap = row.estimation_error || 0.2;

    return Math.round((successGap + estimationGap) * 50);
  }

  private hashGoal(goal: string): string {
    return crypto.createHash('md5').update(goal).digest('hex');
  }

  private hashPattern(pattern: LessonPattern): string {
    return crypto.createHash('md5').update(JSON.stringify(pattern)).digest('hex');
  }

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
    await this.analytics.close();
    await this.pool.end();
  }
}
