/**
 * Change Log Routes - Express routes for Change Log API
 */

import { Router } from 'express';
import { ChangeLogController } from '../controllers/change-log.controller';
import { createRateLimit } from '../middleware/error-handler';
import {
  validateCreateChangeLogEntry,
  validateApproveChange,
} from '../middleware/validation';

const router = Router();
const changeLogController = new ChangeLogController();
const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

router.post('/', writeRateLimit, validateCreateChangeLogEntry, changeLogController.createChangeLog);
router.get('/', changeLogController.getAllChangeLogs);
router.get('/summary', changeLogController.getSummary);
router.get('/project/:projectId/history', changeLogController.getProjectHistory);
router.get('/:id', changeLogController.getChangeLog);
router.post('/:id/approve', writeRateLimit, validateApproveChange, changeLogController.approveChange);

export default router;
