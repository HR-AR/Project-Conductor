/**
 * Project History Service
 * Manages project tracking, comparison, and history analysis
 */

import type {
  Project,
  ProjectFilters,
  ProjectDetails,
  ProjectComparison,
  ProjectTimelineEvent,
  ProjectSummary,
  SimilarProjectsResult,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectScopeType,
  ProjectStatusType,
} from '../models/project.model';
import { simpleMockService } from './simple-mock.service';

export class ProjectHistoryService {
  /**
   * Get all projects with optional filtering
   */
  async getProjects(filters: ProjectFilters = {}): Promise<Project[]> {
    const projects = await simpleMockService.getAllProjects();
    let filtered = projects;

    // Apply scope filter
    if (filters.scope && filters.scope.length > 0) {
      filtered = filtered.filter((p) => filters.scope!.includes(p.scope));
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((p) => filters.status!.includes(p.status));
    }

    // Apply creator filter
    if (filters.createdBy) {
      filtered = filtered.filter((p) => p.createdBy === filters.createdBy);
    }

    // Apply stakeholder filter
    if (filters.stakeholderEmail) {
      filtered = filtered.filter((p) =>
        p.stakeholders.some((s) => s.email === filters.stakeholderEmail)
      );
    }

    // Apply budget range filter
    if (filters.minBudget !== undefined) {
      filtered = filtered.filter((p) => p.budget >= filters.minBudget!);
    }
    if (filters.maxBudget !== undefined) {
      filtered = filtered.filter((p) => p.budget <= filters.maxBudget!);
    }

    // Apply date range filter
    if (filters.startDateFrom) {
      const fromDate = new Date(filters.startDateFrom);
      filtered = filtered.filter((p) => p.timeline.startDate >= fromDate);
    }
    if (filters.startDateTo) {
      const toDate = new Date(filters.startDateTo);
      filtered = filtered.filter((p) => p.timeline.startDate <= toDate);
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((p) =>
        p.tags.some((tag) => filters.tags!.includes(tag))
      );
    }

    // Apply search filter (title and description)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  /**
   * Get single project by ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    return simpleMockService.getProjectById(id);
  }

  /**
   * Get project with full traceability details
   */
  async getProjectDetails(id: string): Promise<ProjectDetails | null> {
    const project = await this.getProjectById(id);
    if (!project) return null;

    // Fetch related documents
    const brd = project.brdId ? await simpleMockService.getBRDById(project.brdId) : undefined;
    const prd = project.prdId ? await simpleMockService.getPRDById(project.prdId) : undefined;

    const designs = [];
    for (const designId of project.designIds) {
      const design = await simpleMockService.getDesignById(designId);
      if (design) designs.push(design);
    }

    const conflicts = [];
    for (const conflictId of project.conflictIds) {
      const conflict = await simpleMockService.getConflictById(conflictId);
      if (conflict) conflicts.push(conflict);
    }

    const changeLogs = [];
    for (const changeLogId of project.changeLogIds) {
      const changeLog = await simpleMockService.getChangeLogById(changeLogId);
      if (changeLog) changeLogs.push(changeLog);
    }

    return {
      project,
      brd,
      prd,
      designs,
      conflicts,
      changeLogs,
    };
  }

  /**
   * Compare two projects
   */
  async compareProjects(id1: string, id2: string): Promise<ProjectComparison | null> {
    const project1 = await this.getProjectById(id1);
    const project2 = await this.getProjectById(id2);

    if (!project1 || !project2) return null;

    // Calculate budget difference
    const budgetDiff = project2.budget - project1.budget;

    // Calculate timeline difference (in days)
    const timeline1Days =
      (project1.timeline.targetDate.getTime() - project1.timeline.startDate.getTime()) /
      (1000 * 60 * 60 * 24);
    const timeline2Days =
      (project2.timeline.targetDate.getTime() - project2.timeline.startDate.getTime()) /
      (1000 * 60 * 60 * 24);
    const timelineDiff = Math.round(timeline2Days - timeline1Days);

    // Scope change detection
    const scopeChange =
      project1.scope !== project2.scope
        ? { from: project1.scope, to: project2.scope }
        : undefined;

    // Feature comparison (simplified - comparing tags)
    const tags1 = new Set(project1.tags);
    const tags2 = new Set(project2.tags);

    const added = Array.from(tags2).filter((tag) => !tags1.has(tag));
    const removed = Array.from(tags1).filter((tag) => !tags2.has(tag));
    const modified: string[] = []; // Could compare descriptions, budgets, etc.

    // Major changes summary
    const majorChanges = [];
    if (scopeChange) {
      majorChanges.push({
        category: 'Scope',
        description: `Changed from ${scopeChange.from} to ${scopeChange.to}`,
        impact: 'Project focus and deliverables shifted',
      });
    }
    if (Math.abs(budgetDiff) > project1.budget * 0.2) {
      majorChanges.push({
        category: 'Budget',
        description: `Budget ${budgetDiff > 0 ? 'increased' : 'decreased'} by $${Math.abs(budgetDiff).toLocaleString()}`,
        impact: budgetDiff > 0 ? 'Additional resources allocated' : 'Cost optimization required',
      });
    }
    if (Math.abs(timelineDiff) > 14) {
      majorChanges.push({
        category: 'Timeline',
        description: `Timeline ${timelineDiff > 0 ? 'extended' : 'compressed'} by ${Math.abs(timelineDiff)} days`,
        impact: timelineDiff > 0 ? 'Delayed delivery date' : 'Accelerated delivery',
      });
    }

    return {
      project1,
      project2,
      scopeChange,
      budgetDiff,
      timelineDiff,
      features: {
        added,
        removed,
        modified,
      },
      totalChanges: project2.changeLogIds.length,
      majorChanges,
    };
  }

  /**
   * Find similar projects based on scope, tags, and title
   */
  async getSimilarProjects(projectId: string): Promise<SimilarProjectsResult | null> {
    const project = await this.getProjectById(projectId);
    if (!project) return null;

    const allProjects = await simpleMockService.getAllProjects();
    const otherProjects = allProjects.filter((p) => p.id !== projectId);

    // Calculate similarity scores
    const scoredProjects = otherProjects.map((p) => {
      let score = 0;
      const reasons: string[] = [];

      // Scope match (50 points)
      if (p.scope === project.scope) {
        score += 50;
        reasons.push(`Same scope: ${p.scope}`);
      }

      // Tag overlap (30 points max)
      const projectTags = new Set(project.tags);
      const otherTags = new Set(p.tags);
      const commonTags = Array.from(projectTags).filter((tag) => otherTags.has(tag));
      if (commonTags.length > 0) {
        const tagScore = Math.min(30, commonTags.length * 10);
        score += tagScore;
        reasons.push(`${commonTags.length} common tags: ${commonTags.join(', ')}`);
      }

      // Title keyword overlap (20 points max)
      const projectWords = project.title.toLowerCase().split(/\s+/);
      const otherWords = p.title.toLowerCase().split(/\s+/);
      const commonWords = projectWords.filter((word) => otherWords.includes(word) && word.length > 3);
      if (commonWords.length > 0) {
        const wordScore = Math.min(20, commonWords.length * 5);
        score += wordScore;
        reasons.push(`Similar title keywords: ${commonWords.join(', ')}`);
      }

      return {
        project: p,
        similarityScore: score,
        similarityReasons: reasons,
      };
    });

    // Sort by score and take top results
    const similarProjects = scoredProjects
      .filter((sp) => sp.similarityScore > 30) // Minimum 30% similarity
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);

    return {
      project,
      similarProjects,
    };
  }

  /**
   * Get project timeline (chronological events)
   */
  async getProjectTimeline(id: string): Promise<ProjectTimelineEvent[]> {
    const details = await this.getProjectDetails(id);
    if (!details) return [];

    const events: ProjectTimelineEvent[] = [];

    // Project created
    events.push({
      timestamp: details.project.createdAt,
      type: 'created',
      description: `Project "${details.project.title}" created`,
      userId: details.project.createdBy,
    });

    // BRD events
    if (details.brd) {
      events.push({
        timestamp: details.brd.createdAt,
        type: 'brd_submitted',
        description: 'Business Requirements Document submitted',
        documentId: details.brd.id,
      });
      if (details.brd.status === 'approved') {
        events.push({
          timestamp: details.brd.updatedAt,
          type: 'brd_approved',
          description: 'BRD approved by stakeholders',
          documentId: details.brd.id,
        });
      }
    }

    // PRD events
    if (details.prd) {
      events.push({
        timestamp: details.prd.createdAt,
        type: 'prd_created',
        description: 'Product Requirements Document created',
        documentId: details.prd.id,
      });
      if (details.prd.status === 'aligned') {
        events.push({
          timestamp: details.prd.updatedAt,
          type: 'prd_aligned',
          description: 'PRD aligned with stakeholders',
          documentId: details.prd.id,
        });
      }
    }

    // Engineering design events
    for (const design of details.designs) {
      events.push({
        timestamp: design.createdAt,
        type: 'design_submitted',
        description: `Engineering design submitted by ${design.team} team`,
        documentId: design.id,
      });
    }

    // Conflict events
    for (const conflict of details.conflicts) {
      events.push({
        timestamp: conflict.createdAt,
        type: 'conflict_raised',
        description: `Conflict raised: ${conflict.title}`,
        documentId: conflict.id,
      });
      if (conflict.status === 'resolved') {
        events.push({
          timestamp: conflict.updatedAt,
          type: 'conflict_resolved',
          description: `Conflict resolved: ${conflict.title}`,
          documentId: conflict.id,
        });
      }
    }

    // Change log events
    for (const changeLog of details.changeLogs) {
      events.push({
        timestamp: changeLog.timestamp,
        type: 'change_logged',
        description: `Change: ${changeLog.item} - ${changeLog.change}`,
        documentId: changeLog.id,
      });
    }

    // Project completion
    if (details.project.completedAt) {
      events.push({
        timestamp: details.project.completedAt,
        type: 'completed',
        description: 'Project completed',
      });
    }

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get project summary statistics
   */
  async getProjectSummary(): Promise<ProjectSummary> {
    const allProjects = await simpleMockService.getAllProjects();

    const byScope: Record<ProjectScopeType, number> = {
      feature: 0,
      platform: 0,
      integration: 0,
      optimization: 0,
      bugfix: 0,
      maintenance: 0,
      research: 0,
    };

    const byStatus: Record<ProjectStatusType, number> = {
      draft: 0,
      brd_approval: 0,
      prd_alignment: 0,
      design: 0,
      implementation: 0,
      completed: 0,
      archived: 0,
    };

    let totalBudget = 0;
    let completed = 0;
    let active = 0;
    let totalDuration = 0;
    let projectsWithDuration = 0;

    for (const project of allProjects) {
      byScope[project.scope]++;
      byStatus[project.status]++;
      totalBudget += project.budget;

      if (project.status === 'completed') {
        completed++;
        if (project.completedAt) {
          const duration =
            (project.completedAt.getTime() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          totalDuration += duration;
          projectsWithDuration++;
        }
      }

      if (['brd_approval', 'prd_alignment', 'design', 'implementation'].includes(project.status)) {
        active++;
      }
    }

    // Find most common scope
    let mostCommonScope: ProjectScopeType = 'feature';
    let maxScopeCount = 0;
    for (const [scope, count] of Object.entries(byScope)) {
      if (count > maxScopeCount) {
        maxScopeCount = count;
        mostCommonScope = scope as ProjectScopeType;
      }
    }

    const successRate = allProjects.length > 0 ? (completed / allProjects.length) * 100 : 0;
    const averageDuration = projectsWithDuration > 0 ? totalDuration / projectsWithDuration : 0;

    return {
      total: allProjects.length,
      byScope,
      byStatus,
      totalBudget,
      averageBudget: allProjects.length > 0 ? totalBudget / allProjects.length : 0,
      completed,
      active,
      successRate: Math.round(successRate),
      averageDuration: Math.round(averageDuration),
      mostCommonScope,
    };
  }

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectRequest, createdBy: string): Promise<Project> {
    return simpleMockService.createProject(data, createdBy);
  }

  /**
   * Update an existing project
   */
  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project | null> {
    return simpleMockService.updateProject(id, data);
  }
}