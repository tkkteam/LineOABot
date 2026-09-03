import { Router } from 'express';
import { listTransactions, deleteTransaction, notifyTransaction } from '../controllers/transactionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Protect all routes
router.use(authenticate);

router.get('/', listTransactions);
router.delete('/:id', deleteTransaction);
router.post('/:id/notify', notifyTransaction);

export default router;
