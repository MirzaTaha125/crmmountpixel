import express from 'express';
import cors from 'cors';
import { submitPublicInquiry } from '../controllers/PublicInquiryController.js';

const router = express.Router();

// Enable CORS for all origins for this specific public route
router.use(cors());

// GET /api/public/inquiries
// Helpful response for browser checks; actual submission is POST.
router.get('/inquiries', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Public inquiry endpoint is live. Use POST to submit an inquiry.',
    submitMethod: 'POST',
    submitUrl: '/api/public/inquiries',
  });
});

// POST /api/public/inquiries
router.post('/inquiries', submitPublicInquiry);

export default router;
