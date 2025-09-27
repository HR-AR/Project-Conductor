/**
 * Review Routes - API routes for review and approval workflow
 */

import { Router } from 'express';
import ReviewController from '../controllers/review.controller';

const router = Router();
const reviewController = new ReviewController();

// Review routes

/**
 * @swagger
 * /api/v1/requirements/{id}/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create a review assignment
 *     description: Assign a reviewer to a requirement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requirement ID
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user making the assignment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reviewerId
 *             properties:
 *               reviewerId:
 *                 type: string
 *                 description: ID of the user assigned to review
 *               comments:
 *                 type: string
 *                 description: Optional comments when assigning the review
 *     responses:
 *       201:
 *         description: Review assignment created successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Requirement not found
 */
router.post(
  '/requirements/:id/reviews',
  reviewController.createReview
);

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Submit a review decision
 *     description: Submit a review decision with comments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reviewer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *               - comments
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [approved, rejected, changes_requested]
 *                 description: Review decision
 *               comments:
 *                 type: string
 *                 description: Review comments explaining the decision
 *     responses:
 *       200:
 *         description: Review submitted successfully
 *       400:
 *         description: Invalid request data or review already submitted
 *       403:
 *         description: Not authorized to submit this review
 *       404:
 *         description: Review not found
 *   get:
 *     tags: [Reviews]
 *     summary: Get a specific review
 *     description: Get a review by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *       404:
 *         description: Review not found
 */
router.put(
  '/reviews/:id',
  reviewController.submitReview
);

router.get('/reviews/:id', reviewController.getReview);

/**
 * @swagger
 * /api/v1/requirements/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Get all reviews for a requirement
 *     description: Get all reviews associated with a requirement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requirement ID
 *       - in: query
 *         name: reviewerId
 *         schema:
 *           type: string
 *         description: Filter by reviewer ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [pending, approved, rejected, changes_requested]
 *         description: Filter by review status
 *       - in: query
 *         name: decision
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [approved, rejected, changes_requested]
 *         description: Filter by review decision
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *       404:
 *         description: Requirement not found
 */
router.get('/requirements/:id/reviews', reviewController.getReviews);

/**
 * @swagger
 * /api/v1/reviews/pending:
 *   get:
 *     tags: [Reviews]
 *     summary: Get pending reviews for authenticated user
 *     description: Get all pending reviews assigned to the authenticated user
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the authenticated user
 *     responses:
 *       200:
 *         description: Pending reviews retrieved successfully
 *       400:
 *         description: User authentication required
 */
router.get('/reviews/pending', reviewController.getPendingReviews);

/**
 * @swagger
 * /api/v1/requirements/{id}/reviews/summary:
 *   get:
 *     tags: [Reviews]
 *     summary: Get review summary for a requirement
 *     description: Get aggregated review statistics and status for a requirement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requirement ID
 *     responses:
 *       200:
 *         description: Review summary retrieved successfully
 *       404:
 *         description: Requirement not found
 */
router.get('/requirements/:id/reviews/summary', reviewController.getReviewSummary);

/**
 * @swagger
 * /api/v1/requirements/{id}/can-transition/{status}:
 *   get:
 *     tags: [Reviews]
 *     summary: Check if status transition is allowed
 *     description: Check if a requirement can transition to a new status based on workflow rules
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requirement ID
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *         description: Target status to check
 *     responses:
 *       200:
 *         description: Transition check result
 */
router.get('/requirements/:id/can-transition/:status', reviewController.canTransitionStatus);

/**
 * @swagger
 * /api/v1/reviews/bulk-assign:
 *   post:
 *     tags: [Reviews]
 *     summary: Bulk assign reviewers to requirements
 *     description: Assign multiple reviewers to multiple requirements
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user making the assignments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requirementIds
 *               - reviewerIds
 *             properties:
 *               requirementIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of requirement IDs
 *               reviewerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of reviewer IDs
 *               comments:
 *                 type: string
 *                 description: Optional comments for all assignments
 *     responses:
 *       200:
 *         description: Bulk assignment completed
 *       400:
 *         description: Invalid request data
 */
router.post(
  '/reviews/bulk-assign',
  reviewController.bulkAssignReviewers
);

/**
 * @swagger
 * /api/v1/reviews/assigned-by/{userId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get reviews assigned by a user
 *     description: Get all review assignments created by a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the assigner
 *     responses:
 *       200:
 *         description: Reviews assigned by user retrieved successfully
 */
router.get('/reviews/assigned-by/:userId', reviewController.getReviewsAssignedBy);

export default router;