/**
 * PRD Routes - Express routes for PRD API
 */

import { Router } from 'express';
import { PRDController } from '../controllers/prd.controller';
import { createRateLimit } from '../middleware/error-handler';
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
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/',
  writeRateLimit,
  validateCreatePRD,
  prdController.createPRD
);

/**
 * @route   POST /api/v1/prd/generate/:brdId
 * @desc    Generate PRD from approved BRD
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/generate/:brdId',
  writeRateLimit,
  prdController.generateFromBRD
);

/**
 * @route   GET /api/v1/prd
 * @desc    Get all PRDs with filtering
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/',
  prdController.getAllPRDs
);

/**
 * @route   GET /api/v1/prd/summary
 * @desc    Get PRD summary statistics
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/summary',
  prdController.getSummary
);

/**
 * @route   GET /api/v1/prd/:id
 * @desc    Get a single PRD by ID
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/:id',
  prdController.getPRD
);

/**
 * @route   PUT /api/v1/prd/:id
 * @desc    Update a PRD
 * @access  Public (in real app, would be protected)
 */
router.put(
  '/:id',
  writeRateLimit,
  validateUpdatePRD,
  prdController.updatePRD
);

/**
 * @route   DELETE /api/v1/prd/:id
 * @desc    Delete a PRD
 * @access  Public (in real app, would be protected)
 */
router.delete(
  '/:id',
  writeRateLimit,
  prdController.deletePRD
);

/**
 * @route   POST /api/v1/prd/:id/align
 * @desc    Record stakeholder alignment on PRD
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/:id/align',
  writeRateLimit,
  prdController.alignPRD
);

/**
 * @route   POST /api/v1/prd/:id/lock
 * @desc    Lock PRD for engineering review
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/:id/lock',
  writeRateLimit,
  prdController.lockPRD
);

/**
 * @route   POST /api/v1/prd/:id/features
 * @desc    Add feature to PRD
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/:id/features',
  writeRateLimit,
  validateAddFeature,
  prdController.addFeature
);

/**
 * @route   POST /api/v1/prd/:id/stories
 * @desc    Add user story to PRD
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/:id/stories',
  writeRateLimit,
  validateAddUserStory,
  prdController.addUserStory
);

/**
 * @route   GET /api/v1/prd/:id/alignment-status
 * @desc    Get PRD alignment status
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/:id/alignment-status',
  prdController.getAlignmentStatus
);

export default router;
