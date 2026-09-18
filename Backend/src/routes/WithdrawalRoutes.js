import express from 'express';
import {
  listWithdrawals, createWithdrawal, updateWithdrawal, deleteWithdrawal,
} from '../controllers/WithdrawalController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/',       listWithdrawals);
router.post('/',      createWithdrawal);
router.put('/:id',    updateWithdrawal);
router.delete('/:id', deleteWithdrawal);

export default router;
