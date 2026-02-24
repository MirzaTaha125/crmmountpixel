import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  setup2FA,
  verify2FASetup,
  disable2FA,
  verify2FALogin,
  get2FAStatus,
  regenerateBackupCodes
} from '../controllers/TwoFactorController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Setup 2FA (generate secret and QR code)
router.post('/setup', setup2FA);

// Verify setup code and enable 2FA
router.post('/verify-setup', verify2FASetup);

// Disable 2FA (requires password)
router.post('/disable', disable2FA);

// Get 2FA status
router.get('/status', get2FAStatus);

// Regenerate backup codes
router.post('/regenerate-backup', regenerateBackupCodes);

// Verify 2FA during login (doesn't require full auth, uses temporary session)
// This will be handled separately in login flow
export const verify2FALoginRoute = verify2FALogin;

export default router;

