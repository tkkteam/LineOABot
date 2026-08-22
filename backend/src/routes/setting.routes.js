import { Router } from 'express';
import * as settingController from '../controllers/settingController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'super_admin'));

router.get('/', settingController.getSettingsHandler);
router.put('/', settingController.updateSetting);

export default router;
