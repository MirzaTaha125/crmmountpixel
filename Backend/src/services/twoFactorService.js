import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a secret key for TOTP
 * @param {string} email - User's email
 * @param {string} issuer - Company/service name
 * @returns {Object} Secret object with base32 secret
 */
export function generateSecret(email, issuer = 'CRM System') {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${email})`,
    issuer: issuer,
    length: 32
  });
  
  // Ensure we have a valid base32 secret
  if (!secret.base32) {
    throw new Error('Failed to generate secret');
  }
  
  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url
  };
}

/**
 * Generate QR code data URL for the secret
 * @param {string} otpauthUrl - OTP Auth URL
 * @returns {Promise<string>} QR code data URL
 */
export async function generateQRCode(otpauthUrl) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify TOTP token
 * @param {string} secret - Base32 encoded secret
 * @param {string} token - 6-digit TOTP code
 * @param {number} window - Time window (default: 2, meaning ±1 time step = 60 seconds)
 * @returns {boolean} True if token is valid
 */
export function verifyToken(secret, token, window = 2) {
  try {
    // Ensure token is a string and remove any whitespace
    const cleanToken = String(token).trim().replace(/\s/g, '');
    
    // Validate token format
    if (!/^\d{6}$/.test(cleanToken)) {
      console.error('Invalid token format:', cleanToken);
      return false;
    }

    // Verify with speakeasy
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: cleanToken,
      window: window, // Accept codes from ±1 time step (60 seconds total)
      step: 30 // TOTP step size in seconds (standard is 30)
    });
    
    if (!verified) {
      // Try with a larger window for time drift tolerance
      const verifiedWithLargeWindow = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: 4, // Try ±2 time steps (120 seconds total)
        step: 30
      });
      
      if (verifiedWithLargeWindow) {
        console.log('Token verified with extended time window');
        return true;
      }
    }
    
    return !!verified;
  } catch (error) {
    console.error('Error verifying token:', error);
    console.error('Secret length:', secret?.length);
    console.error('Token received:', token);
    return false;
  }
}

/**
 * Generate backup codes
 * @param {number} count - Number of codes to generate (default: 10)
 * @returns {Array<{code: string, hashed: string}>} Array of backup codes with hashed versions
 */
export function generateBackupCodes(count = 10) {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
    codes.push({
      code: code,
      hashed: null // Will be hashed before storage
    });
  }
  
  return codes;
}

/**
 * Generate a permanent backup code (longer, more secure)
 * @returns {string} Permanent backup code (12 characters)
 */
export function generatePermanentBackupCode() {
  // Generate 12-character alphanumeric code for permanent backup
  return crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 12);
}

/**
 * Hash backup codes using bcrypt
 * @param {Array<string>} codes - Array of plain backup codes
 * @returns {Promise<Array<string>>} Array of hashed codes
 */
export async function hashBackupCodes(codes) {
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code, 10))
  );
  return hashedCodes;
}

/**
 * Verify backup code
 * @param {string} providedCode - Code provided by user
 * @param {Array} storedBackupCodes - Array of backup code objects from database
 * @returns {Object|null} Backup code object if valid, null otherwise
 */
export async function verifyBackupCode(providedCode, storedBackupCodes) {
  if (!providedCode || !storedBackupCodes || storedBackupCodes.length === 0) {
    console.log('verifyBackupCode: Invalid input', {
      hasCode: !!providedCode,
      codeLength: providedCode?.length,
      hasStoredCodes: !!storedBackupCodes,
      storedCodesLength: storedBackupCodes?.length
    });
    return null;
  }
  
  // Clean the provided code
  const cleanCode = String(providedCode).trim().toUpperCase();
  
  if (cleanCode.length !== 8) {
    console.log('verifyBackupCode: Invalid code length', cleanCode.length);
    return null;
  }
  
  // Find unused backup codes
  const unusedCodes = storedBackupCodes.filter(bc => !bc.used);
  
  console.log('verifyBackupCode: Checking', unusedCodes.length, 'unused backup codes');
  
  for (let i = 0; i < unusedCodes.length; i++) {
    const backupCode = unusedCodes[i];
    try {
      // Compare provided code with hashed stored code
      const isMatch = await bcrypt.compare(cleanCode, backupCode.code);
      if (isMatch) {
        console.log('verifyBackupCode: Match found at index', i);
        return backupCode;
      }
    } catch (error) {
      console.error('Error verifying backup code at index', i, ':', error);
      continue;
    }
  }
  
  console.log('verifyBackupCode: No match found for code:', cleanCode);
  return null;
}

/**
 * Format backup codes for display
 * @param {Array<{code: string}>} codes - Array of backup codes
 * @returns {Array<string>} Array of formatted code strings
 */
export function formatBackupCodes(codes) {
  return codes.map(c => c.code);
}

