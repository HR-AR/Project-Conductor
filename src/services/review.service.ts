/**
 * Review Service - Business logic for review and approval workflow
 */

import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  Review,
  ReviewSummary,
  SubmitReviewRequest,
  ReviewFilters,
  ReviewDecisionType,
  ReviewStatusType,
  REVIEW_STATUS,
  REVIEW_DECISION,
  WORKFLOW_RULES,
  WorkflowRule,
} from '../models/review.model';
import IdGenerator from '../utils/id-generator';
import WebSocketService from './websocket.service';

class ReviewService {
  private webSocketService?: WebSocketService | undefined;

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  /**
   * Create a new review assignment
   */
  async createReview(
    requirementId: string,
    reviewerId: string,
    assignedBy: string,
    comments?: string
  ): Promise<Review> {
    const reviewId = IdGenerator.generateRequirementId({ prefix: 'REV' });

    const query = `
      INSERT INTO reviews (
        id, requirement_id, reviewer_id, status, comments, assigned_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      reviewId,
      requirementId,
      reviewerId,
      REVIEW_STATUS.PENDING,
      comments || '',
      assignedBy,
    ];

    try {
      const result = await db.query(query, values);
      const review = result.rows[0];

      // Get the complete review with user details
      const fullReview = await this.getReviewById(review.id);

      // Update requirement status to 'under_review' if it's currently 'draft'
      await this.updateRequirementStatusIfNeeded(requirementId, 'under_review');

      // Emit WebSocket event for review creation
      if (this.webSocketService) {
        this.webSocketService.broadcastReviewUpdate(
          fullReview,
          'created',
          assignedBy
        );
      }

      return fullReview;
    } catch (error) {
      console.error('Error creating review:', error);
      throw new Error('Failed to create review');
    }
  }

  /**
   * Submit a review decision
   */
  async submitReview(
    reviewId: string,
    reviewerId: string,
    data: SubmitReviewRequest
  ): Promise<Review> {
    return await db.withTransaction(async (client: PoolClient) => {
      // Get current review
      const currentReview = await this.getReviewById(reviewId);

      if (!currentReview) {
        throw new Error('Review not found');
      }

      if (currentReview.reviewerId !== reviewerId) {
        throw new Error('Unauthorized: You can only submit your own reviews');
      }

      if (currentReview.status !== REVIEW_STATUS.PENDING) {
        throw new Error('Review has already been submitted');
      }

      // Update review
      const updateQuery = `
        UPDATE reviews
        SET status = $1, decision = $2, comments = $3, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;

      const newStatus = this.mapDecisionToStatus(data.decision);
      const updateValues = [newStatus, data.decision, data.comments, reviewId];

      await client.query(updateQuery, updateValues);

      // Check if requirement status should be updated based on all reviews
      await this.updateRequirementStatusBasedOnReviews(client, currentReview.requirementId);

      // Get the complete review with user details
      const fullReview = await this.getReviewById(reviewId);

      // Emit WebSocket event for review submission
      if (this.webSocketService) {
        this.webSocketService.broadcastReviewUpdate(
          fullReview,
          'updated',
          reviewerId
        );
      }

      return fullReview;
    });
  }

  /**
   * Get review by ID with user details
   */
  async getReviewById(id: string): Promise<Review> {
    const query = `
      SELECT
        r.*,
        u1.username as reviewer_username,
        u1.first_name as reviewer_first_name,
        u1.last_name as reviewer_last_name,
        req.title as requirement_title,
        req.status as requirement_status
      FROM reviews r
      LEFT JOIN users u1 ON r.reviewer_id = u1.id
      LEFT JOIN requirements req ON r.requirement_id = req.id
      WHERE r.id = $1
    `;

    try {
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('Review not found');
      }

      return this.mapRowToReview(result.rows[0]);
    } catch (error) {
      console.error('Error getting review by ID:', error);
      throw error;
    }
  }

  /**
   * Get all reviews for a requirement
   */
  async getReviewsByRequirement(requirementId: string, filters: ReviewFilters = {}): Promise<Review[]> {
    const conditions = ['r.requirement_id = $1'];
    const queryParams: any[] = [requirementId];
    let paramCount = 1;

    if (filters.status && filters.status.length > 0) {
      conditions.push(`r.status = ANY($${++paramCount})`);
      queryParams.push(filters.status);
    }

    if (filters.reviewerId) {
      conditions.push(`r.reviewer_id = $${++paramCount}`);
      queryParams.push(filters.reviewerId);
    }

    if (filters.decision && filters.decision.length > 0) {
      conditions.push(`r.decision = ANY($${++paramCount})`);
      queryParams.push(filters.decision);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT
        r.*,
        u1.username as reviewer_username,
        u1.first_name as reviewer_first_name,
        u1.last_name as reviewer_last_name,
        req.title as requirement_title,
        req.status as requirement_status
      FROM reviews r
      LEFT JOIN users u1 ON r.reviewer_id = u1.id
      LEFT JOIN requirements req ON r.requirement_id = req.id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
    `;

    try {
      const result = await db.query(query, queryParams);
      return result.rows.map((row: any) => this.mapRowToReview(row));
    } catch (error) {
      console.error('Error getting reviews by requirement:', error);
      throw new Error('Failed to get reviews');
    }
  }

  /**
   * Get pending reviews for a user
   */
  async getPendingReviews(reviewerId: string): Promise<Review[]> {
    const query = `
      SELECT
        r.*,
        u1.username as reviewer_username,
        u1.first_name as reviewer_first_name,
        u1.last_name as reviewer_last_name,
        req.title as requirement_title,
        req.status as requirement_status
      FROM reviews r
      LEFT JOIN users u1 ON r.reviewer_id = u1.id
      LEFT JOIN requirements req ON r.requirement_id = req.id
      WHERE r.reviewer_id = $1 AND r.status = $2
      ORDER BY r.created_at DESC
    `;

    try {
      const result = await db.query(query, [reviewerId, REVIEW_STATUS.PENDING]);
      return result.rows.map((row: any) => this.mapRowToReview(row));
    } catch (error) {
      console.error('Error getting pending reviews:', error);
      throw new Error('Failed to get pending reviews');
    }
  }

  /**
   * Get review summary for a requirement
   */
  async getReviewSummary(requirementId: string): Promise<ReviewSummary> {
    const reviews = await this.getReviewsByRequirement(requirementId);

    const summary: ReviewSummary = {
      requirementId,
      totalReviews: reviews.length,
      approved: reviews.filter(r => r.decision === REVIEW_DECISION.APPROVED).length,
      rejected: reviews.filter(r => r.decision === REVIEW_DECISION.REJECTED).length,
      changesRequested: reviews.filter(r => r.decision === REVIEW_DECISION.CHANGES_REQUESTED).length,
      pending: reviews.filter(r => r.status === REVIEW_STATUS.PENDING).length,
      canApprove: false,
      canReject: false,
      canRequestChanges: false,
      overallStatus: 'pending',
    };

    // Determine overall status and permissions based on workflow rules
    summary.overallStatus = this.calculateOverallStatus(reviews);
    const permissions = this.calculatePermissions(reviews);
    summary.canApprove = permissions.canApprove;
    summary.canReject = permissions.canReject;
    summary.canRequestChanges = permissions.canRequestChanges;

    return summary;
  }

  /**
   * Check if a status transition is allowed
   */
  async canTransitionStatus(requirementId: string, newStatus: string): Promise<boolean> {
    try {
      // Get current requirement status
      const requirement = await this.getRequirementStatus(requirementId);
      if (!requirement) return false;

      const currentStatus = requirement.status;

      // Get workflow rule for current status
      const rule = WORKFLOW_RULES[currentStatus];
      if (!rule) return false;

      // Check if transition is allowed
      if (!rule.allowedTransitions.includes(newStatus)) {
        return false;
      }

      // If review is required, check review status
      if (rule.reviewRequired && newStatus === 'approved') {
        const reviews = await this.getReviewsByRequirement(requirementId);
        return this.canApproveBasedOnReviews(reviews, rule);
      }

      return true;
    } catch (error) {
      console.error('Error checking status transition:', error);
      return false;
    }
  }

  /**
   * Enforce workflow rules before status transition
   */
  async enforceWorkflow(requirementId: string, newStatus: string): Promise<void> {
    const canTransition = await this.canTransitionStatus(requirementId, newStatus);

    if (!canTransition) {
      const requirement = await this.getRequirementStatus(requirementId);
      const currentStatus = requirement?.status || 'unknown';

      throw new Error(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
        'Please ensure all required reviews are completed and workflow rules are satisfied.'
      );
    }
  }

  /**
   * Private helper methods
   */

  private mapDecisionToStatus(decision: ReviewDecisionType): ReviewStatusType {
    switch (decision) {
      case REVIEW_DECISION.APPROVED:
        return REVIEW_STATUS.APPROVED;
      case REVIEW_DECISION.REJECTED:
        return REVIEW_STATUS.REJECTED;
      case REVIEW_DECISION.CHANGES_REQUESTED:
        return REVIEW_STATUS.CHANGES_REQUESTED;
      default:
        return REVIEW_STATUS.PENDING;
    }
  }

  private calculateOverallStatus(reviews: Review[]): 'pending' | 'approved' | 'rejected' | 'changes_requested' {
    if (reviews.length === 0) return 'pending';

    const hasRejection = reviews.some(r => r.decision === REVIEW_DECISION.REJECTED);
    if (hasRejection) return 'rejected';

    const hasChangesRequested = reviews.some(r => r.decision === REVIEW_DECISION.CHANGES_REQUESTED);
    if (hasChangesRequested) return 'changes_requested';

    const hasPending = reviews.some(r => r.status === REVIEW_STATUS.PENDING);
    if (hasPending) return 'pending';

    const allApproved = reviews.every(r => r.decision === REVIEW_DECISION.APPROVED);
    if (allApproved && reviews.length > 0) return 'approved';

    return 'pending';
  }

  private calculatePermissions(reviews: Review[]): {
    canApprove: boolean;
    canReject: boolean;
    canRequestChanges: boolean;
  } {
    const hasRejection = reviews.some(r => r.decision === REVIEW_DECISION.REJECTED);
    const hasChangesRequested = reviews.some(r => r.decision === REVIEW_DECISION.CHANGES_REQUESTED);
    const hasPendingReviews = reviews.some(r => r.status === REVIEW_STATUS.PENDING);

    return {
      canApprove: !hasRejection && !hasChangesRequested && !hasPendingReviews && reviews.length > 0,
      canReject: true, // Can always reject
      canRequestChanges: true, // Can always request changes
    };
  }

  private canApproveBasedOnReviews(reviews: Review[], rule: WorkflowRule): boolean {
    if (rule.blockOnRejection) {
      const hasRejection = reviews.some(r => r.decision === REVIEW_DECISION.REJECTED);
      if (hasRejection) return false;
    }

    if (rule.approvalThreshold) {
      const approvalCount = reviews.filter(r => r.decision === REVIEW_DECISION.APPROVED).length;
      if (approvalCount < rule.approvalThreshold) return false;
    }

    const hasPending = reviews.some(r => r.status === REVIEW_STATUS.PENDING);
    return !hasPending;
  }

  private async updateRequirementStatusIfNeeded(requirementId: string, newStatus: string): Promise<void> {
    const query = `
      UPDATE requirements
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'draft'
    `;

    try {
      await db.query(query, [newStatus, requirementId]);
    } catch (error) {
      console.error('Error updating requirement status:', error);
      // Don't throw - this is a side effect, not critical
    }
  }

  private async updateRequirementStatusBasedOnReviews(
    client: PoolClient,
    requirementId: string
  ): Promise<void> {
    const reviews = await this.getReviewsByRequirement(requirementId);
    const overallStatus = this.calculateOverallStatus(reviews);

    let newRequirementStatus: string | null = null;

    switch (overallStatus) {
      case 'approved':
        newRequirementStatus = 'approved';
        break;
      case 'rejected':
        newRequirementStatus = 'rejected';
        break;
      case 'changes_requested':
        newRequirementStatus = 'changes_requested';
        break;
      // 'pending' doesn't change requirement status
    }

    if (newRequirementStatus) {
      const query = `
        UPDATE requirements
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      try {
        await client.query(query, [newRequirementStatus, requirementId]);
      } catch (error) {
        console.error('Error updating requirement status based on reviews:', error);
      }
    }
  }

  private async getRequirementStatus(requirementId: string): Promise<{ status: string } | null> {
    const query = 'SELECT status FROM requirements WHERE id = $1';

    try {
      const result = await db.query(query, [requirementId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting requirement status:', error);
      return null;
    }
  }

  private mapRowToReview(row: any): Review {
    const review: Review = {
      id: row.id,
      requirementId: row.requirement_id,
      reviewerId: row.reviewer_id,
      status: row.status,
      decision: row.decision,
      comments: row.comments || '',
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    if (row.reviewer_username) {
      review.reviewer = {
        id: row.reviewer_id,
        username: row.reviewer_username,
        firstName: row.reviewer_first_name,
        lastName: row.reviewer_last_name,
      };
    }

    if (row.requirement_title) {
      review.requirement = {
        id: row.requirement_id,
        title: row.requirement_title,
        status: row.requirement_status,
      };
    }

    return review;
  }
}

export { ReviewService };
export default ReviewService;