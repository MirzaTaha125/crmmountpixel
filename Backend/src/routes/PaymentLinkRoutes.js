import express from 'express';
import {
  createPaymentLink,
  getPaymentLinkById,
  getAllPaymentLinks,
  updatePaymentLink,
  updatePaymentLinkStatus,
  deletePaymentLink,
  completePayment,
  sendPaymentConfirmation,
  syncPaypalStatus,
  paypalWebhook
} from '../controllers/PaymentLinkController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/webhook/paypal', paypalWebhook);              // PayPal webhook (public, no auth)
router.post('/', authMiddleware, createPaymentLink);
router.get('/', authMiddleware, getAllPaymentLinks);
router.get('/:linkId', getPaymentLinkById);                 // Public — client payment page
router.post('/:linkId/complete', completePayment);          // Public — legacy / manual fallback
router.post('/:linkId/send-confirmation', authMiddleware, sendPaymentConfirmation);
router.get('/:linkId/sync-paypal', authMiddleware, syncPaypalStatus); // Admin syncs PayPal status
router.put('/:linkId', authMiddleware, updatePaymentLink);
router.put('/:linkId/status', authMiddleware, updatePaymentLinkStatus);
router.delete('/:linkId', authMiddleware, deletePaymentLink);

export default router;
