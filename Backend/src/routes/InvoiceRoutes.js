import express from 'express';
import {
  createInvoice,
  getInvoices,
  deleteInvoice,
  syncInvoicePaypalStatus,
  sendInvoiceEmail,
  paypalInvoiceWebhook,
  createPaypalInvoiceForExisting,
  markInvoicePaid,
  resyncInvoiceToFinance,
  matchInvoiceClient,
  assignInvoiceToClient,
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
router.patch('/:id/mark-paid', authMiddleware, markInvoicePaid);   // Manual invoice → mark Paid
router.post('/:id/resync-finance', authMiddleware, resyncInvoiceToFinance); // Repair: re-link paid invoice to Finance
router.get('/:id/match-client',    authMiddleware, matchInvoiceClient);      // Preview: find client by invoice email
router.post('/:id/assign-client',  authMiddleware, assignInvoiceToClient);   // Commit: assign invoice + PH to client

export default router;
