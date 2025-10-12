/**
 * Plan Generator Service
 * Generates execution plans from parsed goals with agent assignments and dependencies
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ExecutionPlan,
  ParsedGoal,
  Task,
  TaskStatus,
  TaskPriority,
  Milestone,
  DependencyGraph,
  TaskDependency,
  ParallelizationOpportunity,
  AgentType,
  RequiredCapability,
  GoalTemplate,
  PlanValidationResult
} from '../../models/orchestrator-planning.model';
import { GoalParserService } from './goal-parser.service';

/**
 * Plan Generator Service
 * Creates detailed execution plans with tasks, dependencies, and milestones
 */
export class PlanGeneratorService {
  private goalParser: GoalParserService;
  private agentCapabilities: Map<AgentType, RequiredCapability[]>;

  constructor(goalParser?: GoalParserService) {
    this.goalParser = goalParser || new GoalParserService();
    this.initializeAgentCapabilities();
  }

  /**
   * Generate execution plan from goal string
   */
  public generatePlan(goal: string): ExecutionPlan {
    const parsedGoal = this.goalParser.parseGoal(goal);
    return this.generatePlanFromParsedGoal(parsedGoal);
  }

  /**
   * Generate execution plan from parsed goal
   */
  public generatePlanFromParsedGoal(parsedGoal: ParsedGoal): ExecutionPlan {
    const planId = uuidv4();
    const tasks = this.generateTasks(parsedGoal);
    const dependencies = this.buildDependencyGraph(tasks);
    const milestones = this.generateMilestones(tasks, dependencies);
    const parallelizationOpportunities = this.identifyParallelizationOpportunities(
      tasks,
      dependencies
    );
    const riskAssessment = this.assessRisks(parsedGoal, tasks);
    const estimatedDuration = this.calculateTotalDuration(tasks, dependencies);

    const plan: ExecutionPlan = {
      id: planId,
      goal: parsedGoal.originalGoal,
      parsedGoal,
      tasks,
      milestones,
      estimatedDuration,
      dependencies,
      parallelizationOpportunities,
      riskAssessment,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft'
    };

    return plan;
  }

  /**
   * Generate tasks based on parsed goal
   */
  private generateTasks(parsedGoal: ParsedGoal): Task[] {
    const tasks: Task[] = [];

    // Phase 1: Models and Database
    if (
      parsedGoal.capabilities.includes(RequiredCapability.DATABASE) ||
      parsedGoal.capabilities.includes(RequiredCapability.CRUD)
    ) {
      tasks.push(
        this.createTask({
          name: 'Define Data Models',
          description: 'Create TypeScript interfaces and database schema',
          agentType: AgentType.MODELS,
          priority: TaskPriority.CRITICAL,
          estimatedDuration: 30,
          outputs: ['models/*.model.ts'],
          acceptanceCriteria: [
            'All entities defined with proper types',
            'Relationships mapped correctly',
            'TypeScript strict mode compliance'
          ],
          phase: 'models',
          complexity: 5
        })
      );

      tasks.push(
        this.createTask({
          name: 'Create Database Schema',
          description: 'Design and implement database migrations',
          agentType: AgentType.DATABASE,
          priority: TaskPriority.CRITICAL,
          estimatedDuration: 45,
          outputs: ['migrations/*.sql'],
          acceptanceCriteria: [
            'Schema matches data models',
            'Indexes created for performance',
            'Foreign keys and constraints defined'
          ],
          dependencies: ['Define Data Models'],
          phase: 'database',
          complexity: 6
        })
      );
    }

    // Phase 2: API Endpoints
    if (parsedGoal.capabilities.includes(RequiredCapability.API)) {
      tasks.push(
        this.createTask({
          name: 'Implement API Controllers',
          description: 'Create REST API endpoints with request handling',
          agentType: AgentType.API,
          priority: TaskPriority.HIGH,
          estimatedDuration: 60,
          outputs: ['controllers/*.controller.ts', 'routes/*.routes.ts'],
          acceptanceCriteria: [
            'All CRUD endpoints implemented',
            'Request validation in place',
            'Proper error handling',
            'Consistent response format'
          ],
          dependencies: ['Define Data Models'],
          phase: 'api',
          complexity: 7
        })
      );

      tasks.push(
        this.createTask({
          name: 'Implement Service Layer',
          description: 'Create business logic services',
          agentType: AgentType.API,
          priority: TaskPriority.HIGH,
          estimatedDuration: 45,
          outputs: ['services/*.service.ts'],
          acceptanceCriteria: [
            'Business logic separated from controllers',
            'Database queries implemented',
            'Proper error handling',
            'Type-safe operations'
          ],
          dependencies: ['Define Data Models', 'Create Database Schema'],
          phase: 'api',
          complexity: 6
        })
      );
    }

    // Phase 3: Authentication
    if (parsedGoal.capabilities.includes(RequiredCapability.AUTHENTICATION)) {
      tasks.push(
        this.createTask({
          name: 'Implement Authentication',
          description: 'Create JWT-based authentication system',
          agentType: AgentType.AUTH,
          priority: TaskPriority.CRITICAL,
          estimatedDuration: 90,
          outputs: [
            'middleware/auth.ts',
            'services/auth.service.ts',
            'utils/jwt.util.ts'
          ],
          acceptanceCriteria: [
            'JWT token generation and validation',
            'Password hashing implemented',
            'Login/logout endpoints',
            'Token refresh mechanism'
          ],
          dependencies: ['Define Data Models'],
          phase: 'security',
          complexity: 8
        })
      );
    }

    // Phase 4: Authorization
    if (parsedGoal.capabilities.includes(RequiredCapability.AUTHORIZATION)) {
      tasks.push(
        this.createTask({
          name: 'Implement RBAC',
          description: 'Create role-based access control system',
          agentType: AgentType.RBAC,
          priority: TaskPriority.HIGH,
          estimatedDuration: 75,
          outputs: [
            'middleware/rbac.middleware.ts',
            'models/permissions.model.ts',
            'utils/permissions.util.ts'
          ],
          acceptanceCriteria: [
            'Role definitions created',
            'Permission checks implemented',
            'Middleware protects routes',
            'Admin override functionality'
          ],
          dependencies: ['Implement Authentication'],
          phase: 'security',
          complexity: 7
        })
      );
    }

    // Phase 5: Real-time Features
    if (parsedGoal.capabilities.includes(RequiredCapability.REAL_TIME)) {
      tasks.push(
        this.createTask({
          name: 'Implement WebSocket Server',
          description: 'Set up Socket.io for real-time communication',
          agentType: AgentType.REALTIME,
          priority: TaskPriority.MEDIUM,
          estimatedDuration: 60,
          outputs: [
            'services/websocket.service.ts',
            'models/websocket-events.model.ts'
          ],
          acceptanceCriteria: [
            'WebSocket server running',
            'Event types defined',
            'Room-based broadcasting',
            'Connection handling'
          ],
          dependencies: ['Implement API Controllers'],
          phase: 'realtime',
          complexity: 6
        })
      );
    }

    // Phase 6: UI Components
    if (parsedGoal.capabilities.includes(RequiredCapability.UI)) {
      tasks.push(
        this.createTask({
          name: 'Build User Interface',
          description: 'Create frontend components and pages',
          agentType: AgentType.UI,
          priority: TaskPriority.MEDIUM,
          estimatedDuration: 120,
          outputs: ['public/**/*.html', 'public/css/*.css', 'public/js/*.js'],
          acceptanceCriteria: [
            'All UI components implemented',
            'Responsive design',
            'API integration complete',
            'Form validation'
          ],
          dependencies: ['Implement API Controllers'],
          phase: 'ui',
          complexity: 8
        })
      );
    }

    // Phase 7: Integration
    if (parsedGoal.capabilities.includes(RequiredCapability.INTEGRATION)) {
      tasks.push(
        this.createTask({
          name: 'Implement External Integration',
          description: 'Connect to external systems',
          agentType: AgentType.INTEGRATION,
          priority: TaskPriority.MEDIUM,
          estimatedDuration: 90,
          outputs: ['services/*-integration.service.ts'],
          acceptanceCriteria: [
            'API client implemented',
            'Authentication handled',
            'Error handling for external failures',
            'Rate limiting respected'
          ],
          dependencies: ['Implement Service Layer'],
          phase: 'integration',
          complexity: 7
        })
      );
    }

    // Phase 8: Validation and Quality
    if (parsedGoal.capabilities.includes(RequiredCapability.VALIDATION)) {
      tasks.push(
        this.createTask({
          name: 'Add Input Validation',
          description: 'Implement request validation and quality checks',
          agentType: AgentType.QUALITY,
          priority: TaskPriority.HIGH,
          estimatedDuration: 45,
          outputs: ['middleware/validation.ts'],
          acceptanceCriteria: [
            'All inputs validated',
            'Custom validators created',
            'Error messages user-friendly',
            'Schema-based validation'
          ],
          dependencies: ['Implement API Controllers'],
          phase: 'quality',
          complexity: 5
        })
      );
    }

    // Phase 9: Testing (Always included)
    tasks.push(
      this.createTask({
        name: 'Write Unit Tests',
        description: 'Create unit tests for services and utilities',
        agentType: AgentType.TEST,
        priority: TaskPriority.HIGH,
        estimatedDuration: 60,
        outputs: ['tests/unit/**/*.test.ts'],
        acceptanceCriteria: [
          '80%+ code coverage',
          'All services tested',
          'Edge cases covered',
          'Tests pass consistently'
        ],
        dependencies: ['Implement Service Layer'],
        phase: 'testing',
        complexity: 6
      })
    );

    tasks.push(
      this.createTask({
        name: 'Write Integration Tests',
        description: 'Create API integration tests',
        agentType: AgentType.TEST,
        priority: TaskPriority.HIGH,
        estimatedDuration: 75,
        outputs: ['tests/integration/**/*.test.ts'],
        acceptanceCriteria: [
          'All endpoints tested',
          'Error cases covered',
          'Authentication tested',
          'Database transactions tested'
        ],
        dependencies: ['Implement API Controllers', 'Write Unit Tests'],
        phase: 'testing',
        complexity: 7
      })
    );

    // Phase 10: Documentation (if required)
    if (parsedGoal.capabilities.includes(RequiredCapability.DOCUMENTATION)) {
      tasks.push(
        this.createTask({
          name: 'Write Documentation',
          description: 'Create API documentation and guides',
          agentType: AgentType.DOCUMENTATION,
          priority: TaskPriority.LOW,
          estimatedDuration: 45,
          outputs: ['docs/**/*.md'],
          acceptanceCriteria: [
            'API endpoints documented',
            'Setup instructions clear',
            'Examples provided',
            'Architecture explained'
          ],
          dependencies: [], // Can run in parallel
          phase: 'documentation',
          complexity: 4
        })
      );
    }

    // Assign task IDs and resolve dependency references
    return this.assignTaskIds(tasks);
  }

  /**
   * Create task with defaults
   */
  private createTask(
    config: Omit<Task, 'id' | 'status' | 'canRunInParallel' | 'metadata'> & {
      dependencies?: string[];
      phase?: string;
      complexity?: number;
    }
  ): Omit<Task, 'id'> {
    return {
      name: config.name,
      description: config.description,
      agentType: config.agentType,
      status: TaskStatus.PENDING,
      priority: config.priority,
      estimatedDuration: config.estimatedDuration,
      dependencies: config.dependencies || [],
      outputs: config.outputs,
      acceptanceCriteria: config.acceptanceCriteria,
      canRunInParallel: (config.dependencies || []).length === 0,
      metadata: {
        phase: config.phase,
        complexity: config.complexity
      }
    };
  }

  /**
   * Assign unique IDs to tasks and resolve name-based dependencies to IDs
   */
  private assignTaskIds(tasks: Omit<Task, 'id'>[]): Task[] {
    const nameToIdMap = new Map<string, string>();
    const tasksWithIds: Task[] = [];

    // First pass: assign IDs
    for (const task of tasks) {
      const id = uuidv4();
      nameToIdMap.set(task.name, id);
      tasksWithIds.push({ ...task, id });
    }

    // Second pass: resolve dependencies
    for (const task of tasksWithIds) {
      task.dependencies = task.dependencies.map(
        depName => nameToIdMap.get(depName) || depName
      );
    }

    return tasksWithIds;
  }

  /**
   * Build dependency graph from tasks
   */
  private buildDependencyGraph(tasks: Task[]): DependencyGraph {
    const edges: TaskDependency[] = [];
    const layers: string[][] = [];
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

    // Calculate layers (topological sort)
    const visited = new Set<string>();
    const layer = new Map<string, number>();

    const calculateLayer = (taskId: string): number => {
      if (layer.has(taskId)) {
        return layer.get(taskId)!;
      }

      const task = taskMap.get(taskId)!;
      if (task.dependencies.length === 0) {
        layer.set(taskId, 0);
        return 0;
      }

      const maxDepLayer = Math.max(
        ...task.dependencies.map(depId => calculateLayer(depId))
      );
      const taskLayer = maxDepLayer + 1;
      layer.set(taskId, taskLayer);
      return taskLayer;
    };

    for (const task of tasks) {
      calculateLayer(task.id);
    }

    // Group tasks by layer
    const maxLayer = Math.max(...Array.from(layer.values()));
    for (let i = 0; i <= maxLayer; i++) {
      const layerTasks = tasks.filter(t => layer.get(t.id) === i).map(t => t.id);
      if (layerTasks.length > 0) {
        layers.push(layerTasks);
      }
    }

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(tasks, edges);

    return {
      nodes: tasks,
      edges,
      layers,
      criticalPath
    };
  }

  /**
   * Calculate critical path (longest path through graph)
   */
  private calculateCriticalPath(tasks: Task[], edges: TaskDependency[]): string[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const earliestStart = new Map<string, number>();
    const latestStart = new Map<string, number>();

    // Calculate earliest start times (forward pass)
    const calculateEarliestStart = (taskId: string): number => {
      if (earliestStart.has(taskId)) {
        return earliestStart.get(taskId)!;
      }

      const task = taskMap.get(taskId)!;
      const incomingEdges = edges.filter(e => e.toTaskId === taskId);

      if (incomingEdges.length === 0) {
        earliestStart.set(taskId, 0);
        return 0;
      }

      const maxPredecessorFinish = Math.max(
        ...incomingEdges.map(edge => {
          const predTask = taskMap.get(edge.fromTaskId)!;
          return calculateEarliestStart(edge.fromTaskId) + predTask.estimatedDuration;
        })
      );

      earliestStart.set(taskId, maxPredecessorFinish);
      return maxPredecessorFinish;
    };

    for (const task of tasks) {
      calculateEarliestStart(task.id);
    }

    // Find project duration
    const projectDuration = Math.max(
      ...tasks.map(t => earliestStart.get(t.id)! + t.estimatedDuration)
    );

    // Calculate latest start times (backward pass)
    const calculateLatestStart = (taskId: string): number => {
      if (latestStart.has(taskId)) {
        return latestStart.get(taskId)!;
      }

      const task = taskMap.get(taskId)!;
      const outgoingEdges = edges.filter(e => e.fromTaskId === taskId);

      if (outgoingEdges.length === 0) {
        const latest = projectDuration - task.estimatedDuration;
        latestStart.set(taskId, latest);
        return latest;
      }

      const minSuccessorStart = Math.min(
        ...outgoingEdges.map(edge => calculateLatestStart(edge.toTaskId))
      );

      const latest = minSuccessorStart - task.estimatedDuration;
      latestStart.set(taskId, latest);
      return latest;
    };

    for (const task of tasks) {
      calculateLatestStart(task.id);
    }

    // Critical path = tasks where earliest start = latest start (no slack)
    const criticalTasks = tasks.filter(
      t => Math.abs(earliestStart.get(t.id)! - latestStart.get(t.id)!) < 0.01
    );

    return criticalTasks.map(t => t.id);
  }

  /**
   * Generate milestones from tasks
   */
  private generateMilestones(tasks: Task[], dependencies: DependencyGraph): Milestone[] {
    const milestones: Milestone[] = [];
    const phaseGroups = new Map<string, Task[]>();

    // Group tasks by phase
    for (const task of tasks) {
      const phase = task.metadata.phase || 'general';
      if (!phaseGroups.has(phase)) {
        phaseGroups.set(phase, []);
      }
      phaseGroups.get(phase)!.push(task);
    }

    // Create milestone for each phase
    const phaseOrder = [
      'models',
      'database',
      'api',
      'security',
      'realtime',
      'ui',
      'integration',
      'quality',
      'testing',
      'documentation'
    ];

    let cumulativeDuration = 0;
    for (const phase of phaseOrder) {
      const phaseTasks = phaseGroups.get(phase);
      if (!phaseTasks || phaseTasks.length === 0) continue;

      const phaseDuration = Math.max(
        ...phaseTasks.map(t => t.estimatedDuration)
      );

      milestones.push({
        id: uuidv4(),
        name: `Complete ${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase`,
        description: `All ${phase} tasks completed and validated`,
        tasks: phaseTasks.map(t => t.id),
        completionCriteria: [
          'All tasks in phase completed',
          'Tests passing',
          'Code reviewed'
        ],
        estimatedCompletion: new Date(Date.now() + cumulativeDuration * 60000),
        progress: 0,
        isBlocking: ['models', 'database', 'security'].includes(phase)
      });

      cumulativeDuration += phaseDuration;
    }

    return milestones;
  }

  /**
   * Identify parallelization opportunities
   */
  private identifyParallelizationOpportunities(
    tasks: Task[],
    dependencies: DependencyGraph
  ): ParallelizationOpportunity[] {
    const opportunities: ParallelizationOpportunity[] = [];

    // Check each layer for parallel tasks
    for (const layer of dependencies.layers) {
      if (layer.length > 1) {
        const layerTasks = tasks.filter(t => layer.includes(t.id));
        const maxDuration = Math.max(...layerTasks.map(t => t.estimatedDuration));
        const sumDuration = layerTasks.reduce((sum, t) => sum + t.estimatedDuration, 0);
        const timeSaved = sumDuration - maxDuration;

        if (timeSaved > 10) {
          // Only report if significant time savings
          opportunities.push({
            tasks: layer,
            estimatedTimeSaved: timeSaved,
            reason: 'Tasks have no dependencies between them and can run simultaneously',
            riskLevel: 'low'
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Assess risks in execution plan
   */
  private assessRisks(parsedGoal: ParsedGoal, tasks: Task[]): ExecutionPlan['riskAssessment'] {
    const risks: ExecutionPlan['riskAssessment']['risks'] = [];

    // Complexity risk
    if (parsedGoal.estimatedComplexity === 'very_complex') {
      risks.push({
        type: 'complexity',
        description: 'Goal has very high complexity with many moving parts',
        mitigation: 'Break into smaller sub-goals, increase testing, add checkpoints',
        probability: 0.7,
        impact: 0.8
      });
    }

    // Authentication risk
    if (parsedGoal.capabilities.includes(RequiredCapability.AUTHENTICATION)) {
      risks.push({
        type: 'security',
        description: 'Authentication implementation is security-critical',
        mitigation: 'Use established patterns, security review, penetration testing',
        probability: 0.5,
        impact: 0.9
      });
    }

    // Integration risk
    if (parsedGoal.capabilities.includes(RequiredCapability.INTEGRATION)) {
      risks.push({
        type: 'external_dependency',
        description: 'Integration depends on external system availability and behavior',
        mitigation: 'Implement retry logic, fallback mechanisms, comprehensive error handling',
        probability: 0.6,
        impact: 0.7
      });
    }

    // Long critical path risk
    const criticalPathDuration = tasks
      .filter(t => dependencies.criticalPath?.includes(t.id))
      .reduce((sum, t) => sum + t.estimatedDuration, 0);

    if (criticalPathDuration > 240) {
      // > 4 hours
      risks.push({
        type: 'timeline',
        description: 'Critical path is very long, delays will cascade',
        mitigation: 'Identify parallelization opportunities, add slack time, monitor closely',
        probability: 0.6,
        impact: 0.7
      });
    }

    // Calculate overall risk
    const avgRiskScore =
      risks.reduce((sum, r) => sum + r.probability * r.impact, 0) / risks.length;

    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    if (avgRiskScore < 0.3) overallRisk = 'low';
    else if (avgRiskScore < 0.5) overallRisk = 'medium';
    else if (avgRiskScore < 0.7) overallRisk = 'high';
    else overallRisk = 'critical';

    return {
      overallRisk,
      risks
    };
  }

  /**
   * Calculate total duration considering dependencies
   */
  private calculateTotalDuration(tasks: Task[], dependencies: DependencyGraph): number {
    let totalDuration = 0;

    for (const layer of dependencies.layers) {
      const layerTasks = tasks.filter(t => layer.includes(t.id));
      const maxLayerDuration = Math.max(...layerTasks.map(t => t.estimatedDuration));
      totalDuration += maxLayerDuration;
    }

    return totalDuration;
  }

  /**
   * Validate execution plan
   */
  public validatePlan(plan: ExecutionPlan): PlanValidationResult {
    const errors: PlanValidationResult['errors'] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for circular dependencies
    const circular = this.detectCircularDependencies(plan.tasks);
    if (circular.length > 0) {
      errors.push({
        type: 'circular_dependency',
        message: `Circular dependency detected: ${circular.join(' -> ')}`,
        severity: 'error'
      });
    }

    // Check for missing dependencies
    for (const task of plan.tasks) {
      for (const depId of task.dependencies) {
        const depExists = plan.tasks.find(t => t.id === depId);
        if (!depExists) {
          errors.push({
            type: 'missing_dependency',
            message: `Task "${task.name}" references non-existent dependency: ${depId}`,
            taskId: task.id,
            severity: 'error'
          });
        }
      }
    }

    // Check for invalid agents
    for (const task of plan.tasks) {
      if (!Object.values(AgentType).includes(task.agentType)) {
        errors.push({
          type: 'invalid_agent',
          message: `Task "${task.name}" has invalid agent type: ${task.agentType}`,
          taskId: task.id,
          severity: 'error'
        });
      }
    }

    // Warnings for long duration
    if (plan.estimatedDuration > 480) {
      warnings.push('Plan duration exceeds 8 hours, consider breaking into sub-goals');
    }

    // Suggestions
    if (plan.parallelizationOpportunities.length > 0) {
      suggestions.push(
        `${plan.parallelizationOpportunities.length} parallelization opportunities identified that could save time`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(tasks: Task[]): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const detectCycle = (taskId: string, path: string[]): string[] => {
      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskMap.get(taskId)?.name || taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (!visited.has(depId)) {
            const cycle = detectCycle(depId, [...path]);
            if (cycle.length > 0) return cycle;
          } else if (recursionStack.has(depId)) {
            // Cycle detected
            return [...path, taskMap.get(depId)?.name || depId];
          }
        }
      }

      recursionStack.delete(taskId);
      return [];
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        const cycle = detectCycle(task.id, []);
        if (cycle.length > 0) {
          return cycle;
        }
      }
    }

    return [];
  }

  /**
   * Initialize agent capabilities mapping
   */
  private initializeAgentCapabilities(): void {
    this.agentCapabilities = new Map([
      [AgentType.API, [RequiredCapability.API, RequiredCapability.CRUD]],
      [
        AgentType.MODELS,
        [RequiredCapability.DATABASE, RequiredCapability.VALIDATION]
      ],
      [AgentType.TEST, [RequiredCapability.TESTING]],
      [
        AgentType.REALTIME,
        [RequiredCapability.REAL_TIME, RequiredCapability.WEBSOCKET]
      ],
      [AgentType.QUALITY, [RequiredCapability.VALIDATION, RequiredCapability.LOGGING]],
      [AgentType.INTEGRATION, [RequiredCapability.INTEGRATION]],
      [AgentType.SECURITY, [RequiredCapability.SECURITY]],
      [
        AgentType.AUTH,
        [RequiredCapability.AUTHENTICATION, RequiredCapability.SECURITY]
      ],
      [
        AgentType.RBAC,
        [RequiredCapability.AUTHORIZATION, RequiredCapability.SECURITY]
      ],
      [AgentType.DATABASE, [RequiredCapability.DATABASE]],
      [AgentType.UI, [RequiredCapability.UI]],
      [AgentType.DOCUMENTATION, [RequiredCapability.DOCUMENTATION]]
    ]);
  }
}
