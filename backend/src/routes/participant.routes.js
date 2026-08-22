import { Router } from 'express';
import * as participantController from '../controllers/participantController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'super_admin'));

router.get('/', participantController.listParticipants);
router.get('/stats', participantController.participantStats);
router.delete('/:id', participantController.deleteParticipant);

export default router;
