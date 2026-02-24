import User from '../model/User.js';
import Client from '../model/Client.js';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { decrypt } from '../utils/encryption.js';

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email using admin user's work email
const sendOTPEmail = async (email, otp) => {
  console.log('\n========== PASSWORD RESET EMAIL DEBUG ==========');
  console.log('📧 Attempting to send OTP email to:', email);
  console.log('🔑 Generated OTP:', otp);

  try {
    // Find the first admin user to send the email from
    console.log('🔍 Looking for admin user with work email...');
    const adminUser = await User.findOne({ Role: 'Admin' }).select('+workPassword');

    if (!adminUser) {
      console.error('❌ No admin user found in database');
      throw new Error('No admin user found');
    }

    console.log('✅ Found admin user:', adminUser.Email);

    if (!adminUser.workEmail) {
      console.error('❌ Admin user does not have work email configured');
      throw new Error('Admin user does not have work email configured');
    }

    if (!adminUser.workPassword) {
      console.error('❌ Admin user does not have work password configured');
      throw new Error('Admin user does not have work password configured');
    }

    console.log('✅ Admin work email:', adminUser.workEmail);
    console.log('✅ Work password is configured (encrypted)');

    console.log('🔓 Decrypting work password...');
    const decryptedPassword = decrypt(adminUser.workPassword);
    console.log('✅ Password decrypted successfully');

    // Create transporter using admin's work email
    let transporter;
    let lastError;

    // Try port 587 (TLS) first
    console.log('\n📡 Attempting SMTP connection on port 587 (TLS)...');
    try {
      transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 587,
        secure: false,
        auth: {
          user: adminUser.workEmail,
          pass: decryptedPassword
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      });

      console.log('🔄 Verifying SMTP connection on port 587...');
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully on port 587 (TLS)');
    } catch (error) {
      console.log('⚠️ Port 587 (TLS) failed:', error.message);
      lastError = error;

      // Try port 465 (SSL) as fallback
      console.log('\n📡 Attempting SMTP connection on port 465 (SSL)...');
      try {
        transporter = nodemailer.createTransport({
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          auth: {
            user: adminUser.workEmail,
            pass: decryptedPassword
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        });

        console.log('🔄 Verifying SMTP connection on port 465...');
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully on port 465 (SSL)');
      } catch (error2) {
        console.error('❌ Both SMTP ports failed!');
        console.error('   Port 587 error:', lastError.message);
        console.error('   Port 465 error:', error2.message);
        throw new Error(`SMTP connection failed: ${error2.message}`);
      }
    }

    console.log('\n📨 Preparing email message...');
    const mailOptions = {
      from: `"Security Team" <${adminUser.workEmail}>`,
      to: email,
      subject: 'Password Reset Request - Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #1a1a1a; padding: 30px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">
                        Password Reset Request
                      </h1>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 40px 30px 40px;">
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                        Dear User,
                      </p>
                      
                      <p style="margin: 0 0 25px; font-size: 15px; color: #555555; line-height: 1.6;">
                        We received a request to reset the password for your account. To proceed with the password reset, please use the verification code below:
                      </p>

                      <!-- OTP Box -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                        <tr>
                          <td style="background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 25px; text-align: center;">
                            <p style="margin: 0 0 10px; font-size: 13px; color: #6c757d; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                              Verification Code
                            </p>
                            <p style="margin: 0; font-size: 36px; font-weight: 700; color: #1a1a1a; letter-spacing: 6px; font-family: 'Courier New', Courier, monospace;">
                              ${otp}
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 25px 0 20px; font-size: 15px; color: #555555; line-height: 1.6;">
                        This verification code will expire in <strong>10 minutes</strong> for security purposes.
                      </p>

                      <!-- Security Notice -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                        <tr>
                          <td style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; border-radius: 4px;">
                            <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.5;">
                              <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or contact our support team immediately. Your account security is important to us.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 25px 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                        Best regards,<br>
                        <strong>Security Team</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0 0 8px; font-size: 12px; color: #6c757d; line-height: 1.5;">
                        This is an automated message. Please do not reply to this email.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #adb5bd;">
                        © ${new Date().getFullYear()} All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Password Reset Request - Verification Code

Dear User,

We received a request to reset the password for your account. To proceed with the password reset, please use the verification code below:

VERIFICATION CODE: ${otp}

This verification code will expire in 10 minutes for security purposes.

SECURITY NOTICE: If you did not request a password reset, please ignore this email or contact our support team immediately. Your account security is important to us.

Best regards,
Security Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} All rights reserved.`
    };

    console.log('✅ Email message prepared');
    console.log('   From:', mailOptions.from);
    console.log('   To:', mailOptions.to);
    console.log('   Subject:', mailOptions.subject);

    console.log('\n🚀 Sending email...');
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('================================================\n');

    return true;
  } catch (error) {
    console.error('\n❌ FAILED TO SEND PASSWORD RESET EMAIL');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    console.error('================================================\n');
    throw error;
  }
};

// Request password reset (send OTP)
export const requestPasswordReset = async (req, res) => {
  console.log('\n========== PASSWORD RESET REQUEST ==========');
  console.log('📥 Received password reset request');

  try {
    const { email } = req.body;
    console.log('📧 Email provided:', email);

    if (!email) {
      console.log('❌ No email provided in request');
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Search for user in User collection (admin/employees)
    console.log('🔍 Searching for user in User collection...');
    const user = await User.findOne({ Email: normalizedEmail });

    // Search for client in Client collection
    console.log('🔍 Searching for client in Client collection...');
    const client = await Client.findOne({ email: normalizedEmail });

    // Return error if account doesn't exist
    if (!user && !client) {
      console.log('❌ No user or client found with email:', email);
      console.log('   Returning error - account not found');
      console.log('================================================\n');
      return res.status(404).json({
        message: 'No account found with this email address. Please check your email and try again.'
      });
    }

    // Determine account type and log
    const accountType = user ? 'user' : 'client';
    const accountId = user ? user._id : client._id;
    const accountEmail = user ? user.Email : client.email;

    console.log('✅ Account found!');
    console.log('   Type:', accountType.toUpperCase());
    console.log('   Email:', accountEmail);
    console.log('   ID:', accountId);

    // Generate OTP
    const otp = generateOTP();
    console.log('🔑 OTP generated:', otp);

    // Store OTP with expiration (10 minutes) and account type
    const otpData = {
      otp,
      email: normalizedEmail,
      accountType, // 'user' or 'client'
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    otpStore.set(normalizedEmail, otpData);
    console.log('💾 OTP stored in memory with 10-minute expiration');
    console.log('   Account Type:', accountType);
    console.log('   Expires at:', new Date(otpData.expiresAt).toLocaleString());

    // Send OTP email
    console.log('\n📤 Attempting to send OTP email...');
    try {
      await sendOTPEmail(email, otp);
      console.log('✅ Password reset request completed successfully');
      console.log('================================================\n');
    } catch (emailError) {
      console.error('❌ Failed to send OTP email');
      console.error('   Error:', emailError.message);
      console.error('================================================\n');
      return res.status(500).json({
        message: 'Failed to send OTP email. Please try again later.'
      });
    }

    res.status(200).json({
      message: 'If an account exists with this email, an OTP has been sent.'
    });
  } catch (error) {
    console.error('\n❌ ERROR IN PASSWORD RESET REQUEST');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    console.error('================================================\n');
    res.status(500).json({ message: 'Error processing request', error: error.message });
  }
};

// Verify OTP and reset password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if OTP exists and is valid
    const otpData = otpStore.get(normalizedEmail);

    if (!otpData) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check if OTP is expired
    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Get account type from OTP data
    const accountType = otpData.accountType || 'user'; // Default to 'user' for backward compatibility
    console.log('🔍 Account type:', accountType);

    // Find account based on type
    let account;
    if (accountType === 'client') {
      console.log('🔍 Looking for client account...');
      account = await Client.findOne({ email: normalizedEmail });

      if (!account) {
        otpStore.delete(normalizedEmail);
        console.log('❌ Client not found');
        return res.status(404).json({ message: 'Account not found' });
      }

      console.log('✅ Client found:', account.email);
    } else {
      console.log('🔍 Looking for user account...');
      account = await User.findOne({ Email: normalizedEmail });

      if (!account) {
        otpStore.delete(normalizedEmail);
        console.log('❌ User not found');
        return res.status(404).json({ message: 'Account not found' });
      }

      console.log('✅ User found:', account.Email);
    }

    // Hash new password
    console.log('🔒 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password based on account type
    if (accountType === 'client') {
      account.password = hashedPassword;
      await account.save();
      console.log('✅ Client password updated successfully');
    } else {
      account.Password = hashedPassword;
      account.Confirm_Password = hashedPassword;
      await account.save();
      console.log('✅ User password updated successfully');
    }

    // Delete OTP from store
    otpStore.delete(normalizedEmail);
    console.log('🗑️ OTP deleted from store');

    res.status(200).json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

// Verify OTP (without resetting password - for validation)
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpData = otpStore.get(normalizedEmail);

    if (!otpData) {
      return res.status(400).json({ message: 'Invalid or expired OTP', valid: false });
    }

    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ message: 'OTP has expired', valid: false });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP', valid: false });
    }

    res.status(200).json({ message: 'OTP verified successfully', valid: true });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};
