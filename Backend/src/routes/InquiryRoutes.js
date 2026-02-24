import express from 'express';
import { createInquiry, getAllInquiries, getInquiryById, updateInquiry, deleteInquiry, convertInquiryToClient } from '../controllers/InquiryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createInquiry);
router.get('/', authMiddleware, getAllInquiries);
router.get('/:id', authMiddleware, getInquiryById);
router.put('/:id', authMiddleware, updateInquiry);
router.delete('/:id', authMiddleware, deleteInquiry);
router.post('/:id/convert', authMiddleware, convertInquiryToClient);

export default router; 