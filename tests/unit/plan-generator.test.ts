/**
 * Plan Generator Service - Unit Tests
 */

import { PlanGeneratorService } from '../../src/services/orchestrator/plan-generator.service';
import { GoalParserService } from '../../src/services/orchestrator/goal-parser.service';
import {
  ParsedGoal,
  RequiredCapability,
  AgentType,
  TaskStatus,
  TaskPriority
} from '../../src/models/orchestrator-planning.model';

describe('PlanGeneratorService', () => {
  let planGenerator: PlanGeneratorService;
  let goalParser: GoalParserService;

  beforeEach(() => {
    goalParser = new GoalParserService();
    planGenerator = new PlanGeneratorService(goalParser);
  });

  describe('generatePlan', () => {
    it('should generate plan from goal string', () => {
      const goal = 'Build a RESTful API for user management';
      const plan = planGenerator.generatePlan(goal);

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.goal).toBe(goal);
      expect(plan.tasks.length).toBeGreaterThan(0);
      expect(plan.status).toBe('draft');
    });

    it('should include parsed goal in plan', () => {
      const goal = 'Add authentication';
      const plan = planGenerator.generatePlan(goal);

      expect(plan.parsedGoal).toBeDefined();
      expect(plan.parsedGoal.originalGoal).toBe(goal);
    });
  });

  describe('generatePlanFromParsedGoal', () => {
    it('should generate plan with models and database tasks', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Build API',
        normalizedGoal: 'build api',
        intent: 'build',
        entities: [],
        capabilities: [RequiredCapability.API, RequiredCapability.CRUD, RequiredCapability.DATABASE],
        estimatedComplexity: 'moderate',
        confidence: 0.9,
        suggestedAgents: [AgentType.API, AgentType.MODELS, AgentType.DATABASE],
        metadata: {
          requiresDatabase: true
        }
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      const modelTask = plan.tasks.find(t => t.name === 'Define Data Models');
      const dbTask = plan.tasks.find(t => t.name === 'Create Database Schema');

      expect(modelTask).toBeDefined();
      expect(dbTask).toBeDefined();
      expect(dbTask?.dependencies).toContain(modelTask?.id);
    });

    it('should generate plan with API tasks', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Build API',
        normalizedGoal: 'build api',
        intent: 'build',
        entities: [],
        capabilities: [RequiredCapability.API],
        estimatedComplexity: 'moderate',
        confidence: 0.9,
        suggestedAgents: [AgentType.API],
        metadata: {}
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      const controllerTask = plan.tasks.find(t => t.name === 'Implement API Controllers');
      const serviceTask = plan.tasks.find(t => t.name === 'Implement Service Layer');

      expect(controllerTask).toBeDefined();
      expect(serviceTask).toBeDefined();
    });

    it('should generate plan with authentication tasks', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Add auth',
        normalizedGoal: 'add auth',
        intent: 'add',
        entities: [],
        capabilities: [RequiredCapability.AUTHENTICATION],
        estimatedComplexity: 'complex',
        confidence: 0.9,
        suggestedAgents: [AgentType.AUTH],
        metadata: {
          requiresAuth: true
        }
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      const authTask = plan.tasks.find(t => t.name === 'Implement Authentication');

      expect(authTask).toBeDefined();
      expect(authTask?.agentType).toBe(AgentType.AUTH);
      expect(authTask?.priority).toBe(TaskPriority.CRITICAL);
    });

    it('should generate plan with RBAC tasks', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Add RBAC',
        normalizedGoal: 'add rbac',
        intent: 'add',
        entities: [],
        capabilities: [RequiredCapability.AUTHORIZATION],
        estimatedComplexity: 'complex',
        confidence: 0.9,
        suggestedAgents: [AgentType.RBAC],
        metadata: {}
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      const rbacTask = plan.tasks.find(t => t.name === 'Implement RBAC');

      expect(rbacTask).toBeDefined();
      expect(rbacTask?.agentType).toBe(AgentType.RBAC);
    });

    it('should generate plan with real-time tasks', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Add real-time',
        normalizedGoal: 'add realtime',
        intent: 'add',
        entities: [],
        capabilities: [RequiredCapability.REAL_TIME],
        estimatedComplexity: 'moderate',
        confidence: 0.9,
        suggestedAgents: [AgentType.REALTIME],
        metadata: {}
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      const wsTask = plan.tasks.find(t => t.name === 'Implement WebSocket Server');

      expect(wsTask).toBeDefined();
      expect(wsTask?.agentType).toBe(AgentType.REALTIME);
    });

    it('should generate plan with UI tasks', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Build UI',
        normalizedGoal: 'build ui',
        intent: 'build',
        entities: [],
        capabilities: [RequiredCapability.UI],
        estimatedComplexity: 'moderate',
        confidence: 0.9,
        suggestedAgents: [AgentType.UI],
        metadata: {
          requiresUI: true
        }
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      const uiTask = plan.tasks.find(t => t.name === 'Build User Interface');

      expect(uiTask).toBeDefined();
      expect(uiTask?.agentType).toBe(AgentType.UI);
    });

    it('should always include testing tasks', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Build API',
        normalizedGoal: 'build api',
        intent: 'build',
        entities: [],
        capabilities: [RequiredCapability.API],
        estimatedComplexity: 'moderate',
        confidence: 0.9,
        suggestedAgents: [AgentType.API],
        metadata: {}
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      const unitTestTask = plan.tasks.find(t => t.name === 'Write Unit Tests');
      const integrationTestTask = plan.tasks.find(t => t.name === 'Write Integration Tests');

      expect(unitTestTask).toBeDefined();
      expect(integrationTestTask).toBeDefined();
      expect(unitTestTask?.agentType).toBe(AgentType.TEST);
    });

    it('should include documentation tasks if required', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Build API',
        normalizedGoal: 'build api',
        intent: 'build',
        entities: [],
        capabilities: [RequiredCapability.API, RequiredCapability.DOCUMENTATION],
        estimatedComplexity: 'moderate',
        confidence: 0.9,
        suggestedAgents: [AgentType.API],
        metadata: {
          requiresDocumentation: true
        }
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      const docTask = plan.tasks.find(t => t.name === 'Write Documentation');

      expect(docTask).toBeDefined();
      expect(docTask?.agentType).toBe(AgentType.DOCUMENTATION);
    });
  });

  describe('Task Generation', () => {
    it('should assign unique IDs to all tasks', () => {
      const plan = planGenerator.generatePlan('Build API for users');
      const ids = plan.tasks.map(t => t.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should set all tasks to PENDING status', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      plan.tasks.forEach(task => {
        expect(task.status).toBe(TaskStatus.PENDING);
      });
    });

    it('should include estimated duration for all tasks', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      plan.tasks.forEach(task => {
        expect(task.estimatedDuration).toBeGreaterThan(0);
      });
    });

    it('should include outputs for all tasks', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      plan.tasks.forEach(task => {
        expect(task.outputs.length).toBeGreaterThan(0);
      });
    });

    it('should include acceptance criteria for all tasks', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      plan.tasks.forEach(task => {
        expect(task.acceptanceCriteria.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Dependency Graph', () => {
    it('should build dependency graph', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      expect(plan.dependencies).toBeDefined();
      expect(plan.dependencies.nodes).toEqual(plan.tasks);
      expect(plan.dependencies.edges.length).toBeGreaterThan(0);
    });

    it('should organize tasks into layers', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      expect(plan.dependencies.layers.length).toBeGreaterThan(0);
      expect(plan.dependencies.layers[0].length).toBeGreaterThan(0);
    });

    it('should have tasks with no dependencies in layer 0', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      const layer0TaskIds = plan.dependencies.layers[0];
      const layer0Tasks = plan.tasks.filter(t => layer0TaskIds.includes(t.id));

      layer0Tasks.forEach(task => {
        expect(task.dependencies.length).toBe(0);
      });
    });

    it('should calculate critical path', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      expect(plan.dependencies.criticalPath.length).toBeGreaterThan(0);
    });

    it('should have all critical path tasks in the plan', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      plan.dependencies.criticalPath.forEach(taskId => {
        const task = plan.tasks.find(t => t.id === taskId);
        expect(task).toBeDefined();
      });
    });
  });

  describe('Milestones', () => {
    it('should generate milestones', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      expect(plan.milestones.length).toBeGreaterThan(0);
    });

    it('should assign tasks to milestones', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      plan.milestones.forEach(milestone => {
        expect(milestone.tasks.length).toBeGreaterThan(0);
      });
    });

    it('should have unique milestone IDs', () => {
      const plan = planGenerator.generatePlan('Build API for users');
      const ids = plan.milestones.map(m => m.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should mark security milestones as blocking', () => {
      const plan = planGenerator.generatePlan('Add authentication');

      const securityMilestone = plan.milestones.find(m =>
        m.name.toLowerCase().includes('security')
      );

      if (securityMilestone) {
        expect(securityMilestone.isBlocking).toBe(true);
      }
    });
  });

  describe('Parallelization Opportunities', () => {
    it('should identify parallelization opportunities', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      expect(plan.parallelizationOpportunities.length).toBeGreaterThan(0);
    });

    it('should calculate time saved for opportunities', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      plan.parallelizationOpportunities.forEach(opp => {
        expect(opp.estimatedTimeSaved).toBeGreaterThan(0);
      });
    });

    it('should include reason for each opportunity', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      plan.parallelizationOpportunities.forEach(opp => {
        expect(opp.reason).toBeDefined();
        expect(opp.reason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Risk Assessment', () => {
    it('should assess risks', () => {
      const plan = planGenerator.generatePlan('Add authentication');

      expect(plan.riskAssessment).toBeDefined();
      expect(plan.riskAssessment.overallRisk).toBeDefined();
      expect(plan.riskAssessment.risks.length).toBeGreaterThan(0);
    });

    it('should identify security risks for authentication', () => {
      const plan = planGenerator.generatePlan('Add authentication');

      const securityRisk = plan.riskAssessment.risks.find(r => r.type === 'security');

      expect(securityRisk).toBeDefined();
      expect(securityRisk?.mitigation).toBeDefined();
    });

    it('should identify integration risks', () => {
      const plan = planGenerator.generatePlan('Integrate with Slack');

      const integrationRisk = plan.riskAssessment.risks.find(
        r => r.type === 'external_dependency'
      );

      expect(integrationRisk).toBeDefined();
    });

    it('should identify complexity risks for very complex goals', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Complex goal',
        normalizedGoal: 'complex goal',
        intent: 'build',
        entities: [],
        capabilities: [RequiredCapability.API],
        estimatedComplexity: 'very_complex',
        confidence: 0.9,
        suggestedAgents: [AgentType.API],
        metadata: {}
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      const complexityRisk = plan.riskAssessment.risks.find(r => r.type === 'complexity');

      expect(complexityRisk).toBeDefined();
    });
  });

  describe('Plan Validation', () => {
    it('should validate valid plan', () => {
      const plan = planGenerator.generatePlan('Build API for users');
      const validation = planGenerator.validatePlan(plan);

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect circular dependencies', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      // Create circular dependency
      const task1 = plan.tasks[0];
      const task2 = plan.tasks[1];
      task1.dependencies = [task2.id];
      task2.dependencies = [task1.id];

      const validation = planGenerator.validatePlan(plan);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.type === 'circular_dependency')).toBe(true);
    });

    it('should detect missing dependencies', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      // Add invalid dependency
      plan.tasks[0].dependencies = ['invalid-task-id'];

      const validation = planGenerator.validatePlan(plan);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.type === 'missing_dependency')).toBe(true);
    });

    it('should warn about long duration', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Build API',
        normalizedGoal: 'build api',
        intent: 'build',
        entities: [],
        capabilities: [
          RequiredCapability.API,
          RequiredCapability.AUTHENTICATION,
          RequiredCapability.AUTHORIZATION,
          RequiredCapability.REAL_TIME,
          RequiredCapability.UI
        ],
        estimatedComplexity: 'very_complex',
        confidence: 0.9,
        suggestedAgents: [AgentType.API],
        metadata: {}
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);
      const validation = planGenerator.validatePlan(plan);

      if (plan.estimatedDuration > 480) {
        expect(validation.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should suggest parallelization opportunities', () => {
      const plan = planGenerator.generatePlan('Build API for users');
      const validation = planGenerator.validatePlan(plan);

      if (plan.parallelizationOpportunities.length > 0) {
        expect(validation.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Duration Calculation', () => {
    it('should calculate total duration', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should account for parallelization in duration', () => {
      const plan = planGenerator.generatePlan('Build API for users');

      const sequentialDuration = plan.tasks.reduce(
        (sum, t) => sum + t.estimatedDuration,
        0
      );

      expect(plan.estimatedDuration).toBeLessThan(sequentialDuration);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty capabilities', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Empty',
        normalizedGoal: 'empty',
        intent: 'build',
        entities: [],
        capabilities: [],
        estimatedComplexity: 'simple',
        confidence: 0.5,
        suggestedAgents: [],
        metadata: {}
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      // Should still generate testing tasks at minimum
      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('should handle multiple overlapping capabilities', () => {
      const parsedGoal: ParsedGoal = {
        originalGoal: 'Complex',
        normalizedGoal: 'complex',
        intent: 'build',
        entities: [],
        capabilities: [
          RequiredCapability.API,
          RequiredCapability.CRUD,
          RequiredCapability.DATABASE,
          RequiredCapability.AUTHENTICATION,
          RequiredCapability.AUTHORIZATION,
          RequiredCapability.REAL_TIME,
          RequiredCapability.UI,
          RequiredCapability.INTEGRATION,
          RequiredCapability.TESTING,
          RequiredCapability.DOCUMENTATION
        ],
        estimatedComplexity: 'very_complex',
        confidence: 0.9,
        suggestedAgents: [AgentType.API],
        metadata: {}
      };

      const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);

      expect(plan.tasks.length).toBeGreaterThan(10);
      expect(plan.estimatedDuration).toBeGreaterThan(300);
    });
  });
});
