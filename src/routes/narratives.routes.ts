import express from 'express';
import narrativesController from '../controllers/narratives.controller';

const router = express.Router();

router.get('/:id', (req, res) => narrativesController.getLatest(req, res));
router.get('/:id/versions', (req, res) => narrativesController.listVersions(req, res));
router.get('/:id/versions/:ver', (req, res) => narrativesController.getVersion(req, res));
router.post('/:id/versions', (req, res) => narrativesController.createVersion(req, res));
router.get('/:id/render', (req, res) => narrativesController.render(req, res));

export default router;
