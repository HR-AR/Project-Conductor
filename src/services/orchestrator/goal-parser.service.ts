/**
 * Goal Parser Service
 * Parses natural language goals into structured execution data
 */

import {
  ParsedGoal,
  GoalEntity,
  RequiredCapability,
  AgentType,
  GoalTemplate
} from '../../models/orchestrator-planning.model';

/**
 * Goal Parser Service
 * Extracts intent, entities, and capabilities from natural language goals
 */
export class GoalParserService {
  private templates: GoalTemplate[] = [];

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Parse a natural language goal into structured data
   */
  public parseGoal(goal: string): ParsedGoal {
    const normalizedGoal = this.normalizeGoal(goal);
    const matchedTemplate = this.matchTemplate(normalizedGoal);

    if (matchedTemplate) {
      return this.parseWithTemplate(goal, normalizedGoal, matchedTemplate);
    }

    return this.parseWithoutTemplate(goal, normalizedGoal);
  }

  /**
   * Normalize goal text for processing
   */
  private normalizeGoal(goal: string): string {
    return goal
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // remove special chars except hyphens
      .replace(/\s+/g, ' '); // normalize whitespace
  }

  /**
   * Match goal against known templates
   */
  private matchTemplate(normalizedGoal: string): GoalTemplate | null {
    for (const template of this.templates) {
      if (template.pattern.test(normalizedGoal)) {
        return template;
      }
    }
    return null;
  }

  /**
   * Parse goal using matched template
   */
  private parseWithTemplate(
    originalGoal: string,
    normalizedGoal: string,
    template: GoalTemplate
  ): ParsedGoal {
    const entities = this.extractEntities(normalizedGoal, template);
    const intent = this.extractIntent(normalizedGoal);
    const capabilities = template.requiredCapabilities;
    const metadata = this.buildMetadata(capabilities);

    return {
      originalGoal,
      normalizedGoal,
      intent,
      entities,
      capabilities,
      estimatedComplexity: template.complexity,
      confidence: 0.9, // high confidence with template match
      suggestedAgents: template.suggestedAgents,
      metadata
    };
  }

  /**
   * Parse goal without template (fallback)
   */
  private parseWithoutTemplate(originalGoal: string, normalizedGoal: string): ParsedGoal {
    const intent = this.extractIntent(normalizedGoal);
    const entities = this.extractEntitiesGeneric(normalizedGoal);
    const capabilities = this.inferCapabilities(normalizedGoal, entities);
    const suggestedAgents = this.suggestAgents(capabilities);
    const complexity = this.estimateComplexity(normalizedGoal, capabilities);
    const metadata = this.buildMetadata(capabilities);

    return {
      originalGoal,
      normalizedGoal,
      intent,
      entities,
      capabilities,
      estimatedComplexity: complexity,
      confidence: 0.6, // lower confidence without template
      suggestedAgents,
      metadata
    };
  }

  /**
   * Extract intent (action verb) from goal
   */
  private extractIntent(normalizedGoal: string): string {
    const intentPatterns = [
      { pattern: /^(build|create|develop|implement)\b/, intent: 'build' },
      { pattern: /^(add|include|integrate|attach)\b/, intent: 'add' },
      { pattern: /^(improve|enhance|optimize|upgrade)\b/, intent: 'improve' },
      { pattern: /^(fix|repair|resolve|debug)\b/, intent: 'fix' },
      { pattern: /^(refactor|restructure|reorganize)\b/, intent: 'refactor' },
      { pattern: /^(test|verify|validate)\b/, intent: 'test' },
      { pattern: /^(document|describe|explain)\b/, intent: 'document' },
      { pattern: /^(deploy|release|publish)\b/, intent: 'deploy' }
    ];

    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(normalizedGoal)) {
        return intent;
      }
    }

    return 'build'; // default intent
  }

  /**
   * Extract entities from goal with template
   */
  private extractEntities(normalizedGoal: string, template: GoalTemplate): GoalEntity[] {
    const entities: GoalEntity[] = [];
    const match = template.pattern.exec(normalizedGoal);

    if (match && match.groups) {
      // Extract resource name if captured
      if (match.groups.resource) {
        entities.push({
          type: 'resource',
          name: match.groups.resource,
          description: `${match.groups.resource} resource`,
          confidence: 0.95
        });
      }

      // Extract feature name if captured
      if (match.groups.feature) {
        entities.push({
          type: 'feature',
          name: match.groups.feature,
          description: `${match.groups.feature} feature`,
          confidence: 0.9
        });
      }

      // Extract integration target if captured
      if (match.groups.system) {
        entities.push({
          type: 'integration',
          name: match.groups.system,
          description: `Integration with ${match.groups.system}`,
          confidence: 0.9
        });
      }
    }

    return entities;
  }

  /**
   * Extract entities generically (without template)
   */
  private extractEntitiesGeneric(normalizedGoal: string): GoalEntity[] {
    const entities: GoalEntity[] = [];

    // Look for API/resource patterns
    const apiMatch = normalizedGoal.match(/api\s+for\s+(\w+)/);
    if (apiMatch) {
      entities.push({
        type: 'resource',
        name: apiMatch[1],
        description: `${apiMatch[1]} API resource`,
        confidence: 0.85
      });
    }

    // Look for authentication/security patterns
    if (/authentication|auth|login|signin/.test(normalizedGoal)) {
      entities.push({
        type: 'security',
        name: 'authentication',
        description: 'Authentication system',
        confidence: 0.9
      });
    }

    // Look for integration patterns
    const integrationMatch = normalizedGoal.match(/integrate\s+with\s+(\w+)/);
    if (integrationMatch) {
      entities.push({
        type: 'integration',
        name: integrationMatch[1],
        description: `Integration with ${integrationMatch[1]}`,
        confidence: 0.85
      });
    }

    // Look for UI patterns
    if (/ui|interface|dashboard|form|page/.test(normalizedGoal)) {
      entities.push({
        type: 'feature',
        name: 'user-interface',
        description: 'User interface component',
        confidence: 0.8
      });
    }

    return entities;
  }

  /**
   * Infer required capabilities from goal and entities
   */
  private inferCapabilities(
    normalizedGoal: string,
    entities: GoalEntity[]
  ): RequiredCapability[] {
    const capabilities = new Set<RequiredCapability>();

    // API patterns
    if (/api|endpoint|rest|graphql/.test(normalizedGoal)) {
      capabilities.add(RequiredCapability.API);
      capabilities.add(RequiredCapability.CRUD);
      capabilities.add(RequiredCapability.VALIDATION);
    }

    // Authentication patterns
    if (/auth|login|signin|signup|register|jwt|token/.test(normalizedGoal)) {
      capabilities.add(RequiredCapability.AUTHENTICATION);
      capabilities.add(RequiredCapability.SECURITY);
    }

    // Authorization patterns
    if (/authorization|rbac|permission|role|access control/.test(normalizedGoal)) {
      capabilities.add(RequiredCapability.AUTHORIZATION);
      capabilities.add(RequiredCapability.SECURITY);
    }

    // Real-time patterns
    if (/realtime|real-time|websocket|socket|live|push/.test(normalizedGoal)) {
      capabilities.add(RequiredCapability.REAL_TIME);
      capabilities.add(RequiredCapability.WEBSOCKET);
    }

    // Database patterns
    if (/database|db|postgres|migration|schema/.test(normalizedGoal)) {
      capabilities.add(RequiredCapability.DATABASE);
    }

    // UI patterns
    if (/ui|interface|dashboard|frontend|page|form/.test(normalizedGoal)) {
      capabilities.add(RequiredCapability.UI);
    }

    // Testing patterns
    if (/test|testing|spec|unittest|integration test/.test(normalizedGoal)) {
      capabilities.add(RequiredCapability.TESTING);
    }

    // Integration patterns
    if (/integrate|integration|connect|sync/.test(normalizedGoal)) {
      capabilities.add(RequiredCapability.INTEGRATION);
    }

    // Documentation patterns
    if (/document|doc|readme|guide/.test(normalizedGoal)) {
      capabilities.add(RequiredCapability.DOCUMENTATION);
    }

    // Default to API + CRUD if nothing matched
    if (capabilities.size === 0) {
      capabilities.add(RequiredCapability.API);
      capabilities.add(RequiredCapability.CRUD);
    }

    return Array.from(capabilities);
  }

  /**
   * Suggest agents based on required capabilities
   */
  private suggestAgents(capabilities: RequiredCapability[]): AgentType[] {
    const agents = new Set<AgentType>();

    const capabilityToAgentMap: Record<RequiredCapability, AgentType[]> = {
      [RequiredCapability.CRUD]: [AgentType.API, AgentType.MODELS],
      [RequiredCapability.AUTHENTICATION]: [AgentType.AUTH, AgentType.SECURITY],
      [RequiredCapability.AUTHORIZATION]: [AgentType.RBAC, AgentType.SECURITY],
      [RequiredCapability.VALIDATION]: [AgentType.QUALITY],
      [RequiredCapability.REAL_TIME]: [AgentType.REALTIME],
      [RequiredCapability.TESTING]: [AgentType.TEST],
      [RequiredCapability.INTEGRATION]: [AgentType.INTEGRATION],
      [RequiredCapability.SECURITY]: [AgentType.SECURITY],
      [RequiredCapability.DATABASE]: [AgentType.DATABASE, AgentType.MODELS],
      [RequiredCapability.UI]: [AgentType.UI],
      [RequiredCapability.DOCUMENTATION]: [AgentType.DOCUMENTATION],
      [RequiredCapability.API]: [AgentType.API],
      [RequiredCapability.WEBSOCKET]: [AgentType.REALTIME],
      [RequiredCapability.CACHING]: [AgentType.API],
      [RequiredCapability.LOGGING]: [AgentType.QUALITY]
    };

    for (const capability of capabilities) {
      const suggestedAgents = capabilityToAgentMap[capability] || [];
      suggestedAgents.forEach(agent => agents.add(agent));
    }

    // Always include testing for non-trivial tasks
    if (agents.size > 1) {
      agents.add(AgentType.TEST);
    }

    return Array.from(agents);
  }

  /**
   * Estimate complexity of goal
   */
  private estimateComplexity(
    normalizedGoal: string,
    capabilities: RequiredCapability[]
  ): 'simple' | 'moderate' | 'complex' | 'very_complex' {
    let complexityScore = 0;

    // Base complexity from number of capabilities
    complexityScore += capabilities.length * 10;

    // Bonus for specific complex capabilities
    if (capabilities.includes(RequiredCapability.AUTHENTICATION)) complexityScore += 20;
    if (capabilities.includes(RequiredCapability.AUTHORIZATION)) complexityScore += 20;
    if (capabilities.includes(RequiredCapability.REAL_TIME)) complexityScore += 15;
    if (capabilities.includes(RequiredCapability.INTEGRATION)) complexityScore += 15;
    if (capabilities.includes(RequiredCapability.SECURITY)) complexityScore += 10;

    // Word count heuristic
    const wordCount = normalizedGoal.split(' ').length;
    complexityScore += wordCount * 2;

    // Classify
    if (complexityScore < 30) return 'simple';
    if (complexityScore < 60) return 'moderate';
    if (complexityScore < 100) return 'complex';
    return 'very_complex';
  }

  /**
   * Build metadata from capabilities
   */
  private buildMetadata(capabilities: RequiredCapability[]): ParsedGoal['metadata'] {
    return {
      requiresAuth: capabilities.includes(RequiredCapability.AUTHENTICATION),
      requiresDatabase:
        capabilities.includes(RequiredCapability.DATABASE) ||
        capabilities.includes(RequiredCapability.CRUD),
      requiresUI: capabilities.includes(RequiredCapability.UI),
      requiresTesting: capabilities.includes(RequiredCapability.TESTING),
      requiresDocumentation: capabilities.includes(RequiredCapability.DOCUMENTATION),
      isIntegration: capabilities.includes(RequiredCapability.INTEGRATION),
      affectsExistingCode: capabilities.length > 2 // heuristic
    };
  }

  /**
   * Initialize goal templates for common patterns
   */
  private initializeTemplates(): void {
    this.templates = [
      // API for resource pattern
      {
        id: 'api-for-resource',
        name: 'Build API for Resource',
        pattern: /(?:build|create|implement)\s+(?:a\s+)?(?:rest\s+)?api\s+for\s+(?<resource>\w+)/i,
        description: 'Create a RESTful API for a resource with CRUD operations',
        requiredCapabilities: [
          RequiredCapability.API,
          RequiredCapability.CRUD,
          RequiredCapability.VALIDATION,
          RequiredCapability.DATABASE,
          RequiredCapability.TESTING
        ],
        suggestedAgents: [
          AgentType.MODELS,
          AgentType.API,
          AgentType.DATABASE,
          AgentType.TEST
        ],
        taskTemplate: [],
        estimatedDuration: 180, // 3 hours
        complexity: 'moderate',
        examples: [
          'Build a RESTful API for user management',
          'Create API for products',
          'Implement REST API for orders'
        ]
      },

      // Add authentication pattern
      {
        id: 'add-authentication',
        name: 'Add Authentication',
        pattern: /(?:add|implement|create)\s+(?:user\s+)?authentication/i,
        description: 'Implement JWT-based authentication system',
        requiredCapabilities: [
          RequiredCapability.AUTHENTICATION,
          RequiredCapability.SECURITY,
          RequiredCapability.API,
          RequiredCapability.DATABASE,
          RequiredCapability.TESTING
        ],
        suggestedAgents: [
          AgentType.AUTH,
          AgentType.SECURITY,
          AgentType.API,
          AgentType.DATABASE,
          AgentType.TEST
        ],
        taskTemplate: [],
        estimatedDuration: 240, // 4 hours
        complexity: 'complex',
        examples: [
          'Add authentication',
          'Implement user authentication',
          'Create authentication system'
        ]
      },

      // Add RBAC pattern
      {
        id: 'add-rbac',
        name: 'Add Role-Based Access Control',
        pattern: /(?:add|implement|create)\s+(?:rbac|role.based|permission|authorization)/i,
        description: 'Implement role-based access control system',
        requiredCapabilities: [
          RequiredCapability.AUTHORIZATION,
          RequiredCapability.SECURITY,
          RequiredCapability.DATABASE,
          RequiredCapability.TESTING
        ],
        suggestedAgents: [
          AgentType.RBAC,
          AgentType.SECURITY,
          AgentType.DATABASE,
          AgentType.TEST
        ],
        taskTemplate: [],
        estimatedDuration: 180, // 3 hours
        complexity: 'complex',
        examples: [
          'Add RBAC',
          'Implement role-based access control',
          'Create permission system'
        ]
      },

      // Integrate with system pattern
      {
        id: 'integrate-with-system',
        name: 'Integrate with External System',
        pattern: /integrate\s+with\s+(?<system>\w+)/i,
        description: 'Create integration with external system',
        requiredCapabilities: [
          RequiredCapability.INTEGRATION,
          RequiredCapability.API,
          RequiredCapability.VALIDATION,
          RequiredCapability.TESTING
        ],
        suggestedAgents: [AgentType.INTEGRATION, AgentType.API, AgentType.TEST],
        taskTemplate: [],
        estimatedDuration: 240, // 4 hours
        complexity: 'complex',
        examples: [
          'Integrate with Slack',
          'Integrate with Jira',
          'Integrate with GitHub'
        ]
      },

      // Add real-time feature pattern
      {
        id: 'add-realtime',
        name: 'Add Real-time Feature',
        pattern: /(?:add|implement|create)\s+(?:realtime|real.time|websocket|live)/i,
        description: 'Implement real-time feature with WebSocket',
        requiredCapabilities: [
          RequiredCapability.REAL_TIME,
          RequiredCapability.WEBSOCKET,
          RequiredCapability.API,
          RequiredCapability.TESTING
        ],
        suggestedAgents: [AgentType.REALTIME, AgentType.API, AgentType.TEST],
        taskTemplate: [],
        estimatedDuration: 180, // 3 hours
        complexity: 'moderate',
        examples: [
          'Add real-time notifications',
          'Implement live updates',
          'Create WebSocket connection'
        ]
      },

      // Build UI pattern
      {
        id: 'build-ui',
        name: 'Build User Interface',
        pattern: /(?:build|create|implement)\s+(?:ui|interface|dashboard|form|page)\s+for\s+(?<feature>\w+)/i,
        description: 'Create user interface component',
        requiredCapabilities: [
          RequiredCapability.UI,
          RequiredCapability.API,
          RequiredCapability.TESTING
        ],
        suggestedAgents: [AgentType.UI, AgentType.API, AgentType.TEST],
        taskTemplate: [],
        estimatedDuration: 240, // 4 hours
        complexity: 'moderate',
        examples: [
          'Build UI for user management',
          'Create dashboard for analytics',
          'Implement form for orders'
        ]
      }
    ];
  }

  /**
   * Get all available templates
   */
  public getTemplates(): GoalTemplate[] {
    return this.templates;
  }

  /**
   * Add custom template
   */
  public addTemplate(template: GoalTemplate): void {
    this.templates.push(template);
  }
}
