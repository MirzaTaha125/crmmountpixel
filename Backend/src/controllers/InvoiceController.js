import Invoice from '../model/Invoice.js';
import PaymentHistory from '../model/PaymentHistory.js';
import Client from '../model/Client.js';
import User from '../model/User.js';
import { sendEmail } from '../services/emailService.js';
import { logActivity } from '../services/activityLogService.js';
import { createAndSendInvoice, getPaypalInvoiceStatus, cancelPaypalInvoice, getPaypalInvoiceFee } from '../services/paypalService.js';
import { getIO } from '../socket.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function generateInvoiceNumber() {
  return 'INV-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9000 + 1000);
}

async function notifyAdmins({ clientName, amount, invoiceNumber, title }) {
  try {
    const admins = await User.find({ Role: 'Admin' }).select('Email First_Name workEmail workPassword');
    const sender = admins.find(a => a.workEmail?.trim());
    if (!sender) return;

    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    const subject = `Payment Received — ${clientName} — ${fmt}${invoiceNumber ? ` (${invoiceNumber})` : ''}`;
    const html = `<p>Payment received from <strong>${clientName}</strong>.<br>
      Amount: <strong>${fmt}</strong><br>
      ${invoiceNumber ? `Invoice: ${invoiceNumber}<br>` : ''}
      Service: ${title}</p>`;

    for (const admin of admins) {
      try {
        await sendEmail(sender._id, { to: admin.Email, toName: admin.First_Name || 'Admin', subject, html, text: subject });
      } catch {}
    }
  } catch (err) {
    console.error('Admin notify error:', err.message);
  }
}

async function emitInvoicePaid(invoice) {
  try {
    const io = getIO();
    const payload = {
      _id: invoice._id,
      clientName: invoice.clientName,
      title: invoice.title,
      amount: invoice.amount,
      invoiceNumber: invoice.invoiceNumber,
      paidAt: invoice.paidAt,
    };
    // Notify all admins
    const admins = await User.find({ Role: 'Admin' }).select('_id');
    admins.forEach(a => io.to(a._id.toString()).emit('invoice_paid', payload));
    // Also notify the creator (if not already an admin room)
    if (invoice.createdBy) {
      io.to(invoice.createdBy.toString()).emit('invoice_paid', payload);
    }
  } catch (err) {
    console.error('emitInvoicePaid error:', err.message);
  }
}

// ─── CREATE invoice ──────────────────────────────────────────────────────────

export const createInvoice = async (req, res) => {
  try {
    const { clientId, clientName, clientEmail, title, amount, description } = req.body;

    if (!clientName || !title || !amount) {
      return res.status(400).json({ message: 'clientName, title, and amount are required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    // Try to resolve client info
    let resolvedClientId = clientId || null;
    let brand = '';
    if (resolvedClientId) {
      const client = await Client.findById(resolvedClientId).catch(() => null);
      if (client?.brand) brand = client.brand;
    }

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await Invoice.create({
      clientId: resolvedClientId,
      clientName,
      clientEmail: clientEmail || '',
      title,
      amount: numAmount,
      description: description || '',
      brand,
      invoiceNumber,
      status: 'Pending',
      createdBy: req.user._id,
    });

    // Create PaymentHistory record for reporting
    if (resolvedClientId) {
      try {
        await PaymentHistory.create({
          clientId: resolvedClientId,
          userId: req.user._id,
          amount: numAmount,
          currency: 'USD',
          paymentMethod: 'PayPal',
          description: title + (description ? ` — ${description}` : ''),
          status: 'Pending',
          invoiceNumber,
          paymentDate: new Date(),
          notes: `PayPal invoice created`,
          brand,
        });
      } catch (e) { console.error('PaymentHistory create error:', e.message); }
    }

    // Create & send PayPal invoice (non-blocking)
    try {
      const pp = await createAndSendInvoice({ clientName, clientEmail, title, amount: numAmount, description, brand });
      invoice.paypalInvoiceId     = pp.invoiceId;
      invoice.paypalInvoiceUrl    = pp.invoiceUrl;
      invoice.paypalInvoiceStatus = pp.status;
      await invoice.save();
    } catch (ppErr) {
      console.error('PayPal invoice creation failed (non-fatal):', ppErr.message);
    }

    await logActivity({
      userId: req.user._id,
      action: 'invoice_created',
      entityType: 'Invoice',
      entityId: invoice._id,
      description: `Invoice created for ${clientName} — $${numAmount} — ${title}`,
      module: 'Invoices',
      req,
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error('createInvoice error:', err);
    res.status(500).json({ message: 'Error creating invoice', error: err.message });
  }
};

// ─── GET all invoices ────────────────────────────────────────────────────────

export const getInvoices = async (req, res) => {
  try {
    const { month, year, startDate, endDate, status } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end   = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: new Date(startDate), $lte: end };
    }

    // Non-admins: only see invoices they created
    if (req.user.Role !== 'Admin') {
      filter.createdBy = req.user._id;
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching invoices', error: err.message });
  }
};

// ─── DELETE invoice ──────────────────────────────────────────────────────────

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Cancel PayPal invoice
    if (invoice.paypalInvoiceId && invoice.paypalInvoiceStatus !== 'PAID') {
      await cancelPaypalInvoice(invoice.paypalInvoiceId, 'Invoice deleted from CRM');
    }
    // Remove PaymentHistory record
    if (invoice.invoiceNumber) {
      await PaymentHistory.deleteOne({ invoiceNumber: invoice.invoiceNumber });
    }

    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting invoice', error: err.message });
  }
};

// ─── SYNC PayPal status ──────────────────────────────────────────────────────

export const syncInvoicePaypalStatus = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!invoice.paypalInvoiceId) return res.status(400).json({ message: 'No PayPal invoice linked' });

    const { status, invoiceUrl, paidAt } = await getPaypalInvoiceStatus(invoice.paypalInvoiceId);
    invoice.paypalInvoiceStatus = status;
    if (invoiceUrl) invoice.paypalInvoiceUrl = invoiceUrl;

    if (status === 'PAID') {
      const wasAlreadyPaid = invoice.status === 'Paid';

      invoice.status = 'Paid';
      if (!invoice.paidAt) invoice.paidAt = paidAt ? new Date(paidAt) : new Date();

      // Step 1: always update PaymentHistory to Completed (regardless of fee)
      const phUpdate = {
        status: 'Completed',
        paymentMethod: 'PayPal',
        notes: 'Marked paid via PayPal sync',
      };

      // Step 2: try to fetch fee — add to update if available
      if (!invoice.paypalFee) {
        const feeData = await getPaypalInvoiceFee(invoice.paypalInvoiceId);
        if (feeData) {
          invoice.paypalFee = feeData.fee;
          invoice.netAmount = feeData.netAmount;
          phUpdate.taxFee = feeData.fee;
        }
      } else {
        // fee already saved — still pass it so PaymentHistory stays in sync
        phUpdate.taxFee = invoice.paypalFee;
      }

      if (invoice.invoiceNumber) {
        await PaymentHistory.findOneAndUpdate(
          { invoiceNumber: invoice.invoiceNumber },
          phUpdate
        );
      }

      await invoice.save();

      if (!wasAlreadyPaid) {
        await notifyAdmins({ clientName: invoice.clientName, amount: invoice.amount, invoiceNumber: invoice.invoiceNumber, title: invoice.title });
        await emitInvoicePaid(invoice);
      }
    } else {
      await invoice.save();
    }

    res.json({
      paypalInvoiceStatus: status,
      paypalInvoiceUrl: invoice.paypalInvoiceUrl,
      status: invoice.status,
      paypalFee: invoice.paypalFee ?? null,
      netAmount: invoice.netAmount ?? null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error syncing PayPal status', error: err.message });
  }
};

// ─── CREATE PayPal invoice for an existing invoice that doesn't have one ─────

export const createPaypalInvoiceForExisting = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.paypalInvoiceId) return res.status(400).json({ message: 'PayPal invoice already exists. Use Sync to update status.' });

    const pp = await createAndSendInvoice({
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      title: invoice.title,
      amount: invoice.amount,
      description: invoice.description,
      brand: invoice.brand,
    });

    invoice.paypalInvoiceId     = pp.invoiceId;
    invoice.paypalInvoiceUrl    = pp.invoiceUrl;
    invoice.paypalInvoiceStatus = pp.status;
    await invoice.save();

    res.json({ paypalInvoiceId: pp.invoiceId, paypalInvoiceUrl: pp.invoiceUrl, paypalInvoiceStatus: pp.status });
  } catch (err) {
    console.error('createPaypalInvoiceForExisting error:', err?.response?.data || err.message);
    res.status(500).json({ message: 'Failed to create PayPal invoice', error: err?.response?.data?.message || err.message });
  }
};

// ─── SEND email with PayPal link (via workEmail) ─────────────────────────────

export const sendInvoiceEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const { to, toName, extraNote } = req.body;   // frontend can override recipient / add note
    const recipient = to || invoice.clientEmail;
    if (!recipient) return res.status(400).json({ message: 'No recipient email. Provide "to" in request body.' });

    // Resolve sender: prefer current user, fall back to any admin with workEmail
    const currentUser = await User.findById(req.user._id).select('workEmail');
    let senderId = req.user._id;
    if (!currentUser?.workEmail) {
      const fallbackSender = await User.findOne({ Role: 'Admin', workEmail: { $exists: true, $ne: '' } }).select('_id workEmail');
      if (!fallbackSender) {
        return res.status(400).json({ message: 'No work email configured. Please add a workEmail to your account or an admin account under Settings.' });
      }
      senderId = fallbackSender._id;
    }

    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.amount);
    const brand = invoice.brand || 'Our Team';
    const ppLink = invoice.paypalInvoiceUrl || '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f7fa;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1);overflow:hidden;max-width:600px;">
      <tr><td style="background:linear-gradient(135deg,#0070ba,#003087);padding:40px 30px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">Invoice from ${brand}</h1>
        ${invoice.invoiceNumber ? `<p style="margin:12px 0 0;color:rgba(255,255,255,.85);font-size:14px;">Invoice # ${invoice.invoiceNumber}</p>` : ''}
        <p style="margin:8px 0 0;color:rgba(255,255,255,.75);font-size:13px;">${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>
      </td></tr>
      <tr><td style="padding:40px 30px;">
        <p style="margin:0 0 20px;font-size:16px;color:#333;">Dear ${toName || invoice.clientName || 'Valued Client'},</p>
        <p style="margin:0 0 30px;font-size:15px;color:#666;line-height:1.8;">
          Please find your invoice details below. Click the button to view and pay your invoice securely via PayPal.
        </p>
        <div style="background:#f8f9fa;border-radius:10px;padding:25px;border:1px solid #e9ecef;margin-bottom:30px;">
          <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#333;border-bottom:2px solid #0070ba;padding-bottom:10px;">Invoice Details</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;color:#666;font-size:14px;font-weight:500;">Client:</td>
                <td style="padding:10px 0;text-align:right;color:#333;font-weight:600;">${invoice.clientName}</td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:14px;font-weight:500;">Service:</td>
                <td style="padding:10px 0;text-align:right;color:#333;">${invoice.title}</td></tr>
            ${invoice.description ? `<tr><td style="padding:10px 0;color:#666;font-size:14px;font-weight:500;vertical-align:top;">Description:</td>
                <td style="padding:10px 0;text-align:right;color:#333;">${invoice.description}</td></tr>` : ''}
          </table>
          <div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-radius:8px;padding:18px 20px;margin-top:16px;border:1px solid #10b981;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="color:#065f46;font-size:17px;font-weight:700;">Total Amount:</td>
                  <td style="text-align:right;color:#047857;font-size:24px;font-weight:700;">${fmt}</td></tr>
            </table>
          </div>
        </div>
        ${extraNote ? `<p style="font-size:14px;color:#555;margin-bottom:24px;">${extraNote}</p>` : ''}
        ${ppLink ? `<div style="text-align:center;margin:30px 0;">
          <a href="${ppLink}" style="display:inline-block;background:#0070ba;color:#fff;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;text-decoration:none;box-shadow:0 4px 12px rgba(0,112,186,.4);">
            Pay Invoice via PayPal
          </a>
          <p style="margin:16px 0 0;font-size:12px;color:#999;">Or copy: <a href="${ppLink}" style="color:#0070ba;word-break:break-all;">${ppLink}</a></p>
        </div>` : ''}
        <div style="border-top:1px solid #e9ecef;padding-top:24px;margin-top:24px;">
          <p style="margin:0;font-size:14px;color:#666;">Thank you for your business!</p>
          <p style="margin:16px 0 0;font-size:14px;color:#333;">Best regards,<br><strong style="color:#0070ba;">${brand}</strong></p>
        </div>
      </td></tr>
      <tr><td style="background:#f8f9fa;padding:16px 30px;text-align:center;border-top:1px solid #e9ecef;">
        <p style="margin:0;font-size:12px;color:#999;">This is an automated invoice email. Please do not reply.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    const text = `Invoice from ${brand}\n\nDear ${toName || invoice.clientName},\n\nService: ${invoice.title}\n${invoice.description ? `Description: ${invoice.description}\n` : ''}Amount: ${fmt}\n${invoice.invoiceNumber ? `Invoice #: ${invoice.invoiceNumber}\n` : ''}${ppLink ? `\nPay here: ${ppLink}\n` : ''}\nThank you!\n${brand}`;

    await sendEmail(senderId, {
      to: recipient,
      toName: toName || invoice.clientName,
      subject: `${brand} | Invoice | ${invoice.title}${invoice.invoiceNumber ? ` | ${invoice.invoiceNumber}` : ''}`,
      html,
      text,
    });

    res.json({ message: 'Invoice email sent successfully' });
  } catch (err) {
    console.error('sendInvoiceEmail error:', err);
    res.status(500).json({ message: 'Error sending invoice email', error: err.message });
  }
};

// ─── PayPal webhook ──────────────────────────────────────────────────────────

export const paypalInvoiceWebhook = async (req, res) => {
  // Acknowledge immediately
  res.status(200).json({ received: true });

  try {
    const eventType = req.body?.event_type;
    const paypalInvoiceId = req.body?.resource?.id;
    if (!eventType || !paypalInvoiceId) return;

    const invoice = await Invoice.findOne({ paypalInvoiceId });
    if (!invoice) return;

    if (eventType === 'INVOICING.INVOICE.PAID') {
      invoice.paypalInvoiceStatus = 'PAID';
      if (invoice.status !== 'Paid') {
        invoice.status = 'Paid';
        invoice.paidAt = new Date();

        // Fetch real PayPal fee + net amount
        const feeData = await getPaypalInvoiceFee(paypalInvoiceId);
        if (feeData) {
          invoice.paypalFee = feeData.fee;
          invoice.netAmount = feeData.netAmount;
        }

        if (invoice.invoiceNumber) {
          await PaymentHistory.findOneAndUpdate(
            { invoiceNumber: invoice.invoiceNumber },
            {
              status: 'Completed',
              paymentMethod: 'PayPal',
              notes: `Paid via PayPal — ${paypalInvoiceId}`,
              ...(feeData ? { taxFee: feeData.fee } : {}),
            }
          );
        }
        await notifyAdmins({ clientName: invoice.clientName, amount: invoice.amount, invoiceNumber: invoice.invoiceNumber, title: invoice.title });
        await emitInvoicePaid(invoice);
        await logActivity({
          userId: invoice.createdBy,
          action: 'invoice_paid',
          entityType: 'Invoice',
          entityId: invoice._id,
          description: `Invoice paid for ${invoice.clientName} — $${invoice.amount}`,
          module: 'Invoices',
        });
      }
    } else if (eventType === 'INVOICING.INVOICE.CANCELLED') {
      invoice.paypalInvoiceStatus = 'CANCELLED';
      invoice.status = 'Cancelled';
    } else if (eventType === 'INVOICING.INVOICE.REFUNDED') {
      invoice.paypalInvoiceStatus = 'REFUNDED';
      invoice.status = 'Refunded';
      if (invoice.invoiceNumber) {
        await PaymentHistory.findOneAndUpdate(
          { invoiceNumber: invoice.invoiceNumber },
          { status: 'Refunded', notes: `Refunded via PayPal — ${paypalInvoiceId}` }
        );
      }
    }

    await invoice.save();
    console.log(`PayPal webhook: ${eventType} for ${paypalInvoiceId}`);
  } catch (err) {
    console.error('paypalInvoiceWebhook error:', err);
  }
};
