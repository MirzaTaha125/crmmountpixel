import express from 'express';
import { setupUser2FA, verifyUser2FASetup, disableUser2FA } from '../controllers/AdminTwoFactorController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Admin-only routes for managing 2FA for other users
router.post('/setup-user', setupUser2FA);
router.post('/verify-user-setup', verifyUser2FASetup);
router.post('/disable-user', disableUser2FA);

export default router;
