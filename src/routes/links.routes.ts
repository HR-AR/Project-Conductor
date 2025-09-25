/**
 * Links Routes - Express routes for requirement linking endpoints
 */

import { Router } from 'express';
import { linksController } from '../controllers/links.controller';

const router = Router();

// Routes for requirement-specific link operations
// POST /api/v1/requirements/:id/links - Create link from requirement
router.post('/requirements/:id/links', linksController.createLink.bind(linksController));

// GET /api/v1/requirements/:id/links - Get all links for requirement
router.get('/requirements/:id/links', linksController.getRequirementLinks.bind(linksController));

// POST /api/v1/requirements/:id/links/validate - Validate potential link
router.post('/requirements/:id/links/validate', linksController.validateLink.bind(linksController));

// General link operations
// GET /api/v1/links - Get links with filtering
router.get('/links', linksController.getLinks.bind(linksController));

// GET /api/v1/links/statistics - Get link statistics
router.get('/links/statistics', linksController.getLinkStatistics.bind(linksController));

// PUT /api/v1/links/:linkId - Update existing link
router.put('/links/:linkId', linksController.updateLink.bind(linksController));

// PUT /api/v1/links/:linkId/suspect - Mark/unmark link as suspect
router.put('/links/:linkId/suspect', linksController.markLinkSuspect.bind(linksController));

// DELETE /api/v1/links/:linkId - Delete link
router.delete('/links/:linkId', linksController.deleteLink.bind(linksController));

export default router;