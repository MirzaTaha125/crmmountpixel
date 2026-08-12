import express from 'express';
import {
  getClientPaymentHistory,
  getUserPaymentHistory,
  addPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
  getPaymentStatistics
} from '../controllers/PaymentHistoryController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get payment history for a specific client
router.get('/client/:clientId', getClientPaymentHistory);

// Get all payment history for user's assigned clients
router.get('/', getUserPaymentHistory);

// Get payment statistics
router.get('/statistics', getPaymentStatistics);

// Add new payment record
router.post('/', addPaymentRecord);

// Update payment record
router.put('/:id', updatePaymentRecord);

// Delete payment record
router.delete('/:id', deletePaymentRecord);

export default router;