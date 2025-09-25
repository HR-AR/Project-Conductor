/**
 * Request Validation Middleware using express-validator
 */

import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './error-handler';

/**
 * Middleware to handle validation results
 */
export const handleValidationErrors = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

/**
 * Common validation rules
 */
export const validationRules = {
  // ID validation (supports both UUID and custom format REQ-YYYYMMDD-XXXX)
  id: (field: string) =>
    param(field)
      .matches(/^(REQ|SES|AUD|[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})-\d{8}-\d{4}$|^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/)
      .withMessage(`${field} must be a valid ID`),

  // UUID validation (deprecated - use id instead)
  uuid: (field: string) =>
    param(field).isUUID(4).withMessage(`${field} must be a valid UUID`),

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sortBy')
      .optional()
      .isIn(['title', 'status', 'priority', 'created_at', 'updated_at', 'due_date'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC'])
      .withMessage('Sort order must be ASC or DESC'),
  ],

  // Requirement filters
  requirementFilters: [
    query('status')
      .optional()
      .custom((value) => {
        const statuses = Array.isArray(value) ? value : [value];
        const validStatuses = ['draft', 'active', 'completed', 'archived', 'cancelled'];
        return statuses.every((status: string) => validStatuses.includes(status));
      })
      .withMessage('Invalid status values'),
    query('priority')
      .optional()
      .custom((value) => {
        const priorities = Array.isArray(value) ? value : [value];
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        return priorities.every((priority: string) => validPriorities.includes(priority));
      })
      .withMessage('Invalid priority values'),
    query('assignedTo')
      .optional()
      .custom((value) => {
        const ids = Array.isArray(value) ? value : [value];
        return ids.every((id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id));
      })
      .withMessage('Invalid assignedTo UUIDs'),
    query('createdBy')
      .optional()
      .custom((value) => {
        const ids = Array.isArray(value) ? value : [value];
        return ids.every((id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id));
      })
      .withMessage('Invalid createdBy UUIDs'),
    query('tags')
      .optional()
      .custom((value) => {
        const tags = Array.isArray(value) ? value : [value];
        return tags.every((tag: string) => typeof tag === 'string' && tag.length > 0);
      })
      .withMessage('Tags must be non-empty strings'),
    query('dueDateFrom')
      .optional()
      .isISO8601()
      .withMessage('dueDateFrom must be a valid ISO 8601 date'),
    query('dueDateTo')
      .optional()
      .isISO8601()
      .withMessage('dueDateTo must be a valid ISO 8601 date'),
    query('search')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Search query must be between 1 and 200 characters'),
  ],
};

/**
 * Create requirement validation
 */
export const validateCreateRequirement = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Description must not exceed 10000 characters')
    .trim(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be one of: low, medium, high, critical'),
  body('assignedTo')
    .optional()
    .isUUID(4)
    .withMessage('AssignedTo must be a valid UUID'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  body('estimatedEffort')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated effort must be a positive integer'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags: string[]) => {
      return tags.every(tag => typeof tag === 'string' && tag.length > 0);
    })
    .withMessage('All tags must be non-empty strings'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  handleValidationErrors,
];

/**
 * Update requirement validation
 */
export const validateUpdateRequirement = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Description must not exceed 10000 characters')
    .trim(),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'completed', 'archived', 'cancelled'])
    .withMessage('Status must be one of: draft, active, completed, archived, cancelled'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be one of: low, medium, high, critical'),
  body('assignedTo')
    .optional()
    .isUUID(4)
    .withMessage('AssignedTo must be a valid UUID'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  body('estimatedEffort')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated effort must be a positive integer'),
  body('actualEffort')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Actual effort must be a non-negative integer'),
  body('completionPercentage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Completion percentage must be between 0 and 100'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags: string[]) => {
      return tags.every(tag => typeof tag === 'string' && tag.length > 0);
    })
    .withMessage('All tags must be non-empty strings'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  handleValidationErrors,
];

/**
 * Get requirements validation
 */
export const validateGetRequirements = [
  ...validationRules.pagination,
  ...validationRules.requirementFilters,
  handleValidationErrors,
];

/**
 * Get requirement by ID validation
 */
export const validateGetRequirementById = [
  validationRules.id('id'),
  handleValidationErrors,
];

/**
 * Delete requirement validation
 */
export const validateDeleteRequirement = [
  validationRules.id('id'),
  handleValidationErrors,
];

/**
 * Get requirement versions validation
 */
export const validateGetRequirementVersions = [
  validationRules.id('id'),
  handleValidationErrors,
];

// ========================================
// COMMENT VALIDATION
// ========================================

/**
 * Create comment validation
 */
export const validateCreateComment = [
  validationRules.id('id'), // requirement ID
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment content must be between 1 and 2000 characters')
    .trim(),
  body('parentCommentId')
    .optional()
    .matches(/^CMT-\d{8}-\d{4}$/)
    .withMessage('Parent comment ID must be a valid comment ID'),
  handleValidationErrors,
];

/**
 * Update comment validation
 */
export const validateUpdateComment = [
  param('id')
    .matches(/^CMT-\d{8}-\d{4}$/)
    .withMessage('Comment ID must be a valid comment ID'),
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment content must be between 1 and 2000 characters')
    .trim(),
  handleValidationErrors,
];

/**
 * Get comments validation
 */
export const validateGetComments = [
  validationRules.id('id'), // requirement ID
  query('parentCommentId')
    .optional()
    .matches(/^CMT-\d{8}-\d{4}$/)
    .withMessage('Parent comment ID must be a valid comment ID'),
  query('isRootOnly')
    .optional()
    .isBoolean()
    .withMessage('isRootOnly must be a boolean'),
  query('includeDeleted')
    .optional()
    .isBoolean()
    .withMessage('includeDeleted must be a boolean'),
  query('userId')
    .optional()
    .isLength({ min: 1 })
    .withMessage('User ID must be provided'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  handleValidationErrors,
];

/**
 * Get comment by ID validation
 */
export const validateGetCommentById = [
  param('id')
    .matches(/^CMT-\d{8}-\d{4}$/)
    .withMessage('Comment ID must be a valid comment ID'),
  handleValidationErrors,
];

/**
 * Delete comment validation
 */
export const validateDeleteComment = [
  param('id')
    .matches(/^CMT-\d{8}-\d{4}$/)
    .withMessage('Comment ID must be a valid comment ID'),
  handleValidationErrors,
];