import express from 'express';
import {
  createInvoice,
  getInvoices,
  deleteInvoice,
  syncInvoicePaypalStatus,
  sendInvoiceEmail,
  paypalInvoiceWebhook,
  createPaypalInvoiceForExisting,
} from '../controllers/InvoiceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/webhook/paypal', paypalInvoiceWebhook);           // Public — PayPal webhook
router.post('/', authMiddleware, createInvoice);
router.get('/', authMiddleware, getInvoices);
router.delete('/:id', authMiddleware, deleteInvoice);
router.get('/:id/sync-paypal', authMiddleware, syncInvoicePaypalStatus);
router.post('/:id/create-paypal', authMiddleware, createPaypalInvoiceForExisting);
router.post('/:id/send-email', authMiddleware, sendInvoiceEmail);

export default router;
