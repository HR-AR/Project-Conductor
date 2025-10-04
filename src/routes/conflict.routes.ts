/**
 * Conflict Routes - Express routes for Conflict Resolution API
 */

import { Router } from 'express';
import { ConflictController } from '../controllers/conflict.controller';
import { createRateLimit } from '../middleware/error-handler';
import {
  validateCreateConflict,
  validateAddConflictComment,
  validateAddResolutionOption,
  validateVoteOnResolution,
  validateResolveConflict,
} from '../middleware/validation';

const router = Router();
const conflictController = new ConflictController();
const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

router.post('/', writeRateLimit, validateCreateConflict, conflictController.createConflict);
router.get('/', conflictController.getAllConflicts);
router.get('/summary', conflictController.getSummary);
router.get('/project/:projectId/analytics', conflictController.getAnalytics);
router.get('/:id', conflictController.getConflict);
router.put('/:id', writeRateLimit, conflictController.updateConflict);
router.delete('/:id', writeRateLimit, conflictController.deleteConflict);
router.post('/:id/comments', writeRateLimit, validateAddConflictComment, conflictController.addComment);
router.post('/:id/options', writeRateLimit, validateAddResolutionOption, conflictController.addOption);
router.post('/:id/options/:optionId/vote', writeRateLimit, validateVoteOnResolution, conflictController.vote);
router.post('/:id/resolve', writeRateLimit, validateResolveConflict, conflictController.resolve);

export default router;
