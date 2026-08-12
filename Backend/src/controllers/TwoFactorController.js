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
 * Setup 2FA - Generate secret and QR code
 * Only for Admin users
 */
export async function setup2FA(req, res) {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Unauthorized',
        error: 'User not authenticated' 
      });
    }

    // Get user with 2FA fields
    const user = await User.findById(userId).select('+twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'User does not exist' 
      });
    }

    // Only allow admins to setup 2FA
    if (user.Role !== 'Admin') {
      return res.status(403).json({ 
        message: 'Forbidden',
        error: '2FA is only available for Admin users' 
      });
    }

    // If 2FA is already enabled and verified, return error
    if (user.twoFactorEnabled && user.twoFactorVerified) {
      return res.status(400).json({ 
        message: '2FA already enabled',
        error: 'Two-factor authentication is already enabled for this account' 
      });
    }

    // Generate secret
    const secretData = generateSecret(user.Email, 'CRM System');
    
    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(secretData.otpauth_url);
    
    // Store temporary secret (expires in 10 minutes)
    tempSetupSecrets.set(userId.toString(), {
      secret: secretData.secret,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Log setup initiation
    await logUserAction(
      userId,
      '2fa_setup_initiated',
      `2FA setup initiated for ${user.First_Name} ${user.Last_Name}`,
      { email: user.Email },
      req
    );

    res.status(200).json({
      message: '2FA setup initiated',
      qrCode: qrCodeDataUrl,
      secret: secretData.secret, // Show manual entry option
      manualEntryKey: secretData.secret
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message || 'An unexpected error occurred' 
    });
  }
}

/**
 * Verify 2FA setup code and enable 2FA
 */
export async function verify2FASetup(req, res) {
  try {
    const userId = req.user?._id;
    const { code } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Unauthorized',
        error: 'User not authenticated' 
      });
    }

    if (!code || code.length !== 6) {
      return res.status(400).json({ 
        message: 'Validation error',
        error: 'Please provide a valid 6-digit code' 
      });
    }

    // Get temporary secret
    const tempSecret = tempSetupSecrets.get(userId.toString());
    
    if (!tempSecret) {
      return res.status(400).json({ 
        message: 'Setup expired',
        error: '2FA setup session expired. Please start setup again.' 
      });
    }

    // Check if expired
    if (Date.now() > tempSecret.expiresAt) {
      tempSetupSecrets.delete(userId.toString());
      return res.status(400).json({ 
        message: 'Setup expired',
        error: '2FA setup session expired. Please start setup again.' 
      });
    }

    // Verify the code
    console.log('Verifying 2FA setup code:', {
      userId: userId.toString(),
      codeLength: code?.length,
      secretLength: tempSecret.secret?.length,
      secretPrefix: tempSecret.secret?.substring(0, 10)
    });
    
    const isValid = verifyToken(tempSecret.secret, code);
    
    if (!isValid) {
      console.error('2FA verification failed:', {
        userId: userId.toString(),
        code: code,
        secretExists: !!tempSecret.secret
      });
      
      return res.status(400).json({ 
        message: 'Invalid code',
        error: 'The verification code is incorrect. Please make sure you\'re entering the current 6-digit code from your authenticator app. Codes change every 30 seconds.' 
      });
    }
    
    console.log('2FA verification successful for user:', userId.toString());

    // Get user
    const user = await User.findById(userId).select('+twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'User does not exist' 
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
    user.twoFactorSecret = tempSecret.secret;
    user.twoFactorEnabled = true;
    user.twoFactorVerified = true;
    user.twoFactorBackupCodes = backupCodesArray;
    user.twoFactorPermanentBackupCode = hashedPermanentCode;
    await user.save();

    // Clear temporary secret
    tempSetupSecrets.delete(userId.toString());

    // Log successful setup
    await logUserAction(
      userId,
      '2fa_enabled',
      `2FA enabled for ${user.First_Name} ${user.Last_Name}`,
      { email: user.Email },
      req
    );

    // Return backup codes and permanent code (only shown once)
    res.status(200).json({
      message: '2FA enabled successfully',
      backupCodes: formatBackupCodes(backupCodes),
      permanentBackupCode: permanentBackupCode,
      warning: 'Save these codes securely. They will not be shown again.'
    });
  } catch (error) {
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message || 'An unexpected error occurred' 
    });
  }
}

/**
 * Disable 2FA (requires password confirmation)
 */
export async function disable2FA(req, res) {
  try {
    const userId = req.user?._id;
    const { password } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Unauthorized',
        error: 'User not authenticated' 
      });
    }

    if (!password) {
      return res.status(400).json({ 
        message: 'Validation error',
        error: 'Password is required to disable 2FA' 
      });
    }

    // Get user with password
    const user = await User.findById(userId).select('+Password +twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'User does not exist' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.Password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid password',
        error: 'Incorrect password. Please try again.' 
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorVerified = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];
    user.twoFactorPermanentBackupCode = null;
    await user.save();

    // Log disable action
    await logUserAction(
      userId,
      '2fa_disabled',
      `2FA disabled for ${user.First_Name} ${user.Last_Name}`,
      { email: user.Email },
      req
    );

    res.status(200).json({
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message || 'An unexpected error occurred' 
    });
  }
}

/**
 * Verify 2FA code during login
 */
export async function verify2FALogin(req, res) {
  try {
    const { userId, code, backupCode } = req.body;
    
    console.log('2FA verify-login request:', {
      userId: userId,
      hasCode: !!code,
      hasBackupCode: !!backupCode,
      codeLength: code?.length,
      backupCodeLength: backupCode?.length
    });
    
    if (!userId) {
      return res.status(400).json({ 
        message: 'Validation error',
        error: 'User ID is required' 
      });
    }

    // Get user with 2FA secret and permanent backup code
    const user = await User.findById(userId).select('+twoFactorSecret +twoFactorPermanentBackupCode');
    
    if (!user) {
      console.error('User not found for 2FA verification:', userId);
      return res.status(404).json({ 
        message: 'User not found',
        error: 'User does not exist' 
      });
    }

    if (!user.twoFactorEnabled || !user.twoFactorVerified) {
      console.error('2FA not enabled for user:', userId);
      return res.status(400).json({ 
        message: '2FA not enabled',
        error: 'Two-factor authentication is not enabled for this account' 
      });
    }
    
    if (!user.twoFactorSecret) {
      console.error('2FA secret missing for user:', userId);
      return res.status(500).json({ 
        message: '2FA configuration error',
        error: '2FA is enabled but secret is missing. Please disable and re-enable 2FA.' 
      });
    }

    let isValid = false;

    // Check if using backup code
    if (backupCode) {
      // Clean and uppercase the backup code
      const cleanBackupCode = String(backupCode).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      console.log('Verifying backup code:', {
        userId: userId.toString(),
        providedCode: cleanBackupCode,
        codeLength: cleanBackupCode.length,
        totalBackupCodes: user.twoFactorBackupCodes?.length || 0,
        unusedCodes: user.twoFactorBackupCodes?.filter(bc => !bc.used).length || 0,
        hasPermanentCode: !!user.twoFactorPermanentBackupCode
      });
      
      // First check permanent backup code (12 characters)
      if (cleanBackupCode.length === 12 && user.twoFactorPermanentBackupCode) {
        try {
          const isPermanentMatch = await bcrypt.compare(cleanBackupCode, user.twoFactorPermanentBackupCode);
          console.log('Permanent backup code comparison result:', {
            userId: userId.toString(),
            providedCode: cleanBackupCode,
            codeLength: cleanBackupCode.length,
            hasPermanentCode: !!user.twoFactorPermanentBackupCode,
            isMatch: isPermanentMatch
          });
          
          if (isPermanentMatch) {
            isValid = true;
            console.log('Permanent backup code verified successfully for user:', userId.toString());
            
            // Log permanent backup code usage (doesn't get marked as used)
            await logUserAction(
              userId,
              '2fa_permanent_backup_code_used',
              `Permanent backup code used for login: ${user.First_Name} ${user.Last_Name}`,
              { email: user.Email },
              req
            );
          } else {
            console.error('Permanent backup code mismatch for user:', userId.toString());
          }
        } catch (error) {
          console.error('Error verifying permanent backup code:', error);
        }
      } else if (cleanBackupCode.length === 12 && !user.twoFactorPermanentBackupCode) {
        console.error('12-character code provided but no permanent backup code exists for user:', userId.toString());
      }
      
      // If permanent code didn't match, check regular backup codes (8 characters)
      if (!isValid && cleanBackupCode.length === 8) {
        if (!user.twoFactorBackupCodes || user.twoFactorBackupCodes.length === 0) {
          console.error('No backup codes found for user:', userId.toString());
          return res.status(400).json({ 
            message: 'No backup codes',
            error: 'No backup codes available. Please regenerate them in 2FA settings.' 
          });
        }
        
        const backupCodeObj = await verifyBackupCode(cleanBackupCode, user.twoFactorBackupCodes);
        
        if (backupCodeObj) {
          // Mark backup code as used
          backupCodeObj.used = true;
          await user.save();
          isValid = true;
          
          console.log('Backup code verified successfully for user:', userId.toString());

          // Log backup code usage
          await logUserAction(
            userId,
            '2fa_backup_code_used',
            `Backup code used for login: ${user.First_Name} ${user.Last_Name}`,
            { email: user.Email },
            req
          );
        } else {
          console.error('Backup code verification failed:', {
            userId: userId.toString(),
            providedCode: cleanBackupCode,
            availableCodes: user.twoFactorBackupCodes?.length || 0
          });
        }
      }
    } else if (code) {
      // Verify TOTP code
      if (code.length !== 6) {
        return res.status(400).json({ 
          message: 'Invalid code',
          error: 'Please provide a valid 6-digit code' 
        });
      }

      // Verify TOTP code
      const cleanCode = String(code).trim();
      console.log('Verifying 2FA login code:', {
        userId: userId.toString(),
        codeLength: cleanCode.length,
        code: cleanCode,
        secretExists: !!user.twoFactorSecret,
        secretLength: user.twoFactorSecret?.length,
        secretPrefix: user.twoFactorSecret?.substring(0, 10),
        userEmail: user.Email
      });
      
      if (!user.twoFactorSecret) {
        console.error('2FA secret not found for user:', userId.toString());
        return res.status(500).json({ 
          message: '2FA configuration error',
          error: '2FA is enabled but secret is missing. Please contact support or disable and re-enable 2FA.' 
        });
      }
      
      // Verify with multiple time windows to handle time drift
      isValid = verifyToken(user.twoFactorSecret, cleanCode);
      
      if (!isValid) {
        console.error('2FA login verification failed:', {
          userId: userId.toString(),
          code: cleanCode,
          secretLength: user.twoFactorSecret?.length,
          userEmail: user.Email
        });
        
        // Try to generate what the code should be for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          try {
            const speakeasy = (await import('speakeasy')).default;
            const expectedCode = speakeasy.totp({
              secret: user.twoFactorSecret,
              encoding: 'base32'
            });
            console.log('Expected code (for debugging only):', expectedCode);
            console.log('Provided code:', cleanCode);
            console.log('Codes match?', expectedCode === cleanCode);
          } catch (debugError) {
            console.error('Error generating debug code:', debugError);
          }
        }
      } else {
        console.log('2FA login verification successful for user:', userId.toString());
      }
    } else {
      return res.status(400).json({ 
        message: 'Validation error',
        error: 'Please provide either a 2FA code or backup code' 
      });
    }

    if (!isValid) {
      // Log failed attempt
      await logActivity({
        userId: userId,
        action: '2fa_verification_failed',
        entityType: 'User',
        entityId: userId,
        description: `Failed 2FA verification for ${user.First_Name} ${user.Last_Name}`,
        details: { email: user.Email, usedBackupCode: !!backupCode, codeLength: backupCode?.length || code?.length },
        module: 'Authentication',
        req
      });

      // Return appropriate error message based on what was used
      if (backupCode) {
        const codeLength = String(backupCode).trim().length;
        if (codeLength === 12) {
          return res.status(401).json({ 
            message: 'Invalid backup code',
            error: 'The permanent backup code is incorrect. Please check that you entered all 12 characters correctly.' 
          });
        } else if (codeLength === 8) {
          return res.status(401).json({ 
            message: 'Invalid backup code',
            error: 'The backup code is incorrect or has already been used. Each one-time backup code can only be used once.' 
          });
        } else {
          return res.status(401).json({ 
            message: 'Invalid backup code',
            error: 'Please enter a valid backup code (8 characters for one-time, 12 for permanent).' 
          });
        }
      } else {
        return res.status(401).json({ 
          message: 'Invalid code',
          error: 'The verification code is incorrect. Please make sure you\'re entering the current 6-digit code from your authenticator app. Codes change every 30 seconds.' 
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, Role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Log successful 2FA verification
    await logUserAction(
      userId,
      '2fa_verification_success',
      `2FA verified successfully: ${user.First_Name} ${user.Last_Name}`,
      { email: user.Email, usedBackupCode: !!backupCode },
      req
    );

    res.status(200).json({
      message: '2FA verification successful',
      user: {
        id: user._id,
        First_Name: user.First_Name,
        Last_Name: user.Last_Name,
        Email: user.Email,
        Role: user.Role,
        token
      }
    });
  } catch (error) {
    console.error('Error verifying 2FA login:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message || 'An unexpected error occurred' 
    });
  }
}

/**
 * Get 2FA status
 */
export async function get2FAStatus(req, res) {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Unauthorized',
        error: 'User not authenticated' 
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'User does not exist' 
      });
    }

    // Count unused backup codes
    const unusedBackupCodes = user.twoFactorBackupCodes?.filter(bc => !bc.used).length || 0;

    res.status(200).json({
      twoFactorEnabled: user.twoFactorEnabled || false,
      twoFactorVerified: user.twoFactorVerified || false,
      unusedBackupCodes: unusedBackupCodes
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message || 'An unexpected error occurred' 
    });
  }
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(req, res) {
  try {
    const userId = req.user?._id;
    const { password } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Unauthorized',
        error: 'User not authenticated' 
      });
    }

    if (!password) {
      return res.status(400).json({ 
        message: 'Validation error',
        error: 'Password is required to regenerate backup codes' 
      });
    }

    // Get user with password
    const user = await User.findById(userId).select('+Password');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'User does not exist' 
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ 
        message: '2FA not enabled',
        error: 'Two-factor authentication is not enabled for this account' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.Password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid password',
        error: 'Incorrect password. Please try again.' 
      });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await hashBackupCodes(backupCodes.map(c => c.code));
    
    // Store backup codes in database
    const backupCodesArray = hashedBackupCodes.map((hashed) => ({
      code: hashed,
      used: false,
      createdAt: new Date()
    }));

    // Generate new permanent backup code
    const permanentBackupCode = generatePermanentBackupCode();
    const hashedPermanentCode = await bcrypt.hash(permanentBackupCode, 10);

    user.twoFactorBackupCodes = backupCodesArray;
    user.twoFactorPermanentBackupCode = hashedPermanentCode;
    await user.save();

    // Log regeneration
    await logUserAction(
      userId,
      '2fa_backup_codes_regenerated',
      `Backup codes and permanent code regenerated for ${user.First_Name} ${user.Last_Name}`,
      { email: user.Email },
      req
    );

    res.status(200).json({
      message: 'Backup codes regenerated successfully',
      backupCodes: formatBackupCodes(backupCodes),
      permanentBackupCode: permanentBackupCode,
      warning: 'Save these codes securely. Old codes are no longer valid.'
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message || 'An unexpected error occurred' 
    });
  }
}

