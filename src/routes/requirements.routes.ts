/**
 * Requirements Routes - Express routes for requirements API
 */

import { Router } from 'express';
import { RequirementsController } from '../controllers/requirements.controller';
import {
  validateCreateRequirement,
  validateUpdateRequirement,
  validateGetRequirements,
  validateGetRequirementById,
  validateDeleteRequirement,
  validateGetRequirementVersions,
} from '../middleware/validation';
import { createRateLimit } from '../middleware/error-handler';

const router = Router();
const requirementsController = new RequirementsController();

// Apply rate limiting to all routes (100 requests per 15 minutes)
const defaultRateLimit = createRateLimit();
router.use(defaultRateLimit);

// Apply stricter rate limiting to write operations (20 requests per 15 minutes)
const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

/**
 * @route   GET /api/v1/requirements
 * @desc    Get all requirements with pagination and filtering
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/',
  validateGetRequirements,
  requirementsController.getRequirements
);

/**
 * @route   GET /api/v1/requirements/summary
 * @desc    Get requirements summary statistics
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/summary',
  requirementsController.getRequirementsSummary
);

/**
 * @route   GET /api/v1/requirements/export
 * @desc    Export requirements to CSV
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/export',
  requirementsController.exportRequirements
);

/**
 * @route   POST /api/v1/requirements
 * @desc    Create a new requirement
 * @access  Public (in real app, would be protected)
 */
router.post(
  '/',
  writeRateLimit,
  validateCreateRequirement,
  requirementsController.createRequirement
);

/**
 * @route   PUT /api/v1/requirements/bulk
 * @desc    Bulk update requirements
 * @access  Public (in real app, would be protected)
 */
router.put(
  '/bulk',
  writeRateLimit,
  requirementsController.bulkUpdateRequirements
);

/**
 * @route   GET /api/v1/requirements/:id
 * @desc    Get a single requirement by ID
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/:id',
  validateGetRequirementById,
  requirementsController.getRequirementById
);

/**
 * @route   PUT /api/v1/requirements/:id
 * @desc    Update a requirement
 * @access  Public (in real app, would be protected)
 */
router.put(
  '/:id',
  writeRateLimit,
  validateUpdateRequirement,
  requirementsController.updateRequirement
);

/**
 * @route   DELETE /api/v1/requirements/:id
 * @desc    Delete (archive) a requirement
 * @access  Public (in real app, would be protected)
 */
router.delete(
  '/:id',
  writeRateLimit,
  validateDeleteRequirement,
  requirementsController.deleteRequirement
);

/**
 * @route   GET /api/v1/requirements/:id/versions
 * @desc    Get requirement version history
 * @access  Public (in real app, would be protected)
 */
router.get(
  '/:id/versions',
  validateGetRequirementVersions,
  requirementsController.getRequirementVersions
);

export default router;