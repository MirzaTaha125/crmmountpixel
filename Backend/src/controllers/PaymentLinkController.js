import PaymentLink from '../model/PaymentLink.js';
import PaymentHistory from '../model/PaymentHistory.js';
import Client from '../model/Client.js';
import Assignment from '../model/Assignment.js';
import User from '../model/User.js';
import { sendPaymentConfirmationEmail, sendEmail } from '../services/emailService.js';
import { logPaymentLinkAction, logPaymentAction, logActivity } from '../services/activityLogService.js';
import { createAndSendPaypalInvoice, getPaypalInvoiceStatus, cancelPaypalInvoice } from '../services/paypalService.js';

/**
 * Sends payment notification email to all admin users
 * @param {Object} paymentData - Payment data
 * @param {string} paymentData.clientName - Client name
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.invoiceNumber - Invoice number (optional)
 * @param {string} paymentData.packageName - Package name
 * @param {string} paymentData.paymentMethod - Payment method
 * @param {string} paymentData.linkId - Payment link ID
 */
async function sendAdminPaymentNotification(paymentData) {
  try {
    // Find all admin users
    const adminUsers = await User.find({ Role: 'Admin' }).select('Email First_Name Last_Name workEmail workPassword');
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found to send payment notification');
      return;
    }

    // Find an admin user with work email configured (to use as sender)
    const senderAdmin = adminUsers.find(admin => admin.workEmail && admin.workEmail.trim() !== '');
    
    if (!senderAdmin) {
      console.log('No admin user with work email configured found. Cannot send payment notification.');
      return;
    }

    // Get admin email addresses
    const adminEmails = adminUsers
      .map(admin => admin.Email)
      .filter(email => email && email.trim() !== '');

    if (adminEmails.length === 0) {
      console.log('No admin email addresses found');
      return;
    }

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(paymentData.amount);

    const subject = `Payment Received - ${paymentData.clientName} - ${formattedAmount}${paymentData.invoiceNumber ? ` (Invoice: ${paymentData.invoiceNumber})` : ''}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #333; margin: 0;">Payment Notification</h2>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 16px;">
            A new payment has been received.
          </p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Payment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Client Name:</td>
              <td style="padding: 8px 0; text-align: right;">${paymentData.clientName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Amount:</td>
              <td style="padding: 8px 0; text-align: right; font-size: 18px; color: #4CAF50; font-weight: bold;">${formattedAmount}</td>
            </tr>
            ${paymentData.invoiceNumber ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Invoice Number:</td>
              <td style="padding: 8px 0; text-align: right;">${paymentData.invoiceNumber}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Package:</td>
              <td style="padding: 8px 0; text-align: right;">${paymentData.packageName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Payment Method:</td>
              <td style="padding: 8px 0; text-align: right;">${paymentData.paymentMethod || 'Credit Card'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Payment Link ID:</td>
              <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${paymentData.linkId || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Date:</td>
              <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #4CAF50;">
          <p style="margin: 0; color: #2e7d32; font-weight: bold;">✓ Payment Status: Completed</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
          <p style="margin: 0;">This is an automated notification from the CRM system.</p>
        </div>
      </div>
    `;

    const text = `
Payment Notification

A new payment has been received.

Payment Details:
- Client Name: ${paymentData.clientName || 'N/A'}
- Amount: ${formattedAmount}
${paymentData.invoiceNumber ? `- Invoice Number: ${paymentData.invoiceNumber}\n` : ''}- Package: ${paymentData.packageName || 'N/A'}
- Payment Method: ${paymentData.paymentMethod || 'Credit Card'}
- Payment Link ID: ${paymentData.linkId || 'N/A'}
- Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}

Payment Status: Completed ✓

This is an automated notification from the CRM system.
    `;

    // Send email to all admins using the sender admin's work email
    for (const adminEmail of adminEmails) {
      try {
        await sendEmail(senderAdmin._id, {
          to: adminEmail,
          toName: adminUsers.find(a => a.Email === adminEmail)?.First_Name || 'Admin',
          subject: subject,
          html: html,
          text: text
        });
        console.log(`Payment notification sent to admin: ${adminEmail}`);
      } catch (emailError) {
        console.error(`Error sending payment notification to ${adminEmail}:`, emailError);
        // Continue sending to other admins even if one fails
      }
    }
  } catch (error) {
    console.error('Error sending admin payment notification:', error);
    // Don't throw error - this is a notification, shouldn't fail the payment process
  }
}

export const createPaymentLink = async (req, res) => {
  try {
    const { clientName, clientId, clientEmail, packageName, packageDescription, packagePrice, additionalAmount, additionalDescription, total, brand } = req.body;
    
    // Validate required fields
    if (!clientName || !packageName || packagePrice === undefined || total === undefined) {
      return res.status(400).json({ message: 'Missing required fields: clientName, packageName, packagePrice, and total are required' });
    }

    // Validate data types - convert strings to numbers if needed
    const numPackagePrice = typeof packagePrice === 'string' ? parseFloat(packagePrice) : packagePrice;
    const numTotal = typeof total === 'string' ? parseFloat(total) : total;
    const numAdditionalAmount = additionalAmount ? (typeof additionalAmount === 'string' ? parseFloat(additionalAmount) : additionalAmount) : 0;

    if (isNaN(numPackagePrice) || isNaN(numTotal)) {
      return res.status(400).json({ message: 'packagePrice and total must be valid numbers' });
    }

    if (additionalAmount && isNaN(numAdditionalAmount)) {
      return res.status(400).json({ message: 'additionalAmount must be a valid number' });
    }

    const linkId = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    
    // Try to find client by name or email if clientId is not provided
    let resolvedClientId = clientId;
    let clientBrand = brand && brand.trim() !== '' ? brand.trim() : '';
    
    // Get client to retrieve brand
    let foundClient = null;
    if (resolvedClientId) {
      try {
        foundClient = await Client.findById(resolvedClientId);
        if (foundClient && foundClient.brand) {
          clientBrand = foundClient.brand;
        }
      } catch (findError) {
        console.error('Error finding client by ID:', findError);
      }
    } else {
      try {
        const clientQuery = {};
        if (clientName) {
          clientQuery.name = { $regex: new RegExp(`^${clientName}$`, 'i') };
        }
        if (clientEmail) {
          clientQuery.email = clientEmail.toLowerCase().trim();
        }
        
        if (Object.keys(clientQuery).length > 0) {
          foundClient = await Client.findOne(clientQuery);
          if (foundClient) {
            resolvedClientId = foundClient._id;
            if (foundClient.brand) {
              clientBrand = foundClient.brand;
            }
          }
        }
      } catch (findError) {
        console.error('Error finding client by name/email:', findError);
      }
    }

    // Generate invoice number if we have a clientId (either provided or found)
    let invoiceNumber = '';
    if (resolvedClientId) {
      invoiceNumber = 'INV-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 10000);
    }

    const paymentLink = new PaymentLink({ 
      clientName, 
      clientId: resolvedClientId, 
      clientEmail,
      packageName, 
      packageDescription, 
      packagePrice: numPackagePrice, 
      additionalAmount: numAdditionalAmount, 
      additionalDescription, 
      total: numTotal, 
      linkId, 
      invoiceNumber,
      brand: clientBrand
    });
    await paymentLink.save();

    // Log activity (only for admin actions)
    if (req.user && req.user.Role === 'Admin') {
      await logPaymentLinkAction(
        req.user._id,
        'payment_link_created',
        paymentLink._id,
        `Created payment link for ${paymentLink.clientName} - Amount: $${paymentLink.total}`,
        { linkId: paymentLink.linkId, clientName: paymentLink.clientName, total: paymentLink.total, invoiceNumber: paymentLink.invoiceNumber },
        req
      );
    }

    // Create a PaymentHistory record if we have a clientId (either provided or found)
    if (resolvedClientId) {
      // Get userId from the request (assuming it's set by auth middleware)
      const userId = req.user?._id || req.user?.id;
      
      if (userId) {
        try {
          await PaymentHistory.create({
            clientId: resolvedClientId,
            userId,
            amount: numTotal,
            currency: 'USD',
            paymentMethod: 'Other', // Default to 'Other' as it's a valid enum value, will be updated when payment is actually made
            description: `Payment Link: ${packageName}${numAdditionalAmount > 0 ? ` + $${numAdditionalAmount}` : ''}${additionalDescription ? ` - ${additionalDescription}` : ''}`,
            status: 'Pending',
            invoiceNumber: invoiceNumber,
            paymentDate: new Date(),
            notes: `Payment link generated - Link ID: ${linkId}`,
            brand: clientBrand
          });
        } catch (historyError) {
          console.error('Error creating payment history:', historyError);
          // Don't fail the entire request if payment history creation fails
        }
      } else {
        console.warn('No userId found in request, skipping PaymentHistory creation');
      }
    }

    // Create PayPal invoice and send it to the client (non-blocking — don't fail if PayPal errors)
    if (paymentLink.clientEmail) {
      try {
        const paypal = await createAndSendPaypalInvoice(paymentLink);
        paymentLink.paypalInvoiceId  = paypal.invoiceId;
        paymentLink.paypalInvoiceUrl = paypal.invoiceUrl;
        paymentLink.paypalInvoiceStatus = paypal.status;
        await paymentLink.save();
        console.log(`PayPal invoice created & sent: ${paypal.invoiceId}`);
      } catch (paypalError) {
        console.error('PayPal invoice creation failed (non-fatal):', paypalError.message);
      }
    }

    res.status(201).json(paymentLink);
  } catch (err) {
    console.error('Error creating payment link:', err);
    res.status(500).json({ message: 'Error creating payment link', error: err.message });
  }
};

export const getPaymentLinkById = async (req, res) => {
  try {
    const paymentLink = await PaymentLink.findOne({ linkId: req.params.linkId });
    if (!paymentLink) return res.status(404).json({ message: 'Payment link not found' });
    if (paymentLink.status !== 'Paid' && paymentLink.isExpired()) {
      if (paymentLink.status !== 'Expired') {
        paymentLink.status = 'Expired';
        await paymentLink.save();
      }
    }
    
    // If brand is not set, try to get it from the client
    if (!paymentLink.brand || paymentLink.brand.trim() === '') {
      if (paymentLink.clientId) {
        try {
          const client = await Client.findById(paymentLink.clientId);
          if (client && client.brand) {
            paymentLink.brand = client.brand;
            // Optionally save it for future requests
            await paymentLink.save();
          }
        } catch (clientError) {
          console.error('Error fetching client brand:', clientError);
        }
      }
    }
    
    res.json(paymentLink);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching payment link', error: err.message });
  }
};

export const getAllPaymentLinks = async (req, res) => {
  try {
    let filter = {};
    
    // For non-admin users, filter by assigned clients
    if (req.user?.Role !== 'Admin') {
      // Find all assignments for this user
      const assignments = await Assignment.find({ userId: req.user._id });
      const clientIds = assignments.map(a => a.clientId);
      
      if (clientIds.length > 0) {
        // Only show payment links for clients assigned to this user
        filter.clientId = { $in: clientIds };
      } else {
        // User has no assignments, return empty array
        return res.json([]);
      }
    }
    
    // Filter by brand
    if (req.query.brand) {
      filter.brand = req.query.brand;
    }
    
    // Filter by month and year
    if (req.query.month && req.query.year) {
      const month = parseInt(req.query.month);
      const year = parseInt(req.query.year);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      filter.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const paymentLinks = await PaymentLink.find(filter).sort({ createdAt: -1 });
    // Update expired status in memory (and DB if needed)
    const now = new Date();
    await Promise.all(paymentLinks.map(async (link) => {
      if (link.status !== 'Paid' && link.status !== 'Expired' && link.isExpired()) {
        link.status = 'Expired';
        await link.save();
      }
    }));
    res.json(paymentLinks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching payment links', error: err.message });
  }
};

export const updatePaymentLink = async (req, res) => {
  try {
    const { linkId } = req.params;
    const {
      clientName,
      clientId,
      clientEmail,
      packageName,
      packageDescription,
      packagePrice,
      additionalAmount,
      additionalDescription,
      total,
      brand
    } = req.body;

    const paymentLink = await PaymentLink.findOne({ linkId });
    if (!paymentLink) {
      return res.status(404).json({ message: 'Payment link not found' });
    }

    // Don't allow editing if already paid
    if (paymentLink.status === 'Paid') {
      return res.status(400).json({ message: 'Cannot edit a paid payment link' });
    }

    // Get brand from client if clientId is provided or updated
    let clientBrand = brand && brand.trim() !== '' ? brand.trim() : paymentLink.brand;
    const updatedClientId = clientId !== undefined ? clientId : paymentLink.clientId;
    
    if (updatedClientId) {
      try {
        const foundClient = await Client.findById(updatedClientId);
        if (foundClient && foundClient.brand) {
          clientBrand = foundClient.brand;
        }
      } catch (findError) {
        console.error('Error finding client for brand:', findError);
      }
    }

    // Update fields
    if (clientName !== undefined) paymentLink.clientName = clientName;
    if (clientId !== undefined) paymentLink.clientId = clientId;
    if (clientEmail !== undefined) paymentLink.clientEmail = clientEmail;
    if (packageName !== undefined) paymentLink.packageName = packageName;
    if (packageDescription !== undefined) paymentLink.packageDescription = packageDescription;
    if (packagePrice !== undefined) paymentLink.packagePrice = packagePrice;
    if (additionalAmount !== undefined) paymentLink.additionalAmount = additionalAmount;
    if (additionalDescription !== undefined) paymentLink.additionalDescription = additionalDescription;
    if (total !== undefined) paymentLink.total = total;
    paymentLink.brand = clientBrand;

    await paymentLink.save();

    // Update corresponding PaymentHistory record if it exists
    if (paymentLink.invoiceNumber) {
      try {
        await PaymentHistory.findOneAndUpdate(
          { invoiceNumber: paymentLink.invoiceNumber },
          {
            amount: total,
            description: `Payment Link: ${packageName}${additionalAmount ? ` + $${additionalAmount}` : ''}${additionalDescription ? ` - ${additionalDescription}` : ''}`,
            clientId: clientId || paymentLink.clientId
          },
          { new: true }
        );
      } catch (historyError) {
        console.error('Error updating payment history:', historyError);
        // Don't fail the request if payment history update fails
      }
    }

    res.json({ message: 'Payment link updated successfully', paymentLink });
  } catch (err) {
    console.error('Error updating payment link:', err);
    res.status(500).json({ message: 'Error updating payment link', error: err.message });
  }
};

export const updatePaymentLinkStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    // Get the old payment link first to check previous status
    const oldPaymentLink = await PaymentLink.findOne({ linkId: req.params.linkId });
    if (!oldPaymentLink) return res.status(404).json({ message: 'Payment link not found' });
    
    const previousStatus = oldPaymentLink.status;
    
    // Update the payment link
    const updateData = { status };
    // Set paidAt date when status is changed to 'Paid' and it wasn't already paid
    if (status === 'Paid' && previousStatus !== 'Paid') {
      updateData.paidAt = new Date();
    }
    const paymentLink = await PaymentLink.findOneAndUpdate(
      { linkId: req.params.linkId },
      updateData,
      { new: true }
    );
    
    // Update corresponding PaymentHistory record if it exists
    let updatedPaymentHistory = null;
    if (paymentLink.clientId && paymentLink.invoiceNumber) {
      try {
        const paymentHistoryUpdate = {
          status: status === 'Paid' ? 'Completed' : status === 'Failed' ? 'Failed' : 'Pending',
          paymentMethod: status === 'Paid' ? 'Credit Card' : 'Other', // Update with actual payment method when paid
          notes: `Payment link status updated to ${status} - Link ID: ${paymentLink.linkId}`
        };
        
        updatedPaymentHistory = await PaymentHistory.findOneAndUpdate(
          { invoiceNumber: paymentLink.invoiceNumber },
          paymentHistoryUpdate,
          { new: true }
        ).populate('clientId', 'name email brand');
      } catch (historyError) {
        console.error('Error updating payment history:', historyError);
        // Don't fail the request if payment history update fails
      }
    }

    // Log payment completion when status is updated to 'Paid'
    if (status === 'Paid' && previousStatus !== 'Paid') {
      const logUserId = req.user ? req.user._id : (paymentLink.clientId || null);
      
      await logActivity({
        userId: logUserId,
        action: 'payment_completed',
        entityType: 'PaymentLink',
        entityId: paymentLink._id,
        description: `Payment completed for ${paymentLink.clientName} - Amount: $${paymentLink.total}${paymentLink.invoiceNumber ? ` (Invoice: ${paymentLink.invoiceNumber})` : ''}`,
        details: {
          linkId: paymentLink.linkId,
          clientId: paymentLink.clientId,
          clientName: paymentLink.clientName,
          total: paymentLink.total,
          invoiceNumber: paymentLink.invoiceNumber,
          paymentMethod: 'Credit Card',
          paidBy: req.user ? `${req.user.First_Name} ${req.user.Last_Name}` : 'Client'
        },
        module: 'Payments',
        req
      });

      // Send admin notification email
      let paymentMethod = 'Credit Card';
      if (updatedPaymentHistory && updatedPaymentHistory.paymentMethod) {
        paymentMethod = updatedPaymentHistory.paymentMethod;
            }
      
      await sendAdminPaymentNotification({
        clientName: paymentLink.clientName,
              amount: paymentLink.total,
              invoiceNumber: paymentLink.invoiceNumber,
        packageName: paymentLink.packageName,
        paymentMethod: paymentMethod,
        linkId: paymentLink.linkId
      });
    }

    // IMPORTANT: NO AUTOMATIC CLIENT EMAILS
    // Payment confirmation email is sent MANUALLY ONLY via the sendPaymentConfirmation endpoint
    // This ensures no automatic emails are sent to clients
    
    res.json(paymentLink);
  } catch (err) {
    res.status(500).json({ message: 'Error updating payment link', error: err.message });
  }
};

// Public endpoint for completing payment (called after successful PayPal payment)
export const completePayment = async (req, res) => {
  try {
    const { linkId } = req.params;
    const paymentLink = await PaymentLink.findOne({ linkId });
    
    if (!paymentLink) {
      return res.status(404).json({ message: 'Payment link not found' });
    }

    // Only allow updating to 'Paid' status if currently 'Pending'
    if (paymentLink.status !== 'Pending') {
      return res.status(400).json({ message: `Payment link is already ${paymentLink.status}` });
    }

    // Update payment link status to 'Paid' and set paidAt date
    paymentLink.status = 'Paid';
    paymentLink.paidAt = new Date();
    await paymentLink.save();

    // Log payment completion (for both admin and client payments)
    // This is a public endpoint, so req.user might not exist (client payment)
    // Use clientId if available, otherwise use system user
    const logUserId = req.user ? req.user._id : (paymentLink.clientId || null);
    
    await logActivity({
      userId: logUserId,
      action: 'payment_completed',
      entityType: 'PaymentLink',
      entityId: paymentLink._id,
      description: `Payment completed for ${paymentLink.clientName} - Amount: $${paymentLink.total}${paymentLink.invoiceNumber ? ` (Invoice: ${paymentLink.invoiceNumber})` : ''}`,
      details: { 
        linkId: paymentLink.linkId, 
        clientId: paymentLink.clientId,
        clientName: paymentLink.clientName, 
        total: paymentLink.total, 
        invoiceNumber: paymentLink.invoiceNumber,
        paymentMethod: 'Credit Card',
        paidBy: req.user ? `${req.user.First_Name} ${req.user.Last_Name}` : 'Client'
      },
      module: 'Payments',
      req
    });

    // Update corresponding PaymentHistory record if it exists
    let updatedPaymentHistory = null;
    if (paymentLink.clientId && paymentLink.invoiceNumber) {
      try {
        updatedPaymentHistory = await PaymentHistory.findOneAndUpdate(
          { invoiceNumber: paymentLink.invoiceNumber },
          {
            status: 'Completed',
            paymentMethod: 'Credit Card', // PayPal payments are processed as Credit Card
            notes: `Payment completed via payment link - Link ID: ${paymentLink.linkId}`
          },
          { new: true }
        ).populate('clientId', 'name email brand');
      } catch (historyError) {
        console.error('Error updating payment history:', historyError);
        // Don't fail the request if payment history update fails
      }
    }

    // Send admin notification email
    let paymentMethod = 'Credit Card';
    if (updatedPaymentHistory && updatedPaymentHistory.paymentMethod) {
      paymentMethod = updatedPaymentHistory.paymentMethod;
    }
    
    await sendAdminPaymentNotification({
      clientName: paymentLink.clientName,
              amount: paymentLink.total,
              invoiceNumber: paymentLink.invoiceNumber,
      packageName: paymentLink.packageName,
      paymentMethod: paymentMethod,
      linkId: paymentLink.linkId
    });

    // IMPORTANT: NO AUTOMATIC CLIENT EMAILS
    // Payment confirmation email is sent MANUALLY ONLY via the sendPaymentConfirmation endpoint
    // This ensures no automatic emails are sent to clients
    
    res.json({ message: 'Payment completed successfully', paymentLink });
  } catch (err) {
    console.error('Error completing payment:', err);
    res.status(500).json({ message: 'Error completing payment', error: err.message });
  }
};

export const sendPaymentConfirmation = async (req, res) => {
  try {
    const { linkId } = req.params;
    const paymentLink = await PaymentLink.findOne({ linkId });
    
    if (!paymentLink) {
      return res.status(404).json({ message: 'Payment link not found' });
    }

    // Only allow sending confirmation for paid payments
    if (paymentLink.status !== 'Paid') {
      return res.status(400).json({ message: 'Payment confirmation can only be sent for paid payments' });
    }

    if (!paymentLink.clientId) {
      return res.status(400).json({ message: 'Payment link does not have an associated client' });
    }

    // Get client information
    const client = await Client.findById(paymentLink.clientId).select('name email brand');
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (!client.email) {
      return res.status(400).json({ message: 'Client does not have an email address' });
    }

    // Get userId from request (the user sending the email)
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get payment method from payment history if available
    let paymentMethod = 'Credit Card';
    let transactionId = null;
    if (paymentLink.invoiceNumber) {
      try {
        const paymentHistory = await PaymentHistory.findOne({ invoiceNumber: paymentLink.invoiceNumber });
        if (paymentHistory) {
          paymentMethod = paymentHistory.paymentMethod || 'Credit Card';
          transactionId = paymentHistory.transactionId || null;
        }
      } catch (historyError) {
        console.error('Error fetching payment history:', historyError);
      }
    }

    // Send payment confirmation email
    await sendPaymentConfirmationEmail(userId, {
      clientEmail: client.email,
      clientName: client.name || paymentLink.clientName,
      amount: paymentLink.total,
      currency: 'USD',
      paymentMethod: paymentMethod,
      invoiceNumber: paymentLink.invoiceNumber,
      description: paymentLink.packageName + (paymentLink.additionalAmount > 0 ? ` + Additional: $${paymentLink.additionalAmount}` : ''),
      transactionId: transactionId,
      brand: client.brand || paymentLink.brand || ''
    });

    res.json({ message: 'Payment confirmation email sent successfully' });
  } catch (err) {
    console.error('Error sending payment confirmation email:', err);
    res.status(500).json({ message: 'Error sending payment confirmation email', error: err.message });
  }
};

export const deletePaymentLink = async (req, res) => {
  try {
    const result = await PaymentLink.findOneAndDelete({ linkId: req.params.linkId });
    if (!result) return res.status(404).json({ message: 'Payment link not found' });
    
    // Log activity (only for admin actions)
    if (req.user && req.user.Role === 'Admin') {
      await logPaymentLinkAction(
        req.user._id,
        'payment_link_deleted',
        result._id,
        `Deleted payment link for ${result.clientName} - Amount: $${result.total}`,
        { linkId: result.linkId, clientName: result.clientName, total: result.total },
        req
      );
    }
    
    // Also delete the corresponding PaymentHistory record by invoiceNumber
    if (result.invoiceNumber) {
      await PaymentHistory.deleteOne({ invoiceNumber: result.invoiceNumber });
    }

    // Cancel PayPal invoice if one exists
    if (result.paypalInvoiceId && result.paypalInvoiceStatus !== 'PAID') {
      await cancelPaypalInvoice(result.paypalInvoiceId, 'Invoice deleted from CRM');
    }

    res.json({ message: 'Payment link deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting payment link', error: err.message });
  }
};

// Sync PayPal invoice status with our DB (called from admin panel or on page load)
export const syncPaypalStatus = async (req, res) => {
  try {
    const paymentLink = await PaymentLink.findOne({ linkId: req.params.linkId });
    if (!paymentLink) return res.status(404).json({ message: 'Payment link not found' });
    if (!paymentLink.paypalInvoiceId) return res.status(400).json({ message: 'No PayPal invoice linked' });

    const { status, invoiceUrl, paidAt } = await getPaypalInvoiceStatus(paymentLink.paypalInvoiceId);

    paymentLink.paypalInvoiceStatus = status;
    if (invoiceUrl) paymentLink.paypalInvoiceUrl = invoiceUrl;

    // If PayPal says PAID but our record isn't — sync it
    if (status === 'PAID' && paymentLink.status !== 'Paid') {
      paymentLink.status = 'Paid';
      paymentLink.paidAt = paidAt ? new Date(paidAt) : new Date();

      if (paymentLink.clientId && paymentLink.invoiceNumber) {
        await PaymentHistory.findOneAndUpdate(
          { invoiceNumber: paymentLink.invoiceNumber },
          { status: 'Completed', paymentMethod: 'PayPal', notes: 'Marked paid via PayPal invoice sync' }
        );
      }
      await sendAdminPaymentNotification({
        clientName: paymentLink.clientName,
        amount: paymentLink.total,
        invoiceNumber: paymentLink.invoiceNumber,
        packageName: paymentLink.packageName,
        paymentMethod: 'PayPal',
        linkId: paymentLink.linkId
      });
    }

    await paymentLink.save();
    res.json({ paypalInvoiceStatus: status, paypalInvoiceUrl: paymentLink.paypalInvoiceUrl, status: paymentLink.status });
  } catch (err) {
    console.error('Error syncing PayPal status:', err);
    res.status(500).json({ message: 'Error syncing PayPal status', error: err.message });
  }
};

// PayPal webhook — called by PayPal when invoice status changes
export const paypalWebhook = async (req, res) => {
  try {
    const event = req.body;
    const eventType = event?.event_type;

    if (!eventType) return res.status(400).json({ message: 'Invalid webhook payload' });

    // Acknowledge immediately so PayPal doesn't retry
    res.status(200).json({ received: true });

    const resource = event.resource || {};
    const paypalInvoiceId = resource.id;
    if (!paypalInvoiceId) return;

    const paymentLink = await PaymentLink.findOne({ paypalInvoiceId });
    if (!paymentLink) {
      console.log(`Webhook: No payment link found for PayPal invoice ${paypalInvoiceId}`);
      return;
    }

    if (eventType === 'INVOICING.INVOICE.PAID') {
      paymentLink.paypalInvoiceStatus = 'PAID';
      if (paymentLink.status !== 'Paid') {
        paymentLink.status = 'Paid';
        paymentLink.paidAt = new Date();

        if (paymentLink.clientId && paymentLink.invoiceNumber) {
          await PaymentHistory.findOneAndUpdate(
            { invoiceNumber: paymentLink.invoiceNumber },
            { status: 'Completed', paymentMethod: 'PayPal', notes: `Paid via PayPal invoice — ID: ${paypalInvoiceId}` }
          );
          await logActivity({
            userId: paymentLink.clientId,
            action: 'payment_completed',
            entityType: 'PaymentLink',
            entityId: paymentLink._id,
            description: `PayPal invoice paid for ${paymentLink.clientName} — $${paymentLink.total}`,
            details: { paypalInvoiceId, invoiceNumber: paymentLink.invoiceNumber },
            module: 'Payments'
          });
        }
        await sendAdminPaymentNotification({
          clientName: paymentLink.clientName,
          amount: paymentLink.total,
          invoiceNumber: paymentLink.invoiceNumber,
          packageName: paymentLink.packageName,
          paymentMethod: 'PayPal',
          linkId: paymentLink.linkId
        });
      }
    } else if (eventType === 'INVOICING.INVOICE.CANCELLED') {
      paymentLink.paypalInvoiceStatus = 'CANCELLED';
    } else if (eventType === 'INVOICING.INVOICE.REFUNDED') {
      paymentLink.paypalInvoiceStatus = 'REFUNDED';
      paymentLink.status = 'Failed';
      if (paymentLink.clientId && paymentLink.invoiceNumber) {
        await PaymentHistory.findOneAndUpdate(
          { invoiceNumber: paymentLink.invoiceNumber },
          { status: 'Refunded', notes: `Refunded via PayPal — ID: ${paypalInvoiceId}` }
        );
      }
    }

    await paymentLink.save();
    console.log(`PayPal webhook processed: ${eventType} for invoice ${paypalInvoiceId}`);
  } catch (err) {
    console.error('PayPal webhook error:', err);
  }
};