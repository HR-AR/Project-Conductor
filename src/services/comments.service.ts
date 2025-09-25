/**
 * Comments Service - Business logic for comment operations
 */

import { generateUniqueId } from '../utils/id-generator';
import {
  BaseComment,
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentFilters,
  CommentThread,
  CommentSummary,
  CommentEventData,
  COMMENT_EVENTS,
} from '../models/comment.model';

export class CommentsService {
  private commentsStorage: Map<string, BaseComment> = new Map();
  private websocketService?: any; // WebSocket service for real-time updates

  constructor(websocketService?: any) {
    this.websocketService = websocketService;
  }

  /**
   * Create a new comment
   */
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

    this.commentsStorage.set(commentId, comment);

    // Convert to Comment with additional fields
    const enrichedComment = await this.enrichComment(comment);

    // Emit real-time event
    if (this.websocketService) {
      const eventData: CommentEventData = {
        requirementId,
        comment: enrichedComment,
        action: 'created',
        userId,
      };
      this.websocketService.broadcastToRequirement(requirementId, COMMENT_EVENTS.CREATED, eventData);
    }

    return enrichedComment;
  }

  /**
   * Get comments for a requirement
   */
  async getCommentsByRequirement(
    requirementId: string,
    filters: CommentFilters = {}
  ): Promise<Comment[]> {
    const allComments = Array.from(this.commentsStorage.values())
      .filter(comment => comment.requirementId === requirementId);

    let filteredComments = this.applyFilters(allComments, filters);

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

  /**
   * Get a comment thread (parent + all replies)
   */
  async getCommentThread(commentId: string): Promise<CommentThread | null> {
    const rootComment = this.commentsStorage.get(commentId);
    if (!rootComment || rootComment.isDeleted) {
      return null;
    }

    // If this is a reply, find the root comment
    let actualRoot = rootComment;
    if (rootComment.parentCommentId) {
      const parentComment = this.commentsStorage.get(rootComment.parentCommentId);
      if (parentComment && !parentComment.isDeleted) {
        actualRoot = parentComment;
      }
    }

    // Get all replies to the root comment
    const replies = Array.from(this.commentsStorage.values())
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

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    userId: string,
    data: UpdateCommentRequest
  ): Promise<Comment | null> {
    const existingComment = this.commentsStorage.get(commentId);
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

    this.commentsStorage.set(commentId, updatedComment);

    const enrichedComment = await this.enrichComment(updatedComment);

    // Emit real-time event
    if (this.websocketService) {
      const eventData: CommentEventData = {
        requirementId: enrichedComment.requirementId,
        comment: enrichedComment,
        action: 'updated',
        userId,
      };
      this.websocketService.broadcastToRequirement(enrichedComment.requirementId, COMMENT_EVENTS.UPDATED, eventData);
    }

    return enrichedComment;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const existingComment = this.commentsStorage.get(commentId);
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

    this.commentsStorage.set(commentId, deletedComment);

    // Create enriched comment for event
    const enrichedComment = await this.enrichComment(deletedComment);

    // Emit real-time event
    if (this.websocketService) {
      const eventData: CommentEventData = {
        requirementId: enrichedComment.requirementId,
        comment: enrichedComment,
        action: 'deleted',
        userId,
      };
      this.websocketService.broadcastToRequirement(enrichedComment.requirementId, COMMENT_EVENTS.DELETED, eventData);
    }

    return true;
  }

  /**
   * Get comment by ID
   */
  async getCommentById(commentId: string): Promise<Comment | null> {
    const comment = this.commentsStorage.get(commentId);
    if (!comment || comment.isDeleted) {
      return null;
    }

    return this.enrichComment(comment);
  }

  /**
   * Get comments summary for a requirement
   */
  async getCommentsSummary(requirementId: string): Promise<CommentSummary> {
    const requirementComments = Array.from(this.commentsStorage.values())
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
    const replyCount = Array.from(this.commentsStorage.values())
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
  private applyFilters(comments: BaseComment[], filters: CommentFilters): BaseComment[] {
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
}

export default CommentsService;