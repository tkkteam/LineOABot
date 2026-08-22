import { Router } from 'express';
import { dashboardStats } from '../controllers/dashboardController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'super_admin'));

router.get('/', dashboardStats);

export default router;
