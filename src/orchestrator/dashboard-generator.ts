/**
 * Dashboard Generator
 * Generates markdown dashboard for orchestrator progress
 */

import fs from 'fs/promises';
import path from 'path';
import { DashboardData, PhaseNumber } from '../models/orchestrator.model';
import logger from '../utils/logger';

export class DashboardGenerator {
  private readonly dashboardFile: string;

  constructor(baseDir: string = process.cwd()) {
    const conductorDir = path.join(baseDir, '.conductor');
    this.dashboardFile = path.join(conductorDir, 'dashboard.md');
  }

  /**
   * Generate dashboard markdown
   */
  async generate(data: DashboardData): Promise<void> {
    const markdown = this.buildDashboard(data);

    try {
      await fs.writeFile(this.dashboardFile, markdown, 'utf-8');
      logger.debug('Dashboard generated');
    } catch (error) {
      logger.error('Failed to generate dashboard', error);
    }
  }

  /**
   * Build dashboard markdown content
   */
  private buildDashboard(data: DashboardData): string {
    const lines: string[] = [];

    // Header
    lines.push('# Project Conductor - Orchestration Dashboard');
    lines.push('');
    lines.push(`*Last Updated: ${data.progress.timestamp.toISOString()}*`);
    lines.push('');

    // System Health
    lines.push('## System Health');
    lines.push('');
    lines.push(this.buildHealthSection(data));
    lines.push('');

    // Current Phase
    lines.push('## Current Phase');
    lines.push('');
    lines.push(this.buildPhaseSection(data));
    lines.push('');

    // Overall Progress
    lines.push('## Overall Progress');
    lines.push('');
    lines.push(this.buildProgressSection(data));
    lines.push('');

    // Active Agents
    lines.push('## Active Agents');
    lines.push('');
    lines.push(this.buildAgentsSection(data));
    lines.push('');

    // Recent Milestones
    lines.push('## Recent Milestones');
    lines.push('');
    lines.push(this.buildMilestonesSection(data));
    lines.push('');

    // Tasks Overview
    lines.push('## Tasks Overview');
    lines.push('');
    lines.push(this.buildTasksSection(data));
    lines.push('');

    // Recent Lessons
    if (data.recentLessons.length > 0) {
      lines.push('## Recent Lessons Learned');
      lines.push('');
      lines.push(this.buildLessonsSection(data));
      lines.push('');
    }

    // Recent Errors
    if (data.recentErrors.length > 0) {
      lines.push('## Recent Errors');
      lines.push('');
      lines.push(this.buildErrorsSection(data));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Build health section
   */
  private buildHealthSection(data: DashboardData): string {
    const { systemHealth } = data;
    const statusEmoji = {
      healthy: '✅',
      degraded: '⚠️',
      critical: '❌'
    };

    const uptimeHours = (systemHealth.uptime / (1000 * 60 * 60)).toFixed(2);

    return [
      `**Status:** ${statusEmoji[systemHealth.status]} ${systemHealth.status.toUpperCase()}`,
      `**Uptime:** ${uptimeHours} hours`,
      `**Memory Usage:** ${systemHealth.memoryUsage.toFixed(2)} MB`,
      `**Active Connections:** ${systemHealth.activeConnections}`,
      `**Last Health Check:** ${systemHealth.lastHealthCheck.toISOString()}`
    ].join('  \n');
  }

  /**
   * Build phase section
   */
  private buildPhaseSection(data: DashboardData): string {
    const { currentPhase } = data;
    const phaseProgress = (data.progress.phaseProgress * 100).toFixed(1);

    const lines: string[] = [];

    lines.push(`**Phase ${currentPhase.phase}: ${currentPhase.name}**`);
    lines.push('');
    lines.push(currentPhase.description);
    lines.push('');
    lines.push(`**Progress:** ${this.buildProgressBar(data.progress.phaseProgress)} ${phaseProgress}%`);
    lines.push('');

    // Milestones for current phase
    lines.push('### Milestones');
    lines.push('');

    for (const milestone of currentPhase.milestones) {
      const statusEmoji = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        failed: '❌'
      };

      lines.push(`- ${statusEmoji[milestone.status]} **${milestone.name}**: ${milestone.description}`);
    }

    return lines.join('\n');
  }

  /**
   * Build progress section
   */
  private buildProgressSection(data: DashboardData): string {
    const { progress } = data;
    const overallProgress = (progress.overallProgress * 100).toFixed(1);

    const lines: string[] = [];

    lines.push(`**Overall Progress:** ${this.buildProgressBar(progress.overallProgress)} ${overallProgress}%`);
    lines.push('');

    // Phase breakdown
    lines.push('### Phase Breakdown');
    lines.push('');

    const phaseNames = [
      'Phase 0: Initialization',
      'Phase 1: Core Requirements Engine',
      'Phase 2: Traceability Engine',
      'Phase 3: Real-time Collaboration',
      'Phase 4: Quality & Validation',
      'Phase 5: External Integrations'
    ];

    for (let i = 0; i <= 5; i++) {
      const isComplete = progress.phase > i;
      const isCurrent = progress.phase === i;
      const emoji = isComplete ? '✅' : isCurrent ? '🔄' : '⏳';

      lines.push(`${emoji} ${phaseNames[i]}`);
    }

    lines.push('');

    if (progress.estimatedCompletion) {
      lines.push(`**Estimated Completion:** ${progress.estimatedCompletion.toISOString()}`);
    }

    return lines.join('\n');
  }

  /**
   * Build agents section
   */
  private buildAgentsSection(data: DashboardData): string {
    const lines: string[] = [];

    lines.push('| Agent | Tasks Completed | Tasks Failed | Success Rate | Avg. Time |');
    lines.push('|-------|----------------|--------------|--------------|-----------|');

    for (const agent of data.activeAgents) {
      const successRate = (agent.successRate * 100).toFixed(1);
      const avgTime = (agent.averageCompletionTime / 1000).toFixed(1);

      lines.push(
        `| ${agent.agentType} | ${agent.tasksCompleted} | ${agent.tasksFailed} | ${successRate}% | ${avgTime}s |`
      );
    }

    return lines.join('\n');
  }

  /**
   * Build milestones section
   */
  private buildMilestonesSection(data: DashboardData): string {
    if (data.recentMilestones.length === 0) {
      return '*No milestones completed yet*';
    }

    const lines: string[] = [];

    for (const milestone of data.recentMilestones) {
      const completedAt = milestone.completedAt?.toISOString() || 'N/A';
      lines.push(`- ✅ **${milestone.name}** - ${milestone.description}`);
      lines.push(`  *Completed: ${completedAt}*`);
    }

    return lines.join('\n');
  }

  /**
   * Build tasks section
   */
  private buildTasksSection(data: DashboardData): string {
    const { progress } = data;

    return [
      `- **Active:** ${progress.activeTasks}`,
      `- **Completed:** ${progress.completedTasks}`,
      `- **Failed:** ${progress.failedTasks}`,
      `- **Total:** ${progress.activeTasks + progress.completedTasks + progress.failedTasks}`
    ].join('\n');
  }

  /**
   * Build lessons section
   */
  private buildLessonsSection(data: DashboardData): string {
    const lines: string[] = [];

    for (const lesson of data.recentLessons) {
      const categoryEmoji = {
        success: '✅',
        failure: '❌',
        optimization: '⚡',
        pattern: '📋'
      };

      lines.push(`- ${categoryEmoji[lesson.category]} **${lesson.description}**`);
      lines.push(`  *Impact: ${lesson.impact}*`);

      if (lesson.actionTaken) {
        lines.push(`  *Action: ${lesson.actionTaken}*`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Build errors section
   */
  private buildErrorsSection(data: DashboardData): string {
    const lines: string[] = [];

    for (const error of data.recentErrors) {
      const severityEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴'
      };

      lines.push(`- ${severityEmoji[error.severity]} **Phase ${error.phase}${error.agent ? ` - ${error.agent}` : ''}**`);
      lines.push(`  ${error.error}`);
      lines.push(`  *${error.timestamp.toISOString()}*`);
    }

    return lines.join('\n');
  }

  /**
   * Build progress bar
   */
  private buildProgressBar(progress: number, width: number = 20): string {
    const filled = Math.round(progress * width);
    const empty = width - filled;

    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }
}
