import express from 'express';
import {
  sendEmailToClient,
  testEmailConfiguration
} from '../controllers/EmailController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Send email endpoint
router.post('/send', sendEmailToClient);

// Test email configuration endpoint
router.get('/test', testEmailConfiguration);

export default router;

