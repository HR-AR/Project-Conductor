/**
 * Comments Controller - Request handlers for comments API
 */

import { Request, Response } from 'express';
import { CommentsService } from '../services/comments.service';
import {
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentFilters,
} from '../models/comment.model';
import { asyncHandler, NotFoundError, BadRequestError, UnauthorizedError } from '../middleware/error-handler';
import logger from '../utils/logger';

export class CommentsController {
  private commentsService: CommentsService;

  constructor(websocketService?: any) {
    this.commentsService = new CommentsService(websocketService);
    logger.info('Comments Controller initialized with PostgreSQL');
  }

  /**
   * Create a new comment on a requirement
   * POST /api/v1/requirements/:id/comments
   */
  createComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: requirementId } = req.params;
      if (!requirementId) {
        throw new BadRequestError('Requirement ID is required');
      }

      const data: CreateCommentRequest = req.body;
      const userId = (req.headers['x-user-id'] as string) || 'system'; // In real app, get from auth middleware

      // Validate required fields
      if (!data.content || data.content.trim().length === 0) {
        throw new BadRequestError('Comment content is required');
      }

      if (data.content.trim().length > 2000) {
        throw new BadRequestError('Comment content cannot exceed 2000 characters');
      }

      // Validate parent comment exists if this is a reply
      if (data.parentCommentId) {
        const parentComment = await this.commentsService.getCommentById(data.parentCommentId);
        if (!parentComment) {
          throw new BadRequestError('Parent comment not found');
        }
        if (parentComment.requirementId !== requirementId) {
          throw new BadRequestError('Parent comment does not belong to this requirement');
        }
      }

      const comment = await this.commentsService.createComment(requirementId, userId, data);

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment created successfully',
      });
    }
  );

  /**
   * Get all comments for a requirement
   * GET /api/v1/requirements/:id/comments
   */
  getCommentsByRequirement = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: requirementId } = req.params;
      if (!requirementId) {
        throw new BadRequestError('Requirement ID is required');
      }

      // Parse filter parameters
      const filters: CommentFilters = {
        requirementId: requirementId,
        parentCommentId: req.query['parentCommentId'] as string | undefined,
        isRootOnly: req.query['isRootOnly'] === 'true',
        includeDeleted: req.query['includeDeleted'] === 'true',
        search: req.query['search'] as string | undefined,
        userId: req.query['userId'] as string | undefined,
      };

      const comments = await this.commentsService.getCommentsByRequirement(requirementId, filters);

      res.json({
        success: true,
        data: comments,
        message: 'Comments retrieved successfully',
      });
    }
  );

  /**
   * Get a comment thread (parent + all replies)
   * GET /api/v1/comments/:id/thread
   */
  getCommentThread = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: commentId } = req.params;
      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }

      const thread = await this.commentsService.getCommentThread(commentId);
      if (!thread) {
        throw new NotFoundError('Comment thread not found');
      }

      res.json({
        success: true,
        data: thread,
        message: 'Comment thread retrieved successfully',
      });
    }
  );

  /**
   * Update a comment
   * PUT /api/v1/comments/:id
   */
  updateComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: commentId } = req.params;
      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }

      const data: UpdateCommentRequest = req.body;
      const userId = (req.headers['x-user-id'] as string) || 'system'; // In real app, get from auth middleware

      // Validate required fields
      if (!data.content || data.content.trim().length === 0) {
        throw new BadRequestError('Comment content is required');
      }

      if (data.content.trim().length > 2000) {
        throw new BadRequestError('Comment content cannot exceed 2000 characters');
      }

      try {
        const comment = await this.commentsService.updateComment(commentId, userId, data);
        if (!comment) {
          throw new NotFoundError('Comment not found');
        }

        res.json({
          success: true,
          data: comment,
          message: 'Comment updated successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          throw new UnauthorizedError('You can only edit your own comments');
        }
        throw error;
      }
    }
  );

  /**
   * Delete a comment
   * DELETE /api/v1/comments/:id
   */
  deleteComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: commentId } = req.params;
      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }

      const userId = (req.headers['x-user-id'] as string) || 'system'; // In real app, get from auth middleware

      try {
        const success = await this.commentsService.deleteComment(commentId, userId);
        if (!success) {
          throw new NotFoundError('Comment not found or already deleted');
        }

        res.json({
          success: true,
          message: 'Comment deleted successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          throw new UnauthorizedError('You can only delete your own comments');
        }
        throw error;
      }
    }
  );

  /**
   * Get a single comment by ID
   * GET /api/v1/comments/:id
   */
  getCommentById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: commentId } = req.params;
      if (!commentId) {
        throw new BadRequestError('Comment ID is required');
      }

      const comment = await this.commentsService.getCommentById(commentId);
      if (!comment) {
        throw new NotFoundError('Comment not found');
      }

      res.json({
        success: true,
        data: comment,
        message: 'Comment retrieved successfully',
      });
    }
  );

  /**
   * Get comments summary for a requirement
   * GET /api/v1/requirements/:id/comments/summary
   */
  getCommentsSummary = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: requirementId } = req.params;
      if (!requirementId) {
        throw new BadRequestError('Requirement ID is required');
      }

      const summary = await this.commentsService.getCommentsSummary(requirementId);

      res.json({
        success: true,
        data: summary,
        message: 'Comments summary retrieved successfully',
      });
    }
  );
}

export default CommentsController;