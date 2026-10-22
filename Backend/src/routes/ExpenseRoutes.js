import express from 'express';
import { 
  createExpense, 
  getAllExpenses, 
  getExpenseById, 
  updateExpense, 
  deleteExpense,
  getFinancialSummary 
} from '../controllers/ExpenseController.js';
import { authMiddleware, staffOnly } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.use(authMiddleware, staffOnly);

router.post('/', requirePermission('add_expenses'), createExpense);
router.get('/', requirePermission('view_expenses'), getAllExpenses);
router.get('/summary', requirePermission('view_expenses'), getFinancialSummary);
router.get('/:id', requirePermission('view_expenses'), getExpenseById);
router.put('/:id', requirePermission('edit_expenses'), updateExpense);
router.delete('/:id', requirePermission('delete_expenses'), deleteExpense);

export default router;


