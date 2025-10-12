/**
 * Project Status Widget - Shows project health, progress, and blockers
 */

import { WidgetRenderer, RenderContext } from '../widget-registry.service';
import { WidgetDataProvider } from '../widget-data-provider.service';
import logger from '../../utils/logger';

export interface ProjectStatusData {
  projectId: string;
  projectName: string;
  status: 'on-track' | 'at-risk' | 'blocked' | 'completed';
  progress: number; // 0-100
  phase: string;
  blockers: Array<{
    id: number;
    title: string;
    severity: 'low' | 'medium' | 'high';
    daysOverdue: number;
  }>;
  healthScore: number; // 0-100
  lastUpdated: Date;
}

export class ProjectStatusWidget implements WidgetRenderer {
  private dataProvider: WidgetDataProvider;

  constructor(dataProvider: WidgetDataProvider) {
    this.dataProvider = dataProvider;
  }

  validate(params: Record<string, string>): boolean {
    return !!(params['project-id'] || params.projectId);
  }

  async render(params: Record<string, string>, context: RenderContext): Promise<string> {
    const projectId = params['project-id'] || params.projectId;

    try {
      const data = await this.dataProvider.getProjectStatus(projectId);

      return this.renderProjectStatus(data);
    } catch (error) {
      logger.error({ error, projectId }, 'Failed to fetch project status data');
      return this.renderError('Failed to load project status');
    }
  }

  private renderProjectStatus(data: ProjectStatusData): string {
    const statusBadge = this.renderStatusBadge(data.status);
    const progressBar = this.renderProgressBar(data.progress);
    const blockersList = this.renderBlockers(data.blockers);
    const healthIndicator = this.renderHealthScore(data.healthScore);

    return `
      <div class="project-status-widget">
        <div class="project-status-header">
          <h4 class="project-status-name">${this.escapeHtml(data.projectName)}</h4>
          ${statusBadge}
        </div>

        <div class="project-status-meta">
          <span class="project-status-phase">Phase: ${this.escapeHtml(data.phase)}</span>
          ${healthIndicator}
        </div>

        <div class="project-status-progress">
          <div class="progress-label">
            <span>Overall Progress</span>
            <span class="progress-percentage">${data.progress}%</span>
          </div>
          ${progressBar}
        </div>

        ${blockersList}

        <div class="project-status-footer">
          <small class="last-updated">
            Updated: ${this.formatDate(data.lastUpdated)}
          </small>
        </div>
      </div>
    `;
  }

  private renderStatusBadge(status: string): string {
    const statusConfig: Record<string, { label: string; emoji: string; class: string }> = {
      'on-track': { label: 'On Track', emoji: '🟢', class: 'status-on-track' },
      'at-risk': { label: 'At Risk', emoji: '🟡', class: 'status-at-risk' },
      'blocked': { label: 'Blocked', emoji: '🔴', class: 'status-blocked' },
      'completed': { label: 'Completed', emoji: '✅', class: 'status-completed' }
    };

    const config = statusConfig[status] || statusConfig['on-track'];

    return `
      <span class="status-badge ${config.class}">
        <span class="status-emoji">${config.emoji}</span>
        ${config.label}
      </span>
    `;
  }

  private renderProgressBar(progress: number): string {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    return `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${clampedProgress}%"></div>
      </div>
    `;
  }

  private renderBlockers(blockers: ProjectStatusData['blockers']): string {
    if (blockers.length === 0) {
      return '';
    }

    const blockerItems = blockers.map(blocker => {
      const severityClass = `blocker-severity-${blocker.severity}`;
      const overdueText = blocker.daysOverdue > 0
        ? `<span class="blocker-overdue">(${blocker.daysOverdue} days overdue)</span>`
        : '';

      return `
        <div class="blocker-item ${severityClass}">
          <span class="blocker-icon">⚠️</span>
          <span class="blocker-title">${this.escapeHtml(blocker.title)}</span>
          ${overdueText}
          <button class="blocker-escalate-btn" onclick="escalateBlocker(${blocker.id})" data-blocker-id="${blocker.id}">
            Escalate
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="project-blockers">
        <div class="blockers-header">
          <strong>Active Blockers (${blockers.length})</strong>
        </div>
        <div class="blockers-list">
          ${blockerItems}
        </div>
      </div>
    `;
  }

  private renderHealthScore(healthScore: number): string {
    const clampedScore = Math.max(0, Math.min(100, healthScore));
    let healthClass = 'health-good';
    let healthEmoji = '💚';

    if (clampedScore < 40) {
      healthClass = 'health-poor';
      healthEmoji = '💔';
    } else if (clampedScore < 70) {
      healthClass = 'health-moderate';
      healthEmoji = '💛';
    }

    return `
      <span class="health-score ${healthClass}">
        <span class="health-emoji">${healthEmoji}</span>
        Health: ${clampedScore}%
      </span>
    `;
  }

  private renderError(message: string): string {
    return `
      <div class="project-status-error">
        <span class="error-icon">⚠️</span>
        <span class="error-message">${this.escapeHtml(message)}</span>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (char: string) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return escapeMap[char];
    });
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return new Date(date).toLocaleDateString();
  }
}
