/**
 * Engineering Design Routes - Express routes for Engineering Design API
 */

import { Router } from 'express';
import { EngineeringDesignController } from '../controllers/engineering-design.controller';
import { createRateLimit } from '../middleware/error-handler';
import {
  validateCreateEngineeringDesign,
  validateUpdateEngineeringDesign,
} from '../middleware/validation';

const router = Router();
const designController = new EngineeringDesignController();
const writeRateLimit = createRateLimit(15 * 60 * 1000, 20);

router.post('/', writeRateLimit, validateCreateEngineeringDesign, designController.createDesign);
router.get('/', designController.getAllDesigns);
router.get('/summary', designController.getSummary);
router.get('/prd/:prdId', designController.getDesignsByPRD);
router.get('/team/:team/capacity', designController.getTeamCapacity);
router.get('/:id', designController.getDesign);
router.put('/:id', writeRateLimit, validateUpdateEngineeringDesign, designController.updateDesign);
router.delete('/:id', writeRateLimit, designController.deleteDesign);
router.post('/:id/detect-conflicts', designController.detectConflicts);

export default router;
