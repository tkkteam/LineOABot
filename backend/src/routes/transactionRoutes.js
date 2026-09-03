import { Router } from 'express';
import { listTransactions } from '../controllers/transactionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all routes
router.use(requireAuth);

router.get('/', listTransactions);

export default router;
