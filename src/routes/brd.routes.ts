/**
 * BRD Routes - Express routes for BRD API
 */

import { Router } from 'express';
import { BRDController } from '../controllers/brd.controller';
import { createRateLimit } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';
import {
  requirePermission,
  requireRole,
  requireAuthentication
} from '../middleware/rbac.middleware';
import { Permission, UserRole } from '../models/permissions.model';
import {
  validateCreateBRD,
  validateUpdateBRD,
  validateApproveBRD,
} from '../middleware/validation';

const router = Router();
const brdController = new BRDController();

// Apply rate limiting to write operations
const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

/**
 * @route   POST /api/v1/brd
 * @desc    Create a new BRD
 * @access  Protected - Requires BRD_CREATE permission
 */
router.post(
  '/',
  authenticate,
  requirePermission(Permission.BRD_CREATE),
  writeRateLimit,
  validateCreateBRD,
  brdController.createBRD
);

/**
 * @route   GET /api/v1/brd
 * @desc    Get all BRDs with filtering
 * @access  Protected - Requires BRD_LIST permission
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.BRD_LIST),
  brdController.getAllBRDs
);

/**
 * @route   GET /api/v1/brd/summary
 * @desc    Get BRD summary statistics
 * @access  Protected - Requires BRD_READ permission
 */
router.get(
  '/summary',
  authenticate,
  requirePermission(Permission.BRD_READ),
  brdController.getSummary
);

/**
 * @route   GET /api/v1/brd/:id
 * @desc    Get a single BRD by ID
 * @access  Protected - Requires BRD_READ permission
 */
router.get(
  '/:id',
  authenticate,
  requirePermission(Permission.BRD_READ),
  brdController.getBRD
);

/**
 * @route   PUT /api/v1/brd/:id
 * @desc    Update a BRD
 * @access  Protected - Requires BRD_UPDATE permission
 */
router.put(
  '/:id',
  authenticate,
  requirePermission(Permission.BRD_UPDATE),
  writeRateLimit,
  validateUpdateBRD,
  brdController.updateBRD
);

/**
 * @route   DELETE /api/v1/brd/:id
 * @desc    Delete a BRD
 * @access  Protected - Admin only
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  writeRateLimit,
  brdController.deleteBRD
);

/**
 * @route   POST /api/v1/brd/:id/approve
 * @desc    Approve or reject a BRD
 * @access  Protected - Requires BRD_APPROVE permission
 */
router.post(
  '/:id/approve',
  authenticate,
  requirePermission(Permission.BRD_APPROVE),
  writeRateLimit,
  validateApproveBRD,
  brdController.approveBRD
);

/**
 * @route   GET /api/v1/brd/:id/approval-status
 * @desc    Get BRD approval status
 * @access  Protected - Requires BRD_READ permission
 */
router.get(
  '/:id/approval-status',
  authenticate,
  requirePermission(Permission.BRD_READ),
  brdController.getApprovalStatus
);

export default router;
