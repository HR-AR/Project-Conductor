import { Router } from 'express';
import demoController from '../controllers/demo.controller';

const router = Router();

/**
 * Demo Routes
 * Base path: /api/v1/demo
 */

// Get available demo scenarios
router.get('/scenarios', (req, res) => demoController.getAvailableScenarios(req, res));

// Seed demo data for a specific scenario
router.post('/seed', (req, res) => demoController.seedDemoData(req, res));

export default router;
