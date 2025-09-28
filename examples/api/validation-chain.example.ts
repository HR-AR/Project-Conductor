/**
 * PATTERN: Express Validator Chains with TypeScript
 * USE WHEN: Implementing request validation in Express routes
 * KEY CONCEPTS: Validation middleware, error formatting, custom validators
 *
 * Source: Adapted from routes/requirements.routes.ts and middleware/validation.ts
 */

import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Custom validation error handler
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined,
      })),
    });
    return;
  }

  next();
};

// Rate limiting middleware factory
const createRateLimit = (
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 100
) => {
  // In production, use express-rate-limit or redis-based solution
  return (req: Request, res: Response, next: NextFunction) => {
    // Rate limiting logic here
    next();
  };
};

/**
 * Validation chains for different operations
 */
export const validationChains = {
  /**
   * Create resource validation
   *
   * Key patterns:
   * - Required field validation
   * - Type checking
   * - Custom validators
   * - Sanitization
   */
  createResource: [
    body('title')
      .notEmpty().withMessage('Title is required')
      .isString().withMessage('Title must be a string')
      .isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters')
      .trim()
      .escape(),

    body('description')
      .optional()
      .isString().withMessage('Description must be a string')
      .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters')
      .trim(),

    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority value'),

    body('dueDate')
      .optional()
      .isISO8601().withMessage('Due date must be a valid ISO 8601 date')
      .custom((value) => {
        const date = new Date(value);
        if (date < new Date()) {
          throw new Error('Due date cannot be in the past');
        }
        return true;
      }),

    body('tags')
      .optional()
      .isArray().withMessage('Tags must be an array')
      .custom((tags: string[]) => {
        if (tags.length > 10) {
          throw new Error('Maximum 10 tags allowed');
        }
        return tags.every(tag => typeof tag === 'string' && tag.length <= 50);
      }).withMessage('Each tag must be a string with max 50 characters'),

    body('metadata')
      .optional()
      .isObject().withMessage('Metadata must be an object')
      .custom((value) => {
        // Validate metadata structure
        const keys = Object.keys(value);
        if (keys.length > 20) {
          throw new Error('Metadata cannot have more than 20 properties');
        }
        return true;
      }),

    handleValidationErrors,
  ],

  /**
   * Update resource validation
   *
   * Key patterns:
   * - Partial update validation
   * - At least one field required
   * - Version conflict checking
   */
  updateResource: [
    param('id')
      .notEmpty().withMessage('Resource ID is required')
      .matches(/^[A-Z]{3}-\d{8}-\d{4}$/).withMessage('Invalid resource ID format'),

    body('title')
      .optional()
      .isString().withMessage('Title must be a string')
      .isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters')
      .trim(),

    body('status')
      .optional()
      .isIn(['draft', 'active', 'completed', 'archived']).withMessage('Invalid status'),

    body('version')
      .optional()
      .isInt({ min: 1 }).withMessage('Version must be a positive integer'),

    // Custom validator to ensure at least one field is being updated
    body().custom((value) => {
      const updateableFields = ['title', 'description', 'status', 'priority', 'dueDate'];
      const hasUpdateField = updateableFields.some(field => value[field] !== undefined);
      if (!hasUpdateField) {
        throw new Error('At least one field must be provided for update');
      }
      return true;
    }),

    handleValidationErrors,
  ],

  /**
   * List resources with pagination and filtering
   *
   * Key patterns:
   * - Query parameter validation
   * - Pagination limits
   * - Filter validation
   */
  listResources: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),

    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'title', 'priority', 'dueDate'])
      .withMessage('Invalid sort field'),

    query('sortOrder')
      .optional()
      .toUpperCase()
      .isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC'),

    query('status')
      .optional()
      .customSanitizer((value) => {
        // Convert single value or comma-separated to array
        if (typeof value === 'string') {
          return value.includes(',') ? value.split(',') : [value];
        }
        return value;
      })
      .custom((value: string[]) => {
        const validStatuses = ['draft', 'active', 'completed', 'archived'];
        return value.every(status => validStatuses.includes(status));
      }).withMessage('Invalid status filter'),

    query('dateFrom')
      .optional()
      .isISO8601().withMessage('dateFrom must be a valid ISO 8601 date'),

    query('dateTo')
      .optional()
      .isISO8601().withMessage('dateTo must be a valid ISO 8601 date')
      .custom((value, { req }) => {
        if (req.query?.dateFrom && new Date(value) < new Date(req.query.dateFrom)) {
          throw new Error('dateTo must be after dateFrom');
        }
        return true;
      }),

    query('search')
      .optional()
      .isString().withMessage('Search must be a string')
      .isLength({ min: 2, max: 100 }).withMessage('Search term must be 2-100 characters')
      .trim(),

    handleValidationErrors,
  ],

  /**
   * Bulk operation validation
   *
   * Key patterns:
   * - Array validation
   * - Action validation
   * - Batch size limits
   */
  bulkOperation: [
    body('action')
      .notEmpty().withMessage('Action is required')
      .isIn(['update', 'delete', 'archive', 'activate'])
      .withMessage('Invalid bulk action'),

    body('ids')
      .notEmpty().withMessage('IDs array is required')
      .isArray().withMessage('IDs must be an array')
      .custom((ids: string[]) => {
        if (ids.length === 0) {
          throw new Error('IDs array cannot be empty');
        }
        if (ids.length > 100) {
          throw new Error('Maximum 100 items allowed in bulk operation');
        }
        // Validate each ID format
        const idPattern = /^[A-Z]{3}-\d{8}-\d{4}$/;
        return ids.every(id => idPattern.test(id));
      }).withMessage('Invalid ID format in array'),

    body('data')
      .optional()
      .isObject().withMessage('Data must be an object when provided'),

    handleValidationErrors,
  ],
};

/**
 * Example route setup with validation
 */
export function setupRoutes(router: Router, controller: any): void {
  // Apply default rate limiting
  const defaultRateLimit = createRateLimit();
  router.use(defaultRateLimit);

  // Stricter rate limiting for write operations
  const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

  // GET endpoints
  router.get(
    '/',
    validationChains.listResources,
    controller.getResources
  );

  router.get(
    '/:id',
    param('id').matches(/^[A-Z]{3}-\d{8}-\d{4}$/),
    handleValidationErrors,
    controller.getResourceById
  );

  // POST endpoints with stricter rate limiting
  router.post(
    '/',
    writeRateLimit,
    validationChains.createResource,
    controller.createResource
  );

  router.post(
    '/bulk',
    writeRateLimit,
    validationChains.bulkOperation,
    controller.bulkOperation
  );

  // PUT endpoints
  router.put(
    '/:id',
    writeRateLimit,
    validationChains.updateResource,
    controller.updateResource
  );

  // DELETE endpoints
  router.delete(
    '/:id',
    writeRateLimit,
    param('id').matches(/^[A-Z]{3}-\d{8}-\d{4}$/),
    query('force').optional().isBoolean().toBoolean(),
    handleValidationErrors,
    controller.deleteResource
  );
}

/**
 * Custom validators for common patterns
 */
export const customValidators = {
  // Email validation with domain restriction
  isCompanyEmail: (value: string) => {
    const emailRegex = /^[^\s@]+@yourcompany\.com$/;
    if (!emailRegex.test(value)) {
      throw new Error('Must be a valid company email address');
    }
    return true;
  },

  // JSON validation
  isValidJSON: (value: string) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      throw new Error('Must be valid JSON');
    }
  },

  // Future date validation
  isFutureDate: (value: string) => {
    const date = new Date(value);
    if (date <= new Date()) {
      throw new Error('Date must be in the future');
    }
    return true;
  },
};