/**
 * Agent Quality
 * Autonomous agent for NLP-based validation and quality assurance
 */

import { BaseAgent } from './base-agent';
import {
  AgentType,
  AgentTask,
  AgentTaskResult,
  PhaseNumber
} from '../../models/orchestrator.model';

export class AgentQuality extends BaseAgent {
  constructor() {
    super(
      AgentType.QUALITY,
      'Quality Agent',
      'Implements NLP-based validation, review workflows, and quality metrics'
    );
  }

  protected async performTask(task: AgentTask): Promise<AgentTaskResult> {
    this.validateTask(task);

    const filesCreated: string[] = [];
    const filesModified: string[] = [];

    this.log('info', `Performing Quality task: ${task.milestone}`);

    // Quality agent is primarily active in Phase 4
    if (task.phase === PhaseNumber.PHASE_4) {
      await this.implementQualityFeatures(task, filesCreated, filesModified);
    } else {
      this.log('warn', `Limited quality functionality for phase ${task.phase}`);
      await this.implementBasicQuality(filesCreated, filesModified);
    }

    return this.createResult(true, {
      output: `Quality features implemented for ${task.milestone}`,
      filesCreated,
      filesModified
    });
  }

  private async implementQualityFeatures(
    task: AgentTask,
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Implementing quality validation features');

    // NLP ambiguity detection
    if (task.description.includes('nlp') || task.description.includes('ambiguity')) {
      created.push(`${this.context.srcDir}/services/quality.service.ts`);
      created.push(`${this.context.srcDir}/models/quality.model.ts`);
      created.push(`${this.context.srcDir}/utils/nlp-analyzer.ts`);
      await this.sleep(1000);
    }

    // Review workflows
    if (task.description.includes('review') || task.description.includes('workflow')) {
      created.push(`${this.context.srcDir}/services/review.service.ts`);
      created.push(`${this.context.srcDir}/models/review.model.ts`);
      created.push(`${this.context.srcDir}/routes/review.routes.ts`);
      created.push(`${this.context.srcDir}/controllers/review.controller.ts`);
      await this.sleep(800);
    }

    // Approval system
    if (task.description.includes('approval')) {
      created.push(`${this.context.srcDir}/services/approval.service.ts`);
      created.push(`${this.context.srcDir}/models/approval.model.ts`);
      await this.sleep(600);
    }

    // Quality metrics
    if (task.description.includes('metric')) {
      created.push(`${this.context.srcDir}/services/metrics.service.ts`);
      created.push(`${this.context.srcDir}/models/metrics.model.ts`);
      created.push(`${this.context.srcDir}/routes/metrics.routes.ts`);
      created.push(`${this.context.srcDir}/controllers/metrics.controller.ts`);
      await this.sleep(700);
    }

    // Dashboard for quality insights
    if (task.description.includes('dashboard')) {
      created.push(`${this.context.srcDir}/services/dashboard.service.ts`);
      await this.sleep(500);
    }
  }

  private async implementBasicQuality(
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Implementing basic quality checks');

    // Basic validation utilities
    created.push(`${this.context.srcDir}/utils/validators.ts`);
    await this.sleep(300);
  }

  getCapabilities(phase: PhaseNumber): string[] {
    const capabilities: Record<PhaseNumber, string[]> = {
      [PhaseNumber.PHASE_0]: [],
      [PhaseNumber.PHASE_1]: [
        'Basic input validation',
        'Data integrity checks'
      ],
      [PhaseNumber.PHASE_2]: [
        'Link validity checks',
        'Circular dependency detection'
      ],
      [PhaseNumber.PHASE_3]: [
        'Comment quality validation'
      ],
      [PhaseNumber.PHASE_4]: [
        'NLP-based ambiguity detection',
        'Requirements quality analysis',
        'Review workflow implementation',
        'Approval process enforcement',
        'Status transition validation',
        'Quality metrics calculation',
        'Quality dashboard generation',
        'Completeness analysis',
        'Consistency checking'
      ],
      [PhaseNumber.PHASE_5]: [
        'Integration data validation',
        'External system compliance checks'
      ]
    };

    return capabilities[phase] || [];
  }

  canHandleTask(task: AgentTask): boolean {
    return (
      task.agentType === AgentType.QUALITY &&
      (task.description.toLowerCase().includes('quality') ||
        task.description.toLowerCase().includes('nlp') ||
        task.description.toLowerCase().includes('review') ||
        task.description.toLowerCase().includes('validation') ||
        task.description.toLowerCase().includes('metric'))
    );
  }

  estimateTaskDuration(task: AgentTask): number {
    // Quality features require sophisticated logic
    const baseTime = 50000; // 50 seconds
    const phaseMultipliers: Record<PhaseNumber, number> = {
      [PhaseNumber.PHASE_0]: 0.2,
      [PhaseNumber.PHASE_1]: 0.5,
      [PhaseNumber.PHASE_2]: 0.7,
      [PhaseNumber.PHASE_3]: 0.4,
      [PhaseNumber.PHASE_4]: 2.5, // Main phase for quality features
      [PhaseNumber.PHASE_5]: 0.6
    };

    return baseTime * (phaseMultipliers[task.phase] || 1.0);
  }

  getDependencies(): AgentType[] {
    return [AgentType.MODELS, AgentType.API];
  }
}
