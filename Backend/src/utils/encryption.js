import CryptoJS from 'crypto-js';

// Encryption key - should be in environment variables for production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-change-this-in-production';

/**
 * Encrypts a string using AES encryption
 * @param {string} text - The text to encrypt
 * @returns {string} Encrypted text
 */
export function encrypt(text) {
  if (!text) return '';
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an encrypted string
 * @param {string} encryptedText - The encrypted text to decrypt
 * @returns {string} Decrypted text
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

