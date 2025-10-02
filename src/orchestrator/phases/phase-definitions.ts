/**
 * Phase Definitions
 * Defines all implementation phases with milestones and exit criteria
 */

import {
  PhaseDefinition,
  PhaseNumber,
  AgentType,
  MilestoneStatus
} from '../../models/orchestrator.model';

export const PHASE_DEFINITIONS: Record<PhaseNumber, PhaseDefinition> = {
  [PhaseNumber.PHASE_0]: {
    phase: PhaseNumber.PHASE_0,
    name: 'Initialization',
    description: 'Project structure and Docker environment setup',
    milestones: [
      {
        id: 'phase-0-docker',
        name: 'Docker Environment',
        description: 'Set up Docker containers for PostgreSQL and Redis',
        status: MilestoneStatus.PENDING,
        requiredAgents: []
      },
      {
        id: 'phase-0-database',
        name: 'Database Schema',
        description: 'Create initial database schema and migrations',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.MODELS]
      },
      {
        id: 'phase-0-health',
        name: 'Health Checks',
        description: 'Implement health check endpoints',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.API, AgentType.TEST]
      },
      {
        id: 'phase-0-dependencies',
        name: 'Base Dependencies',
        description: 'Install and configure core dependencies',
        status: MilestoneStatus.PENDING,
        requiredAgents: []
      }
    ],
    requiredAgents: [AgentType.MODELS, AgentType.API, AgentType.TEST],
    testCommand: 'npm test -- tests/integration/health.test.ts',
    exitCriteria: [
      'Docker services running (docker-compose ps)',
      'Database schema created',
      'Health endpoints responding (GET /api/v1/health)',
      'All infrastructure tests passing'
    ],
    dependencies: []
  },

  [PhaseNumber.PHASE_1]: {
    phase: PhaseNumber.PHASE_1,
    name: 'Core Requirements Engine',
    description: 'Requirements CRUD API with version control and audit logging',
    milestones: [
      {
        id: 'phase-1-models',
        name: 'Requirement Models',
        description: 'Create requirement data models and interfaces',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.MODELS]
      },
      {
        id: 'phase-1-crud',
        name: 'CRUD API',
        description: 'Implement requirements CRUD endpoints',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.API]
      },
      {
        id: 'phase-1-id-generation',
        name: 'Unique ID System',
        description: 'Implement unique ID generation for requirements',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.API]
      },
      {
        id: 'phase-1-audit',
        name: 'Audit Logging',
        description: 'Implement comprehensive audit trail',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.API]
      },
      {
        id: 'phase-1-versioning',
        name: 'Version Control',
        description: 'Add version control for requirements',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.API]
      },
      {
        id: 'phase-1-tests',
        name: 'Requirements Tests',
        description: 'Create comprehensive test suite',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.TEST]
      }
    ],
    requiredAgents: [AgentType.MODELS, AgentType.API, AgentType.TEST],
    testCommand: 'npm test -- tests/integration/requirements.api.test.ts',
    exitCriteria: [
      'All CRUD operations working (GET, POST, PUT, DELETE)',
      'Unique IDs generated for all requirements',
      'Audit trail captures all changes',
      'Version history accessible',
      'All requirements API tests passing'
    ],
    dependencies: [PhaseNumber.PHASE_0]
  },

  [PhaseNumber.PHASE_2]: {
    phase: PhaseNumber.PHASE_2,
    name: 'Traceability Engine',
    description: 'Bidirectional requirement linking and traceability matrix',
    milestones: [
      {
        id: 'phase-2-link-models',
        name: 'Link Models',
        description: 'Create link and traceability data models',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.MODELS]
      },
      {
        id: 'phase-2-bidirectional',
        name: 'Bidirectional Links',
        description: 'Implement bidirectional requirement linking',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.API]
      },
      {
        id: 'phase-2-suspect',
        name: 'Suspect Detection',
        description: 'Add suspect link detection and flagging',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.API, AgentType.QUALITY]
      },
      {
        id: 'phase-2-matrix',
        name: 'Traceability Matrix',
        description: 'Generate traceability matrix visualization',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.API]
      },
      {
        id: 'phase-2-coverage',
        name: 'Coverage Analysis',
        description: 'Implement coverage gap analysis',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.API, AgentType.QUALITY]
      },
      {
        id: 'phase-2-tests',
        name: 'Traceability Tests',
        description: 'Create traceability test suite',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.TEST]
      }
    ],
    requiredAgents: [AgentType.MODELS, AgentType.API, AgentType.QUALITY, AgentType.TEST],
    testCommand: 'npm test -- tests/integration/traceability.api.test.ts',
    exitCriteria: [
      'Links can be created between requirements',
      'Bidirectional links automatically maintained',
      'Suspect links detected when source changes',
      'Traceability matrix generated',
      'Coverage gaps identified',
      'All traceability tests passing'
    ],
    dependencies: [PhaseNumber.PHASE_1]
  },

  [PhaseNumber.PHASE_3]: {
    phase: PhaseNumber.PHASE_3,
    name: 'Real-time Collaboration',
    description: 'WebSocket server with commenting, presence, and live updates',
    milestones: [
      {
        id: 'phase-3-websocket',
        name: 'WebSocket Server',
        description: 'Set up Socket.io WebSocket server',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.REALTIME]
      },
      {
        id: 'phase-3-presence',
        name: 'Presence Tracking',
        description: 'Implement user presence tracking',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.REALTIME, AgentType.MODELS]
      },
      {
        id: 'phase-3-comments',
        name: 'Commenting System',
        description: 'Add commenting and threading',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.REALTIME, AgentType.API]
      },
      {
        id: 'phase-3-live-updates',
        name: 'Live Updates',
        description: 'Propagate live updates to all clients',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.REALTIME]
      },
      {
        id: 'phase-3-tests',
        name: 'Real-time Tests',
        description: 'Create WebSocket and collaboration tests',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.TEST]
      },
      {
        id: 'phase-3-load-test',
        name: 'Load Testing',
        description: 'Test with 20+ concurrent users',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.TEST]
      }
    ],
    requiredAgents: [AgentType.MODELS, AgentType.API, AgentType.REALTIME, AgentType.TEST],
    testCommand: 'npm test:presence',
    exitCriteria: [
      'WebSocket server running and accepting connections',
      'User presence tracked in real-time',
      'Comments can be added and retrieved',
      'Updates propagate to all connected clients',
      'Load test passes with 20+ users',
      'All real-time tests passing'
    ],
    dependencies: [PhaseNumber.PHASE_1, PhaseNumber.PHASE_2]
  },

  [PhaseNumber.PHASE_4]: {
    phase: PhaseNumber.PHASE_4,
    name: 'Quality & Validation',
    description: 'NLP-based validation, review workflows, and quality metrics',
    milestones: [
      {
        id: 'phase-4-nlp',
        name: 'NLP Ambiguity Detection',
        description: 'Implement NLP-based ambiguity detection',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.QUALITY]
      },
      {
        id: 'phase-4-review',
        name: 'Review Workflows',
        description: 'Add review and approval workflows',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.QUALITY, AgentType.API]
      },
      {
        id: 'phase-4-transitions',
        name: 'Status Transitions',
        description: 'Enforce status transition rules',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.QUALITY, AgentType.API]
      },
      {
        id: 'phase-4-metrics',
        name: 'Quality Metrics',
        description: 'Generate quality metrics dashboard',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.QUALITY, AgentType.API]
      },
      {
        id: 'phase-4-tests',
        name: 'Quality Tests',
        description: 'Create quality validation test suite',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.TEST]
      }
    ],
    requiredAgents: [AgentType.MODELS, AgentType.API, AgentType.QUALITY, AgentType.TEST],
    testCommand: 'npm test -- tests/integration/quality.api.test.ts',
    exitCriteria: [
      'NLP detects ambiguous requirements',
      'Review workflows enforce approvals',
      'Status transitions validated',
      'Quality metrics calculated and displayed',
      'All quality tests passing'
    ],
    dependencies: [PhaseNumber.PHASE_1, PhaseNumber.PHASE_2]
  },

  [PhaseNumber.PHASE_5]: {
    phase: PhaseNumber.PHASE_5,
    name: 'External Integrations',
    description: 'Jira, Slack, and OAuth integrations with rate limiting',
    milestones: [
      {
        id: 'phase-5-oauth',
        name: 'OAuth Authentication',
        description: 'Implement OAuth 2.0 authentication flow',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.INTEGRATION, AgentType.API]
      },
      {
        id: 'phase-5-jira',
        name: 'Jira Integration',
        description: 'Add Jira issue export/import',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.INTEGRATION]
      },
      {
        id: 'phase-5-slack',
        name: 'Slack Integration',
        description: 'Implement Slack notification channels',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.INTEGRATION]
      },
      {
        id: 'phase-5-rate-limit',
        name: 'Rate Limiting',
        description: 'Add API rate limiting',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.INTEGRATION, AgentType.API]
      },
      {
        id: 'phase-5-tests',
        name: 'Integration Tests',
        description: 'Create integration test suite',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.TEST]
      },
      {
        id: 'phase-5-security',
        name: 'Security Checks',
        description: 'Run security validation tests',
        status: MilestoneStatus.PENDING,
        requiredAgents: [AgentType.TEST, AgentType.QUALITY]
      }
    ],
    requiredAgents: [
      AgentType.MODELS,
      AgentType.API,
      AgentType.INTEGRATION,
      AgentType.QUALITY,
      AgentType.TEST
    ],
    testCommand: 'npm test -- tests/e2e/integrations.test.ts',
    exitCriteria: [
      'OAuth flow working',
      'Jira issues can be imported/exported',
      'Slack notifications sending',
      'Rate limiting preventing abuse',
      'Security tests passing',
      'All integration tests passing'
    ],
    dependencies: [PhaseNumber.PHASE_1, PhaseNumber.PHASE_2, PhaseNumber.PHASE_3, PhaseNumber.PHASE_4]
  }
};
