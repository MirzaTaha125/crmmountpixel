import express from 'express';
import { createInquiry, createInquiriesBulk, getAllInquiries, getInquiryById, updateInquiry, deleteInquiry, convertInquiryToClient } from '../controllers/InquiryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createInquiry);
// Before '/:id' handlers below so 'bulk' is never read as an id.
router.post('/bulk', authMiddleware, createInquiriesBulk);
router.get('/', authMiddleware, getAllInquiries);
router.get('/:id', authMiddleware, getInquiryById);
router.put('/:id', authMiddleware, updateInquiry);
router.delete('/:id', authMiddleware, deleteInquiry);
router.post('/:id/convert', authMiddleware, convertInquiryToClient);

export default router; 