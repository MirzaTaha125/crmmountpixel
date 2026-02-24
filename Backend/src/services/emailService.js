/**
 * EMAIL SERVICE - IMPORTANT SECURITY NOTE:
 * =========================================
 * NO AUTOMATIC EMAILS ARE SENT TO CLIENTS.
 * All client emails are MANUAL ONLY - triggered by user/admin action.
 * 
 * Automatic emails are DISABLED for:
 * - Payment confirmations (manual via sendPaymentConfirmation endpoint)
 * - Payment history updates (commented out)
 * - Client creation/updates (no emails sent)
 * 
 * Only admin notification emails are sent automatically (to admins only, not clients).
 */

import nodemailer from 'nodemailer';
import User from '../model/User.js';
import Client from '../model/Client.js';
import { decrypt } from '../utils/encryption.js';

/**
 * Creates a nodemailer transporter using user's work email credentials
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} Nodemailer transporter
 */
export async function createTransporter(userId) {
  try {
    // Get user with work password (select: false by default, so we need to explicitly select it)
    const user = await User.findById(userId).select('+workPassword');

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.workEmail || !user.workPassword) {
      throw new Error('User does not have work email configured');
    }

    // Decrypt the work password
    const decryptedPassword = decrypt(user.workPassword);

    // Hostinger SMTP configuration
    // Try port 587 first (TLS), then fallback to 465 (SSL)
    let transporter;
    let lastError;

    // Try port 587 (TLS) first - this is more commonly used
    try {
      transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 587,
        secure: false, // false for 587, true for 465
        auth: {
          user: user.workEmail,
          pass: decryptedPassword
        },
        tls: {
          // Do not fail on invalid certificates
          rejectUnauthorized: false
        },
        // Connection timeout
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      });

      // Verify connection
      await transporter.verify();
      console.log('Email transporter verified successfully on port 587 (TLS)');
    } catch (error) {
      console.log('Port 587 (TLS) failed, trying port 465 (SSL):', error.message);
      lastError = error;

      // Try port 465 (SSL) as fallback
      try {
        transporter = nodemailer.createTransport({
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true, // true for 465
          auth: {
            user: user.workEmail,
            pass: decryptedPassword
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        });

        await transporter.verify();
        console.log('Email transporter verified successfully on port 465 (SSL)');
      } catch (error2) {
        console.error('Both ports failed. Port 587 error:', lastError.message);
        console.error('Port 465 error:', error2.message);
        throw new Error(`SMTP connection failed. Port 587: ${lastError.message}, Port 465: ${error2.message}`);
      }
    }

    return transporter;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
}

/**
 * Sends an email using the user's work email account
 * @param {string} userId - The user's ID
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.toName - Recipient name (optional)
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - Email body in HTML format
 * @param {string} emailData.text - Email body in plain text (optional, will use html if not provided)
 * @param {Array} emailData.cc - CC recipients (optional)
 * @param {Array} emailData.bcc - BCC recipients (optional)
 * @returns {Promise<Object>} Email send result
 */
export async function sendEmail(userId, emailData) {
  try {
    const { to, toName, subject, html, text, cc, bcc } = emailData;

    if (!to || !subject || (!html && !text)) {
      throw new Error('Missing required email fields: to, subject, and html/text');
    }

    // Get user to get their work email (from address)
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.workEmail) {
      throw new Error('User does not have work email configured');
    }

    // Create transporter
    const transporter = await createTransporter(userId);

    // Prepare email options
    // Use workEmailName if available, otherwise use First_Name + Last_Name
    const fromName = (user.workEmailName || `${user.First_Name} ${user.Last_Name}`).trim().replace(/[<>"]/g, ''); // Remove problematic characters

    // Clean HTML content to avoid spam triggers
    let cleanHtml = html || text;
    let cleanText = text || (html ? html.replace(/<[^>]*>/g, '') : '');

    // Remove spam trigger words and improve content
    if (cleanHtml) {
      // Ensure proper HTML structure
      if (!cleanHtml.includes('<html>')) {
        cleanHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${cleanHtml}
</body>
</html>`;
      }
    }

    const mailOptions = {
      from: {
        name: fromName,
        address: user.workEmail
      },
      to: toName ? {
        name: toName.replace(/[<>"]/g, ''),
        address: to
      } : to,
      subject: subject,
      html: cleanHtml,
      text: cleanText,
      // Add reply-to as the work email
      replyTo: user.workEmail,
      // Add headers for better email deliverability
      headers: {
        'X-Mailer': 'CRM System',
        'X-Priority': '3',
        'Importance': 'normal',
        'List-Unsubscribe': `<mailto:${user.workEmail}?subject=unsubscribe>`,
        'Precedence': 'bulk'
      },
      // Add message ID with domain
      messageId: `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${user.workEmail.split('@')[1]}>`,
      // Date header
      date: new Date(),
      cc: cc,
      bcc: bcc
    };

    // Send email with detailed logging
    console.log('Attempting to send email:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html,
      hasText: !!mailOptions.text
    });

    const info = await transporter.sendMail(mailOptions);

    console.log('Email send response:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending
    });

    // Check if email was actually sent
    // Some SMTP servers return the email in 'accepted' array, others might queue it in 'pending'
    // Only throw error if email was explicitly rejected AND not accepted/pending
    const hasAccepted = info.accepted && info.accepted.length > 0;
    const hasPending = info.pending && info.pending.length > 0;
    const hasRejected = info.rejected && info.rejected.length > 0;

    // If we have accepted or pending recipients, email was sent successfully
    if (hasAccepted || hasPending) {
      console.log('Email sent successfully:', {
        accepted: info.accepted,
        pending: info.pending,
        rejected: info.rejected
      });

      // If there are rejected recipients but also accepted ones, log warning but don't fail
      if (hasRejected && hasAccepted) {
        console.warn('Some recipients were rejected, but email was sent to accepted recipients:', {
          accepted: info.accepted,
          rejected: info.rejected
        });
      }

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        pending: info.pending || []
      };
    }

    // Only throw error if email was completely rejected (no accepted or pending)
    if (hasRejected && !hasAccepted && !hasPending) {
      console.error('Email was completely rejected:', info.rejected);
      throw new Error(`Email was rejected by server: ${info.rejected.join(', ')}`);
    }

    // If no accepted, pending, or rejected info, check messageId as fallback
    // Some SMTP servers might send successfully but not populate these arrays
    if (info.messageId) {
      console.log('Email sent (messageId present, but no accepted/pending info):', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        pending: info.pending || []
      };
    }

    // Last resort: if we have a response from server, assume it was sent
    if (info.response) {
      console.log('Email sent (server response received):', info.response);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        pending: info.pending || []
      };
    }

    // Only throw error if we have no indication the email was sent
    console.error('Email send status unclear - no accepted, pending, messageId, or response');
    throw new Error('Email send status unclear - unable to confirm if email was sent');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Sends a payment confirmation email to the client
 * @param {string} userId - The user's ID (who is sending the email)
 * @param {Object} paymentData - Payment data
 * @param {string} paymentData.clientEmail - Client's email address
 * @param {string} paymentData.clientName - Client's name
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.currency - Payment currency (default: USD)
 * @param {string} paymentData.paymentMethod - Payment method
 * @param {string} paymentData.invoiceNumber - Invoice number (optional)
 * @param {string} paymentData.description - Payment description (optional)
 * @param {string} paymentData.transactionId - Transaction ID (optional)
 * @param {string} paymentData.brand - Brand name (optional)
 * @returns {Promise<Object>} Email send result
 */
export async function sendPaymentConfirmationEmail(userId, paymentData) {
  try {
    const {
      clientEmail,
      clientName,
      amount,
      currency = 'USD',
      paymentMethod,
      invoiceNumber,
      description,
      transactionId,
      brand
    } = paymentData;

    if (!clientEmail || !clientName || amount === undefined) {
      throw new Error('Missing required payment data: clientEmail, clientName, and amount are required');
    }

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);

    const brandName = brand || 'Our Team';
    const subject = `Payment Confirmation - ${invoiceNumber ? `Invoice ${invoiceNumber}` : 'Payment Received'}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f7fa; padding: 20px 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Dear ${clientName},</p>
              <p style="margin: 0 0 30px; font-size: 15px; color: #666666; line-height: 1.8;">
                Thank you for your payment! This email serves as confirmation that we have successfully received and processed your payment.
          </p>
              
              <!-- Payment Details Card -->
              <div style="background-color: #f8f9fa; border-radius: 10px; padding: 25px; margin: 30px 0; border: 1px solid #e9ecef;">
                <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #333333; border-bottom: 2px solid #667eea; padding-bottom: 12px;">Payment Details</h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Amount Paid:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 22px; font-weight: 700; color: #10b981;">${formattedAmount}</td>
            </tr>
            ${invoiceNumber ? `
            <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Invoice Number:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333; font-weight: 600;">${invoiceNumber}</td>
            </tr>
            ` : ''}
            <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Payment Method:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333;">${paymentMethod || 'N/A'}</td>
            </tr>
            ${transactionId ? `
            <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Transaction ID:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 13px; color: #666666; font-family: 'Courier New', monospace; word-break: break-all;">${transactionId}</td>
            </tr>
            ` : ''}
            <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Payment Date:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
          </table>
        </div>

              <!-- Status Badge -->
              <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 8px; padding: 16px 20px; margin: 25px 0; text-align: center; border: 1px solid #10b981;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #065f46;">
                  <span style="font-size: 20px; margin-right: 8px;">✓</span>
                  Payment Status: <span style="color: #047857;">Completed</span>
                </p>
        </div>

              <!-- Footer Message -->
              <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #e9ecef;">
                <p style="margin: 0 0 15px; font-size: 15px; color: #666666; line-height: 1.7;">
                  We appreciate your business! If you have any questions about this payment or need assistance, please don't hesitate to reach out to us.
                </p>
                <p style="margin: 20px 0 0; font-size: 15px; color: #333333;">
                  Best regards,<br>
                  <strong style="color: #667eea;">${brandName}</strong>
                </p>
        </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 12px; color: #999999;">
                This is an automated confirmation email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
Payment Confirmation

Dear ${clientName},

This email confirms that we have successfully received your payment.

Payment Details:
- Amount: ${formattedAmount}
${invoiceNumber ? `- Invoice Number: ${invoiceNumber}\n` : ''}
- Payment Method: ${paymentMethod || 'N/A'}
${transactionId ? `- Transaction ID: ${transactionId}\n` : ''}
- Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Payment Status: Completed ✓

Thank you for your payment. If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
${brandName}
    `;

    return await sendEmail(userId, {
      to: clientEmail,
      toName: clientName,
      subject: subject,
      html: html,
      text: text
    });
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    throw error;
  }
}

/**
 * Sends a welcome/notification email to a client
 * 
 * ⚠️ IMPORTANT: This function is NOT called automatically anywhere in the codebase.
 * It is available for MANUAL use only if needed in the future.
 * NO automatic client emails are sent when clients are created or updated.
 * 
 * @param {string} userId - The user's ID (who is sending the email)
 * @param {Object} clientData - Client data
 * @param {string} clientData.clientEmail - Client's email address
 * @param {string} clientData.clientName - Client's name
 * @param {string} clientData.brand - Brand name (optional)
 * @param {string} clientData.type - Email type: 'welcome' or 'update' (default: 'welcome')
 * @param {string} clientData.message - Custom message (optional)
 * @returns {Promise<Object>} Email send result
 */
export async function sendClientNotificationEmail(userId, clientData) {
  try {
    const {
      clientEmail,
      clientName,
      brand,
      type = 'welcome',
      message
    } = clientData;

    if (!clientEmail || !clientName) {
      throw new Error('Missing required client data: clientEmail and clientName are required');
    }

    const brandName = brand || 'Our Team';
    const isWelcome = type === 'welcome';
    const subject = isWelcome
      ? `Welcome to ${brandName}!`
      : `Account Update - ${brandName}`;

    const defaultMessage = isWelcome
      ? `We're excited to have you on board! Your account has been successfully created in our system.`
      : `Your account information has been updated. If you have any questions, please don't hesitate to contact us.`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #333; margin: 0;">${isWelcome ? 'Welcome!' : 'Account Update'}</h2>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 16px;">Dear ${clientName},</p>
          <p style="margin: 0 0 15px 0; line-height: 1.6;">
            ${message || defaultMessage}
          </p>
        </div>

        ${isWelcome ? `
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #2196F3;">
          <p style="margin: 0; color: #1565c0;">
            <strong>What's Next?</strong><br>
            You can now access your account and view your projects, invoices, and payment history. 
            If you have any questions or need assistance, our team is here to help.
          </p>
        </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
          <p style="margin: 0 0 10px 0;">We look forward to working with you!</p>
          <p style="margin: 0;">Best regards,<br><strong>${brandName}</strong></p>
        </div>
      </div>
    `;

    const text = `
${isWelcome ? 'Welcome!' : 'Account Update'}

Dear ${clientName},

${message || defaultMessage}

${isWelcome ? `
What's Next?
You can now access your account and view your projects, invoices, and payment history. 
If you have any questions or need assistance, our team is here to help.
` : ''}

We look forward to working with you!

Best regards,
${brandName}
    `;

    return await sendEmail(userId, {
      to: clientEmail,
      toName: clientName,
      subject: subject,
      html: html,
      text: text
    });
  } catch (error) {
    console.error('Error sending client notification email:', error);
    throw error;
  }
}
