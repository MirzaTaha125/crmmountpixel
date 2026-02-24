import express from 'express';
import { 
  createExpense, 
  getAllExpenses, 
  getExpenseById, 
  updateExpense, 
  deleteExpense,
  getFinancialSummary 
} from '../controllers/ExpenseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createExpense);
router.get('/', authMiddleware, getAllExpenses);
router.get('/summary', authMiddleware, getFinancialSummary);
router.get('/:id', authMiddleware, getExpenseById);
router.put('/:id', authMiddleware, updateExpense);
router.delete('/:id', authMiddleware, deleteExpense);

export default router;


