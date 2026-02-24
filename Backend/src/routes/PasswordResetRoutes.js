import express from 'express';
import { requestPasswordReset, resetPassword, verifyOTP } from '../controllers/PasswordResetController.js';

const router = express.Router();

// Request password reset (send OTP)
router.post('/request', requestPasswordReset);

// Verify OTP
router.post('/verify-otp', verifyOTP);

// Reset password with OTP
router.post('/reset', resetPassword);

export default router;
