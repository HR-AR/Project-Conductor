/**
 * Widget Data Provider Service - Fetches live data for widgets
 * Orchestrates data retrieval from various services (orchestration, approval, project history)
 */

import { ProjectStatusData } from './widget-renderers/project-status.widget';
import { BlockerData } from './widget-renderers/blocker-alert.widget';
import { ApprovalStatusData } from './widget-renderers/approval-status.widget';
import logger from '../utils/logger';

// Import mock data when USE_MOCK_DB is enabled
import mockWidgetData from '../mock-data/widget-data.mock';

export class WidgetDataProvider {
  private useMock: boolean;

  constructor() {
    this.useMock = process.env['USE_MOCK_DB'] !== 'false';
  }

  /**
   * Get project status data
   */
  async getProjectStatus(projectId: string): Promise<ProjectStatusData> {
    if (this.useMock) {
      return this.getMockProjectStatus(projectId);
    }

    // TODO: Implement real data fetching from orchestration service
    logger.info({ projectId }, 'Fetching project status from orchestration service');

    // For now, fallback to mock data
    return this.getMockProjectStatus(projectId);
  }

  /**
   * Get single blocker by ID
   */
  async getBlocker(blockerId: string): Promise<BlockerData | null> {
    if (this.useMock) {
      return this.getMockBlocker(blockerId);
    }

    // TODO: Implement real data fetching
    logger.info({ blockerId }, 'Fetching blocker data');

    return this.getMockBlocker(blockerId);
  }

  /**
   * Get blockers by milestone
   */
  async getBlockersByMilestone(milestoneId: string): Promise<BlockerData[]> {
    if (this.useMock) {
      return this.getMockBlockersByMilestone(milestoneId);
    }

    // TODO: Implement real data fetching
    logger.info({ milestoneId }, 'Fetching blockers by milestone');

    return this.getMockBlockersByMilestone(milestoneId);
  }

  /**
   * Get blockers by project
   */
  async getBlockersByProject(projectId: string): Promise<BlockerData[]> {
    if (this.useMock) {
      return this.getMockBlockersByProject(projectId);
    }

    // TODO: Implement real data fetching
    logger.info({ projectId }, 'Fetching blockers by project');

    return this.getMockBlockersByProject(projectId);
  }

  /**
   * Get approval status for narrative
   */
  async getApprovalStatus(narrativeId: string): Promise<ApprovalStatusData> {
    if (this.useMock) {
      return this.getMockApprovalStatus(narrativeId);
    }

    // TODO: Implement real data fetching from approval workflow service
    logger.info({ narrativeId }, 'Fetching approval status');

    return this.getMockApprovalStatus(narrativeId);
  }

  // Mock data methods
  private getMockProjectStatus(projectId: string): ProjectStatusData {
    const project = mockWidgetData.projectStatuses.find(p => p.projectId === projectId);

    if (!project) {
      logger.warn({ projectId }, 'Project not found in mock data, using default');
      return mockWidgetData.projectStatuses[0];
    }

    return project;
  }

  private getMockBlocker(blockerId: string): BlockerData | null {
    const blocker = mockWidgetData.blockers.find(b => b.id === parseInt(blockerId));
    return blocker || null;
  }

  private getMockBlockersByMilestone(milestoneId: string): BlockerData[] {
    return mockWidgetData.blockers.filter(b => b.milestoneId === milestoneId);
  }

  private getMockBlockersByProject(projectId: string): BlockerData[] {
    return mockWidgetData.blockers.filter(b => b.projectId === projectId);
  }

  private getMockApprovalStatus(narrativeId: string): ApprovalStatusData {
    const approval = mockWidgetData.approvalStatuses.find(
      a => a.narrativeId === parseInt(narrativeId)
    );

    if (!approval) {
      logger.warn({ narrativeId }, 'Approval not found in mock data, using default');
      return mockWidgetData.approvalStatuses[0];
    }

    return approval;
  }
}

export default new WidgetDataProvider();
