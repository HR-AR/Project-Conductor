/**
 * Execution Optimizer Service
 * Optimizes task execution order and manages dynamic plan adaptation
 */

import {
  ExecutionPlan,
  Task,
  TaskStatus,
  DependencyGraph,
  OptimizationStrategy,
  PlanComparison,
  ExecutionContext,
  PlanAdaptation,
  ParallelizationOpportunity,
  TaskDependency
} from '../../models/orchestrator-planning.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * Execution Optimizer Service
 * Optimizes task ordering, manages parallelization, and adapts plans during execution
 */
export class ExecutionOptimizerService {
  /**
   * Optimize execution plan based on strategy
   */
  public optimizePlan(
    plan: ExecutionPlan,
    strategy: OptimizationStrategy = { strategy: 'balanced', parameters: {} }
  ): ExecutionPlan {
    switch (strategy.strategy) {
      case 'minimize_duration':
        return this.optimizeForDuration(plan, strategy.parameters);
      case 'minimize_risk':
        return this.optimizeForRisk(plan, strategy.parameters);
      case 'maximize_parallelization':
        return this.optimizeForParallelization(plan, strategy.parameters);
      case 'balanced':
      default:
        return this.optimizeBalanced(plan, strategy.parameters);
    }
  }

  /**
   * Optimize plan to minimize total duration
   */
  private optimizeForDuration(
    plan: ExecutionPlan,
    parameters: OptimizationStrategy['parameters']
  ): ExecutionPlan {
    const optimizedTasks = [...plan.tasks];
    const maxParallelTasks = parameters.maxParallelTasks || 4;

    // Reorder tasks to maximize parallelization opportunities
    const reorderedTasks = this.reorderForMaxParallelization(
      optimizedTasks,
      maxParallelTasks
    );

    // Rebuild dependency graph
    const dependencies = this.rebuildDependencyGraph(reorderedTasks);

    // Recalculate duration
    const estimatedDuration = this.calculateOptimizedDuration(
      reorderedTasks,
      dependencies,
      maxParallelTasks
    );

    return {
      ...plan,
      tasks: reorderedTasks,
      dependencies,
      estimatedDuration,
      updatedAt: new Date()
    };
  }

  /**
   * Optimize plan to minimize risk
   */
  private optimizeForRisk(
    plan: ExecutionPlan,
    parameters: OptimizationStrategy['parameters']
  ): ExecutionPlan {
    const optimizedTasks = [...plan.tasks];

    // Add safety tasks (extra validation, testing)
    const safetyTasks = this.generateSafetyTasks(optimizedTasks);
    optimizedTasks.push(...safetyTasks);

    // Reduce parallelization for critical tasks
    const criticalTaskIds = new Set(plan.dependencies.criticalPath);
    for (const task of optimizedTasks) {
      if (criticalTaskIds.has(task.id)) {
        task.canRunInParallel = false;
      }
    }

    // Rebuild dependency graph
    const dependencies = this.rebuildDependencyGraph(optimizedTasks);

    // Recalculate duration (will be longer due to reduced parallelization)
    const estimatedDuration = this.calculateOptimizedDuration(optimizedTasks, dependencies, 1);

    // Reassess risks
    const riskAssessment = {
      ...plan.riskAssessment,
      overallRisk: this.downgradeRisk(plan.riskAssessment.overallRisk)
    };

    return {
      ...plan,
      tasks: optimizedTasks,
      dependencies,
      estimatedDuration,
      riskAssessment,
      updatedAt: new Date()
    };
  }

  /**
   * Optimize plan to maximize parallelization
   */
  private optimizeForParallelization(
    plan: ExecutionPlan,
    parameters: OptimizationStrategy['parameters']
  ): ExecutionPlan {
    const optimizedTasks = [...plan.tasks];
    const maxParallelTasks = parameters.maxParallelTasks || 8;

    // Mark as many tasks as possible for parallel execution
    for (const task of optimizedTasks) {
      if (task.dependencies.length === 0) {
        task.canRunInParallel = true;
      }
    }

    // Identify and break soft dependencies
    const softDeps = this.identifySoftDependencies(optimizedTasks);
    for (const dep of softDeps) {
      const task = optimizedTasks.find(t => t.id === dep.toTaskId);
      if (task) {
        task.dependencies = task.dependencies.filter(d => d !== dep.fromTaskId);
        task.canRunInParallel = true;
      }
    }

    // Rebuild dependency graph
    const dependencies = this.rebuildDependencyGraph(optimizedTasks);

    // Recalculate duration with high parallelization
    const estimatedDuration = this.calculateOptimizedDuration(
      optimizedTasks,
      dependencies,
      maxParallelTasks
    );

    // Identify new parallelization opportunities
    const parallelizationOpportunities = this.identifyParallelizationOpportunities(
      optimizedTasks,
      dependencies
    );

    return {
      ...plan,
      tasks: optimizedTasks,
      dependencies,
      estimatedDuration,
      parallelizationOpportunities,
      updatedAt: new Date()
    };
  }

  /**
   * Optimize plan with balanced approach
   */
  private optimizeBalanced(
    plan: ExecutionPlan,
    parameters: OptimizationStrategy['parameters']
  ): ExecutionPlan {
    const maxParallelTasks = parameters.maxParallelTasks || 4;
    const riskTolerance = parameters.riskTolerance || 'medium';

    // Start with duration optimization
    let optimized = this.optimizeForDuration(plan, { ...parameters, maxParallelTasks });

    // Add safety measures based on risk tolerance
    if (riskTolerance === 'low') {
      const criticalTaskIds = new Set(optimized.dependencies.criticalPath);
      for (const task of optimized.tasks) {
        if (criticalTaskIds.has(task.id)) {
          task.canRunInParallel = false;
        }
      }
    }

    // Recalculate final metrics
    const dependencies = this.rebuildDependencyGraph(optimized.tasks);
    const estimatedDuration = this.calculateOptimizedDuration(
      optimized.tasks,
      dependencies,
      maxParallelTasks
    );

    return {
      ...optimized,
      dependencies,
      estimatedDuration,
      updatedAt: new Date()
    };
  }

  /**
   * Get optimal execution order for tasks
   */
  public getExecutionOrder(plan: ExecutionPlan, maxParallelTasks: number = 4): Task[][] {
    const executionGroups: Task[][] = [];
    const completed = new Set<string>();
    const inProgress = new Set<string>();
    const taskMap = new Map(plan.tasks.map(t => [t.id, t]));

    while (completed.size < plan.tasks.length) {
      const readyTasks = plan.tasks.filter(task => {
        // Skip if already completed or in progress
        if (completed.has(task.id) || inProgress.has(task.id)) return false;

        // Check if all dependencies are completed
        return task.dependencies.every(depId => completed.has(depId));
      });

      if (readyTasks.length === 0) {
        // No more tasks ready, break to avoid infinite loop
        break;
      }

      // Group tasks for parallel execution
      const parallelGroup: Task[] = [];
      for (const task of readyTasks) {
        if (parallelGroup.length >= maxParallelTasks) break;

        if (task.canRunInParallel || parallelGroup.length === 0) {
          parallelGroup.push(task);
          inProgress.add(task.id);
        }
      }

      executionGroups.push(parallelGroup);

      // Mark as completed for next iteration
      parallelGroup.forEach(task => {
        completed.add(task.id);
        inProgress.delete(task.id);
      });
    }

    return executionGroups;
  }

  /**
   * Adapt plan based on execution results
   */
  public adaptPlan(
    plan: ExecutionPlan,
    context: ExecutionContext,
    trigger: PlanAdaptation['trigger'],
    reason: string
  ): { plan: ExecutionPlan; adaptation: PlanAdaptation } {
    const adaptation: PlanAdaptation = {
      id: uuidv4(),
      planId: plan.id,
      timestamp: new Date(),
      trigger,
      description: reason,
      changes: {},
      reason,
      impact: {
        estimatedDurationChange: 0,
        tasksAffected: 0,
        riskChange: 'unchanged'
      }
    };

    let modifiedPlan = { ...plan };

    switch (trigger) {
      case 'task_failure':
        ({ plan: modifiedPlan, adaptation: adaptation } = this.handleTaskFailure(
          modifiedPlan,
          context,
          adaptation
        ));
        break;

      case 'conflict_detected':
        ({ plan: modifiedPlan, adaptation: adaptation } = this.handleConflict(
          modifiedPlan,
          context,
          adaptation
        ));
        break;

      case 'time_overrun':
        ({ plan: modifiedPlan, adaptation: adaptation } = this.handleTimeOverrun(
          modifiedPlan,
          context,
          adaptation
        ));
        break;

      case 'dependency_change':
        ({ plan: modifiedPlan, adaptation: adaptation } = this.handleDependencyChange(
          modifiedPlan,
          context,
          adaptation
        ));
        break;

      case 'manual':
        // Manual adaptation handled by caller
        break;
    }

    return { plan: modifiedPlan, adaptation };
  }

  /**
   * Handle task failure adaptation
   */
  private handleTaskFailure(
    plan: ExecutionPlan,
    context: ExecutionContext,
    adaptation: PlanAdaptation
  ): { plan: ExecutionPlan; adaptation: PlanAdaptation } {
    const failedTaskIds = context.failedTasks;
    const tasksToRetry: Task[] = [];
    const tasksToSkip: string[] = [];

    for (const taskId of failedTaskIds) {
      const task = plan.tasks.find(t => t.id === taskId);
      if (!task) continue;

      // Check if task is on critical path
      const isCritical = plan.dependencies.criticalPath.includes(taskId);

      if (isCritical) {
        // Critical task - must retry
        const retryTask = { ...task, status: TaskStatus.PENDING };
        tasksToRetry.push(retryTask);
      } else {
        // Non-critical task - can skip
        tasksToSkip.push(taskId);
      }
    }

    // Update plan
    const updatedTasks = plan.tasks.map(t => {
      const retry = tasksToRetry.find(rt => rt.id === t.id);
      if (retry) return retry;
      if (tasksToSkip.includes(t.id)) return { ...t, status: TaskStatus.SKIPPED };
      return t;
    });

    adaptation.changes = {
      tasksModified: tasksToRetry.map(t => ({ id: t.id, status: TaskStatus.PENDING })),
      tasksRemoved: tasksToSkip
    };

    adaptation.impact = {
      estimatedDurationChange: tasksToRetry.reduce((sum, t) => sum + t.estimatedDuration, 0),
      tasksAffected: tasksToRetry.length + tasksToSkip.length,
      riskChange: tasksToSkip.length > 0 ? 'increased' : 'unchanged'
    };

    return {
      plan: {
        ...plan,
        tasks: updatedTasks,
        updatedAt: new Date()
      },
      adaptation
    };
  }

  /**
   * Handle conflict adaptation
   */
  private handleConflict(
    plan: ExecutionPlan,
    context: ExecutionContext,
    adaptation: PlanAdaptation
  ): { plan: ExecutionPlan; adaptation: PlanAdaptation } {
    // Pause all tasks that might be affected by conflict
    const currentTask = context.currentTask;
    if (!currentTask) return { plan, adaptation };

    const task = plan.tasks.find(t => t.id === currentTask);
    if (!task) return { plan, adaptation };

    // Find dependent tasks
    const dependentTasks = plan.tasks.filter(t => t.dependencies.includes(currentTask));

    // Block dependent tasks until conflict resolved
    const updatedTasks = plan.tasks.map(t => {
      if (t.id === currentTask) {
        return { ...t, status: TaskStatus.BLOCKED };
      }
      if (dependentTasks.some(dt => dt.id === t.id)) {
        return { ...t, status: TaskStatus.BLOCKED };
      }
      return t;
    });

    adaptation.changes = {
      tasksModified: [
        { id: currentTask, status: TaskStatus.BLOCKED },
        ...dependentTasks.map(t => ({ id: t.id, status: TaskStatus.BLOCKED }))
      ]
    };

    adaptation.impact = {
      estimatedDurationChange: 0, // Unknown until resolved
      tasksAffected: 1 + dependentTasks.length,
      riskChange: 'increased'
    };

    return {
      plan: {
        ...plan,
        tasks: updatedTasks,
        updatedAt: new Date()
      },
      adaptation
    };
  }

  /**
   * Handle time overrun adaptation
   */
  private handleTimeOverrun(
    plan: ExecutionPlan,
    context: ExecutionContext,
    adaptation: PlanAdaptation
  ): { plan: ExecutionPlan; adaptation: PlanAdaptation } {
    // Increase parallelization to catch up
    const updatedTasks = plan.tasks.map(t => {
      if (t.status === TaskStatus.PENDING && !plan.dependencies.criticalPath.includes(t.id)) {
        return { ...t, canRunInParallel: true };
      }
      return t;
    });

    adaptation.changes = {
      tasksModified: updatedTasks
        .filter(t => t.canRunInParallel && !plan.tasks.find(pt => pt.id === t.id)?.canRunInParallel)
        .map(t => ({ id: t.id, canRunInParallel: true }))
    };

    adaptation.impact = {
      estimatedDurationChange: -30, // Estimated time savings
      tasksAffected: adaptation.changes.tasksModified?.length || 0,
      riskChange: 'increased' // More parallelization = more risk
    };

    return {
      plan: {
        ...plan,
        tasks: updatedTasks,
        updatedAt: new Date()
      },
      adaptation
    };
  }

  /**
   * Handle dependency change adaptation
   */
  private handleDependencyChange(
    plan: ExecutionPlan,
    context: ExecutionContext,
    adaptation: PlanAdaptation
  ): { plan: ExecutionPlan; adaptation: PlanAdaptation } {
    // Rebuild dependency graph
    const dependencies = this.rebuildDependencyGraph(plan.tasks);

    adaptation.impact = {
      estimatedDurationChange: 0,
      tasksAffected: plan.tasks.length,
      riskChange: 'unchanged'
    };

    return {
      plan: {
        ...plan,
        dependencies,
        updatedAt: new Date()
      },
      adaptation
    };
  }

  /**
   * Compare multiple execution plans
   */
  public comparePlans(plans: ExecutionPlan[]): PlanComparison {
    const comparison = {
      duration: plans.map(p => p.estimatedDuration),
      risk: plans.map(p => p.riskAssessment.overallRisk),
      parallelization: plans.map(p => this.calculateParallelizationPercentage(p)),
      cost: plans.map(() => 0) // Not implemented yet
    };

    // Score each plan
    const scores = plans.map((plan, index) => {
      let score = 0;

      // Duration score (lower is better)
      const minDuration = Math.min(...comparison.duration);
      score += (1 - (plan.estimatedDuration - minDuration) / minDuration) * 0.4;

      // Risk score (lower is better)
      const riskScores = { low: 1, medium: 0.7, high: 0.4, critical: 0.1 };
      score += riskScores[plan.riskAssessment.overallRisk] * 0.4;

      // Parallelization score (higher is better)
      const maxParallel = Math.max(...comparison.parallelization);
      score += (comparison.parallelization[index] / maxParallel) * 0.2;

      return { planId: plan.id, score };
    });

    // Find best plan
    const best = scores.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    const bestPlan = plans.find(p => p.id === best.planId)!;

    return {
      plans,
      comparison,
      recommendation: {
        bestPlanId: best.planId,
        reason: this.generateRecommendationReason(bestPlan, plans),
        tradeoffs: this.identifyTradeoffs(bestPlan, plans)
      }
    };
  }

  /**
   * Reorder tasks for maximum parallelization
   */
  private reorderForMaxParallelization(tasks: Task[], maxParallel: number): Task[] {
    // Sort by dependencies (fewer dependencies first)
    return [...tasks].sort((a, b) => {
      if (a.dependencies.length !== b.dependencies.length) {
        return a.dependencies.length - b.dependencies.length;
      }
      // Tie-breaker: higher priority first
      const priorityOrder = {
        [TaskPriority.CRITICAL]: 0,
        [TaskPriority.HIGH]: 1,
        [TaskPriority.MEDIUM]: 2,
        [TaskPriority.LOW]: 3
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Rebuild dependency graph
   */
  private rebuildDependencyGraph(tasks: Task[]): DependencyGraph {
    const edges: TaskDependency[] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    // Build edges
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        edges.push({
          fromTaskId: depId,
          toTaskId: task.id,
          type: 'requires',
          reason: `${task.name} requires ${taskMap.get(depId)?.name || 'dependency'}`
        });
      }
    }

    // Calculate layers (same as plan generator)
    const layers: string[][] = [];
    const layer = new Map<string, number>();

    const calculateLayer = (taskId: string): number => {
      if (layer.has(taskId)) return layer.get(taskId)!;

      const task = taskMap.get(taskId)!;
      if (task.dependencies.length === 0) {
        layer.set(taskId, 0);
        return 0;
      }

      const maxDepLayer = Math.max(...task.dependencies.map(depId => calculateLayer(depId)));
      const taskLayer = maxDepLayer + 1;
      layer.set(taskId, taskLayer);
      return taskLayer;
    };

    for (const task of tasks) {
      calculateLayer(task.id);
    }

    const maxLayer = Math.max(...Array.from(layer.values()));
    for (let i = 0; i <= maxLayer; i++) {
      const layerTasks = tasks.filter(t => layer.get(t.id) === i).map(t => t.id);
      if (layerTasks.length > 0) {
        layers.push(layerTasks);
      }
    }

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(tasks);

    return {
      nodes: tasks,
      edges,
      layers,
      criticalPath
    };
  }

  /**
   * Calculate critical path
   */
  private calculateCriticalPath(tasks: Task[]): string[] {
    // Find longest path through task graph
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const longestPath = new Map<string, number>();

    const calculateLongest = (taskId: string): number => {
      if (longestPath.has(taskId)) return longestPath.get(taskId)!;

      const task = taskMap.get(taskId)!;
      if (task.dependencies.length === 0) {
        longestPath.set(taskId, task.estimatedDuration);
        return task.estimatedDuration;
      }

      const maxDepPath = Math.max(...task.dependencies.map(depId => calculateLongest(depId)));
      const path = maxDepPath + task.estimatedDuration;
      longestPath.set(taskId, path);
      return path;
    };

    for (const task of tasks) {
      calculateLongest(task.id);
    }

    // Get max path value
    const maxPathLength = Math.max(...Array.from(longestPath.values()));

    // Return tasks on critical path
    return tasks.filter(t => longestPath.get(t.id) === maxPathLength).map(t => t.id);
  }

  /**
   * Calculate optimized duration with parallelization
   */
  private calculateOptimizedDuration(
    tasks: Task[],
    dependencies: DependencyGraph,
    maxParallel: number
  ): number {
    let totalDuration = 0;

    for (const layer of dependencies.layers) {
      const layerTasks = tasks.filter(t => layer.includes(t.id));
      const parallelGroups = Math.ceil(layerTasks.length / maxParallel);

      // Calculate duration for this layer
      let layerDuration = 0;
      for (let i = 0; i < parallelGroups; i++) {
        const groupTasks = layerTasks.slice(i * maxParallel, (i + 1) * maxParallel);
        const groupDuration = Math.max(...groupTasks.map(t => t.estimatedDuration));
        layerDuration += groupDuration;
      }

      totalDuration += layerDuration;
    }

    return totalDuration;
  }

  /**
   * Generate safety tasks for risk mitigation
   */
  private generateSafetyTasks(tasks: Task[]): Task[] {
    // Add extra validation/testing tasks for critical components
    return [];
  }

  /**
   * Downgrade risk level
   */
  private downgradeRisk(
    risk: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const downgrades = { critical: 'high', high: 'medium', medium: 'low', low: 'low' };
    return downgrades[risk] as typeof risk;
  }

  /**
   * Identify soft dependencies that can be broken
   */
  private identifySoftDependencies(tasks: Task[]): TaskDependency[] {
    // Placeholder - would analyze dependencies to find non-critical ones
    return [];
  }

  /**
   * Identify parallelization opportunities
   */
  private identifyParallelizationOpportunities(
    tasks: Task[],
    dependencies: DependencyGraph
  ): ParallelizationOpportunity[] {
    const opportunities: ParallelizationOpportunity[] = [];

    for (const layer of dependencies.layers) {
      if (layer.length > 1) {
        const layerTasks = tasks.filter(t => layer.includes(t.id));
        const maxDuration = Math.max(...layerTasks.map(t => t.estimatedDuration));
        const sumDuration = layerTasks.reduce((sum, t) => sum + t.estimatedDuration, 0);
        const timeSaved = sumDuration - maxDuration;

        if (timeSaved > 10) {
          opportunities.push({
            tasks: layer,
            estimatedTimeSaved: timeSaved,
            reason: 'Tasks have no dependencies between them',
            riskLevel: 'low'
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Calculate parallelization percentage
   */
  private calculateParallelizationPercentage(plan: ExecutionPlan): number {
    const parallelTasks = plan.tasks.filter(t => t.canRunInParallel).length;
    return (parallelTasks / plan.tasks.length) * 100;
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(bestPlan: ExecutionPlan, allPlans: ExecutionPlan[]): string {
    const avgDuration =
      allPlans.reduce((sum, p) => sum + p.estimatedDuration, 0) / allPlans.length;

    let reason = `This plan offers the best balance of duration (${bestPlan.estimatedDuration} min`;

    if (bestPlan.estimatedDuration < avgDuration) {
      reason += `, ${Math.round(((avgDuration - bestPlan.estimatedDuration) / avgDuration) * 100)}% faster than average`;
    }

    reason += `), risk level (${bestPlan.riskAssessment.overallRisk}), and parallelization opportunities.`;

    return reason;
  }

  /**
   * Identify tradeoffs between plans
   */
  private identifyTradeoffs(bestPlan: ExecutionPlan, allPlans: ExecutionPlan[]): string[] {
    const tradeoffs: string[] = [];

    // Find fastest plan
    const fastestPlan = allPlans.reduce((fastest, p) =>
      p.estimatedDuration < fastest.estimatedDuration ? p : fastest
    );

    if (fastestPlan.id !== bestPlan.id) {
      const timeDiff = bestPlan.estimatedDuration - fastestPlan.estimatedDuration;
      tradeoffs.push(
        `Choosing this plan means ${timeDiff} min longer than fastest option, but with ${bestPlan.riskAssessment.overallRisk} risk vs ${fastestPlan.riskAssessment.overallRisk}`
      );
    }

    // Find lowest risk plan
    const riskLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    const lowestRiskPlan = allPlans.reduce((lowest, p) =>
      riskLevels[p.riskAssessment.overallRisk] < riskLevels[lowest.riskAssessment.overallRisk]
        ? p
        : lowest
    );

    if (lowestRiskPlan.id !== bestPlan.id) {
      tradeoffs.push(
        `Accepting ${bestPlan.riskAssessment.overallRisk} risk level for better duration (vs safest option with ${lowestRiskPlan.riskAssessment.overallRisk} risk)`
      );
    }

    return tradeoffs;
  }
}
