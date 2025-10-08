/**
 * Simple Mock Service for Testing
 */

import logger from '../utils/logger';
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
import type { BRD } from '../models/brd.model';
import type { PRD } from '../models/prd.model';
import type { EngineeringDesign } from '../models/engineering-design.model';
import type { Conflict } from '../models/conflict.model';
import type { ChangeLogEntry } from '../models/change-log.model';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '../models/project.model';

class SimpleMockService {
  private requirements: Map<string, Requirement> = new Map();
  private versions: Map<string, Requirement[]> = new Map();
  private links: Map<string, BaseLink> = new Map();
  private comments: Map<string, BaseComment> = new Map();
  private qualityAnalyses: Map<string, QualityAnalysis> = new Map();
  private brds: Map<string, BRD> = new Map();
  private prds: Map<string, PRD> = new Map();
  private engineeringDesigns: Map<string, EngineeringDesign> = new Map();
  private conflicts: Map<string, Conflict> = new Map();
  private changeLog: Map<string, ChangeLogEntry> = new Map();
  private projects: Map<string, Project> = new Map();

  async createRequirement(data: CreateRequirementRequest): Promise<Requirement> {
    const id = await generateUniqueId('REQ');
    const requirement: Requirement = {
      id,
      title: data.title,
      ...(data.description && { description: data.description }),
      status: 'draft', // Default status
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

  /**
   * Initialize with sample demo data
   */
  async initializeDemoData(): Promise<void> {
    logger.info('[SimpleMockService] Initializing demo data...');

    // Demo Story: E-commerce Cart Abandonment Problem
    // This creates a realistic journey through all modules

    // Business Problem (Module 2 input)
    const businessProblem = await this.createRequirement({
      title: 'High Cart Abandonment Rate Causing Revenue Loss',
      description: '68% of mobile users abandon checkout at payment screen, resulting in $2M annual revenue loss. Peak abandonment occurs on mobile devices during payment information entry. Customer feedback indicates confusion about shipping costs and security concerns.',
      priority: 'critical',
      tags: ['revenue', 'mobile', 'checkout', 'ux'],
      metadata: {
        stakeholders: 'Sales,Marketing,Engineering,Product',
        businessImpact: '$2M annual revenue loss, 68% cart abandonment rate',
        moduleSource: 'business-input',
        submittedBy: 'Sarah Chen (VP Product)',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
    });
    await this.updateRequirement(businessProblem.id, { status: 'under_review' });

    // Business Requirements (Module 3 - PRD Alignment)
    const req1 = await this.createRequirement({
      title: 'One-Click Checkout for Returning Customers',
      description: 'Enable saved payment methods and addresses for faster checkout, similar to Amazon. Must support Apple Pay and Google Pay.',
      priority: 'critical',
      
      tags: ['checkout', 'ux', 'conversion'],
      metadata: {
        alignment: 'aligned',
        alignedBy: 'Sales Team',
        alignedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        parentRequirement: businessProblem.id,
      },
    });

    const req2 = await this.createRequirement({
      title: 'Transparent Shipping Cost Calculator',
      description: 'Show real-time shipping costs before payment screen. Display estimated delivery dates and multiple shipping options upfront.',
      priority: 'high',
      
      tags: ['shipping', 'transparency', 'ux'],
      metadata: {
        alignment: 'aligned',
        alignedBy: 'Marketing Team',
        alignedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        parentRequirement: businessProblem.id,
      },
    });

    const req3 = await this.createRequirement({
      title: 'Security Trust Indicators',
      description: 'Add SSL badges, payment security logos, and money-back guarantee messaging at checkout to reduce security concerns.',
      priority: 'high',
      
      tags: ['security', 'trust', 'conversion'],
      metadata: {
        alignment: 'align-but',
        alignedBy: 'Engineering Team',
        concerns: 'Need to verify badge placement doesn\'t slow page load time',
        alignedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        parentRequirement: businessProblem.id,
      },
    });

    // Technical Requirements (Module 4 - Implementation)
    const req4 = await this.createRequirement({
      title: 'Payment Gateway API Integration',
      description: 'Integrate Stripe API with support for saved cards, Apple Pay, Google Pay. Must handle PCI compliance and tokenization.',
      priority: 'critical',
      
      tags: ['backend', 'payment', 'api'],
      metadata: {
        implementationStatus: 'in-progress',
        assignedTo: 'Backend Team',
        estimatedHours: 40,
      },
    });

    const req5 = await this.createRequirement({
      title: 'Real-time Shipping Rate API',
      description: 'Implement USPS, FedEx, and UPS API integration for real-time rate calculation based on cart weight and destination.',
      priority: 'high',
      
      tags: ['backend', 'shipping', 'api'],
      metadata: {
        implementationStatus: 'in-progress',
        assignedTo: 'Backend Team',
        estimatedHours: 24,
      },
    });

    const req6 = await this.createRequirement({
      title: 'Mobile-Optimized Checkout UI',
      description: 'Responsive checkout flow with large touch targets, auto-focus on inputs, and progress indicator. Must load under 2 seconds.',
      priority: 'critical',
      
      tags: ['frontend', 'mobile', 'performance'],
      metadata: {
        implementationStatus: 'pending',
        assignedTo: 'Frontend Team',
        estimatedHours: 32,
      },
    });

    const req7 = await this.createRequirement({
      title: 'Analytics Event Tracking',
      description: 'Track checkout funnel events: cart view, shipping info, payment info, completion. Monitor abandonment points.',
      priority: 'medium',
      
      tags: ['analytics', 'monitoring'],
      metadata: {
        implementationStatus: 'pending',
        assignedTo: 'Data Team',
        estimatedHours: 16,
      },
    });

    // Create traceability links showing the flow
    // Business Problem → Business Requirements
    const linkId1 = await generateUniqueId('LINK');
    await this.createLink({
      id: linkId1,
      sourceId: businessProblem.id,
      targetId: req1.id,
      linkType: 'related-to',
      isSuspect: false,
      createdBy: 'Sarah Chen',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const linkId2 = await generateUniqueId('LINK');
    await this.createLink({
      id: linkId2,
      sourceId: businessProblem.id,
      targetId: req2.id,
      linkType: 'related-to',
      isSuspect: false,
      createdBy: 'Sarah Chen',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const linkId3 = await generateUniqueId('LINK');
    await this.createLink({
      id: linkId3,
      sourceId: businessProblem.id,
      targetId: req3.id,
      linkType: 'related-to',
      isSuspect: false,
      createdBy: 'Sarah Chen',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    // Business Requirements → Technical Requirements
    const linkId4 = await generateUniqueId('LINK');
    await this.createLink({
      id: linkId4,
      sourceId: req1.id,
      targetId: req4.id,
      linkType: 'implements',
      isSuspect: false,
      createdBy: 'Tech Lead',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    });

    const linkId5 = await generateUniqueId('LINK');
    await this.createLink({
      id: linkId5,
      sourceId: req2.id,
      targetId: req5.id,
      linkType: 'implements',
      isSuspect: false,
      createdBy: 'Tech Lead',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    });

    const linkId6 = await generateUniqueId('LINK');
    await this.createLink({
      id: linkId6,
      sourceId: req1.id,
      targetId: req6.id,
      linkType: 'implements',
      isSuspect: false,
      createdBy: 'UX Designer',
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    });

    const linkId7 = await generateUniqueId('LINK');
    await this.createLink({
      id: linkId7,
      sourceId: req3.id,
      targetId: req6.id,
      linkType: 'implements',
      isSuspect: false,
      createdBy: 'UX Designer',
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    });

    const linkId8 = await generateUniqueId('LINK');
    await this.createLink({
      id: linkId8,
      sourceId: businessProblem.id,
      targetId: req7.id,
      linkType: 'related-to',
      isSuspect: false,
      createdBy: 'Data Analyst',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    });

    logger.info(`[SimpleMockService] Created ${this.requirements.size} requirements and ${this.links.size} links`);

    // ========================================
    // WORKFLOW DEMO DATA (BRD → PRD → Engineering → Conflict → Change Log)
    // ========================================

    // BRD (Approved)
    const brdId = await generateUniqueId('BRD');
    const brd: BRD = {
      id: brdId,
      title: 'E-commerce Cart Abandonment Crisis',
      problemStatement: '68% of mobile users abandon checkout at payment screen, resulting in $2M annual revenue loss. Peak abandonment occurs during payment information entry. Customer feedback indicates confusion about shipping costs and security concerns.',
      businessImpact: '$2M annual revenue loss, 68% cart abandonment rate, negative customer experience, competitive disadvantage',
      successCriteria: [
        'Reduce cart abandonment by 50% (68% → 34%)',
        'Increase mobile conversion rate by 30%',
        'Recover $1M in annual revenue within 6 months',
        'Achieve 90% customer satisfaction on checkout experience'
      ],
      timeline: {
        startDate: new Date('2025-10-01'),
        targetDate: new Date('2025-12-15')
      },
      budget: 500000,
      stakeholders: [
        { id: 'STK-001', name: 'Sarah Chen', email: 'sarah.chen@company.com', role: 'VP Product', department: 'product', isOwner: true },
        { id: 'STK-002', name: 'Mark Davis', email: 'mark.davis@company.com', role: 'Sales Director', department: 'sales', isOwner: false },
        { id: 'STK-003', name: 'Emily Brown', email: 'emily.brown@company.com', role: 'Marketing Lead', department: 'marketing', isOwner: false }
      ],
      status: 'approved',
      version: 1,
      approvals: [
        { stakeholderId: 'sarah.chen@company.com', decision: 'approved', comments: 'Critical for Q4 revenue', timestamp: new Date('2025-10-02') },
        { stakeholderId: 'mark.davis@company.com', decision: 'approved', comments: 'Aligns with sales goals', timestamp: new Date('2025-10-02') },
        { stakeholderId: 'emily.brown@company.com', decision: 'approved', timestamp: new Date('2025-10-03') }
      ],
      createdAt: new Date('2025-10-01'),
      updatedAt: new Date('2025-10-03'),
      createdBy: 'sarah.chen@company.com'
    };
    this.brds.set(brdId, brd);

    // PRD (Aligned)
    const prdId = await generateUniqueId('PRD');
    const prd: PRD = {
      id: prdId,
      brdId: brdId,
      title: 'Mobile Checkout Optimization - Phase 1',
      features: [
        {
          id: 'FEAT-001',
          title: 'One-Click Checkout',
          description: 'Enable saved payment methods and addresses for returning customers. Support Apple Pay and Google Pay.',
          priority: 'critical',
          acceptanceCriteria: [
            'Returning users see saved payment methods',
            'Apple Pay integration functional on iOS',
            'Google Pay integration functional on Android',
            'PCI compliance maintained'
          ]
        },
        {
          id: 'FEAT-002',
          title: 'Real-time Shipping Calculator',
          description: 'Display shipping costs and delivery estimates before payment screen.',
          priority: 'high',
          acceptanceCriteria: [
            'Shipping costs displayed on cart page',
            'Updates dynamically as user enters address',
            'Shows delivery date estimates',
            'Supports multiple shipping options'
          ]
        },
        {
          id: 'FEAT-003',
          title: 'Security Trust Indicators',
          description: 'Show SSL badges, payment security logos, and money-back guarantee prominently.',
          priority: 'medium',
          acceptanceCriteria: [
            'SSL badge visible on checkout pages',
            'Payment provider logos displayed',
            'Money-back guarantee clearly stated',
            'Security messaging increases trust score'
          ]
        }
      ],
      userStories: [
        {
          id: 'US-001',
          featureId: 'FEAT-001',
          asA: 'returning customer',
          iWant: 'to checkout with one click using my saved payment method',
          soThat: 'I can complete my purchase quickly without re-entering information',
          acceptanceCriteria: ['Payment info auto-filled', 'Single click completes checkout']
        },
        {
          id: 'US-002',
          featureId: 'FEAT-002',
          asA: 'mobile user',
          iWant: 'to see shipping costs before entering payment details',
          soThat: 'I can decide if I want to proceed with the purchase',
          acceptanceCriteria: ['Costs visible on cart page', 'No surprises at checkout']
        }
      ],
      technicalRequirements: [
        'Payment gateway API integration (Stripe)',
        'Shipping API integration (USPS, FedEx, UPS)',
        'Mobile-responsive UI components',
        'Analytics tracking for conversion funnel'
      ],
      dependencies: ['Payment gateway approval', 'Shipping API contracts'],
      status: 'aligned',
      version: 1,
      alignments: [
        { stakeholderId: 'sarah.chen@company.com', status: 'aligned', timestamp: new Date('2025-10-05') },
        { stakeholderId: 'john.chen@company.com', status: 'aligned', timestamp: new Date('2025-10-06') },
        { stakeholderId: 'alex.kumar@company.com', status: 'align_but', concerns: 'Shipping API may add timeline risk', timestamp: new Date('2025-10-06') }
      ],
      createdAt: new Date('2025-10-04'),
      updatedAt: new Date('2025-10-06'),
      createdBy: 'john.chen@company.com'
    };
    this.prds.set(prdId, prd);

    // Engineering Designs (Frontend + Backend)
    const frontendDesignId = await generateUniqueId('DESIGN');
    const frontendDesign: EngineeringDesign = {
      id: frontendDesignId,
      prdId: prdId,
      team: 'frontend',
      approach: 'React components with Redux state management. Mobile-first responsive design using Tailwind CSS.',
      architecture: 'Component library: PaymentForm, ShippingCalculator, TrustBadges. State management via Redux Toolkit.',
      estimates: [
        { featureId: 'FEAT-001', featureTitle: 'One-Click Checkout', hours: 60, engineers: 2 },
        { featureId: 'FEAT-002', featureTitle: 'Shipping Calculator', hours: 80, engineers: 2 },
        { featureId: 'FEAT-003', featureTitle: 'Trust Indicators', hours: 20, engineers: 1 }
      ],
      risks: [
        { id: 'RISK-001', description: 'Apple Pay requires iOS device testing', severity: 'medium', mitigation: 'Use TestFlight for QA' },
        { id: 'RISK-002', description: 'Shipping API rate limits may impact UX', severity: 'high', mitigation: 'Implement caching layer' }
      ],
      dependencies: ['Backend payment API', 'Backend shipping API'],
      conflicts: [
        {
          id: 'CONF-001',
          type: 'timeline',
          description: 'Shipping calculator real-time API requires 2 additional weeks',
          impact: 'Pushes Phase 1 delivery from Dec 15 to Dec 29',
          alternatives: ['Use static shipping estimates for Phase 1', 'Add 2 more engineers', 'Push to Phase 2']
        }
      ],
      status: 'under_review',
      createdAt: new Date('2025-10-07'),
      updatedAt: new Date('2025-10-07'),
      createdBy: 'alex.kumar@company.com'
    };
    this.engineeringDesigns.set(frontendDesignId, frontendDesign);

    const backendDesignId = await generateUniqueId('DESIGN');
    const backendDesign: EngineeringDesign = {
      id: backendDesignId,
      prdId: prdId,
      team: 'backend',
      approach: 'Node.js microservices with REST APIs. Stripe SDK for payments, third-party shipping APIs.',
      architecture: 'Services: PaymentService, ShippingService, AnalyticsService. PostgreSQL for persistence.',
      estimates: [
        { featureId: 'FEAT-001', featureTitle: 'Payment API', hours: 100, engineers: 3 },
        { featureId: 'FEAT-002', featureTitle: 'Shipping API', hours: 60, engineers: 2 },
        { featureId: 'FEAT-003', featureTitle: 'Analytics', hours: 30, engineers: 1 }
      ],
      risks: [
        { id: 'RISK-003', description: 'PCI compliance review required', severity: 'critical', mitigation: 'Start compliance audit immediately' },
        { id: 'RISK-004', description: 'Stripe API rate limits', severity: 'low', mitigation: 'Use exponential backoff' }
      ],
      dependencies: ['PCI compliance approval', 'Shipping API contracts'],
      conflicts: [],
      status: 'approved',
      createdAt: new Date('2025-10-07'),
      updatedAt: new Date('2025-10-08'),
      createdBy: 'jordan.lee@company.com'
    };
    this.engineeringDesigns.set(backendDesignId, backendDesign);

    // Conflict (Resolved)
    const conflictId = await generateUniqueId('CONFLICT');
    const conflict: Conflict = {
      id: conflictId,
      type: 'timeline',
      title: 'Shipping Calculator Timeline Conflict',
      description: 'Engineering estimates that real-time shipping calculator will add 2 weeks to Phase 1 timeline, pushing delivery from Dec 15 to Dec 29, which conflicts with Q4 revenue goals.',
      severity: 'high',
      raisedBy: 'alex.kumar@company.com',
      raisedByRole: 'engineering',
      affectedDocuments: { brdId: brdId, prdId: prdId, designId: frontendDesignId },
      affectedItems: ['FEAT-002'],
      discussion: [
        {
          id: 'DISC-001',
          userId: 'sarah.chen@company.com',
          userName: 'Sarah Chen',
          userRole: 'business',
          comment: 'Q4 deadline is critical for trade show demo. Can we simplify?',
          timestamp: new Date('2025-10-08T10:00:00')
        },
        {
          id: 'DISC-002',
          userId: 'john.chen@company.com',
          userName: 'John Chen',
          userRole: 'product',
          comment: 'Shipping calculator is #1 requested feature. Maybe static estimates for Phase 1?',
          timestamp: new Date('2025-10-08T11:00:00')
        },
        {
          id: 'DISC-003',
          userId: 'alex.kumar@company.com',
          userName: 'Alex Kumar',
          userRole: 'engineering',
          comment: 'Static estimates would take only 1 week. Real-time API can be Phase 2.',
          timestamp: new Date('2025-10-08T14:00:00')
        }
      ],
      options: [
        {
          id: 'OPT-001',
          description: 'Simplify to static shipping estimates for Phase 1',
          impact: 'Meets Dec 15 deadline, reduces functionality slightly',
          pros: ['On time delivery', 'Lower complexity', 'Easier testing'],
          cons: ['Less accurate estimates', 'Users may see surprises'],
          votes: [
            { userId: 'sarah.chen@company.com', userName: 'Sarah Chen', userRole: 'business', timestamp: new Date('2025-10-08T15:00:00') },
            { userId: 'john.chen@company.com', userName: 'John Chen', userRole: 'product', timestamp: new Date('2025-10-08T15:30:00') },
            { userId: 'alex.kumar@company.com', userName: 'Alex Kumar', userRole: 'engineering', timestamp: new Date('2025-10-08T16:00:00') }
          ]
        },
        {
          id: 'OPT-002',
          description: 'Add 2 more engineers to meet timeline',
          impact: 'Budget increase of $50k',
          pros: ['Full functionality', 'Meets deadline'],
          cons: ['Over budget', 'Onboarding time'],
          votes: []
        }
      ],
      resolution: {
        selectedOptionId: 'OPT-001',
        decision: 'Implement static shipping estimates for Phase 1. Real-time shipping API moved to Phase 2.',
        approvedBy: [
          { stakeholderId: 'sarah.chen@company.com', decision: 'approved', comments: 'Good compromise', timestamp: new Date('2025-10-08T17:00:00') },
          { stakeholderId: 'john.chen@company.com', decision: 'approved', timestamp: new Date('2025-10-08T17:15:00') },
          { stakeholderId: 'alex.kumar@company.com', decision: 'approved', timestamp: new Date('2025-10-08T17:30:00') }
        ],
        documentsUpdated: [
          {
            documentType: 'PRD',
            documentId: prdId,
            changes: 'Updated FEAT-002: Simplified to static shipping estimates for Phase 1',
            version: 2
          },
          {
            documentType: 'EngineeringDesign',
            documentId: frontendDesignId,
            changes: 'Reduced FEAT-002 estimate from 80 to 30 hours',
            version: 2
          }
        ],
        implementedAt: new Date('2025-10-08T18:00:00')
      },
      status: 'resolved',
      createdAt: new Date('2025-10-08T09:00:00'),
      updatedAt: new Date('2025-10-08T18:00:00')
    };
    this.conflicts.set(conflictId, conflict);

    // Change Log Entry
    const changeLogId = await generateUniqueId('CHANGE');
    const changeLogEntry: ChangeLogEntry = {
      id: changeLogId,
      projectId: brdId,
      item: 'Real-time Shipping Calculator',
      change: 'Simplified to static shipping estimates for Phase 1',
      reason: 'Timeline conflict - Real-time API would delay Phase 1 by 2 weeks, missing Q4 trade show deadline',
      impact: 'Phase 1 ships on time (Dec 15). Real-time shipping API moved to Phase 2 (Q1 2026).',
      category: 'scope',
      phase: 'pushed_to_phase_2',
      approvedBy: [
        { stakeholderId: 'sarah.chen@company.com', decision: 'approved', comments: 'Critical for trade show', timestamp: new Date('2025-10-08T17:00:00') },
        { stakeholderId: 'john.chen@company.com', decision: 'approved', timestamp: new Date('2025-10-08T17:15:00') },
        { stakeholderId: 'alex.kumar@company.com', decision: 'approved', timestamp: new Date('2025-10-08T17:30:00') }
      ],
      relatedConflictId: conflictId,
      documentsBefore: [
        {
          documentType: 'PRD',
          documentId: prdId,
          version: 1,
          snapshot: { features: prd.features }
        }
      ],
      documentsAfter: [
        {
          documentType: 'PRD',
          documentId: prdId,
          version: 2,
          snapshot: { features: prd.features }
        }
      ],
      timestamp: new Date('2025-10-08T18:00:00'),
      createdBy: 'system'
    };
    this.changeLog.set(changeLogId, changeLogEntry);

    logger.info(`[SimpleMockService] Workflow demo data created: ${this.brds.size} BRDs, ${this.prds.size} PRDs, ${this.engineeringDesigns.size} designs, ${this.conflicts.size} conflicts, ${this.changeLog.size} change log entries`);

    // ========================================
    // PROJECT HISTORY DEMO DATA
    // ========================================

    // Project 1: E-commerce Cart Abandonment (linked to existing BRD/PRD)
    const proj1Id = await generateUniqueId('PROJ');
    const project1: Project = {
      id: proj1Id,
      title: 'E-commerce Cart Abandonment Crisis',
      description: 'Reduce 68% cart abandonment rate on mobile checkout to recover $2M annual revenue',
      scope: 'optimization',
      status: 'implementation',
      brdId: brdId,
      prdId: prdId,
      designIds: [frontendDesignId, backendDesignId],
      conflictIds: [conflictId],
      changeLogIds: [changeLogId],
      businessImpact: '$2M annual revenue loss, 68% cart abandonment rate, negative customer experience',
      budget: 500000,
      timeline: {
        startDate: new Date('2025-10-01'),
        targetDate: new Date('2025-12-15'),
      },
      stakeholders: brd.stakeholders,
      createdAt: new Date('2025-10-01'),
      updatedAt: new Date('2025-10-08'),
      createdBy: 'sarah.chen@company.com',
      tags: ['revenue', 'mobile', 'checkout', 'ux', 'conversion'],
    };
    this.projects.set(proj1Id, project1);

    // Project 2: Mobile Push Notifications (completed)
    const proj2Id = await generateUniqueId('PROJ');
    const project2: Project = {
      id: proj2Id,
      title: 'Mobile Push Notifications',
      description: 'Implement real-time push notifications for iOS and Android apps to increase user engagement',
      scope: 'feature',
      status: 'completed',
      designIds: [],
      conflictIds: [],
      changeLogIds: [],
      businessImpact: 'Increase user engagement by 40%, reduce churn by 15%',
      budget: 250000,
      timeline: {
        startDate: new Date('2025-07-01'),
        targetDate: new Date('2025-09-30'),
        actualCompletionDate: new Date('2025-09-28'),
      },
      stakeholders: [
        { id: 'STK-101', name: 'Lisa Wang', email: 'lisa.wang@company.com', role: 'Product Manager', department: 'product', isOwner: true },
        { id: 'STK-102', name: 'Tom Martinez', email: 'tom.martinez@company.com', role: 'Mobile Lead', department: 'engineering', isOwner: false },
      ],
      createdAt: new Date('2025-07-01'),
      updatedAt: new Date('2025-09-28'),
      completedAt: new Date('2025-09-28'),
      createdBy: 'lisa.wang@company.com',
      tags: ['mobile', 'notifications', 'engagement', 'retention'],
    };
    this.projects.set(proj2Id, project2);

    // Project 3: Stripe Payment Integration (completed)
    const proj3Id = await generateUniqueId('PROJ');
    const project3: Project = {
      id: proj3Id,
      title: 'Stripe Payment Gateway Integration',
      description: 'Replace legacy payment processor with Stripe for better conversion and lower fees',
      scope: 'integration',
      status: 'completed',
      designIds: [],
      conflictIds: [],
      changeLogIds: [],
      businessImpact: 'Save $500K annually in processing fees, improve checkout success rate by 25%',
      budget: 150000,
      timeline: {
        startDate: new Date('2025-05-01'),
        targetDate: new Date('2025-07-31'),
        actualCompletionDate: new Date('2025-07-15'),
      },
      stakeholders: [
        { id: 'STK-201', name: 'David Kim', email: 'david.kim@company.com', role: 'Engineering Manager', department: 'engineering', isOwner: true },
        { id: 'STK-202', name: 'Rachel Green', email: 'rachel.green@company.com', role: 'Finance Director', department: 'business', isOwner: false },
      ],
      createdAt: new Date('2025-05-01'),
      updatedAt: new Date('2025-07-15'),
      completedAt: new Date('2025-07-15'),
      createdBy: 'david.kim@company.com',
      tags: ['payment', 'stripe', 'integration', 'revenue'],
    };
    this.projects.set(proj3Id, project3);

    // Project 4: Database Performance Tuning (archived)
    const proj4Id = await generateUniqueId('PROJ');
    const project4: Project = {
      id: proj4Id,
      title: 'Database Performance Optimization',
      description: 'Optimize slow database queries and add caching layer to improve API response times',
      scope: 'optimization',
      status: 'archived',
      designIds: [],
      conflictIds: [],
      changeLogIds: [],
      businessImpact: 'Reduce API response time from 2s to 200ms, improve user experience',
      budget: 80000,
      timeline: {
        startDate: new Date('2025-03-01'),
        targetDate: new Date('2025-04-30'),
      },
      stakeholders: [
        { id: 'STK-301', name: 'Mike Johnson', email: 'mike.johnson@company.com', role: 'Backend Lead', department: 'engineering', isOwner: true },
      ],
      createdAt: new Date('2025-03-01'),
      updatedAt: new Date('2025-04-15'),
      createdBy: 'mike.johnson@company.com',
      tags: ['performance', 'database', 'backend', 'caching'],
    };
    this.projects.set(proj4Id, project4);

    // Project 5: Admin Dashboard v2 (design phase)
    const proj5Id = await generateUniqueId('PROJ');
    const project5: Project = {
      id: proj5Id,
      title: 'Admin Dashboard v2 Redesign',
      description: 'Complete redesign of admin dashboard with modern UI, real-time analytics, and improved UX',
      scope: 'feature',
      status: 'design',
      designIds: [],
      conflictIds: [],
      changeLogIds: [],
      businessImpact: 'Improve admin productivity by 50%, reduce training time for new admins',
      budget: 300000,
      timeline: {
        startDate: new Date('2025-11-01'),
        targetDate: new Date('2026-02-28'),
      },
      stakeholders: [
        { id: 'STK-401', name: 'Anna Schmidt', email: 'anna.schmidt@company.com', role: 'Product Designer', department: 'product', isOwner: true },
        { id: 'STK-402', name: 'Chris Taylor', email: 'chris.taylor@company.com', role: 'Frontend Architect', department: 'engineering', isOwner: false },
      ],
      createdAt: new Date('2025-11-01'),
      updatedAt: new Date('2025-11-05'),
      createdBy: 'anna.schmidt@company.com',
      tags: ['admin', 'dashboard', 'ui', 'analytics', 'redesign'],
    };
    this.projects.set(proj5Id, project5);

    // Project 6: OAuth SSO Integration (PRD alignment)
    const proj6Id = await generateUniqueId('PROJ');
    const project6: Project = {
      id: proj6Id,
      title: 'OAuth SSO Integration',
      description: 'Implement Single Sign-On with Google, Microsoft, and Okta for enterprise customers',
      scope: 'integration',
      status: 'prd_alignment',
      designIds: [],
      conflictIds: [],
      changeLogIds: [],
      businessImpact: 'Enable enterprise sales, reduce support tickets by 30%, improve security',
      budget: 200000,
      timeline: {
        startDate: new Date('2025-11-15'),
        targetDate: new Date('2026-01-31'),
      },
      stakeholders: [
        { id: 'STK-501', name: 'James Wilson', email: 'james.wilson@company.com', role: 'Security Engineer', department: 'engineering', isOwner: true },
        { id: 'STK-502', name: 'Patricia Lee', email: 'patricia.lee@company.com', role: 'Enterprise Sales', department: 'sales', isOwner: false },
      ],
      createdAt: new Date('2025-11-15'),
      updatedAt: new Date('2025-11-18'),
      createdBy: 'james.wilson@company.com',
      tags: ['auth', 'sso', 'oauth', 'enterprise', 'security'],
    };
    this.projects.set(proj6Id, project6);

    // Project 7: Code Refactoring Sprint (draft)
    const proj7Id = await generateUniqueId('PROJ');
    const project7: Project = {
      id: proj7Id,
      title: 'Technical Debt Reduction Sprint',
      description: 'Refactor legacy codebase, update dependencies, improve test coverage from 40% to 80%',
      scope: 'maintenance',
      status: 'draft',
      designIds: [],
      conflictIds: [],
      changeLogIds: [],
      businessImpact: 'Reduce bugs by 50%, improve developer velocity by 30%, easier onboarding',
      budget: 120000,
      timeline: {
        startDate: new Date('2026-01-01'),
        targetDate: new Date('2026-03-31'),
      },
      stakeholders: [
        { id: 'STK-601', name: 'Kevin Brown', email: 'kevin.brown@company.com', role: 'Tech Lead', department: 'engineering', isOwner: true },
      ],
      createdAt: new Date('2025-11-20'),
      updatedAt: new Date('2025-11-20'),
      createdBy: 'kevin.brown@company.com',
      tags: ['refactoring', 'technical-debt', 'testing', 'quality'],
    };
    this.projects.set(proj7Id, project7);

    // Project 8: AI Recommendation Engine (research)
    const proj8Id = await generateUniqueId('PROJ');
    const project8: Project = {
      id: proj8Id,
      title: 'AI-Powered Product Recommendations',
      description: 'Research and prototype ML-based recommendation engine to increase cross-sell and upsell',
      scope: 'research',
      status: 'draft',
      designIds: [],
      conflictIds: [],
      changeLogIds: [],
      businessImpact: 'Potential 20% increase in average order value, improve personalization',
      budget: 180000,
      timeline: {
        startDate: new Date('2026-02-01'),
        targetDate: new Date('2026-05-31'),
      },
      stakeholders: [
        { id: 'STK-701', name: 'Dr. Susan Park', email: 'susan.park@company.com', role: 'ML Engineer', department: 'engineering', isOwner: true },
        { id: 'STK-702', name: 'Robert Chen', email: 'robert.chen@company.com', role: 'Data Scientist', department: 'product', isOwner: false },
      ],
      createdAt: new Date('2025-11-25'),
      updatedAt: new Date('2025-11-25'),
      createdBy: 'susan.park@company.com',
      tags: ['ai', 'ml', 'recommendations', 'research', 'personalization'],
    };
    this.projects.set(proj8Id, project8);

    logger.info(`[SimpleMockService] Created ${this.projects.size} demo projects`);
  }

  // ========================================
  // WORKFLOW DATA ACCESS METHODS
  // ========================================

  async getBRDs(): Promise<BRD[]> {
    return Array.from(this.brds.values());
  }

  async getAllBRDs(): Promise<BRD[]> {
    return Array.from(this.brds.values());
  }

  async getBRDById(id: string): Promise<BRD | null> {
    return this.brds.get(id) || null;
  }

  async getPRDs(): Promise<PRD[]> {
    return Array.from(this.prds.values());
  }

  async getAllPRDs(): Promise<PRD[]> {
    return Array.from(this.prds.values());
  }

  async getPRDById(id: string): Promise<PRD | null> {
    return this.prds.get(id) || null;
  }

  async getEngineeringDesigns(): Promise<EngineeringDesign[]> {
    return Array.from(this.engineeringDesigns.values());
  }

  async getAllDesigns(): Promise<EngineeringDesign[]> {
    return Array.from(this.engineeringDesigns.values());
  }

  async getEngineeringDesignById(id: string): Promise<EngineeringDesign | null> {
    return this.engineeringDesigns.get(id) || null;
  }

  async getDesignById(id: string): Promise<EngineeringDesign | null> {
    return this.engineeringDesigns.get(id) || null;
  }

  async getConflicts(): Promise<Conflict[]> {
    return Array.from(this.conflicts.values());
  }

  async getAllConflicts(): Promise<Conflict[]> {
    return Array.from(this.conflicts.values());
  }

  async getConflictById(id: string): Promise<Conflict | null> {
    return this.conflicts.get(id) || null;
  }

  async getChangeLog(): Promise<ChangeLogEntry[]> {
    return Array.from(this.changeLog.values());
  }

  async getAllChangeLogs(): Promise<ChangeLogEntry[]> {
    return Array.from(this.changeLog.values());
  }

  async getChangeLogById(id: string): Promise<ChangeLogEntry | null> {
    return this.changeLog.get(id) || null;
  }

  // ========================================
  // PROJECT MANAGEMENT METHODS
  // ========================================

  async createProject(data: CreateProjectRequest, createdBy: string): Promise<Project> {
    const id = await generateUniqueId('PROJ');

    const project: Project = {
      id,
      title: data.title,
      description: data.description,
      scope: data.scope,
      status: 'draft',
      designIds: [],
      conflictIds: [],
      changeLogIds: [],
      businessImpact: data.businessImpact,
      budget: data.budget,
      timeline: {
        startDate: new Date(data.timeline.startDate),
        targetDate: new Date(data.timeline.targetDate),
      },
      stakeholders: data.stakeholders.map((s, i) => ({
        id: `STK-${Date.now()}-${i}`,
        ...s,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      previousVersionId: data.previousVersionId,
      tags: data.tags || [],
    };

    this.projects.set(id, project);
    return project;
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project | null> {
    const existing = this.projects.get(id);
    if (!existing) return null;

    const updated: Project = {
      ...existing,
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.scope && { scope: data.scope }),
      ...(data.status && { status: data.status }),
      ...(data.businessImpact && { businessImpact: data.businessImpact }),
      ...(data.budget !== undefined && { budget: data.budget }),
      ...(data.timeline && {
        timeline: {
          startDate: new Date(data.timeline.startDate),
          targetDate: new Date(data.timeline.targetDate),
          actualCompletionDate: existing.timeline.actualCompletionDate,
        },
      }),
      ...(data.stakeholders && {
        stakeholders: data.stakeholders.map((s, i) => ({
          id: `STK-${Date.now()}-${i}`,
          ...s,
        })),
      }),
      ...(data.tags && { tags: data.tags }),
      ...(data.brdId && { brdId: data.brdId }),
      ...(data.prdId && { prdId: data.prdId }),
      updatedAt: new Date(),
      ...(data.status === 'completed' && !existing.completedAt && { completedAt: new Date() }),
    };

    this.projects.set(id, updated);
    return updated;
  }
}

// Create singleton and initialize with demo data immediately
const mockServiceInstance = new SimpleMockService();

// Initialize demo data synchronously (don't await, just fire and forget with logging)
(async () => {
  try {
    await mockServiceInstance.initializeDemoData();
    logger.info('[SimpleMockService] Demo data initialization complete');
  } catch (err) {
    logger.error({ err }, '[SimpleMockService] Failed to initialize demo data');
  }
})();

export const simpleMockService = mockServiceInstance;
export default SimpleMockService;