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
 * Alias for handleValidationErrors (for compatibility)
 */
export const validateRequest = handleValidationErrors;

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
      .customSanitizer((value) => {
        // Normalize camelCase to snake_case for backward compatibility
        const camelToSnakeMapping: Record<string, string> = {
          'updatedAt': 'updated_at',
          'createdAt': 'created_at',
          'dueDate': 'due_date'
        };
        return camelToSnakeMapping[value] || value;
      })
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

// ========================================
// BRD VALIDATION
// ========================================

/**
 * Create BRD validation
 */
export const validateCreateBRD = [
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters')
    .trim(),
  body('businessObjectives')
    .notEmpty()
    .withMessage('Business objectives are required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Business objectives must not exceed 10000 characters')
    .trim(),
  body('stakeholders')
    .isArray()
    .withMessage('Stakeholders must be an array')
    .notEmpty()
    .withMessage('At least one stakeholder is required'),
  body('stakeholders.*.name')
    .notEmpty()
    .withMessage('Stakeholder name is required'),
  body('stakeholders.*.role')
    .notEmpty()
    .withMessage('Stakeholder role is required'),
  body('stakeholders.*.email')
    .notEmpty()
    .withMessage('Stakeholder email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('scopeInclusions')
    .isArray()
    .withMessage('Scope inclusions must be an array'),
  body('scopeExclusions')
    .isArray()
    .withMessage('Scope exclusions must be an array'),
  body('successCriteria')
    .isArray()
    .withMessage('Success criteria must be an array'),
  body('constraints')
    .optional()
    .isArray()
    .withMessage('Constraints must be an array'),
  body('assumptions')
    .optional()
    .isArray()
    .withMessage('Assumptions must be an array'),
  body('risks')
    .optional()
    .isArray()
    .withMessage('Risks must be an array'),
  body('budget')
    .optional()
    .isObject()
    .withMessage('Budget must be an object'),
  body('budget.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget amount must be a positive number'),
  body('budget.currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  body('timeline')
    .optional()
    .isObject()
    .withMessage('Timeline must be an object'),
  body('timeline.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('timeline.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  handleValidationErrors,
];

/**
 * Update BRD validation
 */
export const validateUpdateBRD = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters')
    .trim(),
  body('businessObjectives')
    .optional()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Business objectives must not exceed 10000 characters')
    .trim(),
  body('stakeholders')
    .optional()
    .isArray()
    .withMessage('Stakeholders must be an array'),
  body('scopeInclusions')
    .optional()
    .isArray()
    .withMessage('Scope inclusions must be an array'),
  body('scopeExclusions')
    .optional()
    .isArray()
    .withMessage('Scope exclusions must be an array'),
  body('successCriteria')
    .optional()
    .isArray()
    .withMessage('Success criteria must be an array'),
  body('constraints')
    .optional()
    .isArray()
    .withMessage('Constraints must be an array'),
  body('assumptions')
    .optional()
    .isArray()
    .withMessage('Assumptions must be an array'),
  body('risks')
    .optional()
    .isArray()
    .withMessage('Risks must be an array'),
  body('budget')
    .optional()
    .isObject()
    .withMessage('Budget must be an object'),
  body('timeline')
    .optional()
    .isObject()
    .withMessage('Timeline must be an object'),
  handleValidationErrors,
];

/**
 * Approve BRD validation
 */
export const validateApproveBRD = [
  body('stakeholderId')
    .notEmpty()
    .withMessage('Stakeholder ID is required'),
  body('decision')
    .isIn(['approved', 'rejected'])
    .withMessage('Decision must be either approved or rejected'),
  body('comments')
    .optional()
    .isString()
    .withMessage('Comments must be a string'),
  handleValidationErrors,
];

// ========================================
// PRD VALIDATION
// ========================================

/**
 * Create PRD validation
 */
export const validateCreatePRD = [
  body('brdId')
    .notEmpty()
    .withMessage('BRD ID is required'),
  body('productVision')
    .notEmpty()
    .withMessage('Product vision is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Product vision must not exceed 10000 characters')
    .trim(),
  body('targetAudience')
    .notEmpty()
    .withMessage('Target audience is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Target audience must not exceed 5000 characters')
    .trim(),
  body('features')
    .isArray()
    .withMessage('Features must be an array')
    .notEmpty()
    .withMessage('At least one feature is required'),
  body('features.*.id')
    .notEmpty()
    .withMessage('Feature ID is required'),
  body('features.*.name')
    .notEmpty()
    .withMessage('Feature name is required'),
  body('features.*.description')
    .notEmpty()
    .withMessage('Feature description is required'),
  body('features.*.priority')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be one of: low, medium, high, critical'),
  body('userStories')
    .optional()
    .isArray()
    .withMessage('User stories must be an array'),
  body('acceptanceCriteria')
    .optional()
    .isArray()
    .withMessage('Acceptance criteria must be an array'),
  body('technicalConstraints')
    .optional()
    .isArray()
    .withMessage('Technical constraints must be an array'),
  body('dependencies')
    .optional()
    .isArray()
    .withMessage('Dependencies must be an array'),
  body('performanceRequirements')
    .optional()
    .isObject()
    .withMessage('Performance requirements must be an object'),
  handleValidationErrors,
];

/**
 * Update PRD validation
 */
export const validateUpdatePRD = [
  body('productVision')
    .optional()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Product vision must not exceed 10000 characters')
    .trim(),
  body('targetAudience')
    .optional()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Target audience must not exceed 5000 characters')
    .trim(),
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),
  body('userStories')
    .optional()
    .isArray()
    .withMessage('User stories must be an array'),
  body('acceptanceCriteria')
    .optional()
    .isArray()
    .withMessage('Acceptance criteria must be an array'),
  body('technicalConstraints')
    .optional()
    .isArray()
    .withMessage('Technical constraints must be an array'),
  body('dependencies')
    .optional()
    .isArray()
    .withMessage('Dependencies must be an array'),
  body('performanceRequirements')
    .optional()
    .isObject()
    .withMessage('Performance requirements must be an object'),
  handleValidationErrors,
];

/**
 * Add feature to PRD validation
 */
export const validateAddFeature = [
  body('id')
    .notEmpty()
    .withMessage('Feature ID is required'),
  body('name')
    .notEmpty()
    .withMessage('Feature name is required'),
  body('description')
    .notEmpty()
    .withMessage('Feature description is required'),
  body('priority')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be one of: low, medium, high, critical'),
  body('estimatedEffort')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated effort must be a positive integer'),
  body('status')
    .optional()
    .isIn(['proposed', 'approved', 'in_progress', 'completed', 'deferred'])
    .withMessage('Invalid status'),
  handleValidationErrors,
];

/**
 * Add user story validation
 */
export const validateAddUserStory = [
  body('id')
    .notEmpty()
    .withMessage('User story ID is required'),
  body('asA')
    .notEmpty()
    .withMessage('User role is required'),
  body('iWant')
    .notEmpty()
    .withMessage('User want is required'),
  body('soThat')
    .notEmpty()
    .withMessage('User benefit is required'),
  body('acceptanceCriteria')
    .isArray()
    .withMessage('Acceptance criteria must be an array'),
  body('relatedFeatureIds')
    .optional()
    .isArray()
    .withMessage('Related feature IDs must be an array'),
  handleValidationErrors,
];

// ========================================
// ENGINEERING DESIGN VALIDATION
// ========================================

/**
 * Create Engineering Design validation
 */
export const validateCreateEngineeringDesign = [
  body('prdId')
    .notEmpty()
    .withMessage('PRD ID is required'),
  body('architecture')
    .notEmpty()
    .withMessage('Architecture is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Architecture must not exceed 10000 characters')
    .trim(),
  body('technologyStack')
    .isArray()
    .withMessage('Technology stack must be an array')
    .notEmpty()
    .withMessage('At least one technology is required'),
  body('dataModel')
    .optional()
    .isObject()
    .withMessage('Data model must be an object'),
  body('apiDesign')
    .optional()
    .isObject()
    .withMessage('API design must be an object'),
  body('securityConsiderations')
    .optional()
    .isArray()
    .withMessage('Security considerations must be an array'),
  body('scalabilityPlan')
    .optional()
    .isString()
    .withMessage('Scalability plan must be a string'),
  body('estimates')
    .isArray()
    .withMessage('Estimates must be an array'),
  body('estimates.*.featureId')
    .notEmpty()
    .withMessage('Feature ID is required for estimate'),
  body('estimates.*.hoursEstimate')
    .isInt({ min: 1 })
    .withMessage('Hours estimate must be a positive integer'),
  body('estimates.*.complexityLevel')
    .isIn(['low', 'medium', 'high', 'very_high'])
    .withMessage('Invalid complexity level'),
  body('risks')
    .optional()
    .isArray()
    .withMessage('Risks must be an array'),
  handleValidationErrors,
];

/**
 * Update Engineering Design validation
 */
export const validateUpdateEngineeringDesign = [
  body('architecture')
    .optional()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Architecture must not exceed 10000 characters')
    .trim(),
  body('technologyStack')
    .optional()
    .isArray()
    .withMessage('Technology stack must be an array'),
  body('dataModel')
    .optional()
    .isObject()
    .withMessage('Data model must be an object'),
  body('apiDesign')
    .optional()
    .isObject()
    .withMessage('API design must be an object'),
  body('securityConsiderations')
    .optional()
    .isArray()
    .withMessage('Security considerations must be an array'),
  body('scalabilityPlan')
    .optional()
    .isString()
    .withMessage('Scalability plan must be a string'),
  body('estimates')
    .optional()
    .isArray()
    .withMessage('Estimates must be an array'),
  body('risks')
    .optional()
    .isArray()
    .withMessage('Risks must be an array'),
  handleValidationErrors,
];

// ========================================
// CONFLICT VALIDATION
// ========================================

/**
 * Create Conflict validation
 */
export const validateCreateConflict = [
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters')
    .trim(),
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Description must not exceed 10000 characters')
    .trim(),
  body('type')
    .isIn(['scope_creep', 'resource_constraint', 'timeline_conflict', 'technical_limitation', 'stakeholder_disagreement', 'budget_overrun'])
    .withMessage('Invalid conflict type'),
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be one of: low, medium, high, critical'),
  body('affectedStakeholders')
    .isArray()
    .withMessage('Affected stakeholders must be an array'),
  body('relatedDocuments')
    .optional()
    .isArray()
    .withMessage('Related documents must be an array'),
  handleValidationErrors,
];

/**
 * Add conflict comment validation
 */
export const validateAddConflictComment = [
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment content must be between 1 and 2000 characters')
    .trim(),
  body('commentedBy')
    .notEmpty()
    .withMessage('Commenter ID is required'),
  handleValidationErrors,
];

/**
 * Add resolution option validation
 */
export const validateAddResolutionOption = [
  body('title')
    .notEmpty()
    .withMessage('Option title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Description must not exceed 5000 characters')
    .trim(),
  body('proposedBy')
    .notEmpty()
    .withMessage('Proposer ID is required'),
  body('impact')
    .optional()
    .isString()
    .withMessage('Impact must be a string'),
  body('estimatedCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated cost must be a positive number'),
  body('estimatedTimeImpact')
    .optional()
    .isString()
    .withMessage('Estimated time impact must be a string'),
  handleValidationErrors,
];

/**
 * Vote on resolution validation
 */
export const validateVoteOnResolution = [
  body('optionId')
    .notEmpty()
    .withMessage('Option ID is required'),
  body('votedBy')
    .notEmpty()
    .withMessage('Voter ID is required'),
  body('vote')
    .isIn(['approve', 'reject', 'abstain'])
    .withMessage('Vote must be one of: approve, reject, abstain'),
  body('reasoning')
    .optional()
    .isString()
    .withMessage('Reasoning must be a string'),
  handleValidationErrors,
];

/**
 * Resolve conflict validation
 */
export const validateResolveConflict = [
  body('resolutionSummary')
    .notEmpty()
    .withMessage('Resolution summary is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Resolution summary must not exceed 5000 characters')
    .trim(),
  body('selectedOptionId')
    .optional()
    .isString()
    .withMessage('Selected option ID must be a string'),
  body('resolvedBy')
    .notEmpty()
    .withMessage('Resolver ID is required'),
  handleValidationErrors,
];

// ========================================
// CHANGE LOG VALIDATION
// ========================================

/**
 * Create Change Log Entry validation
 */
export const validateCreateChangeLogEntry = [
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required'),
  body('item')
    .notEmpty()
    .withMessage('Item is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Item must be between 1 and 500 characters')
    .trim(),
  body('change')
    .notEmpty()
    .withMessage('Change description is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Change must not exceed 5000 characters')
    .trim(),
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Reason must not exceed 5000 characters')
    .trim(),
  body('impact')
    .notEmpty()
    .withMessage('Impact is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Impact must not exceed 5000 characters')
    .trim(),
  body('category')
    .isIn(['scope', 'timeline', 'budget', 'technical', 'process'])
    .withMessage('Category must be one of: scope, timeline, budget, technical, process'),
  body('phase')
    .isIn(['pushed_to_phase_2', 'simplified', 'removed', 'added', 'modified'])
    .withMessage('Phase must be one of: pushed_to_phase_2, simplified, removed, added, modified'),
  body('relatedConflictId')
    .optional()
    .isString()
    .withMessage('Related conflict ID must be a string'),
  body('documentsBefore')
    .optional()
    .isArray()
    .withMessage('Documents before must be an array'),
  body('documentsAfter')
    .optional()
    .isArray()
    .withMessage('Documents after must be an array'),
  handleValidationErrors,
];

/**
 * Approve Change validation
 */
export const validateApproveChange = [
  body('stakeholderId')
    .notEmpty()
    .withMessage('Stakeholder ID is required'),
  body('decision')
    .isIn(['approved', 'rejected'])
    .withMessage('Decision must be either approved or rejected'),
  body('comments')
    .optional()
    .isString()
    .withMessage('Comments must be a string'),
  handleValidationErrors,
];