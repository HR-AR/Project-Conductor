/**
 * Approval Status Widget - Shows approval progress and reviewer status
 */

import { WidgetRenderer, RenderContext } from '../widget-registry.service';
import { WidgetDataProvider } from '../widget-data-provider.service';
import logger from '../../utils/logger';

export interface ApprovalStatusData {
  narrativeId: number;
  narrativeVersion: number;
  status: 'pending' | 'approved' | 'rejected' | 'conditional';
  totalReviewers: number;
  approvedCount: number;
  rejectedCount: number;
  conditionalCount: number;
  pendingCount: number;
  reviewers: Array<{
    id: number;
    name: string;
    role: string;
    vote: 'pending' | 'approved' | 'rejected' | 'conditional';
    votedAt?: Date;
    conditions?: string[];
  }>;
  dueDate?: Date;
  initiatedAt: Date;
  finalizedAt?: Date;
}

export class ApprovalStatusWidget implements WidgetRenderer {
  private dataProvider: WidgetDataProvider;

  constructor(dataProvider: WidgetDataProvider) {
    this.dataProvider = dataProvider;
  }

  validate(params: Record<string, string>): boolean {
    return !!(params['narrative-id'] || params.narrativeId);
  }

  async render(params: Record<string, string>, context: RenderContext): Promise<string> {
    const narrativeId = params['narrative-id'] || params.narrativeId;

    try {
      const data = await this.dataProvider.getApprovalStatus(narrativeId);

      return this.renderApprovalStatus(data);
    } catch (error) {
      logger.error({ error, narrativeId }, 'Failed to fetch approval status data');
      return this.renderError('Failed to load approval status');
    }
  }

  private renderApprovalStatus(data: ApprovalStatusData): string {
    const statusBadge = this.renderStatusBadge(data.status);
    const progressBar = this.renderProgressBar(data);
    const reviewersList = this.renderReviewers(data.reviewers);
    const timeline = this.renderTimeline(data);

    return `
      <div class="approval-status-widget">
        <div class="approval-status-header">
          <h4 class="approval-status-title">Approval Status</h4>
          ${statusBadge}
        </div>

        <div class="approval-progress-section">
          <div class="approval-progress-stats">
            <div class="approval-stat approval-stat-approved">
              <span class="stat-value">${data.approvedCount}</span>
              <span class="stat-label">Approved</span>
            </div>
            <div class="approval-stat approval-stat-pending">
              <span class="stat-value">${data.pendingCount}</span>
              <span class="stat-label">Pending</span>
            </div>
            <div class="approval-stat approval-stat-rejected">
              <span class="stat-value">${data.rejectedCount}</span>
              <span class="stat-label">Rejected</span>
            </div>
            ${data.conditionalCount > 0 ? `
              <div class="approval-stat approval-stat-conditional">
                <span class="stat-value">${data.conditionalCount}</span>
                <span class="stat-label">Conditional</span>
              </div>
            ` : ''}
          </div>
          ${progressBar}
        </div>

        ${reviewersList}
        ${timeline}
      </div>
    `;
  }

  private renderStatusBadge(status: string): string {
    const statusConfig: Record<string, { label: string; emoji: string; class: string }> = {
      pending: { label: 'Pending Review', emoji: '⏳', class: 'status-pending' },
      approved: { label: 'Approved', emoji: '✅', class: 'status-approved' },
      rejected: { label: 'Rejected', emoji: '❌', class: 'status-rejected' },
      conditional: { label: 'Conditionally Approved', emoji: '⚠️', class: 'status-conditional' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return `
      <span class="approval-status-badge ${config.class}">
        <span class="status-emoji">${config.emoji}</span>
        ${config.label}
      </span>
    `;
  }

  private renderProgressBar(data: ApprovalStatusData): string {
    const completedPercentage = (data.totalReviewers > 0)
      ? Math.round(((data.approvedCount + data.rejectedCount + data.conditionalCount) / data.totalReviewers) * 100)
      : 0;

    const approvedPercentage = (data.totalReviewers > 0)
      ? Math.round((data.approvedCount / data.totalReviewers) * 100)
      : 0;

    return `
      <div class="approval-progress-bar-container">
        <div class="approval-progress-label">
          <span>Review Progress</span>
          <span class="approval-progress-percentage">${completedPercentage}% Complete</span>
        </div>
        <div class="approval-progress-bar">
          <div class="approval-progress-fill approval-progress-fill-approved"
               style="width: ${approvedPercentage}%"></div>
          <div class="approval-progress-fill approval-progress-fill-rejected"
               style="width: ${(data.rejectedCount / data.totalReviewers) * 100}%"></div>
          <div class="approval-progress-fill approval-progress-fill-conditional"
               style="width: ${(data.conditionalCount / data.totalReviewers) * 100}%"></div>
        </div>
      </div>
    `;
  }

  private renderReviewers(reviewers: ApprovalStatusData['reviewers']): string {
    if (reviewers.length === 0) {
      return '';
    }

    const reviewerItems = reviewers.map(reviewer => {
      const voteClass = `reviewer-vote-${reviewer.vote}`;
      const voteIcon = this.getVoteIcon(reviewer.vote);

      const conditionsHtml = reviewer.conditions && reviewer.conditions.length > 0 ? `
        <div class="reviewer-conditions">
          <strong>Conditions:</strong>
          <ul class="conditions-list">
            ${reviewer.conditions.map(c => `<li>${this.escapeHtml(c)}</li>`).join('')}
          </ul>
        </div>
      ` : '';

      const votedAtHtml = reviewer.votedAt ? `
        <span class="reviewer-voted-at">
          ${this.formatDate(reviewer.votedAt)}
        </span>
      ` : '';

      return `
        <div class="reviewer-item ${voteClass}">
          <div class="reviewer-info">
            <div class="reviewer-header">
              <span class="reviewer-name">${this.escapeHtml(reviewer.name)}</span>
              <span class="reviewer-role">${this.escapeHtml(reviewer.role)}</span>
            </div>
            <div class="reviewer-vote">
              <span class="vote-icon">${voteIcon}</span>
              <span class="vote-status">${this.getVoteLabel(reviewer.vote)}</span>
              ${votedAtHtml}
            </div>
          </div>
          ${conditionsHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="approval-reviewers">
        <h5 class="approval-reviewers-title">Reviewers (${reviewers.length})</h5>
        <div class="approval-reviewers-list">
          ${reviewerItems}
        </div>
      </div>
    `;
  }

  private renderTimeline(data: ApprovalStatusData): string {
    const dueDateHtml = data.dueDate ? `
      <div class="timeline-item">
        <span class="timeline-icon">📅</span>
        <span class="timeline-label">Due Date:</span>
        <span class="timeline-value ${this.isPastDue(data.dueDate) ? 'timeline-overdue' : ''}">
          ${this.formatDate(data.dueDate)}
          ${this.isPastDue(data.dueDate) ? ' (OVERDUE)' : ''}
        </span>
      </div>
    ` : '';

    const finalizedHtml = data.finalizedAt ? `
      <div class="timeline-item">
        <span class="timeline-icon">✓</span>
        <span class="timeline-label">Finalized:</span>
        <span class="timeline-value">${this.formatDate(data.finalizedAt)}</span>
      </div>
    ` : '';

    return `
      <div class="approval-timeline">
        <div class="timeline-item">
          <span class="timeline-icon">🚀</span>
          <span class="timeline-label">Initiated:</span>
          <span class="timeline-value">${this.formatDate(data.initiatedAt)}</span>
        </div>
        ${dueDateHtml}
        ${finalizedHtml}
      </div>
    `;
  }

  private getVoteIcon(vote: string): string {
    const voteIcons: Record<string, string> = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
      conditional: '⚠️'
    };

    return voteIcons[vote] || '❓';
  }

  private getVoteLabel(vote: string): string {
    const voteLabels: Record<string, string> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      conditional: 'Conditional'
    };

    return voteLabels[vote] || 'Unknown';
  }

  private isPastDue(dueDate: Date): boolean {
    return new Date(dueDate) < new Date();
  }

  private renderError(message: string): string {
    return `
      <div class="approval-status-error">
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
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
