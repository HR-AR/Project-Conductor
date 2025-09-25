/**
 * Traceability Routes - Express routes for traceability matrix and analytics
 */

import { Router } from 'express';
import { traceabilityController } from '../controllers/traceability.controller';

const router = Router();

// GET /api/v1/traceability/matrix - Generate traceability matrix
router.get('/traceability/matrix', traceabilityController.getTraceabilityMatrix.bind(traceabilityController));

// GET /api/v1/traceability/analytics - Generate link analytics
router.get('/traceability/analytics', traceabilityController.getLinkAnalytics.bind(traceabilityController));

// GET /api/v1/traceability/coverage - Get coverage report with filtering
router.get('/traceability/coverage', traceabilityController.getCoverageReport.bind(traceabilityController));

// GET /api/v1/traceability/impact/:id - Get impact analysis for requirement
router.get('/traceability/impact/:id', traceabilityController.getImpactAnalysis.bind(traceabilityController));

// GET /api/v1/traceability/path/:fromId/:toId - Get traceability path between requirements
router.get('/traceability/path/:fromId/:toId', traceabilityController.getTraceabilityPath.bind(traceabilityController));

export default router;