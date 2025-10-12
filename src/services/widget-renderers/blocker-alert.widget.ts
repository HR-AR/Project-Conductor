/**
 * Blocker Alert Widget - Shows active blockers with escalation options
 */

import { WidgetRenderer, RenderContext } from '../widget-registry.service';
import { WidgetDataProvider } from '../widget-data-provider.service';
import logger from '../../utils/logger';

export interface BlockerData {
  id: number;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'escalated' | 'resolved';
  assignedTo: string;
  createdAt: Date;
  daysActive: number;
  escalationCount: number;
  milestoneId?: string;
  projectId?: string;
}

export class BlockerAlertWidget implements WidgetRenderer {
  private dataProvider: WidgetDataProvider;

  constructor(dataProvider: WidgetDataProvider) {
    this.dataProvider = dataProvider;
  }

  validate(params: Record<string, string>): boolean {
    // Can accept milestone-id, project-id, or blocker-id
    return !!(
      params['milestone-id'] ||
      params.milestoneId ||
      params['project-id'] ||
      params.projectId ||
      params['blocker-id'] ||
      params.blockerId
    );
  }

  async render(params: Record<string, string>, context: RenderContext): Promise<string> {
    const milestoneId = params['milestone-id'] || params.milestoneId;
    const projectId = params['project-id'] || params.projectId;
    const blockerId = params['blocker-id'] || params.blockerId;

    try {
      let blockers: BlockerData[];

      if (blockerId) {
        const blocker = await this.dataProvider.getBlocker(blockerId);
        blockers = blocker ? [blocker] : [];
      } else if (milestoneId) {
        blockers = await this.dataProvider.getBlockersByMilestone(milestoneId);
      } else if (projectId) {
        blockers = await this.dataProvider.getBlockersByProject(projectId);
      } else {
        return this.renderError('No valid identifier provided');
      }

      return this.renderBlockers(blockers);
    } catch (error) {
      logger.error({ error, params }, 'Failed to fetch blocker data');
      return this.renderError('Failed to load blocker data');
    }
  }

  private renderBlockers(blockers: BlockerData[]): string {
    if (blockers.length === 0) {
      return this.renderNoBlockers();
    }

    const activeBlockers = blockers.filter(b => b.status === 'active');
    const escalatedBlockers = blockers.filter(b => b.status === 'escalated');

    const blockerItems = blockers.map(blocker => this.renderBlockerItem(blocker)).join('');

    return `
      <div class="blocker-alert-widget">
        <div class="blocker-alert-header">
          <span class="blocker-alert-icon">🚨</span>
          <h4 class="blocker-alert-title">
            Active Blockers
            <span class="blocker-count">${activeBlockers.length}</span>
          </h4>
          ${escalatedBlockers.length > 0 ? `
            <span class="blocker-escalated-badge">
              ${escalatedBlockers.length} Escalated
            </span>
          ` : ''}
        </div>

        <div class="blocker-alert-list">
          ${blockerItems}
        </div>
      </div>
    `;
  }

  private renderBlockerItem(blocker: BlockerData): string {
    const severityClass = `blocker-severity-${blocker.severity}`;
    const statusClass = `blocker-status-${blocker.status}`;
    const severityLabel = this.getSeverityLabel(blocker.severity);
    const urgencyIndicator = this.getUrgencyIndicator(blocker);

    return `
      <div class="blocker-alert-item ${severityClass} ${statusClass}"
           data-blocker-id="${blocker.id}">
        <div class="blocker-alert-item-header">
          <span class="blocker-severity-badge ${severityClass}">
            ${severityLabel.emoji} ${severityLabel.text}
          </span>
          <span class="blocker-status-badge ${statusClass}">
            ${blocker.status.toUpperCase()}
          </span>
        </div>

        <div class="blocker-alert-item-content">
          <h5 class="blocker-title">${this.escapeHtml(blocker.title)}</h5>
          <p class="blocker-description">${this.escapeHtml(blocker.description)}</p>

          <div class="blocker-meta">
            <span class="blocker-assigned">
              👤 ${this.escapeHtml(blocker.assignedTo)}
            </span>
            <span class="blocker-age ${blocker.daysActive > 3 ? 'blocker-age-warning' : ''}">
              ⏱️ ${blocker.daysActive} day${blocker.daysActive !== 1 ? 's' : ''} active
            </span>
            ${urgencyIndicator}
          </div>

          ${blocker.escalationCount > 0 ? `
            <div class="blocker-escalation-history">
              <span class="escalation-icon">📢</span>
              Escalated ${blocker.escalationCount} time${blocker.escalationCount !== 1 ? 's' : ''}
            </div>
          ` : ''}
        </div>

        <div class="blocker-alert-item-actions">
          ${blocker.status === 'active' ? `
            <button class="blocker-action-btn blocker-escalate-btn"
                    onclick="escalateBlocker(${blocker.id})"
                    data-blocker-id="${blocker.id}">
              📢 Escalate
            </button>
          ` : ''}
          <button class="blocker-action-btn blocker-resolve-btn"
                  onclick="resolveBlocker(${blocker.id})"
                  data-blocker-id="${blocker.id}">
            ✅ Mark Resolved
          </button>
          <button class="blocker-action-btn blocker-details-btn"
                  onclick="viewBlockerDetails(${blocker.id})"
                  data-blocker-id="${blocker.id}">
            ℹ️ Details
          </button>
        </div>
      </div>
    `;
  }

  private renderNoBlockers(): string {
    return `
      <div class="blocker-alert-widget blocker-alert-empty">
        <div class="blocker-alert-empty-content">
          <span class="blocker-alert-empty-icon">✅</span>
          <h4 class="blocker-alert-empty-title">No Active Blockers</h4>
          <p class="blocker-alert-empty-message">
            All clear! No blockers are currently impacting this project.
          </p>
        </div>
      </div>
    `;
  }

  private getSeverityLabel(severity: string): { emoji: string; text: string } {
    const severityMap: Record<string, { emoji: string; text: string }> = {
      high: { emoji: '🔴', text: 'High' },
      medium: { emoji: '🟡', text: 'Medium' },
      low: { emoji: '🟢', text: 'Low' }
    };

    return severityMap[severity] || severityMap.medium;
  }

  private getUrgencyIndicator(blocker: BlockerData): string {
    if (blocker.severity === 'high' || blocker.daysActive > 5) {
      return `
        <span class="blocker-urgency blocker-urgency-high">
          🚨 URGENT
        </span>
      `;
    }

    if (blocker.severity === 'medium' || blocker.daysActive > 3) {
      return `
        <span class="blocker-urgency blocker-urgency-medium">
          ⚡ Needs Attention
        </span>
      `;
    }

    return '';
  }

  private renderError(message: string): string {
    return `
      <div class="blocker-alert-error">
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
}
