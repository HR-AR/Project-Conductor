/**
 * Agent Integration
 * Autonomous agent for external system integrations (Jira, Slack, OAuth)
 */

import { BaseAgent } from './base-agent';
import {
  AgentType,
  AgentTask,
  AgentTaskResult,
  PhaseNumber
} from '../../models/orchestrator.model';

export class AgentIntegration extends BaseAgent {
  constructor() {
    super(
      AgentType.INTEGRATION,
      'Integration Agent',
      'Implements external system integrations including Jira, Slack, and OAuth'
    );
  }

  protected async performTask(task: AgentTask): Promise<AgentTaskResult> {
    this.validateTask(task);

    const filesCreated: string[] = [];
    const filesModified: string[] = [];

    this.log('info', `Performing Integration task: ${task.milestone}`);

    // Integration agent is primarily active in Phase 5
    if (task.phase === PhaseNumber.PHASE_5) {
      await this.implementIntegrations(task, filesCreated, filesModified);
    } else {
      this.log('warn', `No integration functionality for phase ${task.phase}`);
    }

    return this.createResult(true, {
      output: `Integration features implemented for ${task.milestone}`,
      filesCreated,
      filesModified
    });
  }

  private async implementIntegrations(
    task: AgentTask,
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Implementing external integrations');

    // OAuth authentication
    if (task.description.includes('oauth') || task.description.includes('auth')) {
      created.push(`${this.context.srcDir}/services/oauth.service.ts`);
      created.push(`${this.context.srcDir}/models/auth.model.ts`);
      created.push(`${this.context.srcDir}/middleware/oauth.middleware.ts`);
      created.push(`${this.context.srcDir}/routes/auth.routes.ts`);
      created.push(`${this.context.srcDir}/controllers/auth.controller.ts`);
      await this.sleep(1000);
    }

    // Jira integration
    if (task.description.includes('jira')) {
      created.push(`${this.context.srcDir}/services/jira.service.ts`);
      created.push(`${this.context.srcDir}/models/jira.model.ts`);
      created.push(`${this.context.srcDir}/routes/jira.routes.ts`);
      created.push(`${this.context.srcDir}/controllers/jira.controller.ts`);
      created.push(`${this.context.srcDir}/utils/jira-mapper.ts`);
      await this.sleep(1200);
    }

    // Slack integration
    if (task.description.includes('slack')) {
      created.push(`${this.context.srcDir}/services/slack.service.ts`);
      created.push(`${this.context.srcDir}/models/slack.model.ts`);
      created.push(`${this.context.srcDir}/routes/slack.routes.ts`);
      created.push(`${this.context.srcDir}/controllers/slack.controller.ts`);
      created.push(`${this.context.srcDir}/utils/slack-formatter.ts`);
      await this.sleep(1000);
    }

    // Rate limiting for external APIs
    if (task.description.includes('rate') || task.description.includes('limit')) {
      created.push(`${this.context.srcDir}/middleware/rate-limiter.ts`);
      created.push(`${this.context.srcDir}/utils/rate-limit-store.ts`);
      await this.sleep(600);
    }

    // Webhook handlers
    if (task.description.includes('webhook')) {
      created.push(`${this.context.srcDir}/routes/webhooks.routes.ts`);
      created.push(`${this.context.srcDir}/controllers/webhooks.controller.ts`);
      created.push(`${this.context.srcDir}/services/webhook-processor.service.ts`);
      await this.sleep(800);
    }

    // API key management
    if (task.description.includes('api key') || task.description.includes('apikey')) {
      created.push(`${this.context.srcDir}/services/api-key.service.ts`);
      created.push(`${this.context.srcDir}/models/api-key.model.ts`);
      created.push(`${this.context.srcDir}/middleware/api-key.middleware.ts`);
      await this.sleep(700);
    }
  }

  getCapabilities(phase: PhaseNumber): string[] {
    const capabilities: Record<PhaseNumber, string[]> = {
      [PhaseNumber.PHASE_0]: [],
      [PhaseNumber.PHASE_1]: [],
      [PhaseNumber.PHASE_2]: [],
      [PhaseNumber.PHASE_3]: [],
      [PhaseNumber.PHASE_4]: [],
      [PhaseNumber.PHASE_5]: [
        'OAuth 2.0 authentication flow',
        'Jira issue export/import',
        'Jira bidirectional sync',
        'Slack notification channels',
        'Slack slash commands',
        'Webhook processing',
        'API rate limiting',
        'API key management',
        'External system health checks',
        'Integration error handling',
        'Retry logic for failed requests',
        'Security validation',
        'Data mapping and transformation'
      ]
    };

    return capabilities[phase] || [];
  }

  canHandleTask(task: AgentTask): boolean {
    return (
      task.agentType === AgentType.INTEGRATION &&
      (task.description.toLowerCase().includes('integration') ||
        task.description.toLowerCase().includes('jira') ||
        task.description.toLowerCase().includes('slack') ||
        task.description.toLowerCase().includes('oauth') ||
        task.description.toLowerCase().includes('webhook') ||
        task.description.toLowerCase().includes('external'))
    );
  }

  estimateTaskDuration(task: AgentTask): number {
    // Integration features are complex and time-consuming
    const baseTime = 70000; // 70 seconds
    const phaseMultipliers: Record<PhaseNumber, number> = {
      [PhaseNumber.PHASE_0]: 0.0,
      [PhaseNumber.PHASE_1]: 0.0,
      [PhaseNumber.PHASE_2]: 0.0,
      [PhaseNumber.PHASE_3]: 0.0,
      [PhaseNumber.PHASE_4]: 0.0,
      [PhaseNumber.PHASE_5]: 2.0 // All integration work in Phase 5
    };

    return baseTime * (phaseMultipliers[task.phase] || 0.5);
  }

  getDependencies(): AgentType[] {
    return [AgentType.MODELS, AgentType.API, AgentType.QUALITY];
  }
}
