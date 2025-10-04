/**
 * BRD Routes - Express routes for BRD API
 */

import { Router } from 'express';
import { BRDController } from '../controllers/brd.controller';
import { createRateLimit } from '../middleware/error-handler';
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
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/',
  writeRateLimit,
  validateCreateBRD,
  brdController.createBRD
);

/**
 * @route   GET /api/v1/brd
 * @desc    Get all BRDs with filtering
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/',
  brdController.getAllBRDs
);

/**
 * @route   GET /api/v1/brd/summary
 * @desc    Get BRD summary statistics
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/summary',
  brdController.getSummary
);

/**
 * @route   GET /api/v1/brd/:id
 * @desc    Get a single BRD by ID
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/:id',
  brdController.getBRD
);

/**
 * @route   PUT /api/v1/brd/:id
 * @desc    Update a BRD
 * @access  Public (in real app, would be protected)
 */
router.put(
  '/:id',
  writeRateLimit,
  validateUpdateBRD,
  brdController.updateBRD
);

/**
 * @route   DELETE /api/v1/brd/:id
 * @desc    Delete a BRD
 * @access  Public (in real app, would be protected)
 */
router.delete(
  '/:id',
  writeRateLimit,
  brdController.deleteBRD
);

/**
 * @route   POST /api/v1/brd/:id/approve
 * @desc    Approve or reject a BRD
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/:id/approve',
  writeRateLimit,
  validateApproveBRD,
  brdController.approveBRD
);

/**
 * @route   GET /api/v1/brd/:id/approval-status
 * @desc    Get BRD approval status
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/:id/approval-status',
  brdController.getApprovalStatus
);

export default router;
