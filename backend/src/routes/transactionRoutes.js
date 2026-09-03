import { Router } from 'express';
import { listTransactions } from '../controllers/transactionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Protect all routes
router.use(authenticate);

router.get('/', listTransactions);

export default router;
