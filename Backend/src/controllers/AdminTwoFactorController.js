import User from '../model/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
    generateSecret,
    generateQRCode,
    verifyToken,
    generateBackupCodes,
    hashBackupCodes,
    verifyBackupCode,
    formatBackupCodes,
    generatePermanentBackupCode
} from '../services/twoFactorService.js';
import { logActivity, logUserAction } from '../services/activityLogService.js';

// Store temporary 2FA setup secrets (in production, use Redis or similar)
const tempSetupSecrets = new Map();

/**
 * Setup 2FA for another user (Admin only)
 * Allows admins to set up 2FA for any user
 */
export async function setupUser2FA(req, res) {
    try {
        const adminId = req.user?._id;
        const { targetUserId } = req.body;

        if (!adminId) {
            return res.status(401).json({
                message: 'Unauthorized',
                error: 'User not authenticated'
            });
        }

        // Get admin user
        const admin = await User.findById(adminId);

        if (!admin || admin.Role !== 'Admin') {
            return res.status(403).json({
                message: 'Forbidden',
                error: 'Only admins can set up 2FA for other users'
            });
        }

        if (!targetUserId) {
            return res.status(400).json({
                message: 'Validation error',
                error: 'Target user ID is required'
            });
        }

        // Get target user with 2FA fields
        const targetUser = await User.findById(targetUserId).select('+twoFactorSecret');

        if (!targetUser) {
            return res.status(404).json({
                message: 'User not found',
                error: 'Target user does not exist'
            });
        }

        // If 2FA is already enabled and verified, return error
        if (targetUser.twoFactorEnabled && targetUser.twoFactorVerified) {
            return res.status(400).json({
                message: '2FA already enabled',
                error: 'Two-factor authentication is already enabled for this user'
            });
        }

        // Generate secret
        const secretData = generateSecret(targetUser.Email, 'CRM System');

        // Generate QR code
        const qrCodeDataUrl = await generateQRCode(secretData.otpauth_url);

        // Store temporary secret (expires in 30 minutes for admin setup)
        tempSetupSecrets.set(targetUserId.toString(), {
            secret: secretData.secret,
            expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
            setupBy: adminId.toString()
        });

        // Log setup initiation
        await logUserAction(
            adminId,
            '2fa_setup_initiated_for_user',
            `Admin ${admin.First_Name} ${admin.Last_Name} initiated 2FA setup for ${targetUser.First_Name} ${targetUser.Last_Name}`,
            {
                targetUserId: targetUserId,
                targetEmail: targetUser.Email,
                adminEmail: admin.Email
            },
            req
        );

        res.status(200).json({
            message: '2FA setup initiated for user',
            qrCode: qrCodeDataUrl,
            secret: secretData.secret,
            manualEntryKey: secretData.secret,
            userEmail: targetUser.Email,
            userName: `${targetUser.First_Name} ${targetUser.Last_Name}`
        });
    } catch (error) {
        console.error('Error setting up 2FA for user:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message || 'An unexpected error occurred'
        });
    }
}

/**
 * Verify and enable 2FA for another user (Admin only)
 */
export async function verifyUser2FASetup(req, res) {
    try {
        const adminId = req.user?._id;
        const { targetUserId, code } = req.body;

        if (!adminId) {
            return res.status(401).json({
                message: 'Unauthorized',
                error: 'User not authenticated'
            });
        }

        // Get admin user
        const admin = await User.findById(adminId);

        if (!admin || admin.Role !== 'Admin') {
            return res.status(403).json({
                message: 'Forbidden',
                error: 'Only admins can verify 2FA setup for other users'
            });
        }

        if (!targetUserId || !code || code.length !== 6) {
            return res.status(400).json({
                message: 'Validation error',
                error: 'Target user ID and valid 6-digit code are required'
            });
        }

        // Get temporary secret
        const tempSecret = tempSetupSecrets.get(targetUserId.toString());

        if (!tempSecret) {
            return res.status(400).json({
                message: 'Setup expired',
                error: '2FA setup session expired. Please start setup again.'
            });
        }

        // Check if expired
        if (Date.now() > tempSecret.expiresAt) {
            tempSetupSecrets.delete(targetUserId.toString());
            return res.status(400).json({
                message: 'Setup expired',
                error: '2FA setup session expired. Please start setup again.'
            });
        }

        // Verify the code
        const isValid = verifyToken(tempSecret.secret, code);

        if (!isValid) {
            return res.status(400).json({
                message: 'Invalid code',
                error: 'The verification code is incorrect. Please make sure you\'re entering the current 6-digit code from the authenticator app.'
            });
        }

        // Get target user
        const targetUser = await User.findById(targetUserId).select('+twoFactorSecret');

        if (!targetUser) {
            return res.status(404).json({
                message: 'User not found',
                error: 'Target user does not exist'
            });
        }

        // Generate backup codes
        const backupCodes = generateBackupCodes(10);
        const hashedBackupCodes = await hashBackupCodes(backupCodes.map(c => c.code));

        // Store backup codes in database
        const backupCodesArray = hashedBackupCodes.map((hashed, index) => ({
            code: hashed,
            used: false,
            createdAt: new Date()
        }));

        // Generate permanent backup code
        const permanentBackupCode = generatePermanentBackupCode();
        const hashedPermanentCode = await bcrypt.hash(permanentBackupCode, 10);

        // Save secret and enable 2FA
        targetUser.twoFactorSecret = tempSecret.secret;
        targetUser.twoFactorEnabled = true;
        targetUser.twoFactorVerified = true;
        targetUser.twoFactorBackupCodes = backupCodesArray;
        targetUser.twoFactorPermanentBackupCode = hashedPermanentCode;
        await targetUser.save();

        // Clear temporary secret
        tempSetupSecrets.delete(targetUserId.toString());

        // Log successful setup
        await logUserAction(
            adminId,
            '2fa_enabled_for_user',
            `Admin ${admin.First_Name} ${admin.Last_Name} enabled 2FA for ${targetUser.First_Name} ${targetUser.Last_Name}`,
            {
                targetUserId: targetUserId,
                targetEmail: targetUser.Email,
                adminEmail: admin.Email
            },
            req
        );

        // Return backup codes and permanent code (only shown once)
        res.status(200).json({
            message: '2FA enabled successfully for user',
            backupCodes: formatBackupCodes(backupCodes),
            permanentBackupCode: permanentBackupCode,
            warning: 'Save these codes securely and provide them to the user. They will not be shown again.',
            userEmail: targetUser.Email,
            userName: `${targetUser.First_Name} ${targetUser.Last_Name}`
        });
    } catch (error) {
        console.error('Error verifying 2FA setup for user:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message || 'An unexpected error occurred'
        });
    }
}

/**
 * Disable 2FA for another user (Admin only)
 */
export async function disableUser2FA(req, res) {
    try {
        const adminId = req.user?._id;
        const { targetUserId } = req.body;

        if (!adminId) {
            return res.status(401).json({
                message: 'Unauthorized',
                error: 'User not authenticated'
            });
        }

        // Get admin user
        const admin = await User.findById(adminId);

        if (!admin || admin.Role !== 'Admin') {
            return res.status(403).json({
                message: 'Forbidden',
                error: 'Only admins can disable 2FA for other users'
            });
        }

        if (!targetUserId) {
            return res.status(400).json({
                message: 'Validation error',
                error: 'Target user ID is required'
            });
        }

        // Get target user
        const targetUser = await User.findById(targetUserId).select('+twoFactorSecret');

        if (!targetUser) {
            return res.status(404).json({
                message: 'User not found',
                error: 'Target user does not exist'
            });
        }

        // Disable 2FA
        targetUser.twoFactorEnabled = false;
        targetUser.twoFactorVerified = false;
        targetUser.twoFactorSecret = null;
        targetUser.twoFactorBackupCodes = [];
        targetUser.twoFactorPermanentBackupCode = null;
        await targetUser.save();

        // Log disable action
        await logUserAction(
            adminId,
            '2fa_disabled_for_user',
            `Admin ${admin.First_Name} ${admin.Last_Name} disabled 2FA for ${targetUser.First_Name} ${targetUser.Last_Name}`,
            {
                targetUserId: targetUserId,
                targetEmail: targetUser.Email,
                adminEmail: admin.Email
            },
            req
        );

        res.status(200).json({
            message: '2FA disabled successfully for user',
            userEmail: targetUser.Email,
            userName: `${targetUser.First_Name} ${targetUser.Last_Name}`
        });
    } catch (error) {
        console.error('Error disabling 2FA for user:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message || 'An unexpected error occurred'
        });
    }
}
