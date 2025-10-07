/**
 * Generation Routes - API routes for AI-powered document generation
 */

import express from 'express';
import { GenerationController } from '../controllers/generation.controller';
import { body, param, validationResult } from 'express-validator';

// Simple validation handler
const validationHandler = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

const router = express.Router();
const controller = new GenerationController();

/**
 * POST /api/v1/generation/brd-from-idea
 * Generate BRD from user idea
 */
router.post(
  '/brd-from-idea',
  [
    body('idea').notEmpty().trim().isLength({ min: 10, max: 5000 }).withMessage('Idea must be between 10 and 5000 characters'),
    body('complexity').optional().isIn(['simple', 'moderate', 'complex']).withMessage('Complexity must be simple, moderate, or complex'),
    validationHandler,
  ],
  controller.generateBRDFromIdea
);

/**
 * POST /api/v1/generation/prd-from-brd/:brdId
 * Generate PRD from approved BRD
 */
router.post(
  '/prd-from-brd/:brdId',
  [
    param('brdId').notEmpty().withMessage('BRD ID is required'),
    validationHandler,
  ],
  controller.generatePRDFromBRD
);

/**
 * POST /api/v1/generation/prd-from-idea
 * Generate PRD directly from user idea
 */
router.post(
  '/prd-from-idea',
  [
    body('idea').notEmpty().trim().isLength({ min: 10, max: 5000 }).withMessage('Idea must be between 10 and 5000 characters'),
    body('complexity').optional().isIn(['simple', 'moderate', 'complex']).withMessage('Complexity must be simple, moderate, or complex'),
    validationHandler,
  ],
  controller.generatePRDFromIdea
);

/**
 * POST /api/v1/generation/brd-from-prd/:prdId
 * Generate BRD from PRD (reverse engineering)
 */
router.post(
  '/brd-from-prd/:prdId',
  [
    param('prdId').notEmpty().withMessage('PRD ID is required'),
    validationHandler,
  ],
  controller.generateBRDFromPRD
);

/**
 * POST /api/v1/generation/regenerate-section
 * Regenerate specific section of BRD or PRD
 */
router.post(
  '/regenerate-section',
  [
    body('documentId').notEmpty().withMessage('Document ID is required'),
    body('documentType').isIn(['brd', 'prd']).withMessage('Document type must be brd or prd'),
    body('section').notEmpty().withMessage('Section name is required'),
    body('feedback').optional().isString().trim(),
    validationHandler,
  ],
  controller.regenerateSection
);

/**
 * POST /api/v1/generation/configure
 * Configure LLM provider
 */
router.post(
  '/configure',
  [
    body('provider').isIn(['mock', 'openai', 'anthropic', 'gemini']).withMessage('Invalid provider'),
    body('model').optional().isString().trim(),
    body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
    validationHandler,
  ],
  controller.configureLLM
);

/**
 * GET /api/v1/generation/providers
 * Get available LLM providers
 */
router.get('/providers', controller.getProviders);

/**
 * GET /api/v1/generation/status/:jobId
 * Get generation job status (future feature)
 */
router.get('/status/:jobId', controller.getGenerationStatus);

export default router;