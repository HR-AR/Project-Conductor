/**
 * User Routes - Protected endpoints for user management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize, authorizeOwnerOrAdmin } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();
const userController = new UserController();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (with pagination and filtering)
 * @access  Admin only
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .isIn(['username', 'email', 'createdAt', 'lastLoginAt'])
      .withMessage('sortBy must be one of: username, email, createdAt, lastLoginAt'),
    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC'])
      .withMessage('sortOrder must be ASC or DESC'),
    query('role')
      .optional()
      .custom((value) => {
        const roles = value.split(',');
        const validRoles = ['admin', 'manager', 'user', 'viewer'];
        return roles.every((role: string) => validRoles.includes(role.trim()));
      })
      .withMessage('role must contain valid roles: admin, manager, user, viewer'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search query must not exceed 100 characters'),
    handleValidationErrors,
  ],
  userController.getAllUsers
);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Admin only
 * @note    Must be before /:id route to avoid conflict
 */
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  userController.getUserStats
);

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Authenticated users
 * @note    Must be before /:id route to avoid conflict
 */
router.get(
  '/me',
  authenticate,
  userController.getCurrentUser
);

/**
 * @route   PUT /api/v1/users/me/password
 * @desc    Change current user's password
 * @access  Authenticated users
 */
router.put(
  '/me/password',
  authenticate,
  [
    body('oldPassword')
      .notEmpty()
      .withMessage('Old password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('New password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('New password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('New password must contain at least one number'),
    handleValidationErrors,
  ],
  userController.changePassword
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Authenticated users (own profile) or Admin
 */
router.get(
  '/:id',
  authenticate,
  authorizeOwnerOrAdmin('id'),
  [
    param('id')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    handleValidationErrors,
  ],
  userController.getUserById
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user profile
 * @access  User (own profile) or Admin
 */
router.put(
  '/:id',
  authenticate,
  authorizeOwnerOrAdmin('id'),
  [
    param('id')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail(),
    body('firstName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('First name must not exceed 100 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Last name must not exceed 100 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'user', 'viewer'])
      .withMessage('Role must be one of: admin, manager, user, viewer')
      .custom((value, { req }) => {
        // Only admins can change roles
        if (req.user && req.user.role !== 'admin') {
          throw new Error('Only admins can change user roles');
        }
        return true;
      }),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
      .custom((value, { req }) => {
        // Only admins can change active status
        if (req.user && req.user.role !== 'admin') {
          throw new Error('Only admins can change user active status');
        }
        return true;
      }),
    handleValidationErrors,
  ],
  userController.updateUser
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin only
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  [
    param('id')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    handleValidationErrors,
  ],
  userController.deleteUser
);

export default router;
