import { Router } from 'express';
import authRoutes from './auth.routes.js';
import participantRoutes from './participant.routes.js';
import wheelRoutes from './wheel.routes.js';
import winnerRoutes from './winner.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import groupRoutes from './group.routes.js';
import settingRoutes from './setting.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/participants', participantRoutes);
router.use('/wheel', wheelRoutes);
router.use('/winners', winnerRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/groups', groupRoutes);
router.use('/settings', settingRoutes);

export default router;
