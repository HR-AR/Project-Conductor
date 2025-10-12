/**
 * Conflict Routes - Express routes for Conflict Resolution API
 */

import { Router } from 'express';
import { ConflictController } from '../controllers/conflict.controller';
import { createRateLimit } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';
import {
  requirePermission,
  requireRole
} from '../middleware/rbac.middleware';
import { Permission, UserRole } from '../models/permissions.model';
import {
  validateCreateConflict,
  validateAddConflictComment,
  validateAddResolutionOption,
  validateVoteOnResolution,
  validateResolveConflict,
} from '../middleware/validation';

const router = Router();
const conflictController = new ConflictController();
const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

/**
 * @route   POST /api/v1/conflict
 * @desc    Create a new conflict
 * @access  Protected - Requires CONFLICT_CREATE permission
 */
router.post(
  '/',
  authenticate,
  requirePermission(Permission.CONFLICT_CREATE),
  writeRateLimit,
  validateCreateConflict,
  conflictController.createConflict
);

/**
 * @route   GET /api/v1/conflict
 * @desc    Get all conflicts
 * @access  Protected - Requires CONFLICT_LIST permission
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.CONFLICT_LIST),
  conflictController.getAllConflicts
);

/**
 * @route   GET /api/v1/conflict/summary
 * @desc    Get conflict summary statistics
 * @access  Protected - Requires CONFLICT_READ permission
 */
router.get(
  '/summary',
  authenticate,
  requirePermission(Permission.CONFLICT_READ),
  conflictController.getSummary
);

/**
 * @route   GET /api/v1/conflict/project/:projectId/analytics
 * @desc    Get conflict analytics for a project
 * @access  Protected - Requires CONFLICT_READ permission
 */
router.get(
  '/project/:projectId/analytics',
  authenticate,
  requirePermission(Permission.CONFLICT_READ),
  conflictController.getAnalytics
);

/**
 * @route   GET /api/v1/conflict/:id
 * @desc    Get a single conflict by ID
 * @access  Protected - Requires CONFLICT_READ permission
 */
router.get(
  '/:id',
  authenticate,
  requirePermission(Permission.CONFLICT_READ),
  conflictController.getConflict
);

/**
 * @route   PUT /api/v1/conflict/:id
 * @desc    Update a conflict
 * @access  Protected - Requires CONFLICT_UPDATE permission
 */
router.put(
  '/:id',
  authenticate,
  requirePermission(Permission.CONFLICT_UPDATE),
  writeRateLimit,
  conflictController.updateConflict
);

/**
 * @route   DELETE /api/v1/conflict/:id
 * @desc    Delete a conflict
 * @access  Protected - Admin only
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  writeRateLimit,
  conflictController.deleteConflict
);

/**
 * @route   POST /api/v1/conflict/:id/comments
 * @desc    Add a comment to a conflict
 * @access  Protected - Requires CONFLICT_READ permission (all users can comment)
 */
router.post(
  '/:id/comments',
  authenticate,
  requirePermission(Permission.CONFLICT_READ),
  writeRateLimit,
  validateAddConflictComment,
  conflictController.addComment
);

/**
 * @route   POST /api/v1/conflict/:id/options
 * @desc    Add a resolution option to a conflict
 * @access  Protected - Requires CONFLICT_UPDATE permission
 */
router.post(
  '/:id/options',
  authenticate,
  requirePermission(Permission.CONFLICT_UPDATE),
  writeRateLimit,
  validateAddResolutionOption,
  conflictController.addOption
);

/**
 * @route   POST /api/v1/conflict/:id/options/:optionId/vote
 * @desc    Vote on a conflict resolution option
 * @access  Protected - Requires CONFLICT_VOTE permission
 */
router.post(
  '/:id/options/:optionId/vote',
  authenticate,
  requirePermission(Permission.CONFLICT_VOTE),
  writeRateLimit,
  validateVoteOnResolution,
  conflictController.vote
);

/**
 * @route   POST /api/v1/conflict/:id/resolve
 * @desc    Resolve a conflict
 * @access  Protected - Requires CONFLICT_RESOLVE permission
 */
router.post(
  '/:id/resolve',
  authenticate,
  requirePermission(Permission.CONFLICT_RESOLVE),
  writeRateLimit,
  validateResolveConflict,
  conflictController.resolve
);

export default router;
