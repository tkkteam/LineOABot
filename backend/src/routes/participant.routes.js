import { Router } from 'express';
import * as participantController from '../controllers/participantController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'super_admin'));

router.get('/', participantController.listParticipants);
router.get('/pending', participantController.listPendingSlips);
router.post('/:id/approve', participantController.approveSlip);
router.post('/:id/reject', participantController.rejectSlip);
router.post('/', participantController.addManualParticipant);
router.get('/stats', participantController.participantStats);
router.put('/:id/admin', participantController.toggleGroupAdmin);
router.delete('/:id', participantController.deleteParticipant);

export default router;
