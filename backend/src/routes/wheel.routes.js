import { Router } from 'express';
import * as wheelController from '../controllers/wheelController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'super_admin'));

router.post('/spin', wheelController.spin);
router.get('/data', wheelController.wheelData);

export default router;
