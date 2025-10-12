import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller';

const router = Router();

/**
 * Dashboard Routes
 * Base path: /api/v1/dashboard
 */

// Get all projects or filtered projects
router.get('/projects', (req, res) => dashboardController.getProjects(req, res));

// Get projects pending my approval
router.get('/my-approvals', (req, res) => dashboardController.getMyApprovals(req, res));

// Get dashboard statistics
router.get('/stats', (req, res) => dashboardController.getStats(req, res));

// Rebuild entire index
router.post('/rebuild-index', (req, res) => dashboardController.rebuildIndex(req, res));

export default router;
