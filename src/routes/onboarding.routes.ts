import { Router } from 'express';
import onboardingController from '../controllers/onboarding.controller.js';

const router = Router();

/**
 * @route POST /api/v1/onboarding/create
 * @desc Create a new project from onboarding wizard
 * @access Public (in production, should be authenticated)
 */
router.post('/create', (req, res) => onboardingController.createProject(req, res));

/**
 * @route GET /api/v1/onboarding/templates
 * @desc Get project templates for quick start
 * @access Public
 */
router.get('/templates', (req, res) => onboardingController.getTemplates(req, res));

export default router;
