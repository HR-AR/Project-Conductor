/**
 * Engineering Design Routes - Express routes for Engineering Design API
 */

import { Router } from 'express';
import { EngineeringDesignController } from '../controllers/engineering-design.controller';
import { createRateLimit } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';
import {
  requirePermission,
  requireRole
} from '../middleware/rbac.middleware';
import { Permission, UserRole } from '../models/permissions.model';
import {
  validateCreateEngineeringDesign,
  validateUpdateEngineeringDesign,
} from '../middleware/validation';

const router = Router();
const designController = new EngineeringDesignController();
const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

/**
 * @route   POST /api/v1/engineering-design
 * @desc    Create a new engineering design
 * @access  Protected - Requires DESIGN_CREATE permission
 */
router.post(
  '/',
  authenticate,
  requirePermission(Permission.DESIGN_CREATE),
  writeRateLimit,
  validateCreateEngineeringDesign,
  designController.createDesign
);

/**
 * @route   GET /api/v1/engineering-design
 * @desc    Get all engineering designs
 * @access  Protected - Requires DESIGN_LIST permission
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.DESIGN_LIST),
  designController.getAllDesigns
);

/**
 * @route   GET /api/v1/engineering-design/summary
 * @desc    Get engineering design summary statistics
 * @access  Protected - Requires DESIGN_READ permission
 */
router.get(
  '/summary',
  authenticate,
  requirePermission(Permission.DESIGN_READ),
  designController.getSummary
);

/**
 * @route   GET /api/v1/engineering-design/prd/:prdId
 * @desc    Get designs for a specific PRD
 * @access  Protected - Requires DESIGN_LIST permission
 */
router.get(
  '/prd/:prdId',
  authenticate,
  requirePermission(Permission.DESIGN_LIST),
  designController.getDesignsByPRD
);

/**
 * @route   GET /api/v1/engineering-design/team/:team/capacity
 * @desc    Get team capacity information
 * @access  Protected - Requires DESIGN_READ permission
 */
router.get(
  '/team/:team/capacity',
  authenticate,
  requirePermission(Permission.DESIGN_READ),
  designController.getTeamCapacity
);

/**
 * @route   GET /api/v1/engineering-design/:id
 * @desc    Get a single engineering design by ID
 * @access  Protected - Requires DESIGN_READ permission
 */
router.get(
  '/:id',
  authenticate,
  requirePermission(Permission.DESIGN_READ),
  designController.getDesign
);

/**
 * @route   PUT /api/v1/engineering-design/:id
 * @desc    Update an engineering design
 * @access  Protected - Requires DESIGN_UPDATE permission
 */
router.put(
  '/:id',
  authenticate,
  requirePermission(Permission.DESIGN_UPDATE),
  writeRateLimit,
  validateUpdateEngineeringDesign,
  designController.updateDesign
);

/**
 * @route   DELETE /api/v1/engineering-design/:id
 * @desc    Delete an engineering design
 * @access  Protected - Admin only
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  writeRateLimit,
  designController.deleteDesign
);

/**
 * @route   POST /api/v1/engineering-design/:id/detect-conflicts
 * @desc    Detect conflicts in design
 * @access  Protected - Requires DESIGN_READ permission
 */
router.post(
  '/:id/detect-conflicts',
  authenticate,
  requirePermission(Permission.DESIGN_READ),
  designController.detectConflicts
);

export default router;
