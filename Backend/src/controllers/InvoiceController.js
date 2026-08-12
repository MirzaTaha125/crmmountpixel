import crypto from 'crypto';
import Invoice from '../model/Invoice.js';
import PaymentHistory from '../model/PaymentHistory.js';
import Client from '../model/Client.js';
import User from '../model/User.js';
import Inquiry from '../model/Inquiry.js';
import Assignment from '../model/Assignment.js';
import Brand from '../model/Brand.js';
import { generateClientId } from './ClientController.js';
import { sendEmail } from '../services/emailService.js';
import { logActivity } from '../services/activityLogService.js';
import { createAndSendInvoice, getPaypalInvoiceStatus, cancelPaypalInvoice, getPaypalInvoiceFee } from '../services/paypalService.js';
import { createAndSendStripeInvoice, getStripeInvoiceStatus, cancelStripeInvoice, getStripeInvoiceFee, constructStripeEvent } from '../services/stripeService.js';
import { getIO } from '../socket.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function generateInvoiceNumber() {
  return 'INV-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9000 + 1000);
}

// Create-or-update the PaymentHistory row for a paid invoice.
//
// The bug we're fixing: findOneAndUpdate quietly no-ops when the PH row doesn't
// exist (e.g. inquiry invoices skip PH creation because they have no clientId
// yet; occasional creation failures also leave the row missing). Result: the
// invoice ends up "Paid" on the invoices page but INVISIBLE in Sales / Revenue
// reports and exports. `upsert` guarantees a row exists for every paid invoice.
//
// Callers pass the invoice + a partial patch (paymentMethod, notes, taxFee,
// paymentDate, status). Anything not in the patch is filled from the invoice.
async function upsertPaymentHistoryFor(invoice, patch = {}) {
  if (!invoice?.invoiceNumber) return null;
  try {
    const method = patch.paymentMethod
      || (invoice.provider === 'stripe' ? 'Stripe'
        : invoice.provider === 'manual' ? (invoice.manualPaymentMethod || 'Other')
        : 'PayPal');

    const setDoc = {
      // Always keep these in sync with the invoice — even on updates — so a
      // brand/client rename doesn't leave stale rows for reports.
      clientId:       invoice.clientId || null,
      userId:         invoice.createdBy || null,
      amount:         invoice.amount,
      currency:       'USD',
      paymentMethod:  method,
      description:    invoice.title + (invoice.description ? ` — ${invoice.description}` : ''),
      status:         patch.status || (invoice.status === 'Paid' ? 'Completed' : 'Pending'),
      invoiceNumber:  invoice.invoiceNumber,
      paymentDate:    patch.paymentDate || invoice.paidAt || invoice.createdAt || new Date(),
      notes:          patch.notes || 'Payment recorded via invoice generator',
      brand:          invoice.brand || '',
    };
    if (patch.taxFee != null) setDoc.taxFee = patch.taxFee;

    return await PaymentHistory.findOneAndUpdate(
      { invoiceNumber: invoice.invoiceNumber },
      { $set: setDoc },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (e) {
    console.error(`upsertPaymentHistoryFor(${invoice?.invoiceNumber}) failed:`, e.message);
    return null;
  }
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

// Link every invoice that was billed to an inquiry to the given client, and ensure each
// one has a PaymentHistory record so it appears in the client's payment history.
// (Inquiry invoices skip PaymentHistory at creation time because it requires a clientId.)
// Idempotent — safe to call from the manual convert AND the paid auto-convert paths.
export async function linkInquiryInvoicesToClient(inquiryId, client) {
  if (!inquiryId || !client?._id) return;
  const invoices = await Invoice.find({ inquiryId });
  for (const inv of invoices) {
    try {
      if (!inv.clientId) {
        inv.clientId = client._id;
        if (!inv.brand && client.brand) inv.brand = client.brand;
        await inv.save();
      }
      if (!inv.invoiceNumber) continue;

      const existingPH = await PaymentHistory.findOne({ invoiceNumber: inv.invoiceNumber });
      if (existingPH) {
        existingPH.clientId = client._id;
        if (client.brand) existingPH.brand = client.brand;
        await existingPH.save();
      } else {
        // Preserve the actual provider on the payment history record.
        // Bug fix: manual invoices used to fall through the PayPal branch,
        // which mislabelled the payment method AND read a fee off the wrong
        // field. Handle all three providers explicitly.
        const method =
          inv.provider === 'stripe' ? 'Stripe' :
          inv.provider === 'manual' ? (inv.manualPaymentMethod || 'Other') :
          'PayPal';
        const fee =
          inv.provider === 'stripe' ? inv.stripeFee :
          inv.provider === 'manual' ? undefined :   // manual invoices don't carry a provider fee
          inv.paypalFee;
        await PaymentHistory.create({
          clientId: client._id,
          userId: inv.createdBy || client.createdBy,
          amount: inv.amount,
          currency: 'USD',
          paymentMethod: method,
          description: inv.title + (inv.description ? ` — ${inv.description}` : ''),
          status: inv.status === 'Paid' ? 'Completed' : 'Pending',
          invoiceNumber: inv.invoiceNumber,
          paymentDate: inv.paidAt || inv.createdAt || new Date(),
          notes: 'Linked from inquiry invoice on conversion',
          brand: client.brand || inv.brand || '',
          ...(fee ? { taxFee: fee } : {}),
        });
      }
    } catch (e) {
      console.error(`linkInquiryInvoicesToClient: invoice ${inv._id} failed:`, e.message);
    }
  }
}

// When an invoice that was billed to an inquiry gets paid, turn that inquiry into a
// real client (reusing the same rules as manual inquiry→client conversion), link the
// invoice + its PaymentHistory to the new client. Fully idempotent and non-fatal:
// any failure here never affects the payment flow.
async function convertInquiryClientOnPaid(invoice) {
  try {
    if (!invoice?.inquiryId || invoice.clientId) return null; // not an inquiry invoice, or already linked

    const inquiry = await Inquiry.findById(invoice.inquiryId).populate('createdBy', 'Role');
    if (!inquiry) return null;

    let client = null;
    if (inquiry.isConverted && inquiry.convertedToClientId) {
      client = await Client.findById(inquiry.convertedToClientId);
    }

    if (!client) {
      const creatorUserId = inquiry.createdBy?._id || inquiry.createdBy || invoice.createdBy;
      const clientData = {
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        brand: (inquiry.brand || invoice.brand || '').trim(),
        createdBy: creatorUserId,
      };
      if (clientData.brand) {
        const cid = await generateClientId(clientData.brand);
        if (cid) clientData.clientId = cid;
      }
      client = await Client.create(clientData);

      // Assign to the inquiry's creator (non-admins only; admins see all clients).
      const creatorRole = inquiry.createdBy?.Role;
      const validRoles = ['Front', 'Upsell', 'Production', 'Employee'];
      if (creatorRole && validRoles.includes(creatorRole) && creatorUserId) {
        const existing = await Assignment.findOne({ clientId: client._id, userId: creatorUserId });
        if (!existing) {
          await Assignment.create({ clientId: client._id, userId: creatorUserId, role: creatorRole });
        }
      }

      await Inquiry.findByIdAndUpdate(inquiry._id, {
        isConverted: true,
        convertedToClientId: client._id,
        convertedAt: new Date(),
        convertedBy: invoice.createdBy || creatorUserId,
      });
    }

    // Link every invoice of this inquiry to the client + ensure each has a PaymentHistory
    // record (covers this paid invoice and any siblings).
    await linkInquiryInvoicesToClient(inquiry._id, client);

    await logActivity({
      userId: invoice.createdBy,
      action: 'inquiry_converted',
      entityType: 'Client',
      entityId: client._id,
      description: `Inquiry auto-converted to client on invoice payment: ${client.name}`,
      module: 'Clients',
    });

    return client;
  } catch (err) {
    console.error('convertInquiryClientOnPaid error:', err.message);
    return null;
  }
}

// ─── CREATE invoice ──────────────────────────────────────────────────────────

export const createInvoice = async (req, res) => {
  try {
    const {
      clientId, inquiryId, clientName, clientEmail, title, amount, description, provider,
      // Manual invoice fields
      brandId, paymentAccountId, initialStatus, issuedDate, dueDate,
    } = req.body;

    if (!clientName || !title || !amount) {
      return res.status(400).json({ message: 'clientName, title, and amount are required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    // Provider selection — default to paypal so existing callers keep working.
    const selectedProvider =
      provider === 'stripe' ? 'stripe' :
      provider === 'manual' ? 'manual' :
      'paypal';

    // Stripe requires an email to send the invoice to; PayPal is more forgiving.
    // Manual invoices don't email — the admin shares the link/PDF themselves.
    if (selectedProvider === 'stripe' && !clientEmail) {
      return res.status(400).json({ message: 'clientEmail is required to send a Stripe invoice' });
    }
    if (selectedProvider === 'manual' && !brandId) {
      return res.status(400).json({ message: 'brandId is required for manual invoices' });
    }

    // Resolve recipient — either an existing client (unchanged behaviour) or an inquiry.
    let resolvedClientId = clientId || null;
    let resolvedInquiryId = inquiryId || null;
    let brand = '';
    if (resolvedClientId) {
      const client = await Client.findById(resolvedClientId).catch(() => null);
      if (client?.brand) brand = client.brand;
    } else if (resolvedInquiryId) {
      const inquiry = await Inquiry.findById(resolvedInquiryId).catch(() => null);
      if (inquiry?.brand) brand = inquiry.brand;
      // If this inquiry was already converted, bill the existing client instead.
      if (inquiry?.isConverted && inquiry?.convertedToClientId) {
        resolvedClientId = inquiry.convertedToClientId;
        resolvedInquiryId = null;
        const c = await Client.findById(resolvedClientId).catch(() => null);
        if (c?.brand) brand = c.brand;
      }
    }

    const invoiceNumber = generateInvoiceNumber();

    // Manual invoice — snapshot the brand and the specific payment account the
    // admin picked, so future edits to the brand can't mutate history.
    let brandSnapshot = null;
    let paymentAccountSnapshot = null;
    let manualPaymentMethod = '';
    // Left undefined for non-manual invoices — omitting the field (rather than
    // setting it to null) keeps them out of the partial-unique publicSlug index
    // cleanly and avoids `E11000 dup key: { publicSlug: null }` on retries.
    let publicSlug;

    if (selectedProvider === 'manual') {
      const brandDoc = await Brand.findById(brandId).catch(() => null);
      if (!brandDoc) {
        return res.status(400).json({ message: 'Selected brand not found' });
      }
      brand = brand || brandDoc.name;
      brandSnapshot = {
        brandId: brandDoc._id,
        name: brandDoc.name || '',
        code: brandDoc.code || '',
        logo: brandDoc.logo || '',
        mainColor: brandDoc.mainColor || '#6366f1',
        phone: brandDoc.phone || '',
        email: brandDoc.email || '',
        officialWebsites: brandDoc.officialWebsites || [],
      };

      if (paymentAccountId) {
        const acct = (brandDoc.paymentAccounts || []).find(
          (pa) => pa._id?.toString() === String(paymentAccountId)
        );
        if (acct) {
          paymentAccountSnapshot = {
            method: acct.method || '',
            label: acct.label || '',
            details: acct.details || '',
          };
          manualPaymentMethod = acct.method || '';
        }
      }

      // Public slug — 24 random URL-safe chars. Collisions are astronomically
      // unlikely; loop anyway just to be safe.
      publicSlug = crypto.randomBytes(18).toString('base64url');
      while (await Invoice.findOne({ publicSlug })) {
        publicSlug = crypto.randomBytes(18).toString('base64url');
      }
    }

    const wantsPaid = selectedProvider === 'manual' && String(initialStatus).toLowerCase() === 'paid';
    const invoice = await Invoice.create({
      clientId: resolvedClientId,
      inquiryId: resolvedInquiryId,
      clientName,
      clientEmail: clientEmail || '',
      title,
      amount: numAmount,
      description: description || '',
      brand,
      invoiceNumber,
      status: wantsPaid ? 'Paid' : 'Pending',
      provider: selectedProvider,
      createdBy: req.user._id,
      // Dates — parse if the client sent them, else fall back to sensible defaults.
      issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
      dueDate:    dueDate    ? new Date(dueDate)    : null,
      // Manual-only fields (null / '' for other providers)
      manualPaymentMethod,
      manualPaymentAccountSnapshot: paymentAccountSnapshot,
      brandSnapshot,
      // Only set publicSlug for manual invoices — other providers leave the
      // field absent so they don't appear in the partial-unique index at all.
      ...(publicSlug ? { publicSlug } : {}),
      paidAt: wantsPaid ? new Date() : null,
    });

    // Create PaymentHistory record for reporting
    if (resolvedClientId) {
      try {
        // Choose the payment-method label and status based on which provider
        // this invoice went through. Manual invoices use the actual method
        // the admin picked (Cheque / Wire / etc.) and reflect the immediate
        // Paid/Unpaid choice, so the client's payment history is accurate
        // from the moment the invoice is created.
        let phMethod = 'PayPal';
        let phNotes  = 'PayPal invoice created';
        if (selectedProvider === 'stripe') {
          phMethod = 'Stripe';
          phNotes  = 'Stripe invoice created';
        } else if (selectedProvider === 'manual') {
          phMethod = manualPaymentMethod || 'Other';
          phNotes  = wantsPaid
            ? `Manual invoice — marked Paid via ${manualPaymentMethod || 'unspecified method'}`
            : `Manual invoice created via ${manualPaymentMethod || 'unspecified method'}`;
        }
        await PaymentHistory.create({
          clientId: resolvedClientId,
          userId: req.user._id,
          amount: numAmount,
          currency: 'USD',
          paymentMethod: phMethod,
          description: title + (description ? ` — ${description}` : ''),
          status: wantsPaid ? 'Completed' : 'Pending',
          invoiceNumber,
          paymentDate: new Date(),
          notes: phNotes,
          brand,
        });
      } catch (e) { console.error('PaymentHistory create error:', e.message); }
    }

    // Create & send the invoice via the chosen provider (non-blocking — the CRM
    // record persists even if the payment provider is unreachable or misconfigured).
    // We collect a warning so the UI can tell the user *why* no link was created.
    let providerWarning = null;

    if (selectedProvider === 'manual') {
      // Nothing to call — the invoice is already saved with its snapshot and
      // publicSlug. Public link is /invoice/<publicSlug> on the frontend.
    } else if (selectedProvider === 'stripe') {
      try {
        const s = await createAndSendStripeInvoice({
          clientName, clientEmail, title, amount: numAmount, description,
          invoiceNumber,   // pass CRM invoice number so both dashboards match
        });
        invoice.stripeInvoiceId     = s.invoiceId;
        invoice.stripeInvoiceUrl    = s.invoiceUrl;
        invoice.stripeInvoiceStatus = s.status;
        await invoice.save();
        // Defensive: if Stripe reports the invoice already paid at creation
        // time (edge case), reflect it in the CRM immediately so we don't
        // leave the row in a mismatched "provider paid / CRM pending" state.
        if (s.status === 'paid') {
          try { await syncInvoiceFromStripe(invoice); } catch { /* swallow */ }
        }
      } catch (sErr) {
        // Stripe SDK errors carry richer info than .message alone — surface the full picture in logs.
        const details =
          sErr?.raw?.message ||
          sErr?.raw?.type ||
          sErr?.type ||
          sErr?.message ||
          'Unknown Stripe error';
        console.error('[Stripe] invoice creation FAILED:', details, sErr?.raw?.code ? `(code=${sErr.raw.code})` : '');
        providerWarning = `Stripe: ${details}`;
      }
    } else {
      try {
        const pp = await createAndSendInvoice({ clientName, clientEmail, title, amount: numAmount, description, brand, invoiceNumber });
        invoice.paypalInvoiceId     = pp.invoiceId;
        invoice.paypalInvoiceUrl    = pp.invoiceUrl;
        invoice.paypalInvoiceStatus = pp.status;
        await invoice.save();
      } catch (ppErr) {
        console.error('[PayPal] invoice creation FAILED:', ppErr.message);
        providerWarning = `PayPal: ${ppErr.message}`;
      }
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

    // Include a warning so the frontend can show a toast when the CRM record was
    // saved but the payment-provider call failed (e.g. missing API key).
    const responseBody = providerWarning
      ? { ...invoice.toObject(), providerWarning }
      : invoice;
    res.status(201).json(responseBody);
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

    // Cancel the provider-side invoice too (best-effort).
    if (invoice.paypalInvoiceId && invoice.paypalInvoiceStatus !== 'PAID') {
      await cancelPaypalInvoice(invoice.paypalInvoiceId, 'Invoice deleted from CRM');
    }
    if (invoice.stripeInvoiceId && invoice.stripeInvoiceStatus !== 'paid') {
      await cancelStripeInvoice(invoice.stripeInvoiceId);
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

// Core PayPal status sync for ONE invoice. Shared by the manual UI sync and the
// background auto-sync job. Mutates + saves the invoice; fires paid side-effects once.
async function syncInvoiceFromPaypal(invoice) {
  const { status, invoiceUrl, paidAt } = await getPaypalInvoiceStatus(invoice.paypalInvoiceId);
  invoice.paypalInvoiceStatus = status;
  if (invoiceUrl) invoice.paypalInvoiceUrl = invoiceUrl;

  if (status === 'PAID') {
    const wasAlreadyPaid = invoice.status === 'Paid';

    invoice.status = 'Paid';
    if (!invoice.paidAt) invoice.paidAt = paidAt ? new Date(paidAt) : new Date();

    // Always update PaymentHistory to Completed (regardless of fee)
    const phUpdate = {
      status: 'Completed',
      paymentMethod: 'PayPal',
      notes: 'Marked paid via PayPal sync',
    };

    // Try to fetch fee — add to update if available
    if (!invoice.paypalFee) {
      const feeData = await getPaypalInvoiceFee(invoice.paypalInvoiceId);
      if (feeData) {
        invoice.paypalFee = feeData.fee;
        invoice.netAmount = feeData.netAmount;
        phUpdate.taxFee = feeData.fee;
      }
    } else {
      phUpdate.taxFee = invoice.paypalFee;
    }

    await invoice.save();
    // Upsert (not just update) so an inquiry invoice that skipped PH creation
    // still gets a row on payment — otherwise it goes missing from reports.
    await upsertPaymentHistoryFor(invoice, phUpdate);

    if (!wasAlreadyPaid) {
      await convertInquiryClientOnPaid(invoice); // inquiry invoice → create the client automatically
      await notifyAdmins({ clientName: invoice.clientName, amount: invoice.amount, invoiceNumber: invoice.invoiceNumber, title: invoice.title });
      await emitInvoicePaid(invoice);
    }
  } else {
    await invoice.save();
  }

  return status;
}

// Core Stripe status sync for ONE invoice. Mirrors syncInvoiceFromPaypal
// so both providers behave identically from the caller's perspective.
async function syncInvoiceFromStripe(invoice) {
  const { status, invoiceUrl, paidAt } = await getStripeInvoiceStatus(invoice.stripeInvoiceId);
  invoice.stripeInvoiceStatus = status;
  if (invoiceUrl) invoice.stripeInvoiceUrl = invoiceUrl;

  if (status === 'paid') {
    const wasAlreadyPaid = invoice.status === 'Paid';

    invoice.status = 'Paid';
    if (!invoice.paidAt) invoice.paidAt = paidAt ? new Date(paidAt) : new Date();

    const phUpdate = {
      status: 'Completed',
      paymentMethod: 'Stripe',
      notes: 'Marked paid via Stripe sync',
    };

    if (!invoice.stripeFee) {
      const feeData = await getStripeInvoiceFee(invoice.stripeInvoiceId);
      if (feeData) {
        invoice.stripeFee = feeData.fee;
        invoice.netAmount = feeData.netAmount;
        phUpdate.taxFee = feeData.fee;
      }
    } else {
      phUpdate.taxFee = invoice.stripeFee;
    }

    await invoice.save();
    // Upsert so paid invoices never go missing from Sales/Revenue reports.
    await upsertPaymentHistoryFor(invoice, phUpdate);

    if (!wasAlreadyPaid) {
      await convertInquiryClientOnPaid(invoice);
      await notifyAdmins({ clientName: invoice.clientName, amount: invoice.amount, invoiceNumber: invoice.invoiceNumber, title: invoice.title });
      await emitInvoicePaid(invoice);
    }
  } else {
    await invoice.save();
  }

  return status;
}

// ─── SYNC provider status (manual, via the UI button) ────────────────────────
// Routes to the correct provider based on which id is on the invoice.
// The endpoint name stays `syncInvoicePaypalStatus` for backward compatibility.
export const syncInvoicePaypalStatus = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const isStripe = invoice.provider === 'stripe' && invoice.stripeInvoiceId;
    const isPaypal = invoice.provider !== 'stripe' && invoice.paypalInvoiceId;

    if (!isStripe && !isPaypal) {
      return res.status(400).json({ message: 'No provider invoice linked to sync' });
    }

    if (isStripe) {
      await syncInvoiceFromStripe(invoice);
    } else {
      await syncInvoiceFromPaypal(invoice);
    }

    res.json({
      provider: invoice.provider || 'paypal',
      paypalInvoiceStatus: invoice.paypalInvoiceStatus,
      paypalInvoiceUrl:    invoice.paypalInvoiceUrl,
      paypalFee:           invoice.paypalFee ?? null,
      stripeInvoiceStatus: invoice.stripeInvoiceStatus,
      stripeInvoiceUrl:    invoice.stripeInvoiceUrl,
      stripeFee:           invoice.stripeFee ?? null,
      status:              invoice.status,
      netAmount:           invoice.netAmount ?? null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error syncing invoice status', error: err.message });
  }
};

// ─── AUTO-SYNC: poll pending PayPal invoices so "Paid" updates by itself ──────
// Runs on a timer from server.js. No webhook / manual sync needed. Idempotent and
// fully guarded — a PayPal/API failure on one invoice never affects the others.
const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let autoSyncRunning = false;
export async function autoSyncPendingInvoices() {
  if (autoSyncRunning) return; // never overlap runs
  autoSyncRunning = true;
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // only recent (last 90 days)

    // PayPal-side pending invoices (skip terminal statuses)
    const pendingPaypal = await Invoice.find({
      status: 'Pending',
      paypalInvoiceId: { $exists: true, $ne: null },
      createdAt: { $gte: cutoff },
      paypalInvoiceStatus: { $nin: ['PAID', 'MARKED_AS_PAID', 'CANCELLED', 'REFUNDED'] },
    })
      .sort({ createdAt: -1 })
      .limit(50); // hard cap per cycle so a backlog can never flood PayPal

    for (const inv of pendingPaypal) {
      try {
        await syncInvoiceFromPaypal(inv);
      } catch (e) {
        console.error(`autoSync (paypal) invoice ${inv._id} failed:`, e.message);
      }
      await _sleep(250); // gentle spacing between PayPal calls
    }

    // Stripe-side pending invoices (skip terminal statuses).
    // Guarded — if STRIPE_SECRET_KEY isn't set yet, the loop just no-ops
    // per invoice since getStripe() throws before any state is touched.
    const pendingStripe = await Invoice.find({
      status: 'Pending',
      stripeInvoiceId: { $exists: true, $ne: null },
      createdAt: { $gte: cutoff },
      stripeInvoiceStatus: { $nin: ['paid', 'void', 'uncollectible'] },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    for (const inv of pendingStripe) {
      try {
        await syncInvoiceFromStripe(inv);
      } catch (e) {
        console.error(`autoSync (stripe) invoice ${inv._id} failed:`, e.message);
      }
      await _sleep(250);
    }
  } catch (e) {
    console.error('autoSyncPendingInvoices error:', e.message);
  } finally {
    autoSyncRunning = false;
  }
}

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
      invoiceNumber: invoice.invoiceNumber,
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

        // Upsert so webhook-triggered payments land in reports even if the
        // PH row was never created (inquiry invoices, previous create errors).
        await upsertPaymentHistoryFor(invoice, {
          status: 'Completed',
          paymentMethod: 'PayPal',
          notes: `Paid via PayPal — ${paypalInvoiceId}`,
          ...(feeData ? { taxFee: feeData.fee } : {}),
        });
        await convertInquiryClientOnPaid(invoice); // inquiry invoice → create the client automatically
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
      await upsertPaymentHistoryFor(invoice, {
        status: 'Refunded',
        paymentMethod: 'PayPal',
        notes: `Refunded via PayPal — ${paypalInvoiceId}`,
      });
    }

    await invoice.save();
    console.log(`PayPal webhook: ${eventType} for ${paypalInvoiceId}`);
  } catch (err) {
    console.error('paypalInvoiceWebhook error:', err);
  }
};

// ─── Stripe webhook ─────────────────────────────────────────────────────────
// Stripe pings this endpoint when an invoice is paid, voided, etc.
// Response is always 200 (once signature is verified) — Stripe retries on
// non-2xx, so a bad handler can create a retry storm.
// IMPORTANT: this route MUST receive the *raw* request body so the signature
// verification works. Route setup in server.js handles that.
export const stripeInvoiceWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).send('Missing stripe-signature header');

  let event;
  try {
    // req.body here is a Buffer because we mount express.raw() before this route.
    event = constructStripeEvent(req.body, signature);
  } catch (err) {
    console.error('[Stripe webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Acknowledge fast so Stripe doesn't retry — process the update asynchronously.
  res.status(200).json({ received: true });

  try {
    const type = event.type;
    const obj  = event.data?.object;
    if (!obj?.id) return;

    // Only care about invoice-level events we can act on.
    const relevant = new Set([
      'invoice.paid',
      'invoice.payment_succeeded',
      'invoice.marked_uncollectible',
      'invoice.voided',
      'invoice.finalized',
    ]);
    if (!relevant.has(type)) return;

    const invoice = await Invoice.findOne({ stripeInvoiceId: obj.id });
    if (!invoice) {
      console.log(`[Stripe webhook] ${type} for ${obj.id} — no matching CRM invoice`);
      return;
    }

    // Use the shared sync path so paid side-effects (PaymentHistory update,
    // admin email, inquiry→client conversion) fire exactly once and match the
    // manual-sync flow.
    await syncInvoiceFromStripe(invoice);
    console.log(`[Stripe webhook] ${type} processed for CRM invoice ${invoice._id}`);
  } catch (err) {
    console.error('[Stripe webhook] handler error:', err);
  }
};

// ─── Mark a manual invoice as PAID ───────────────────────────────────────────
// Admin-only. Flips status Pending → Paid, sets paidAt, and updates any
// existing PaymentHistory row for this invoice number to Completed.
// Optionally accepts a `paymentMethod` override so the admin can record which
// account actually received the money (e.g. issued for Wire but received via
// Zelle).
export const markInvoicePaid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.provider !== 'manual') {
      return res.status(400).json({ message: 'Only manual invoices can be marked paid from here — use Sync for PayPal/Stripe' });
    }
    if (invoice.status === 'Paid') {
      return res.status(200).json({ message: 'Invoice is already marked paid', invoice });
    }

    const { paymentMethod } = req.body || {};
    const method = paymentMethod || invoice.manualPaymentMethod || 'Other';

    invoice.status = 'Paid';
    invoice.paidAt = new Date();
    if (paymentMethod) invoice.manualPaymentMethod = paymentMethod;
    await invoice.save();

    // Upsert PaymentHistory (create if missing, update if present) — the old
    // update-only path silently skipped invoices whose PH row was never created,
    // making manual paid invoices vanish from Sales/Revenue reports.
    await upsertPaymentHistoryFor(invoice, {
      status: 'Completed',
      paymentMethod: method,
      paymentDate: invoice.paidAt,
      notes: `Manual invoice — marked Paid via ${method}`,
    });

    // Notify admins + fire any paid-side-effects (inquiry → client conversion, etc.)
    try {
      await convertInquiryClientOnPaid(invoice);
      await notifyAdmins({
        clientName: invoice.clientName,
        amount: invoice.amount,
        invoiceNumber: invoice.invoiceNumber,
        title: invoice.title,
      });
      await emitInvoicePaid(invoice);
    } catch (e) { console.error('Post-paid side-effect error:', e.message); }

    await logActivity({
      userId: req.user._id,
      action: 'invoice_paid',
      entityType: 'Invoice',
      entityId: invoice._id,
      description: `Manual invoice marked Paid — ${invoice.clientName} — $${invoice.amount}`,
      module: 'Invoices',
      req,
    });

    res.json({ message: 'Invoice marked Paid', invoice });
  } catch (err) {
    console.error('markInvoicePaid error:', err);
    res.status(500).json({ message: 'Error marking invoice paid', error: err.message });
  }
};

// ─── Public invoice viewer (no auth) ─────────────────────────────────────────
// Anyone with the publicSlug can read the invoice's public-safe fields to
// render the shareable invoice page. Sensitive fields (createdBy, inquiry
// linkage, etc.) are NOT returned.
export const publicInvoiceView = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ publicSlug: req.params.slug });
    if (!invoice || invoice.provider !== 'manual') {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    // Keep the payload minimal + safe — only what the client needs to render.
    res.json({
      invoiceNumber: invoice.invoiceNumber,
      status:        invoice.status,
      title:         invoice.title,
      description:   invoice.description,
      amount:        invoice.amount,
      issuedDate:    invoice.issuedDate,
      dueDate:       invoice.dueDate,
      paidAt:        invoice.paidAt,
      clientName:    invoice.clientName,
      clientEmail:   invoice.clientEmail,
      paymentMethod: invoice.manualPaymentMethod,
      paymentAccount: invoice.manualPaymentAccountSnapshot,
      brand:          invoice.brandSnapshot,
      createdAt:      invoice.createdAt,
    });
  } catch (err) {
    console.error('publicInvoiceView error:', err);
    res.status(500).json({ message: 'Error loading invoice', error: err.message });
  }
};
