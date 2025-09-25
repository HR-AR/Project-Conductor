/**
 * Comments Routes - Express routes for comments API
 */

import { Router } from 'express';
import { CommentsController } from '../controllers/comments.controller';
import {
  validateCreateComment,
  validateUpdateComment,
  validateGetComments,
  validateGetCommentById,
  validateDeleteComment,
} from '../middleware/validation';
import { createRateLimit } from '../middleware/error-handler';

export function createCommentsRoutes(websocketService?: any): Router {
  const router = Router();
  const commentsController = new CommentsController(websocketService);

  // Apply rate limiting to all routes (100 requests per 15 minutes)
  const defaultRateLimit = createRateLimit();
  router.use(defaultRateLimit);

  // Apply stricter rate limiting to write operations (30 requests per 15 minutes)
  const writeRateLimit = createRateLimit(15 * 60 * 1000, 30);

  // ========================================
  // COMMENTS FOR REQUIREMENTS
  // ========================================

  /**
   * @route   POST /api/v1/requirements/:id/comments
   * @desc    Create a new comment on a requirement
   * @access  Public (in real app, would be protected)
   */
  router.post(
    '/requirements/:id/comments',
    writeRateLimit,
    validateCreateComment,
    commentsController.createComment
  );

  /**
   * @route   GET /api/v1/requirements/:id/comments
   * @desc    Get all comments for a requirement
   * @access  Public (in real app, would be protected)
   */
  router.get(
    '/requirements/:id/comments',
    validateGetComments,
    commentsController.getCommentsByRequirement
  );

  /**
   * @route   GET /api/v1/requirements/:id/comments/summary
   * @desc    Get comments summary for a requirement
   * @access  Public (in real app, would be protected)
   */
  router.get(
    '/requirements/:id/comments/summary',
    commentsController.getCommentsSummary
  );

  // ========================================
  // INDIVIDUAL COMMENTS
  // ========================================

  /**
   * @route   GET /api/v1/comments/:id
   * @desc    Get a single comment by ID
   * @access  Public (in real app, would be protected)
   */
  router.get(
    '/comments/:id',
    validateGetCommentById,
    commentsController.getCommentById
  );

  /**
   * @route   PUT /api/v1/comments/:id
   * @desc    Update a comment
   * @access  Public (in real app, would be protected)
   */
  router.put(
    '/comments/:id',
    writeRateLimit,
    validateUpdateComment,
    commentsController.updateComment
  );

  /**
   * @route   DELETE /api/v1/comments/:id
   * @desc    Delete a comment
   * @access  Public (in real app, would be protected)
   */
  router.delete(
    '/comments/:id',
    writeRateLimit,
    validateDeleteComment,
    commentsController.deleteComment
  );

  /**
   * @route   GET /api/v1/comments/:id/thread
   * @desc    Get comment thread (parent + all replies)
   * @access  Public (in real app, would be protected)
   */
  router.get(
    '/comments/:id/thread',
    validateGetCommentById,
    commentsController.getCommentThread
  );

  return router;
}

export default createCommentsRoutes;