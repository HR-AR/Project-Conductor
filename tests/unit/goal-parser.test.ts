/**
 * Goal Parser Service - Unit Tests
 */

import { GoalParserService } from '../../src/services/orchestrator/goal-parser.service';
import {
  RequiredCapability,
  AgentType,
  GoalTemplate
} from '../../src/models/orchestrator-planning.model';

describe('GoalParserService', () => {
  let goalParser: GoalParserService;

  beforeEach(() => {
    goalParser = new GoalParserService();
  });

  describe('parseGoal', () => {
    describe('Template Matching', () => {
      it('should match "Build API for resource" template', () => {
        const goal = 'Build a RESTful API for user management';
        const result = goalParser.parseGoal(goal);

        expect(result.intent).toBe('build');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.estimatedComplexity).toBe('moderate');
        expect(result.capabilities).toContain(RequiredCapability.API);
        expect(result.capabilities).toContain(RequiredCapability.CRUD);
        expect(result.suggestedAgents).toContain(AgentType.API);
      });

      it('should match "Add authentication" template', () => {
        const goal = 'Add authentication';
        const result = goalParser.parseGoal(goal);

        expect(result.intent).toBe('add');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.estimatedComplexity).toBe('complex');
        expect(result.capabilities).toContain(RequiredCapability.AUTHENTICATION);
        expect(result.capabilities).toContain(RequiredCapability.SECURITY);
        expect(result.suggestedAgents).toContain(AgentType.AUTH);
      });

      it('should match "Add RBAC" template', () => {
        const goal = 'Implement role-based access control';
        const result = goalParser.parseGoal(goal);

        expect(result.intent).toBe('build');
        expect(result.capabilities).toContain(RequiredCapability.AUTHORIZATION);
        expect(result.suggestedAgents).toContain(AgentType.RBAC);
      });

      it('should match "Integrate with system" template', () => {
        const goal = 'Integrate with Slack';
        const result = goalParser.parseGoal(goal);

        expect(result.intent).toBe('add');
        expect(result.capabilities).toContain(RequiredCapability.INTEGRATION);
        expect(result.suggestedAgents).toContain(AgentType.INTEGRATION);
        expect(result.entities).toHaveLength(1);
        expect(result.entities[0].type).toBe('integration');
        expect(result.entities[0].name).toBe('slack');
      });

      it('should match "Add real-time" template', () => {
        const goal = 'Add real-time notifications';
        const result = goalParser.parseGoal(goal);

        expect(result.capabilities).toContain(RequiredCapability.REAL_TIME);
        expect(result.capabilities).toContain(RequiredCapability.WEBSOCKET);
        expect(result.suggestedAgents).toContain(AgentType.REALTIME);
      });

      it('should match "Build UI" template', () => {
        const goal = 'Build UI for user management';
        const result = goalParser.parseGoal(goal);

        expect(result.capabilities).toContain(RequiredCapability.UI);
        expect(result.suggestedAgents).toContain(AgentType.UI);
      });
    });

    describe('Generic Parsing (No Template Match)', () => {
      it('should parse goal without template match', () => {
        const goal = 'Optimize database queries for performance';
        const result = goalParser.parseGoal(goal);

        expect(result.originalGoal).toBe(goal);
        expect(result.confidence).toBeLessThan(0.9);
        expect(result.intent).toBeDefined();
        expect(result.capabilities.length).toBeGreaterThan(0);
        expect(result.suggestedAgents.length).toBeGreaterThan(0);
      });

      it('should infer API capability from keywords', () => {
        const goal = 'Create endpoint for fetching data';
        const result = goalParser.parseGoal(goal);

        expect(result.capabilities).toContain(RequiredCapability.API);
      });

      it('should infer DATABASE capability from keywords', () => {
        const goal = 'Create database migration for new schema';
        const result = goalParser.parseGoal(goal);

        expect(result.capabilities).toContain(RequiredCapability.DATABASE);
      });

      it('should default to API + CRUD if no matches', () => {
        const goal = 'Do something random';
        const result = goalParser.parseGoal(goal);

        expect(result.capabilities).toContain(RequiredCapability.API);
        expect(result.capabilities).toContain(RequiredCapability.CRUD);
      });
    });

    describe('Intent Extraction', () => {
      it('should extract "build" intent', () => {
        expect(goalParser.parseGoal('Build a new feature').intent).toBe('build');
        expect(goalParser.parseGoal('Create a service').intent).toBe('build');
        expect(goalParser.parseGoal('Develop an API').intent).toBe('build');
        expect(goalParser.parseGoal('Implement authentication').intent).toBe('build');
      });

      it('should extract "add" intent', () => {
        expect(goalParser.parseGoal('Add authentication').intent).toBe('add');
        expect(goalParser.parseGoal('Include validation').intent).toBe('add');
        expect(goalParser.parseGoal('Integrate with Slack').intent).toBe('add');
      });

      it('should extract "improve" intent', () => {
        expect(goalParser.parseGoal('Improve performance').intent).toBe('improve');
        expect(goalParser.parseGoal('Enhance security').intent).toBe('improve');
        expect(goalParser.parseGoal('Optimize queries').intent).toBe('improve');
      });

      it('should extract "fix" intent', () => {
        expect(goalParser.parseGoal('Fix login bug').intent).toBe('fix');
        expect(goalParser.parseGoal('Repair broken endpoint').intent).toBe('fix');
        expect(goalParser.parseGoal('Resolve authentication issue').intent).toBe('fix');
      });
    });

    describe('Entity Extraction', () => {
      it('should extract resource entities', () => {
        const result = goalParser.parseGoal('Build API for user management');
        const resourceEntity = result.entities.find(e => e.type === 'resource');

        expect(resourceEntity).toBeDefined();
        expect(resourceEntity?.name).toBe('user');
      });

      it('should extract security entities', () => {
        const result = goalParser.parseGoal('Add authentication system');
        const securityEntity = result.entities.find(e => e.type === 'security');

        expect(securityEntity).toBeDefined();
        expect(securityEntity?.name).toBe('authentication');
      });

      it('should extract integration entities', () => {
        const result = goalParser.parseGoal('Integrate with GitHub');
        const integrationEntity = result.entities.find(e => e.type === 'integration');

        expect(integrationEntity).toBeDefined();
        expect(integrationEntity?.name).toBe('github');
      });

      it('should extract UI entities', () => {
        const result = goalParser.parseGoal('Build dashboard for analytics');
        const uiEntity = result.entities.find(e => e.type === 'feature');

        expect(uiEntity).toBeDefined();
      });
    });

    describe('Capability Inference', () => {
      it('should infer multiple capabilities', () => {
        const result = goalParser.parseGoal(
          'Build REST API with authentication and real-time updates'
        );

        expect(result.capabilities).toContain(RequiredCapability.API);
        expect(result.capabilities).toContain(RequiredCapability.AUTHENTICATION);
        expect(result.capabilities).toContain(RequiredCapability.REAL_TIME);
      });

      it('should include testing for non-trivial goals', () => {
        const result = goalParser.parseGoal('Build API with authentication');

        expect(result.suggestedAgents).toContain(AgentType.TEST);
      });
    });

    describe('Complexity Estimation', () => {
      it('should estimate simple complexity', () => {
        const result = goalParser.parseGoal('Create a model');

        expect(result.estimatedComplexity).toBe('simple');
      });

      it('should estimate moderate complexity', () => {
        const result = goalParser.parseGoal('Build API for users');

        expect(result.estimatedComplexity).toBe('moderate');
      });

      it('should estimate complex complexity', () => {
        const result = goalParser.parseGoal('Add authentication with OAuth and RBAC');

        expect(['complex', 'very_complex']).toContain(result.estimatedComplexity);
      });
    });

    describe('Metadata Generation', () => {
      it('should set requiresAuth metadata', () => {
        const result = goalParser.parseGoal('Add authentication');

        expect(result.metadata.requiresAuth).toBe(true);
      });

      it('should set requiresDatabase metadata', () => {
        const result = goalParser.parseGoal('Create database schema');

        expect(result.metadata.requiresDatabase).toBe(true);
      });

      it('should set requiresUI metadata', () => {
        const result = goalParser.parseGoal('Build user interface');

        expect(result.metadata.requiresUI).toBe(true);
      });

      it('should set isIntegration metadata', () => {
        const result = goalParser.parseGoal('Integrate with Slack');

        expect(result.metadata.isIntegration).toBe(true);
      });
    });
  });

  describe('Template Management', () => {
    it('should return all templates', () => {
      const templates = goalParser.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('pattern');
      expect(templates[0]).toHaveProperty('requiredCapabilities');
    });

    it('should add custom template', () => {
      const customTemplate: GoalTemplate = {
        id: 'test-template',
        name: 'Test Template',
        pattern: /test\s+pattern/i,
        description: 'Test description',
        requiredCapabilities: [RequiredCapability.API],
        suggestedAgents: [AgentType.API],
        taskTemplate: [],
        estimatedDuration: 60,
        complexity: 'simple',
        examples: ['test pattern example']
      };

      goalParser.addTemplate(customTemplate);
      const templates = goalParser.getTemplates();

      expect(templates).toContainEqual(customTemplate);
    });

    it('should use custom template for parsing', () => {
      const customTemplate: GoalTemplate = {
        id: 'custom-api',
        name: 'Custom API Template',
        pattern: /custom\s+api\s+for\s+(?<resource>\w+)/i,
        description: 'Custom API pattern',
        requiredCapabilities: [RequiredCapability.API, RequiredCapability.CRUD],
        suggestedAgents: [AgentType.API],
        taskTemplate: [],
        estimatedDuration: 120,
        complexity: 'moderate',
        examples: ['custom api for orders']
      };

      goalParser.addTemplate(customTemplate);
      const result = goalParser.parseGoal('custom api for orders');

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.suggestedAgents).toContain(AgentType.API);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty goal', () => {
      const result = goalParser.parseGoal('');

      expect(result.normalizedGoal).toBe('');
      expect(result.capabilities.length).toBeGreaterThan(0); // defaults
    });

    it('should handle very long goal', () => {
      const longGoal = 'Build ' + 'a very complex '.repeat(50) + 'API';
      const result = goalParser.parseGoal(longGoal);

      expect(result.originalGoal).toBe(longGoal);
      expect(result.estimatedComplexity).toBe('very_complex');
    });

    it('should handle special characters', () => {
      const goal = 'Build API for user-management!!!';
      const result = goalParser.parseGoal(goal);

      expect(result.normalizedGoal).not.toContain('!');
      expect(result.capabilities).toContain(RequiredCapability.API);
    });

    it('should handle case insensitivity', () => {
      const result1 = goalParser.parseGoal('BUILD API FOR USERS');
      const result2 = goalParser.parseGoal('build api for users');

      expect(result1.capabilities).toEqual(result2.capabilities);
      expect(result1.intent).toEqual(result2.intent);
    });
  });

  describe('Goal Normalization', () => {
    it('should normalize whitespace', () => {
      const result = goalParser.parseGoal('Build   API   for   users');

      expect(result.normalizedGoal).toBe('build api for users');
    });

    it('should convert to lowercase', () => {
      const result = goalParser.parseGoal('BUILD API FOR USERS');

      expect(result.normalizedGoal).toBe('build api for users');
    });

    it('should remove special characters', () => {
      const result = goalParser.parseGoal('Build API for users!!!');

      expect(result.normalizedGoal).not.toContain('!');
    });
  });
});
