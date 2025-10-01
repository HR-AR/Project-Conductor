/**
 * Simple Mock Service for Testing
 */

import { generateUniqueId } from '../utils/id-generator';
import { BaseLink, LinkFilters } from '../models/link.model';
import {
  BaseComment,
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentFilters,
  CommentThread,
  CommentSummary,
} from '../models/comment.model';
import {
  QualityAnalysis,
  QualityReport,
  QualityIssueType,
  QualityIssueSeverity,
} from '../models/quality.model';
import {
  Requirement,
  CreateRequirementRequest,
  UpdateRequirementRequest,
  RequirementFilters,
  PaginationParams,
  PaginatedResponse,
} from '../models/requirement.model';

class SimpleMockService {
  private requirements: Map<string, Requirement> = new Map();
  private versions: Map<string, Requirement[]> = new Map();
  private links: Map<string, BaseLink> = new Map();
  private comments: Map<string, BaseComment> = new Map();
  private qualityAnalyses: Map<string, QualityAnalysis> = new Map();

  async createRequirement(data: CreateRequirementRequest): Promise<Requirement> {
    const id = await generateUniqueId('REQ');
    const requirement: Requirement = {
      id,
      title: data.title,
      ...(data.description && { description: data.description }),
      status: 'draft',
      priority: data.priority || 'medium',
      ...(data.assignedTo && { assignedTo: data.assignedTo }),
      createdBy: 'system', // In real implementation, this would come from auth context
      ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      ...(data.estimatedEffort !== undefined && { estimatedEffort: data.estimatedEffort }),
      completionPercentage: 0,
      ...(data.tags && data.tags.length > 0 && { tags: data.tags }),
      ...(data.metadata && { metadata: data.metadata }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.requirements.set(id, requirement);
    return requirement;
  }

  async getRequirementById(id: string): Promise<Requirement | null> {
    return this.requirements.get(id) || null;
  }

  async updateRequirement(id: string, data: UpdateRequirementRequest): Promise<Requirement | null> {
    const existing = this.requirements.get(id);
    if (!existing) return null;

    // Save version
    if (!this.versions.has(id)) {
      this.versions.set(id, []);
    }
    this.versions.get(id)!.push({ ...existing });

    const updated: Requirement = {
      ...existing,
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && data.description ? { description: data.description } : {}),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.assignedTo !== undefined && data.assignedTo ? { assignedTo: data.assignedTo } : {}),
      ...(data.dueDate !== undefined && data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
      ...(data.estimatedEffort !== undefined && { estimatedEffort: data.estimatedEffort }),
      ...(data.actualEffort !== undefined && { actualEffort: data.actualEffort }),
      ...(data.completionPercentage !== undefined && { completionPercentage: data.completionPercentage }),
      ...(data.tags !== undefined && data.tags.length > 0 ? { tags: data.tags } : {}),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
      updatedAt: new Date(),
    };
    this.requirements.set(id, updated);
    return updated;
  }

  async deleteRequirement(id: string): Promise<boolean> {
    const requirement = this.requirements.get(id);
    if (!requirement) return false;
    requirement.status = 'archived';
    return true;
  }

  async listRequirements(options: PaginationParams): Promise<PaginatedResponse<Requirement>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const all = Array.from(this.requirements.values());
    const paginated = all.slice(offset, offset + limit);
    const total = all.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    };
  }

  async getRequirementVersions(id: string): Promise<Requirement[]> {
    return this.versions.get(id) || [];
  }

  async getSummary(): Promise<{
    total: number;
    by_status: Record<string, number>;
  }> {
    const all = Array.from(this.requirements.values());
    return {
      total: all.length,
      by_status: {
        draft: all.filter(r => r.status === 'draft').length,
        under_review: all.filter(r => r.status === 'under_review').length,
        approved: all.filter(r => r.status === 'approved').length,
        active: all.filter(r => r.status === 'active').length,
        completed: all.filter(r => r.status === 'completed').length,
        archived: all.filter(r => r.status === 'archived').length
      }
    };
  }

  // Alias for compatibility with RequirementsService
  async getRequirements(filters: RequirementFilters, pagination: PaginationParams): Promise<PaginatedResponse<Requirement>> {
    // Apply filters
    let requirements = Array.from(this.requirements.values());

    if (filters.status && filters.status.length > 0) {
      requirements = requirements.filter(r => filters.status!.includes(r.status));
    }

    if (filters.priority && filters.priority.length > 0) {
      requirements = requirements.filter(r => filters.priority!.includes(r.priority));
    }

    if (filters.assignedTo && filters.assignedTo.length > 0) {
      requirements = requirements.filter(r => r.assignedTo && filters.assignedTo!.includes(r.assignedTo));
    }

    if (filters.createdBy && filters.createdBy.length > 0) {
      requirements = requirements.filter(r => filters.createdBy!.includes(r.createdBy));
    }

    if (filters.tags && filters.tags.length > 0) {
      requirements = requirements.filter(r =>
        r.tags && r.tags.some(tag => filters.tags!.includes(tag))
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      requirements = requirements.filter(r =>
        r.title.toLowerCase().includes(searchLower) ||
        (r.description && r.description.toLowerCase().includes(searchLower))
      );
    }

    // Paginate
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const offset = (page - 1) * limit;
    const total = requirements.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = requirements.slice(offset, offset + limit);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    };
  }

  // Link management methods
  async createLink(link: BaseLink): Promise<BaseLink> {
    this.links.set(link.id, { ...link });
    return link;
  }

  async getLinkById(id: string): Promise<BaseLink | null> {
    return this.links.get(id) || null;
  }

  async updateLink(id: string, data: Partial<BaseLink>): Promise<BaseLink | null> {
    const existing = this.links.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.links.set(id, updated);
    return updated;
  }

  async deleteLink(id: string): Promise<boolean> {
    return this.links.delete(id);
  }

  async getLinks(filters: LinkFilters = {}): Promise<BaseLink[]> {
    let links = Array.from(this.links.values());

    // Apply filters
    if (filters.linkType && filters.linkType.length > 0) {
      links = links.filter(link => filters.linkType!.includes(link.linkType));
    }

    if (filters.sourceId) {
      links = links.filter(link => link.sourceId === filters.sourceId);
    }

    if (filters.targetId) {
      links = links.filter(link => link.targetId === filters.targetId);
    }

    if (filters.isSuspect !== undefined) {
      links = links.filter(link => link.isSuspect === filters.isSuspect);
    }

    if (filters.createdBy) {
      links = links.filter(link => link.createdBy === filters.createdBy);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      links = links.filter(link =>
        link.description?.toLowerCase().includes(searchTerm)
      );
    }

    return links;
  }

  async getIncomingLinks(requirementId: string): Promise<BaseLink[]> {
    return Array.from(this.links.values()).filter(link => link.targetId === requirementId);
  }

  async getOutgoingLinks(requirementId: string): Promise<BaseLink[]> {
    return Array.from(this.links.values()).filter(link => link.sourceId === requirementId);
  }

  async getAllRequirements(): Promise<Requirement[]> {
    return Array.from(this.requirements.values());
  }

  async getAllLinks(): Promise<BaseLink[]> {
    return Array.from(this.links.values());
  }

  // ========================================
  // COMMENT MANAGEMENT METHODS
  // ========================================

  async createComment(
    requirementId: string,
    userId: string,
    data: CreateCommentRequest
  ): Promise<Comment> {
    const commentId = await generateUniqueId('CMT');

    const comment: BaseComment = {
      id: commentId,
      requirementId,
      userId,
      content: data.content.trim(),
      parentCommentId: data.parentCommentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    this.comments.set(commentId, comment);

    // Convert to Comment with additional fields
    const enrichedComment = await this.enrichComment(comment);
    return enrichedComment;
  }

  async getCommentsByRequirement(
    requirementId: string,
    filters: CommentFilters = {}
  ): Promise<Comment[]> {
    const allComments = Array.from(this.comments.values())
      .filter(comment => comment.requirementId === requirementId);

    const filteredComments = this.applyCommentFilters(allComments, filters);

    // Enrich comments with additional data
    const enrichedComments = await Promise.all(
      filteredComments.map(comment => this.enrichComment(comment))
    );

    // If requesting threaded structure, organize by parent-child relationship
    if (!filters.isRootOnly) {
      return this.organizeAsThreads(enrichedComments);
    }

    // Sort by creation date (newest first)
    return enrichedComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCommentThread(commentId: string): Promise<CommentThread | null> {
    const rootComment = this.comments.get(commentId);
    if (!rootComment || rootComment.isDeleted) {
      return null;
    }

    // If this is a reply, find the root comment
    let actualRoot = rootComment;
    if (rootComment.parentCommentId) {
      const parentComment = this.comments.get(rootComment.parentCommentId);
      if (parentComment && !parentComment.isDeleted) {
        actualRoot = parentComment;
      }
    }

    // Get all replies to the root comment
    const replies = Array.from(this.comments.values())
      .filter(comment =>
        comment.parentCommentId === actualRoot.id &&
        !comment.isDeleted
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const enrichedRoot = await this.enrichComment(actualRoot);
    const enrichedReplies = await Promise.all(
      replies.map(reply => this.enrichComment(reply))
    );

    const lastReply = replies.length > 0 ? replies[replies.length - 1] : undefined;

    return {
      id: actualRoot.id,
      rootComment: enrichedRoot,
      replies: enrichedReplies,
      totalReplies: replies.length,
      lastReplyAt: lastReply?.createdAt,
    };
  }

  async updateComment(
    commentId: string,
    userId: string,
    data: UpdateCommentRequest
  ): Promise<Comment | null> {
    const existingComment = this.comments.get(commentId);
    if (!existingComment || existingComment.isDeleted) {
      return null;
    }

    // Check if user owns the comment
    if (existingComment.userId !== userId) {
      throw new Error('Unauthorized: You can only edit your own comments');
    }

    const updatedComment: BaseComment = {
      ...existingComment,
      content: data.content.trim(),
      updatedAt: new Date(),
      editedAt: new Date(),
    };

    this.comments.set(commentId, updatedComment);

    const enrichedComment = await this.enrichComment(updatedComment);
    return enrichedComment;
  }

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const existingComment = this.comments.get(commentId);
    if (!existingComment || existingComment.isDeleted) {
      return false;
    }

    // Check if user owns the comment
    if (existingComment.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own comments');
    }

    // Soft delete
    const deletedComment: BaseComment = {
      ...existingComment,
      isDeleted: true,
      updatedAt: new Date(),
    };

    this.comments.set(commentId, deletedComment);
    return true;
  }

  async getCommentById(commentId: string): Promise<Comment | null> {
    const comment = this.comments.get(commentId);
    if (!comment || comment.isDeleted) {
      return null;
    }

    return this.enrichComment(comment);
  }

  async getCommentsSummary(requirementId: string): Promise<CommentSummary> {
    const requirementComments = Array.from(this.comments.values())
      .filter(comment => comment.requirementId === requirementId && !comment.isDeleted);

    const rootComments = requirementComments.filter(comment => !comment.parentCommentId);
    const replies = requirementComments.filter(comment => !!comment.parentCommentId);

    const activeUsers = [...new Set(requirementComments.map(comment => comment.userId))];

    const lastActivity = requirementComments.length > 0
      ? new Date(Math.max(...requirementComments.map(comment => comment.updatedAt.getTime())))
      : undefined;

    return {
      totalComments: requirementComments.length,
      totalRootComments: rootComments.length,
      totalReplies: replies.length,
      activeUsers,
      lastActivity,
    };
  }

  // ========================================
  // COMMENT HELPER METHODS
  // ========================================

  /**
   * Private helper to enrich comment with additional data
   */
  private async enrichComment(comment: BaseComment): Promise<Comment> {
    // In a real application, this would fetch user data from a user service
    // For now, we'll create mock user data based on userId
    const author = {
      id: comment.userId,
      username: comment.userId.startsWith('USR') ? `user_${comment.userId.slice(-4)}` : comment.userId,
      firstName: 'User',
      lastName: comment.userId.slice(-4),
    };

    // Count direct replies
    const replyCount = Array.from(this.comments.values())
      .filter(c => c.parentCommentId === comment.id && !c.isDeleted)
      .length;

    return {
      ...comment,
      author,
      replyCount,
    };
  }

  /**
   * Private helper to apply filters to comments
   */
  private applyCommentFilters(comments: BaseComment[], filters: CommentFilters): BaseComment[] {
    let filtered = comments;

    // Basic filters
    if (!filters.includeDeleted) {
      filtered = filtered.filter(comment => !comment.isDeleted);
    }

    if (filters.userId) {
      filtered = filtered.filter(comment => comment.userId === filters.userId);
    }

    if (filters.parentCommentId !== undefined) {
      filtered = filtered.filter(comment => comment.parentCommentId === filters.parentCommentId);
    }

    if (filters.isRootOnly) {
      filtered = filtered.filter(comment => !comment.parentCommentId);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(comment =>
        comment.content.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  /**
   * Private helper to organize comments as threaded structure
   */
  private organizeAsThreads(comments: Comment[]): Comment[] {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create map and identify root comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
      if (!comment.parentCommentId) {
        rootComments.push(commentMap.get(comment.id)!);
      }
    });

    // Second pass: attach replies to their parents
    comments.forEach(comment => {
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          if (!parent.replies) {
            parent.replies = [];
          }
          parent.replies.push(commentMap.get(comment.id)!);
        }
      }
    });

    // Sort root comments by creation date (newest first)
    // Sort replies by creation date (oldest first for conversation flow)
    rootComments.forEach(rootComment => {
      if (rootComment.replies) {
        rootComment.replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    });

    return rootComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ========================================
  // QUALITY ANALYSIS METHODS
  // ========================================

  /**
   * Store a quality analysis for a requirement
   */
  async storeQualityAnalysis(requirementId: string, analysis: QualityAnalysis): Promise<void> {
    this.qualityAnalyses.set(requirementId, analysis);
  }

  /**
   * Get quality analysis for a requirement
   */
  async getQualityAnalysis(requirementId: string): Promise<QualityAnalysis | null> {
    return this.qualityAnalyses.get(requirementId) || null;
  }

  /**
   * Get quality report with metrics
   */
  async getQualityReport(filters: {
    startDate?: Date;
    endDate?: Date;
    minScore?: number;
    maxScore?: number;
  } = {}): Promise<QualityReport> {
    const allAnalyses = Array.from(this.qualityAnalyses.values());
    let filteredAnalyses = allAnalyses;

    // Apply date filters
    if (filters.startDate) {
      filteredAnalyses = filteredAnalyses.filter(analysis =>
        analysis.analyzedAt >= filters.startDate!
      );
    }

    if (filters.endDate) {
      filteredAnalyses = filteredAnalyses.filter(analysis =>
        analysis.analyzedAt <= filters.endDate!
      );
    }

    // Apply score filters
    if (filters.minScore !== undefined) {
      filteredAnalyses = filteredAnalyses.filter(analysis =>
        analysis.qualityScore >= filters.minScore!
      );
    }

    if (filters.maxScore !== undefined) {
      filteredAnalyses = filteredAnalyses.filter(analysis =>
        analysis.qualityScore <= filters.maxScore!
      );
    }

    // Calculate metrics
    const totalRequirements = this.requirements.size;
    const requirementsAnalyzed = filteredAnalyses.length;
    const averageQualityScore = requirementsAnalyzed > 0
      ? filteredAnalyses.reduce((sum, analysis) => sum + analysis.qualityScore, 0) / requirementsAnalyzed
      : 0;

    // Issue distribution
    const issueDistribution: Record<QualityIssueType, number> = {
      weak_word: 0,
      vague_term: 0,
      ambiguous_pronoun: 0,
      missing_specific: 0,
      passive_voice: 0,
    };

    // Severity distribution
    const severityDistribution: Record<QualityIssueSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    filteredAnalyses.forEach(analysis => {
      analysis.issues.forEach(issue => {
        issueDistribution[issue.type]++;
        severityDistribution[issue.severity]++;
      });
    });

    // Top issues
    const topIssues = Object.entries(issueDistribution)
      .map(([type, count]) => ({
        type: type as QualityIssueType,
        count,
        affectedRequirements: filteredAnalyses.filter(analysis =>
          analysis.issues.some(issue => issue.type === type)
        ).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Quality trends (simplified - group by day for last 30 days)
    const qualityTrends = this.generateQualityTrends(filteredAnalyses, 30);

    return {
      totalRequirements,
      averageQualityScore: Math.round(averageQualityScore),
      requirementsAnalyzed,
      issueDistribution,
      severityDistribution,
      topIssues,
      qualityTrends,
      generatedAt: new Date(),
    };
  }

  /**
   * Get recent quality analyses
   */
  async getRecentQualityAnalyses(limit: number = 10): Promise<QualityAnalysis[]> {
    return Array.from(this.qualityAnalyses.values())
      .sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get quality trends over time
   */
  async getQualityTrends(days: number, groupBy: 'day' | 'week' | 'month'): Promise<Array<{
    date: string;
    averageScore: number;
    totalAnalyzed: number;
  }>> {
    const analyses = Array.from(this.qualityAnalyses.values());
    return this.generateQualityTrends(analyses, days, groupBy);
  }

  /**
   * Get requirements with low quality scores
   */
  async getLowQualityRequirements(threshold: number, limit: number): Promise<Array<{
    requirementId: string;
    title: string;
    qualityScore: number;
    issueCount: number;
    lastAnalyzed: Date;
  }>> {
    const lowQualityAnalyses = Array.from(this.qualityAnalyses.values())
      .filter(analysis => analysis.qualityScore < threshold)
      .sort((a, b) => a.qualityScore - b.qualityScore)
      .slice(0, limit);

    const results = [];
    for (const analysis of lowQualityAnalyses) {
      const requirement = this.requirements.get(analysis.requirementId);
      if (requirement) {
        results.push({
          requirementId: analysis.requirementId,
          title: requirement.title,
          qualityScore: analysis.qualityScore,
          issueCount: analysis.issues.length,
          lastAnalyzed: analysis.analyzedAt,
        });
      }
    }

    return results;
  }

  /**
   * Helper method to generate quality trends
   */
  private generateQualityTrends(
    analyses: QualityAnalysis[],
    days: number,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Array<{
    date: string;
    averageScore: number;
    totalAnalyzed: number;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const trends = [];
    const relevantAnalyses = analyses.filter(analysis =>
      analysis.analyzedAt >= startDate && analysis.analyzedAt <= endDate
    );

    // Group analyses by date period
    const groupedAnalyses = new Map<string, QualityAnalysis[]>();

    relevantAnalyses.forEach(analysis => {
      const date = analysis.analyzedAt;
      let key: string;

      switch (groupBy) {
        case 'week': {
          // Start of week (Monday)
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay() + 1);
          key = weekStart.toISOString().split('T')[0] || '';
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // day
          key = date.toISOString().split('T')[0] || '';
      }

      if (!groupedAnalyses.has(key)) {
        groupedAnalyses.set(key, []);
      }
      groupedAnalyses.get(key)!.push(analysis);
    });

    // Generate trend data
    for (const [date, periodAnalyses] of groupedAnalyses.entries()) {
      const averageScore = periodAnalyses.length > 0
        ? periodAnalyses.reduce((sum, analysis) => sum + analysis.qualityScore, 0) / periodAnalyses.length
        : 0;

      trends.push({
        date,
        averageScore: Math.round(averageScore),
        totalAnalyzed: periodAnalyses.length,
      });
    }

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const simpleMockService = new SimpleMockService();
export default SimpleMockService;