import { Router } from 'express';
import * as winnerController from '../controllers/winnerController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'super_admin'));

router.get('/', winnerController.listWinners);
router.get('/export', winnerController.exportWinners);
router.delete('/:id', winnerController.deleteWinner);

export default router;
