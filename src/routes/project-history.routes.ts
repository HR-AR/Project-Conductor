/**
 * Project History Routes
 * Defines API endpoints for project tracking and history
 */

import express from 'express';
import * as projectHistoryController from '../controllers/project-history.controller';

const router = express.Router();

// GET /api/v1/projects/summary - Must come before /:id to avoid conflicts
router.get('/summary', projectHistoryController.getProjectSummary);

// GET /api/v1/projects - List all projects with filters
router.get('/', projectHistoryController.getProjects);

// GET /api/v1/projects/:id - Get single project
router.get('/:id', projectHistoryController.getProjectById);

// GET /api/v1/projects/:id/details - Get project details with traceability
router.get('/:id/details', projectHistoryController.getProjectDetails);

// GET /api/v1/projects/:id/timeline - Get project timeline
router.get('/:id/timeline', projectHistoryController.getProjectTimeline);

// GET /api/v1/projects/:id/similar - Get similar projects
router.get('/:id/similar', projectHistoryController.getSimilarProjects);

// GET /api/v1/projects/:id1/compare/:id2 - Compare two projects
router.get('/:id1/compare/:id2', projectHistoryController.compareProjects);

// POST /api/v1/projects - Create new project
router.post('/', projectHistoryController.createProject);

// PUT /api/v1/projects/:id - Update project
router.put('/:id', projectHistoryController.updateProject);

export default router;