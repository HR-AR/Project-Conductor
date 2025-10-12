/**
 * PRD Routes - Express routes for PRD API
 */

import { Router } from 'express';
import { PRDController } from '../controllers/prd.controller';
import { createRateLimit } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';
import {
  requirePermission,
  requireRole,
  requireAuthentication
} from '../middleware/rbac.middleware';
import { Permission, UserRole } from '../models/permissions.model';
import {
  validateCreatePRD,
  validateUpdatePRD,
  validateAddFeature,
  validateAddUserStory,
} from '../middleware/validation';

const router = Router();
const prdController = new PRDController();

// Apply rate limiting to write operations
const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

/**
 * @route   POST /api/v1/prd
 * @desc    Create a new PRD
 * @access  Protected - Requires PRD_CREATE permission
 */
router.post(
  '/',
  authenticate,
  requirePermission(Permission.PRD_CREATE),
  writeRateLimit,
  validateCreatePRD,
  prdController.createPRD
);

/**
 * @route   POST /api/v1/prd/generate/:brdId
 * @desc    Generate PRD from approved BRD
 * @access  Protected - Requires PRD_CREATE permission
 */
router.post(
  '/generate/:brdId',
  authenticate,
  requirePermission(Permission.PRD_CREATE),
  writeRateLimit,
  prdController.generateFromBRD
);

/**
 * @route   GET /api/v1/prd
 * @desc    Get all PRDs with filtering
 * @access  Protected - Requires PRD_LIST permission
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.PRD_LIST),
  prdController.getAllPRDs
);

/**
 * @route   GET /api/v1/prd/summary
 * @desc    Get PRD summary statistics
 * @access  Protected - Requires PRD_READ permission
 */
router.get(
  '/summary',
  authenticate,
  requirePermission(Permission.PRD_READ),
  prdController.getSummary
);

/**
 * @route   GET /api/v1/prd/:id
 * @desc    Get a single PRD by ID
 * @access  Protected - Requires PRD_READ permission
 */
router.get(
  '/:id',
  authenticate,
  requirePermission(Permission.PRD_READ),
  prdController.getPRD
);

/**
 * @route   PUT /api/v1/prd/:id
 * @desc    Update a PRD
 * @access  Protected - Requires PRD_UPDATE permission
 */
router.put(
  '/:id',
  authenticate,
  requirePermission(Permission.PRD_UPDATE),
  writeRateLimit,
  validateUpdatePRD,
  prdController.updatePRD
);

/**
 * @route   DELETE /api/v1/prd/:id
 * @desc    Delete a PRD
 * @access  Protected - Admin only
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  writeRateLimit,
  prdController.deletePRD
);

/**
 * @route   POST /api/v1/prd/:id/align
 * @desc    Record stakeholder alignment on PRD
 * @access  Protected - Requires PRD_APPROVE permission
 */
router.post(
  '/:id/align',
  authenticate,
  requirePermission(Permission.PRD_APPROVE),
  writeRateLimit,
  prdController.alignPRD
);

/**
 * @route   POST /api/v1/prd/:id/lock
 * @desc    Lock PRD for engineering review
 * @access  Protected - Requires PRD_APPROVE permission
 */
router.post(
  '/:id/lock',
  authenticate,
  requirePermission(Permission.PRD_APPROVE),
  writeRateLimit,
  prdController.lockPRD
);

/**
 * @route   POST /api/v1/prd/:id/features
 * @desc    Add feature to PRD
 * @access  Protected - Requires PRD_UPDATE permission
 */
router.post(
  '/:id/features',
  authenticate,
  requirePermission(Permission.PRD_UPDATE),
  writeRateLimit,
  validateAddFeature,
  prdController.addFeature
);

/**
 * @route   POST /api/v1/prd/:id/stories
 * @desc    Add user story to PRD
 * @access  Protected - Requires PRD_UPDATE permission
 */
router.post(
  '/:id/stories',
  authenticate,
  requirePermission(Permission.PRD_UPDATE),
  writeRateLimit,
  validateAddUserStory,
  prdController.addUserStory
);

/**
 * @route   GET /api/v1/prd/:id/alignment-status
 * @desc    Get PRD alignment status
 * @access  Protected - Requires PRD_READ permission
 */
router.get(
  '/:id/alignment-status',
  authenticate,
  requirePermission(Permission.PRD_READ),
  prdController.getAlignmentStatus
);

export default router;
