/**
 * Execution Optimizer Service - Unit Tests
 */

import { ExecutionOptimizerService } from '../../src/services/orchestrator/execution-optimizer.service';
import { PlanGeneratorService } from '../../src/services/orchestrator/plan-generator.service';
import { GoalParserService } from '../../src/services/orchestrator/goal-parser.service';
import {
  ExecutionPlan,
  OptimizationStrategy,
  TaskStatus,
  ExecutionContext,
  AgentType
} from '../../src/models/orchestrator-planning.model';

describe('ExecutionOptimizerService', () => {
  let optimizer: ExecutionOptimizerService;
  let planGenerator: PlanGeneratorService;
  let basePlan: ExecutionPlan;

  beforeEach(() => {
    optimizer = new ExecutionOptimizerService();
    const goalParser = new GoalParserService();
    planGenerator = new PlanGeneratorService(goalParser);
    basePlan = planGenerator.generatePlan('Build API for users');
  });

  describe('optimizePlan', () => {
    it('should optimize plan with balanced strategy', () => {
      const strategy: OptimizationStrategy = {
        strategy: 'balanced',
        parameters: { maxParallelTasks: 4 }
      };

      const optimized = optimizer.optimizePlan(basePlan, strategy);

      expect(optimized.id).toBe(basePlan.id);
      expect(optimized.estimatedDuration).toBeLessThanOrEqual(basePlan.estimatedDuration);
    });

    it('should optimize plan for minimum duration', () => {
      const strategy: OptimizationStrategy = {
        strategy: 'minimize_duration',
        parameters: { maxParallelTasks: 8 }
      };

      const optimized = optimizer.optimizePlan(basePlan, strategy);

      expect(optimized.estimatedDuration).toBeLessThanOrEqual(basePlan.estimatedDuration);
    });

    it('should optimize plan for minimum risk', () => {
      const strategy: OptimizationStrategy = {
        strategy: 'minimize_risk',
        parameters: { riskTolerance: 'low' }
      };

      const optimized = optimizer.optimizePlan(basePlan, strategy);

      // Risk optimization may increase duration for safety
      expect(optimized.estimatedDuration).toBeGreaterThanOrEqual(basePlan.estimatedDuration);
    });

    it('should optimize plan for maximum parallelization', () => {
      const strategy: OptimizationStrategy = {
        strategy: 'maximize_parallelization',
        parameters: { maxParallelTasks: 8 }
      };

      const optimized = optimizer.optimizePlan(basePlan, strategy);

      const parallelTasks = optimized.tasks.filter(t => t.canRunInParallel).length;
      const baseParallelTasks = basePlan.tasks.filter(t => t.canRunInParallel).length;

      expect(parallelTasks).toBeGreaterThanOrEqual(baseParallelTasks);
    });

    it('should update plan timestamp', () => {
      const beforeTime = basePlan.updatedAt;
      const optimized = optimizer.optimizePlan(basePlan);

      expect(optimized.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });
  });

  describe('getExecutionOrder', () => {
    it('should return execution groups', () => {
      const executionOrder = optimizer.getExecutionOrder(basePlan, 4);

      expect(executionOrder.length).toBeGreaterThan(0);
      expect(Array.isArray(executionOrder)).toBe(true);
    });

    it('should respect max parallel tasks', () => {
      const maxParallel = 3;
      const executionOrder = optimizer.getExecutionOrder(basePlan, maxParallel);

      executionOrder.forEach(group => {
        expect(group.length).toBeLessThanOrEqual(maxParallel);
      });
    });

    it('should have tasks with no dependencies in first group', () => {
      const executionOrder = optimizer.getExecutionOrder(basePlan, 4);
      const firstGroup = executionOrder[0];

      firstGroup.forEach(task => {
        expect(task.dependencies.length).toBe(0);
      });
    });

    it('should execute all tasks eventually', () => {
      const executionOrder = optimizer.getExecutionOrder(basePlan, 4);
      const allExecutedTasks = executionOrder.flat();

      expect(allExecutedTasks.length).toBe(basePlan.tasks.length);
    });

    it('should respect dependencies', () => {
      const executionOrder = optimizer.getExecutionOrder(basePlan, 4);
      const executedTaskIds = new Set<string>();

      for (const group of executionOrder) {
        for (const task of group) {
          // All dependencies should already be executed
          task.dependencies.forEach(depId => {
            expect(executedTaskIds.has(depId)).toBe(true);
          });

          executedTaskIds.add(task.id);
        }
      }
    });
  });

  describe('adaptPlan - Task Failure', () => {
    it('should adapt plan on task failure', () => {
      const context: ExecutionContext = {
        planId: basePlan.id,
        currentTask: basePlan.tasks[0].id,
        completedTasks: [],
        failedTasks: [basePlan.tasks[0].id],
        blockedTasks: [],
        activeAgents: [],
        metrics: {
          totalTasks: basePlan.tasks.length,
          completedTasks: 0,
          failedTasks: 1,
          skippedTasks: 0,
          averageTaskDuration: 45,
          planProgress: 0,
          estimatedTimeRemaining: basePlan.estimatedDuration
        },
        events: []
      };

      const { plan: adaptedPlan, adaptation } = optimizer.adaptPlan(
        basePlan,
        context,
        'task_failure',
        'Task failed due to error'
      );

      expect(adaptation).toBeDefined();
      expect(adaptation.trigger).toBe('task_failure');
      expect(adaptation.planId).toBe(basePlan.id);
      expect(adaptation.changes).toBeDefined();
    });

    it('should mark critical tasks for retry', () => {
      // Find a critical task
      const criticalTask = basePlan.tasks.find(
        t => basePlan.dependencies.criticalPath.includes(t.id)
      );

      if (criticalTask) {
        const context: ExecutionContext = {
          planId: basePlan.id,
          currentTask: criticalTask.id,
          completedTasks: [],
          failedTasks: [criticalTask.id],
          blockedTasks: [],
          activeAgents: [],
          metrics: {
            totalTasks: basePlan.tasks.length,
            completedTasks: 0,
            failedTasks: 1,
            skippedTasks: 0,
            averageTaskDuration: 45,
            planProgress: 0,
            estimatedTimeRemaining: basePlan.estimatedDuration
          },
          events: []
        };

        const { adaptation } = optimizer.adaptPlan(
          basePlan,
          context,
          'task_failure',
          'Critical task failed'
        );

        expect(adaptation.impact.tasksAffected).toBeGreaterThan(0);
      }
    });
  });

  describe('adaptPlan - Conflict Detected', () => {
    it('should block affected tasks on conflict', () => {
      const context: ExecutionContext = {
        planId: basePlan.id,
        currentTask: basePlan.tasks[0].id,
        completedTasks: [],
        failedTasks: [],
        blockedTasks: [],
        activeAgents: [],
        metrics: {
          totalTasks: basePlan.tasks.length,
          completedTasks: 0,
          failedTasks: 0,
          skippedTasks: 0,
          averageTaskDuration: 45,
          planProgress: 0,
          estimatedTimeRemaining: basePlan.estimatedDuration
        },
        events: []
      };

      const { plan: adaptedPlan, adaptation } = optimizer.adaptPlan(
        basePlan,
        context,
        'conflict_detected',
        'Conflict detected in task'
      );

      expect(adaptation.trigger).toBe('conflict_detected');
      expect(adaptation.impact.riskChange).toBe('increased');
    });
  });

  describe('adaptPlan - Time Overrun', () => {
    it('should increase parallelization on time overrun', () => {
      const context: ExecutionContext = {
        planId: basePlan.id,
        completedTasks: basePlan.tasks.slice(0, 2).map(t => t.id),
        failedTasks: [],
        blockedTasks: [],
        activeAgents: [],
        metrics: {
          totalTasks: basePlan.tasks.length,
          completedTasks: 2,
          failedTasks: 0,
          skippedTasks: 0,
          averageTaskDuration: 90, // Slower than expected
          planProgress: 20,
          estimatedTimeRemaining: basePlan.estimatedDuration * 2
        },
        events: []
      };

      const { plan: adaptedPlan, adaptation } = optimizer.adaptPlan(
        basePlan,
        context,
        'time_overrun',
        'Execution is behind schedule'
      );

      expect(adaptation.trigger).toBe('time_overrun');
      expect(adaptation.impact.estimatedDurationChange).toBeLessThan(0); // Time saved
    });
  });

  describe('comparePlans', () => {
    it('should compare multiple plans', () => {
      const strategies: OptimizationStrategy[] = [
        { strategy: 'balanced', parameters: {} },
        { strategy: 'minimize_duration', parameters: { maxParallelTasks: 8 } },
        { strategy: 'minimize_risk', parameters: { riskTolerance: 'low' } }
      ];

      const plans = strategies.map(strategy => optimizer.optimizePlan(basePlan, strategy));
      const comparison = optimizer.comparePlans(plans);

      expect(comparison.plans.length).toBe(3);
      expect(comparison.comparison.duration.length).toBe(3);
      expect(comparison.comparison.risk.length).toBe(3);
      expect(comparison.comparison.parallelization.length).toBe(3);
    });

    it('should recommend best plan', () => {
      const strategies: OptimizationStrategy[] = [
        { strategy: 'balanced', parameters: {} },
        { strategy: 'minimize_duration', parameters: { maxParallelTasks: 8 } }
      ];

      const plans = strategies.map(strategy => optimizer.optimizePlan(basePlan, strategy));
      const comparison = optimizer.comparePlans(plans);

      expect(comparison.recommendation.bestPlanId).toBeDefined();
      expect(comparison.recommendation.reason).toBeDefined();
      expect(comparison.recommendation.reason.length).toBeGreaterThan(0);
    });

    it('should identify tradeoffs', () => {
      const strategies: OptimizationStrategy[] = [
        { strategy: 'minimize_duration', parameters: { maxParallelTasks: 8 } },
        { strategy: 'minimize_risk', parameters: { riskTolerance: 'low' } }
      ];

      const plans = strategies.map(strategy => optimizer.optimizePlan(basePlan, strategy));
      const comparison = optimizer.comparePlans(plans);

      expect(Array.isArray(comparison.recommendation.tradeoffs)).toBe(true);
    });

    it('should handle single plan comparison', () => {
      const comparison = optimizer.comparePlans([basePlan]);

      expect(comparison.recommendation.bestPlanId).toBe(basePlan.id);
    });
  });

  describe('Optimization Strategies', () => {
    it('should reduce duration with minimize_duration strategy', () => {
      const strategy: OptimizationStrategy = {
        strategy: 'minimize_duration',
        parameters: { maxParallelTasks: 8 }
      };

      const optimized = optimizer.optimizePlan(basePlan, strategy);

      expect(optimized.estimatedDuration).toBeLessThanOrEqual(basePlan.estimatedDuration);
    });

    it('should reduce risk with minimize_risk strategy', () => {
      const baseRiskScore = { low: 1, medium: 2, high: 3, critical: 4 };

      const strategy: OptimizationStrategy = {
        strategy: 'minimize_risk',
        parameters: { riskTolerance: 'low' }
      };

      const optimized = optimizer.optimizePlan(basePlan, strategy);

      expect(
        baseRiskScore[optimized.riskAssessment.overallRisk]
      ).toBeLessThanOrEqual(baseRiskScore[basePlan.riskAssessment.overallRisk]);
    });

    it('should maximize parallelization with maximize_parallelization strategy', () => {
      const strategy: OptimizationStrategy = {
        strategy: 'maximize_parallelization',
        parameters: { maxParallelTasks: 8 }
      };

      const optimized = optimizer.optimizePlan(basePlan, strategy);

      const parallelCount = optimized.tasks.filter(t => t.canRunInParallel).length;
      const baseParallelCount = basePlan.tasks.filter(t => t.canRunInParallel).length;

      expect(parallelCount).toBeGreaterThanOrEqual(baseParallelCount);
    });

    it('should balance concerns with balanced strategy', () => {
      const strategy: OptimizationStrategy = {
        strategy: 'balanced',
        parameters: { maxParallelTasks: 4, riskTolerance: 'medium' }
      };

      const optimized = optimizer.optimizePlan(basePlan, strategy);

      // Balanced should be between min duration and min risk
      const minDuration = optimizer.optimizePlan(basePlan, {
        strategy: 'minimize_duration',
        parameters: { maxParallelTasks: 8 }
      });
      const minRisk = optimizer.optimizePlan(basePlan, {
        strategy: 'minimize_risk',
        parameters: { riskTolerance: 'low' }
      });

      expect(optimized.estimatedDuration).toBeGreaterThanOrEqual(minDuration.estimatedDuration);
      expect(optimized.estimatedDuration).toBeLessThanOrEqual(minRisk.estimatedDuration);
    });
  });

  describe('Edge Cases', () => {
    it('should handle plan with no parallelization opportunities', () => {
      // Create sequential plan
      const sequentialPlan = { ...basePlan };
      for (let i = 1; i < sequentialPlan.tasks.length; i++) {
        sequentialPlan.tasks[i].dependencies = [sequentialPlan.tasks[i - 1].id];
        sequentialPlan.tasks[i].canRunInParallel = false;
      }

      const executionOrder = optimizer.getExecutionOrder(sequentialPlan, 4);

      // Should have one task per group
      executionOrder.forEach(group => {
        expect(group.length).toBe(1);
      });
    });

    it('should handle plan with all tasks parallel', () => {
      // Create all-parallel plan
      const parallelPlan = { ...basePlan };
      parallelPlan.tasks.forEach(task => {
        task.dependencies = [];
        task.canRunInParallel = true;
      });

      const executionOrder = optimizer.getExecutionOrder(parallelPlan, 4);

      // Should group into max parallel batches
      expect(executionOrder[0].length).toBeLessThanOrEqual(4);
    });

    it('should handle empty context in adaptation', () => {
      const emptyContext: ExecutionContext = {
        planId: basePlan.id,
        completedTasks: [],
        failedTasks: [],
        blockedTasks: [],
        activeAgents: [],
        metrics: {
          totalTasks: basePlan.tasks.length,
          completedTasks: 0,
          failedTasks: 0,
          skippedTasks: 0,
          averageTaskDuration: 0,
          planProgress: 0,
          estimatedTimeRemaining: basePlan.estimatedDuration
        },
        events: []
      };

      const { adaptation } = optimizer.adaptPlan(
        basePlan,
        emptyContext,
        'manual',
        'Manual adaptation'
      );

      expect(adaptation).toBeDefined();
      expect(adaptation.trigger).toBe('manual');
    });

    it('should handle plan with single task', () => {
      const singleTaskPlan = {
        ...basePlan,
        tasks: [basePlan.tasks[0]]
      };

      const executionOrder = optimizer.getExecutionOrder(singleTaskPlan, 4);

      expect(executionOrder.length).toBe(1);
      expect(executionOrder[0].length).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should optimize large plans efficiently', () => {
      // Generate a large plan
      const largePlan = planGenerator.generatePlan(
        'Build API with authentication, RBAC, real-time, UI, and integrations'
      );

      const startTime = Date.now();
      const optimized = optimizer.optimizePlan(largePlan);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should get execution order efficiently', () => {
      const startTime = Date.now();
      const executionOrder = optimizer.getExecutionOrder(basePlan, 4);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should complete quickly (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});
