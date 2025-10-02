/**
 * Agent Models
 * Autonomous agent for data model design and implementation
 */

import { BaseAgent } from './base-agent';
import {
  AgentType,
  AgentTask,
  AgentTaskResult,
  PhaseNumber
} from '../../models/orchestrator.model';

export class AgentModels extends BaseAgent {
  constructor() {
    super(
      AgentType.MODELS,
      'Models Agent',
      'Designs and implements data models, interfaces, and type definitions'
    );
  }

  protected async performTask(task: AgentTask): Promise<AgentTaskResult> {
    this.validateTask(task);

    const filesCreated: string[] = [];
    const filesModified: string[] = [];

    this.log('info', `Performing Models task: ${task.milestone}`);

    switch (task.phase) {
      case PhaseNumber.PHASE_0:
        await this.generateBaseModels(filesCreated, filesModified);
        break;

      case PhaseNumber.PHASE_1:
        await this.generateRequirementModels(filesCreated, filesModified);
        break;

      case PhaseNumber.PHASE_2:
        await this.generateLinkModels(filesCreated, filesModified);
        break;

      case PhaseNumber.PHASE_3:
        await this.generateRealtimeModels(filesCreated, filesModified);
        break;

      case PhaseNumber.PHASE_4:
        await this.generateQualityModels(filesCreated, filesModified);
        break;

      case PhaseNumber.PHASE_5:
        await this.generateIntegrationModels(filesCreated, filesModified);
        break;
    }

    return this.createResult(true, {
      output: `Data models generated for ${task.milestone}`,
      filesCreated,
      filesModified
    });
  }

  private async generateBaseModels(
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Generating base data models');

    created.push(`${this.context.srcDir}/models/base.model.ts`);
    created.push(`${this.context.srcDir}/models/error.model.ts`);
    created.push(`${this.context.srcDir}/models/response.model.ts`);

    await this.sleep(300);
  }

  private async generateRequirementModels(
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Generating requirement data models');

    created.push(`${this.context.srcDir}/models/requirement.model.ts`);
    created.push(`${this.context.srcDir}/models/audit.model.ts`);
    created.push(`${this.context.srcDir}/models/version.model.ts`);

    await this.sleep(300);
  }

  private async generateLinkModels(
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Generating traceability link models');

    created.push(`${this.context.srcDir}/models/link.model.ts`);
    created.push(`${this.context.srcDir}/models/traceability.model.ts`);

    await this.sleep(300);
  }

  private async generateRealtimeModels(
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Generating real-time collaboration models');

    created.push(`${this.context.srcDir}/models/comment.model.ts`);
    created.push(`${this.context.srcDir}/models/presence.model.ts`);
    created.push(`${this.context.srcDir}/models/notification.model.ts`);

    await this.sleep(300);
  }

  private async generateQualityModels(
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Generating quality and review models');

    created.push(`${this.context.srcDir}/models/quality.model.ts`);
    created.push(`${this.context.srcDir}/models/review.model.ts`);
    created.push(`${this.context.srcDir}/models/metrics.model.ts`);

    await this.sleep(300);
  }

  private async generateIntegrationModels(
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Generating external integration models');

    created.push(`${this.context.srcDir}/models/jira.model.ts`);
    created.push(`${this.context.srcDir}/models/slack.model.ts`);
    created.push(`${this.context.srcDir}/models/auth.model.ts`);

    await this.sleep(300);
  }

  getCapabilities(phase: PhaseNumber): string[] {
    const capabilities: Record<PhaseNumber, string[]> = {
      [PhaseNumber.PHASE_0]: [
        'Design base interfaces and types',
        'Create error type definitions',
        'Define response structures'
      ],
      [PhaseNumber.PHASE_1]: [
        'Design requirement data model',
        'Create audit trail interfaces',
        'Define version control types'
      ],
      [PhaseNumber.PHASE_2]: [
        'Design link relationship models',
        'Create traceability matrix types',
        'Define coverage interfaces'
      ],
      [PhaseNumber.PHASE_3]: [
        'Design real-time event models',
        'Create presence tracking types',
        'Define notification interfaces'
      ],
      [PhaseNumber.PHASE_4]: [
        'Design quality validation models',
        'Create review workflow types',
        'Define metrics interfaces'
      ],
      [PhaseNumber.PHASE_5]: [
        'Design integration payload models',
        'Create OAuth flow types',
        'Define webhook interfaces'
      ]
    };

    return capabilities[phase] || [];
  }

  canHandleTask(task: AgentTask): boolean {
    return (
      task.agentType === AgentType.MODELS &&
      (task.description.toLowerCase().includes('model') ||
        task.description.toLowerCase().includes('interface') ||
        task.description.toLowerCase().includes('type'))
    );
  }

  estimateTaskDuration(task: AgentTask): number {
    // Models are typically faster to generate
    const baseTime = 20000; // 20 seconds
    const phaseMultipliers: Record<PhaseNumber, number> = {
      [PhaseNumber.PHASE_0]: 0.5,
      [PhaseNumber.PHASE_1]: 1.0,
      [PhaseNumber.PHASE_2]: 1.2,
      [PhaseNumber.PHASE_3]: 1.0,
      [PhaseNumber.PHASE_4]: 1.5,
      [PhaseNumber.PHASE_5]: 1.3
    };

    return baseTime * (phaseMultipliers[task.phase] || 1.0);
  }
}
