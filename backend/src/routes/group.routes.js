import { Router } from 'express';
import * as groupController from '../controllers/groupController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'super_admin'));

router.get('/', groupController.listGroups);
router.get('/all', groupController.listAllGroups);
router.patch('/:id', groupController.updateGroup);
router.post('/:id/sync', groupController.syncGroup);
router.delete('/:id', groupController.deleteGroup);

export default router;
