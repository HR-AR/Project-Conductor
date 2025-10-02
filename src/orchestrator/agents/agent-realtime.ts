/**
 * Agent Realtime
 * Autonomous agent for WebSocket and real-time collaboration features
 */

import { BaseAgent } from './base-agent';
import {
  AgentType,
  AgentTask,
  AgentTaskResult,
  PhaseNumber
} from '../../models/orchestrator.model';

export class AgentRealtime extends BaseAgent {
  constructor() {
    super(
      AgentType.REALTIME,
      'Realtime Agent',
      'Implements WebSocket infrastructure and real-time collaboration features'
    );
  }

  protected async performTask(task: AgentTask): Promise<AgentTaskResult> {
    this.validateTask(task);

    const filesCreated: string[] = [];
    const filesModified: string[] = [];

    this.log('info', `Performing Realtime task: ${task.milestone}`);

    // Realtime agent is primarily active in Phase 3
    if (task.phase === PhaseNumber.PHASE_3) {
      await this.implementRealtimeFeatures(task, filesCreated, filesModified);
    } else {
      this.log('warn', `Limited realtime functionality for phase ${task.phase}`);
      await this.implementMinimalRealtime(filesCreated, filesModified);
    }

    return this.createResult(true, {
      output: `Real-time features implemented for ${task.milestone}`,
      filesCreated,
      filesModified
    });
  }

  private async implementRealtimeFeatures(
    task: AgentTask,
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Implementing full real-time collaboration features');

    // WebSocket server setup
    if (task.description.includes('websocket') || task.description.includes('server')) {
      created.push(`${this.context.srcDir}/services/websocket.service.ts`);
      created.push(`${this.context.srcDir}/config/websocket.ts`);
      modified.push(`${this.context.srcDir}/index.ts`);
      await this.sleep(800);
    }

    // Presence tracking
    if (task.description.includes('presence')) {
      created.push(`${this.context.srcDir}/services/presence.service.ts`);
      created.push(`${this.context.srcDir}/models/presence.model.ts`);
      await this.sleep(600);
    }

    // Commenting system
    if (task.description.includes('comment')) {
      created.push(`${this.context.srcDir}/services/comments.service.ts`);
      created.push(`${this.context.srcDir}/models/comment.model.ts`);
      created.push(`${this.context.srcDir}/routes/comments.routes.ts`);
      created.push(`${this.context.srcDir}/controllers/comments.controller.ts`);
      await this.sleep(700);
    }

    // Live updates propagation
    if (task.description.includes('update') || task.description.includes('broadcast')) {
      created.push(`${this.context.srcDir}/services/notification.service.ts`);
      created.push(`${this.context.srcDir}/models/notification.model.ts`);
      modified.push(`${this.context.srcDir}/services/requirements.service.ts`);
      await this.sleep(500);
    }
  }

  private async implementMinimalRealtime(
    created: string[],
    modified: string[]
  ): Promise<void> {
    this.log('info', 'Implementing minimal real-time support');

    // Basic event emitters for other phases
    created.push(`${this.context.srcDir}/utils/event-emitter.ts`);
    await this.sleep(300);
  }

  getCapabilities(phase: PhaseNumber): string[] {
    const capabilities: Record<PhaseNumber, string[]> = {
      [PhaseNumber.PHASE_0]: [],
      [PhaseNumber.PHASE_1]: [
        'Basic event emission for requirement changes'
      ],
      [PhaseNumber.PHASE_2]: [
        'Event emission for link changes',
        'Real-time suspect link notifications'
      ],
      [PhaseNumber.PHASE_3]: [
        'WebSocket server implementation',
        'User presence tracking system',
        'Real-time commenting and threading',
        'Live update propagation',
        'Room-based broadcasting',
        'Connection management',
        'Reconnection handling',
        'Load testing support for 20+ users'
      ],
      [PhaseNumber.PHASE_4]: [
        'Real-time review notifications',
        'Live quality metric updates'
      ],
      [PhaseNumber.PHASE_5]: [
        'Real-time integration status updates',
        'Live sync notifications'
      ]
    };

    return capabilities[phase] || [];
  }

  canHandleTask(task: AgentTask): boolean {
    return (
      task.agentType === AgentType.REALTIME &&
      (task.description.toLowerCase().includes('websocket') ||
        task.description.toLowerCase().includes('real-time') ||
        task.description.toLowerCase().includes('presence') ||
        task.description.toLowerCase().includes('live') ||
        task.description.toLowerCase().includes('comment'))
    );
  }

  estimateTaskDuration(task: AgentTask): number {
    // Real-time features require careful implementation
    const baseTime = 45000; // 45 seconds
    const phaseMultipliers: Record<PhaseNumber, number> = {
      [PhaseNumber.PHASE_0]: 0.2,
      [PhaseNumber.PHASE_1]: 0.3,
      [PhaseNumber.PHASE_2]: 0.5,
      [PhaseNumber.PHASE_3]: 2.0, // Main phase for real-time features
      [PhaseNumber.PHASE_4]: 0.5,
      [PhaseNumber.PHASE_5]: 0.7
    };

    return baseTime * (phaseMultipliers[task.phase] || 1.0);
  }

  getDependencies(): AgentType[] {
    return [AgentType.MODELS, AgentType.API];
  }
}
