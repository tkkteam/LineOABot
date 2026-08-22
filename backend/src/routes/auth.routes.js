import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Public
router.post('/login', authLimiter, authController.login);

// Authenticated
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, authController.changePassword);

// Super admin only (user management / RBAC)
router.get('/users', authenticate, requireSuperAdmin, authController.listUsers);
router.post('/users', authenticate, requireSuperAdmin, authController.createUser);
router.patch('/users/:id', authenticate, requireSuperAdmin, authController.updateUser);
router.delete('/users/:id', authenticate, requireSuperAdmin, authController.deleteUser);

export default router;
