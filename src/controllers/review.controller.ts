/**
 * Review Controller - Request handlers for review and approval workflow API
 */

import { Request, Response } from 'express';
import { ReviewService } from '../services/review.service';
import { simpleMockService } from '../services/simple-mock.service';
import {
  CreateReviewRequest,
  SubmitReviewRequest,
  ReviewFilters,
} from '../models/review.model';
import { asyncHandler, NotFoundError, BadRequestError, ForbiddenError } from '../middleware/error-handler';
import logger from '../utils/logger';

export class ReviewController {
  private reviewService: any;

  constructor() {
    // Use mock service when database is not available
    const useMock = process.env['USE_MOCK_DB'] !== 'false';
    this.reviewService = useMock ? simpleMockService : new ReviewService();
    if (useMock) {
      logger.info('Using mock review service (database unavailable)');
    }
  }

  /**
   * Create a new review assignment
   * POST /api/v1/requirements/:id/reviews
   */
  createReview = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: requirementId } = req.params;
      const data: CreateReviewRequest = req.body;
      const assignedBy = (req.headers['x-user-id'] as string) || 'system';

      // Validate request
      if (!data.reviewerId) {
        throw new BadRequestError('Reviewer ID is required');
      }

      try {
        const review = await this.reviewService.createReview(
          requirementId as string | undefined,
          data.reviewerId,
          assignedBy,
          data.comments
        );

        res.status(201).json({
          success: true,
          data: review,
          message: 'Review assignment created successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new NotFoundError('Requirement not found');
        }
        throw error;
      }
    }
  );

  /**
   * Submit a review decision
   * PUT /api/v1/reviews/:id
   */
  submitReview = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: reviewId } = req.params;
      const data: SubmitReviewRequest = req.body;
      const reviewerId = (req.headers['x-user-id'] as string) || 'system';

      // Validate request
      if (!data.decision) {
        throw new BadRequestError('Review decision is required');
      }

      if (!data.comments?.trim()) {
        throw new BadRequestError('Review comments are required');
      }

      const validDecisions = ['approved', 'rejected', 'changes_requested'];
      if (!validDecisions.includes(data.decision)) {
        throw new BadRequestError(`Invalid decision. Must be one of: ${validDecisions.join(', ')}`);
      }

      try {
        const review = await this.reviewService.submitReview(
          reviewId as string | undefined,
          reviewerId,
          data
        );

        res.json({
          success: true,
          data: review,
          message: 'Review submitted successfully',
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            throw new NotFoundError('Review not found');
          } else if (error.message.includes('Unauthorized')) {
            throw new ForbiddenError(error.message);
          } else if (error.message.includes('already been submitted')) {
            throw new BadRequestError(error.message);
          }
        }
        throw error;
      }
    }
  );

  /**
   * Get all reviews for a requirement
   * GET /api/v1/requirements/:id/reviews
   */
  getReviews = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: requirementId } = req.params;

      // Parse filter parameters
      const filters: ReviewFilters = {
        reviewerId: req.query['reviewerId'] as string | undefined,
        status: req.query['status'] ? this.parseArrayParam(req.query['status']) as any : undefined,
        decision: req.query['decision'] ? this.parseArrayParam(req.query['decision']) as any : undefined,
        createdFrom: req.query['createdFrom'] as string | undefined,
        createdTo: req.query['createdTo'] as string | undefined,
      };

      try {
        const reviews = await this.reviewService.getReviewsByRequirement(
          requirementId as string | undefined,
          filters
        );

        res.json({
          success: true,
          data: reviews,
          message: 'Reviews retrieved successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new NotFoundError('Requirement not found');
        }
        throw error;
      }
    }
  );

  /**
   * Get pending reviews for the authenticated user
   * GET /api/v1/reviews/pending
   */
  getPendingReviews = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const reviewerId = (req.headers['x-user-id'] as string) || 'system';

      if (!reviewerId || reviewerId === 'system') {
        throw new BadRequestError('User authentication required');
      }

      const reviews = await this.reviewService.getPendingReviews(reviewerId);

      res.json({
        success: true,
        data: reviews,
        message: 'Pending reviews retrieved successfully',
      });
    }
  );

  /**
   * Get review summary for a requirement
   * GET /api/v1/requirements/:id/reviews/summary
   */
  getReviewSummary = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: requirementId } = req.params;

      try {
        const summary = await this.reviewService.getReviewSummary(requirementId as string);

        res.json({
          success: true,
          data: summary,
          message: 'Review summary retrieved successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new NotFoundError('Requirement not found');
        }
        throw error;
      }
    }
  );

  /**
   * Get a specific review by ID
   * GET /api/v1/reviews/:id
   */
  getReview = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: reviewId } = req.params;

      try {
        const review = await this.reviewService.getReviewById(reviewId as string);

        res.json({
          success: true,
          data: review,
          message: 'Review retrieved successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new NotFoundError('Review not found');
        }
        throw error;
      }
    }
  );

  /**
   * Check if a requirement status transition is allowed
   * GET /api/v1/requirements/:id/can-transition/:status
   */
  canTransitionStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id: requirementId, status: newStatus } = req.params;

      const canTransition = await this.reviewService.canTransitionStatus(
        requirementId as string | undefined,
        newStatus as string
      );

      res.json({
        success: true,
        data: {
          requirementId: requirementId as string | undefined,
          newStatus: newStatus as string | undefined,
          canTransition,
        },
        message: canTransition
          ? 'Status transition is allowed'
          : 'Status transition is not allowed',
      });
    }
  );

  /**
   * Bulk assign reviewers to requirements
   * POST /api/v1/reviews/bulk-assign
   */
  bulkAssignReviewers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { requirementIds, reviewerIds, comments } = req.body;
      const assignedBy = (req.headers['x-user-id'] as string) || 'system';

      if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
        throw new BadRequestError('Requirement IDs array is required and cannot be empty');
      }

      if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
        throw new BadRequestError('Reviewer IDs array is required and cannot be empty');
      }

      const results = [];
      const errors = [];

      for (const requirementId of requirementIds) {
        for (const reviewerId of reviewerIds) {
          try {
            const review = await this.reviewService.createReview(
              requirementId,
              reviewerId,
              assignedBy,
              comments
            );
            results.push({
              requirementId,
              reviewerId,
              success: true,
              data: review,
            });
          } catch (error) {
            errors.push({
              requirementId,
              reviewerId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      res.json({
        success: errors.length === 0,
        data: {
          successful: results,
          failed: errors,
          totalProcessed: requirementIds.length * reviewerIds.length,
          successCount: results.length,
          errorCount: errors.length,
        },
        message: `Bulk assignment completed: ${results.length} successful, ${errors.length} failed`,
      });
    }
  );

  /**
   * Get reviews assigned by a specific user
   * GET /api/v1/reviews/assigned-by/:userId
   */
  getReviewsAssignedBy = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { userId: assignedBy } = req.params;

      const reviews = await this.reviewService.getReviewsAssignedBy(assignedBy as string);

      res.json({
        success: true,
        data: reviews,
        message: 'Reviews assigned by user retrieved successfully',
      });
    }
  );

  /**
   * Helper method to parse array parameters from query string
   */
  private parseArrayParam(param: any): string[] | undefined {
    if (!param) return undefined;
    return Array.isArray(param) ? param : [param];
  }
}

export default ReviewController;