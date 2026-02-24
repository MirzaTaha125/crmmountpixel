import express from 'express';
import { createPaymentLink, getPaymentLinkById, getAllPaymentLinks, updatePaymentLink, updatePaymentLinkStatus, deletePaymentLink, completePayment, sendPaymentConfirmation } from '../controllers/PaymentLinkController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to routes that need authentication
router.post('/', authMiddleware, createPaymentLink);
router.get('/', authMiddleware, getAllPaymentLinks);
router.get('/:linkId', getPaymentLinkById); // This one doesn't need auth as it's for public payment links
router.post('/:linkId/complete', completePayment); // Public route for completing payment (called after PayPal success)
router.post('/:linkId/send-confirmation', authMiddleware, sendPaymentConfirmation); // Send payment confirmation email
router.put('/:linkId', authMiddleware, updatePaymentLink);
router.put('/:linkId/status', authMiddleware, updatePaymentLinkStatus);
router.delete('/:linkId', authMiddleware, deletePaymentLink);

export default router; 