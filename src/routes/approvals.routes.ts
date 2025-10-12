/**
 * Approvals Routes - Express routes for Approval and Decision Register API
 */

import { Router } from 'express';
import { ApprovalsController } from '../controllers/approvals.controller';
import { createRateLimit } from '../middleware/error-handler';

const router = Router();
const approvalsController = new ApprovalsController();

// Apply rate limiting to write operations
const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

/**
 * @route   POST /api/v1/approvals/initiate
 * @desc    Initiate review process for a narrative
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/initiate',
  writeRateLimit,
  approvalsController.initiateReview
);

/**
 * @route   GET /api/v1/approvals/pending
 * @desc    Get pending approvals for current user
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/pending',
  approvalsController.getPendingApprovals
);

/**
 * @route   GET /api/v1/approvals
 * @desc    Get all approvals with filtering
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/',
  approvalsController.getAllApprovals
);

/**
 * @route   GET /api/v1/approvals/:id
 * @desc    Get approval by ID
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/:id',
  approvalsController.getApprovalById
);

/**
 * @route   POST /api/v1/approvals/:id/vote
 * @desc    Record a vote (approve, reject, conditional)
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/:id/vote',
  writeRateLimit,
  approvalsController.recordVote
);

/**
 * @route   POST /api/v1/approvals/:id/finalize
 * @desc    Finalize review and determine consensus
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/:id/finalize',
  writeRateLimit,
  approvalsController.finalizeReview
);

/**
 * @route   GET /api/v1/approvals/:narrativeId/decisions
 * @desc    Get decision register for a narrative (all decisions)
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/:narrativeId/decisions',
  approvalsController.getDecisions
);

/**
 * @route   GET /api/v1/approvals/:narrativeId/status
 * @desc    Get approval status for a narrative version
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/:narrativeId/status',
  approvalsController.getApprovalStatus
);

export default router;
