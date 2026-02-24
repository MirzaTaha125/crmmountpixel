import PaymentHistory from '../model/PaymentHistory.js';
import Client from '../model/Client.js';
import Assignment from '../model/Assignment.js';
import PaymentLink from '../model/PaymentLink.js';
import { sendPaymentConfirmationEmail } from '../services/emailService.js';
import { logPaymentAction, logActivity } from '../services/activityLogService.js';

// Get payment history for a specific client
export async function getClientPaymentHistory(req, res) {
  try {
    const { clientId } = req.params;
    const userId = req.user._id;

    // Check if user has access to this client
    if (req.user.Role !== 'Admin') {
      const assignment = await Assignment.findOne({ userId, clientId });
      if (!assignment) {
        return res.status(403).json({ message: 'Access denied to this client' });
      }
    }

    const payments = await PaymentHistory.find({ clientId })
      .populate('userId', 'First_Name Last_Name Role')
      .populate('projectId', 'name')
      .sort({ paymentDate: -1 });

    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Error fetching payment history', error });
  }
}

// Get all payment history for user's assigned clients
export async function getUserPaymentHistory(req, res) {
  try {
    const userId = req.user._id;
    const { status, month, year, startDate, endDate } = req.query;
    let filter = {};

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.paymentDate = { $gte: start, $lte: end };
    } else if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.paymentDate = { $gte: start, $lte: end };
    }

    let payments;

    if (req.user.Role === 'Admin') {
      // Admin can see all payments
      payments = await PaymentHistory.find(filter)
        .populate('clientId', 'name email brand')
        .populate('userId', 'First_Name Last_Name Role')
        .populate('projectId', 'name')
        .sort({ paymentDate: -1 });
    } else {
      // Get payments for user's assigned clients only
      const assignments = await Assignment.find({ userId });
      const clientIds = assignments.map(a => a.clientId);

      filter.clientId = { $in: clientIds };

      payments = await PaymentHistory.find(filter)
        .populate('clientId', 'name email brand')
        .populate('userId', 'First_Name Last_Name Role')
        .populate('projectId', 'name')
        .sort({ paymentDate: -1 });
    }

    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching user payment history:', error);
    res.status(500).json({ message: 'Error fetching payment history', error });
  }
}

// Add new payment record
export async function addPaymentRecord(req, res) {
  try {
    const { clientId, amount, currency, paymentMethod, description, status, transactionId, notes, invoiceNumber, projectId, taxFee, paymentDate } = req.body;
    const userId = req.user._id;

    // Check if user has access to this client
    if (req.user.Role !== 'Admin') {
      const assignment = await Assignment.findOne({ userId, clientId });
      if (!assignment) {
        return res.status(403).json({ message: 'Access denied to this client' });
      }
    }

    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const paymentData = {
      clientId,
      userId,
      amount,
      currency: currency || 'USD',
      paymentMethod,
      description,
      status: status || 'Completed',
      transactionId,
      notes,
      invoiceNumber,
      projectId,
      taxFee: taxFee || 0,
      brand: client.brand || '',
      paymentDate: paymentDate || new Date()
    };

    const payment = await PaymentHistory.create(paymentData);
    const populatedPayment = await PaymentHistory.findById(payment._id)
      .populate('clientId', 'name email brand')
      .populate('userId', 'First_Name Last_Name Role')
      .populate('projectId', 'name');

    // Log payment creation
    if (populatedPayment.clientId) {
      await logPaymentAction(
        userId,
        'payment_created',
        payment._id,
        `Payment record created for ${populatedPayment.clientId.name} - Amount: ${payment.currency || 'USD'} ${payment.amount}${payment.invoiceNumber ? ` (Invoice: ${payment.invoiceNumber})` : ''}`,
        {
          paymentId: payment._id,
          clientId: payment.clientId,
          clientName: populatedPayment.clientId.name,
          amount: payment.amount,
          currency: payment.currency || 'USD',
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          invoiceNumber: payment.invoiceNumber,
          transactionId: payment.transactionId
        },
        req
      );
    }

    // IMPORTANT: NO AUTOMATIC CLIENT EMAILS - Email sending is DISABLED
    // No emails are sent automatically for payment history in client modal
    // All client emails must be sent manually by admin/user action
    // if (payment.status === 'Completed' && populatedPayment.clientId && populatedPayment.clientId.email) {
    //   try {
    //     const client = populatedPayment.clientId;
    //     const emailUserId = populatedPayment.userId ? populatedPayment.userId._id : userId;

    //     if (emailUserId) {
    //       await sendPaymentConfirmationEmail(emailUserId, {
    //         clientEmail: client.email,
    //         clientName: client.name,
    //         amount: payment.amount,
    //         currency: payment.currency || 'USD',
    //         paymentMethod: payment.paymentMethod,
    //         invoiceNumber: payment.invoiceNumber,
    //         description: payment.description,
    //         transactionId: payment.transactionId,
    //         brand: client.brand || payment.brand || ''
    //       });
    //       console.log('Payment confirmation email sent to client:', client.email);
    //     }
    //   } catch (emailError) {
    //     console.error('Error sending payment confirmation email:', emailError);
    //     // Don't fail the request if email sending fails
    //   }
    // }

    res.status(201).json({ message: 'Payment record added successfully', payment: populatedPayment });
  } catch (error) {
    console.error('Error adding payment record:', error);
    res.status(500).json({ message: 'Error adding payment record', error });
  }
}

// Update payment record
export async function updatePaymentRecord(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const payment = await PaymentHistory.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // Check if user has access to this payment
    if (req.user.Role !== 'Admin' && payment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied to this payment record' });
    }

    const updatedPayment = await PaymentHistory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('clientId', 'name email brand')
      .populate('userId', 'First_Name Last_Name Role')
      .populate('projectId', 'name');

    // Log payment update
    if (updatedPayment.clientId) {
      const changes = Object.keys(updateData).filter(key => updateData[key] !== undefined);
      const statusChanged = updateData.status && updateData.status !== payment.status;

      await logPaymentAction(
        userId,
        'payment_updated',
        payment._id,
        `Payment record updated for ${updatedPayment.clientId.name}${statusChanged ? ` - Status changed to: ${updateData.status}` : ''}${updateData.amount ? ` - Amount: ${updatedPayment.currency || 'USD'} ${updateData.amount}` : ''}${updatedPayment.invoiceNumber ? ` (Invoice: ${updatedPayment.invoiceNumber})` : ''}`,
        {
          paymentId: payment._id,
          clientId: payment.clientId,
          clientName: updatedPayment.clientId.name,
          changes: updateData,
          previousStatus: payment.status,
          newStatus: updateData.status || payment.status,
          amount: updateData.amount || payment.amount,
          currency: updatedPayment.currency || 'USD',
          invoiceNumber: updatedPayment.invoiceNumber
        },
        req
      );
    }

    // If payment status is updated to "Completed", also update corresponding PaymentLink status to "Paid"
    if (updateData.status === 'Completed' && payment.invoiceNumber) {
      try {
        await PaymentLink.findOneAndUpdate(
          { invoiceNumber: payment.invoiceNumber },
          { status: 'Paid' },
          { new: true }
        );
      } catch (linkError) {
        console.error('Error updating payment link status:', linkError);
        // Don't fail the request if payment link update fails
      }
    }

    // Log payment completion when status changes to "Completed"
    if (updateData.status === 'Completed' && payment.status !== 'Completed' && updatedPayment.clientId) {
      await logActivity({
        userId: userId,
        action: 'payment_completed',
        entityType: 'Payment',
        entityId: payment._id,
        description: `Payment completed for ${updatedPayment.clientId.name} - Amount: ${updatedPayment.currency || 'USD'} ${updatedPayment.amount}${updatedPayment.invoiceNumber ? ` (Invoice: ${updatedPayment.invoiceNumber})` : ''}`,
        details: {
          paymentId: payment._id,
          clientId: payment.clientId,
          clientName: updatedPayment.clientId.name,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency || 'USD',
          paymentMethod: updatedPayment.paymentMethod,
          invoiceNumber: updatedPayment.invoiceNumber,
          transactionId: updatedPayment.transactionId
        },
        module: 'Payments',
        req
      });
    }

    // IMPORTANT: NO AUTOMATIC CLIENT EMAILS - Email sending is DISABLED
    // No emails are sent automatically for payment history in client modal
    // All client emails must be sent manually by admin/user action
    // if (updateData.status === 'Completed' && updatedPayment.clientId && updatedPayment.clientId.email) {
    //   try {
    //     const client = updatedPayment.clientId;
    //     const emailUserId = updatedPayment.userId ? updatedPayment.userId._id : userId;

    //     if (emailUserId) {
    //       await sendPaymentConfirmationEmail(emailUserId, {
    //         clientEmail: client.email,
    //         clientName: client.name,
    //         amount: updatedPayment.amount,
    //         currency: updatedPayment.currency || 'USD',
    //         paymentMethod: updatedPayment.paymentMethod,
    //         invoiceNumber: updatedPayment.invoiceNumber,
    //         description: updatedPayment.description,
    //         transactionId: updatedPayment.transactionId,
    //         brand: client.brand || updatedPayment.brand || ''
    //       });
    //       console.log('Payment confirmation email sent to client:', client.email);
    //     }
    //   } catch (emailError) {
    //     console.error('Error sending payment confirmation email:', emailError);
    //     // Don't fail the request if email sending fails
    //   }
    // }

    res.status(200).json({ message: 'Payment record updated successfully', payment: updatedPayment });
  } catch (error) {
    console.error('Error updating payment record:', error);
    res.status(500).json({ message: 'Error updating payment record', error });
  }
}

// Delete payment record
export async function deletePaymentRecord(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const payment = await PaymentHistory.findById(id)
      .populate('clientId', 'name email');

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // Check if user has access to this payment
    if (req.user.Role !== 'Admin' && payment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied to this payment record' });
    }

    // Log payment deletion
    if (payment.clientId) {
      await logPaymentAction(
        userId,
        'payment_deleted',
        payment._id,
        `Payment record deleted for ${payment.clientId.name} - Amount: ${payment.currency || 'USD'} ${payment.amount}${payment.invoiceNumber ? ` (Invoice: ${payment.invoiceNumber})` : ''}`,
        {
          paymentId: payment._id,
          clientId: payment.clientId,
          clientName: payment.clientId.name,
          amount: payment.amount,
          currency: payment.currency || 'USD',
          invoiceNumber: payment.invoiceNumber
        },
        req
      );
    }

    await PaymentHistory.findByIdAndDelete(id);
    res.status(200).json({ message: 'Payment record deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment record:', error);
    res.status(500).json({ message: 'Error deleting payment record', error });
  }
}

// Get payment statistics
export async function getPaymentStatistics(req, res) {
  try {
    const userId = req.user._id;
    let matchQuery = {};

    if (req.user.Role !== 'Admin') {
      const assignments = await Assignment.find({ userId });
      const clientIds = assignments.map(a => a.clientId);
      matchQuery.clientId = { $in: clientIds };
    }

    const stats = await PaymentHistory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
          completedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json(stats[0] || {
      totalAmount: 0,
      totalPayments: 0,
      averageAmount: 0,
      completedPayments: 0,
      pendingPayments: 0
    });
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({ message: 'Error fetching payment statistics', error });
  }
}