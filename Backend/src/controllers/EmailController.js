import { sendEmail } from '../services/emailService.js';
import User from '../model/User.js';

/**
 * Send email using authenticated user's work email
 * POST /api/emails/send
 */
export const sendEmailToClient = async (req, res) => {
  try {
    const userId = req.user._id;
    const { to, toName, subject, html, text, cc, bcc } = req.body;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        message: 'Validation error',
        error: 'Missing required fields: to, subject, and html/text are required'
      });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        message: 'Validation error',
        error: 'Invalid recipient email address'
      });
    }

    // Check if user has work email configured
    // Need to explicitly select workPassword since it has select: false in schema
    const user = await User.findById(userId).select('+workPassword');
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Debug logging (remove in production if needed)
    console.log('User work email check:', {
      userId: userId.toString(),
      hasWorkEmail: !!user.workEmail,
      workEmail: user.workEmail,
      hasWorkPassword: !!user.workPassword,
      workPasswordLength: user.workPassword ? user.workPassword.length : 0
    });

    // Check if work email and password are configured (not empty)
    if (!user.workEmail || !user.workPassword || user.workEmail.trim() === '' || user.workPassword.trim() === '') {
      console.log('Work email/password not configured for user:', userId.toString());
      return res.status(400).json({
        message: 'Configuration error',
        error: 'Please configure your work email and password in your user settings'
      });
    }

    // Send email
    const result = await sendEmail(userId, {
      to,
      toName,
      subject,
      html,
      text,
      cc,
      bcc
    });

    console.log('Email send result:', {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected
    });

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected
    });
  } catch (error) {
    console.error('Error in sendEmailToClient:', error);
    
    // Handle specific error types
    if (error.message.includes('work email configured')) {
      return res.status(400).json({
        message: 'Configuration error',
        error: 'Please configure your work email and password in your user settings'
      });
    }

    if (error.message.includes('Invalid login') || error.message.includes('authentication')) {
      return res.status(401).json({
        message: 'Authentication error',
        error: 'Invalid work email credentials. Please check your work email and password.'
      });
    }

    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        message: 'Connection error',
        error: 'Unable to connect to email server. Please try again later.'
      });
    }

    res.status(500).json({
      message: 'Error sending email',
      error: error.message || 'An unexpected error occurred'
    });
  }
};

/**
 * Test email configuration for authenticated user
 * GET /api/emails/test
 */
export const testEmailConfiguration = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('+workPassword');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (!user.workEmail || !user.workPassword) {
      return res.status(400).json({
        message: 'Configuration error',
        error: 'Work email and password not configured'
      });
    }

    // Try to create transporter (this will verify the connection)
    const { createTransporter } = await import('../services/emailService.js');
    await createTransporter(userId);

    res.status(200).json({
      success: true,
      message: 'Email configuration is valid',
      workEmail: user.workEmail
    });
  } catch (error) {
    console.error('Error testing email configuration:', error);
    
    if (error.message.includes('Invalid login') || error.message.includes('authentication')) {
      return res.status(401).json({
        message: 'Authentication error',
        error: 'Invalid work email credentials'
      });
    }

    res.status(500).json({
      message: 'Error testing email configuration',
      error: error.message || 'An unexpected error occurred'
    });
  }
};

