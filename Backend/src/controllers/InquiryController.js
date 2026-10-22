import Inquiry from '../model/Inquiry.js';
import Client from '../model/Client.js';
import Assignment from '../model/Assignment.js';
import User from '../model/User.js';
import PaymentLink from '../model/PaymentLink.js';
import PaymentHistory from '../model/PaymentHistory.js';
import { generateClientId } from './ClientController.js';
import { emitNewInquiry } from '../socket.js';
import { normalizeSourceUrl } from '../utils/sourceUrl.js';
import { logRecordChange } from '../services/activityLogService.js';

// How many rows one bulk submission may carry. The grid in both frontends
// enforces the same number, so the limit is never a surprise at submit time.
export const MAX_BULK_INQUIRIES = 200;

// How many inserts are in flight at once during a bulk submit. Sequential
// would make 200 rows a long wait; unbounded would open 200 connections.
const BULK_CONCURRENCY = 20;

// Fields that make a row worth storing. No single one is mandatory — a lead
// taken over the phone may be a name and a number and nothing else — but a row
// with none of them is a blank the person did not mean to submit.
const SUBSTANCE_FIELDS = ['name', 'email', 'phone', 'businessName', 'reason', 'message'];

// Returns a human-readable problem, or null when the row is usable. Shared by
// the single-inquiry form and the bulk grid so the two cannot drift on what
// counts as a valid inquiry.
const validateInquiryInput = (body = {}) => {
  const text = (v) => String(v ?? '').trim();
  if (!SUBSTANCE_FIELDS.some((k) => text(body[k]))) {
    return 'An inquiry needs at least a name, phone, email, business or note';
  }
  return null;
};

// Builds the document from a request body. Assumes validateInquiryInput has
// already passed.
const buildInquiryData = (body, user) => {
  const text = (v) => String(v ?? '').trim();
  return {
    name: text(body.name),
    email: text(body.email),
    phone: text(body.phone),
    reason: text(body.reason) || text(body.message),
    message: text(body.message) || text(body.reason),
    source: body.source || 'Manual Entry',
    brand: text(body.brand),
    businessName: text(body.businessName),
    serviceWebsite: !!body.serviceWebsite,
    serviceLogo: !!body.serviceLogo,
    serviceSmm: !!body.serviceSmm,
    serviceOther: !!body.serviceOther,
    finalQuotation: text(body.finalQuotation),
    lastCalled: body.lastCalled || undefined,
    sourceUrl: normalizeSourceUrl(body.sourceUrl),
    createdBy: user._id,
    createdByName: `${user.First_Name || ''} ${user.Last_Name || ''}`.trim() || 'Unknown User',
    createdByRole: user.Role || 'Employee'
  };
};

const logInquiry = (req, verb, doc, extra) =>
  logRecordChange({ req, verb, entityType: 'Inquiry', module: 'Inquiries', doc, extra });

export const createInquiry = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated', error: 'Authentication required' });
    }

    const problem = validateInquiryInput(req.body);
    if (problem) {
      return res.status(400).json({ message: 'Validation error', error: problem });
    }

    const inquiry = await Inquiry.create(buildInquiryData(req.body, req.user));
    await logInquiry(req, 'created', inquiry);

    // Notify all connected staff in real time (sound + toast on the admin panel).
    emitNewInquiry(inquiry);

    res.status(201).json({ message: 'Inquiry created successfully', inquiry });
  } catch (err) {
    console.error('Error creating inquiry:', err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: 'Validation error',
        error: validationErrors.join(', ')
      });
    }

    res.status(500).json({
      message: 'Error creating inquiry',
      error: err.message || 'An unexpected error occurred'
    });
  }
};

// Bulk entry from the spreadsheet grid. Deliberately partial-success: someone
// who typed forty rows should not lose thirty-eight of them because two had a
// missing phone number. The response says exactly which rows did not go in, by
// their index in the submitted array, so the grid can keep just those.
export const createInquiriesBulk = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated', error: 'Authentication required' });
    }

    const rows = Array.isArray(req.body?.inquiries) ? req.body.inquiries : null;
    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Validation error', error: 'No inquiries were submitted' });
    }
    if (rows.length > MAX_BULK_INQUIRIES) {
      return res.status(400).json({
        message: 'Validation error',
        error: `At most ${MAX_BULK_INQUIRIES} inquiries can be added at once`
      });
    }

    const failed = [];
    const pending = [];
    rows.forEach((row, index) => {
      const problem = validateInquiryInput(row);
      if (problem) failed.push({ row: index, error: problem });
      else pending.push({ row: index, data: buildInquiryData(row, req.user) });
    });

    const created = [];
    for (let i = 0; i < pending.length; i += BULK_CONCURRENCY) {
      const batch = pending.slice(i, i + BULK_CONCURRENCY);
      const results = await Promise.all(batch.map(async ({ row, data }) => {
        try {
          return { row, inquiry: await Inquiry.create(data) };
        } catch (err) {
          const detail = err.name === 'ValidationError'
            ? Object.values(err.errors).map((e) => e.message).join(', ')
            : err.message || 'Could not be saved';
          return { row, error: detail };
        }
      }));
      results.forEach((r) => (r.inquiry ? created.push(r) : failed.push(r)));
    }

    // No per-row socket emit. `new_inquiry` plays a sound and raises a toast on
    // every staff panel, which is right for a lead arriving from a website and
    // wrong for forty rows typed in by hand. The submitting panel reloads its
    // own list.
    failed.sort((a, b) => a.row - b.row);

    if (created.length) {
      await logRecordChange({
        req,
        verb: 'created',
        entityType: 'Inquiry',
        module: 'Inquiries',
        doc: created[0].inquiry,
        extra: {
          bulk: true,
          count: created.length,
          // The names go in the log too, so a bulk entry can be checked later
          // without hunting through the inquiry list for what arrived when.
          names: created.map((c) => c.inquiry.name || c.inquiry.email).slice(0, 50),
        },
      });
    }

    if (created.length === 0) {
      return res.status(400).json({
        message: 'No inquiries were added',
        error: failed[0]?.error || 'Every row was rejected',
        created: 0,
        failed
      });
    }

    res.status(201).json({
      message: `${created.length} ${created.length === 1 ? 'inquiry' : 'inquiries'} added`,
      created: created.length,
      inquiries: created.map((c) => c.inquiry),
      failed
    });
  } catch (err) {
    console.error('Error creating inquiries in bulk:', err);
    res.status(500).json({
      message: 'Error creating inquiries',
      error: err.message || 'An unexpected error occurred'
    });
  }
};

export const getAllInquiries = async (req, res) => {
  try {
    // Visibility rules (non-admin): a user always sees inquiries they created, PLUS any
    // inquiries whose source they've been granted (view_ppc_inquiries / view_smm_inquiries /
    // view_website_inquiries). view_all_inquiries shows everything. Admin sees all.
    let filter = {};
    if (req.user?.Role !== 'Admin') {
      const UserPermission = (await import('../model/UserPermission.js')).default;
      const grants = await UserPermission.find({ userId: req.user._id, granted: true }).select('permissionName');
      const names = new Set(grants.map((g) => g.permissionName));

      if (!names.has('view_all_inquiries')) {
        const allowedSources = [];
        if (names.has('view_ppc_inquiries')) allowedSources.push('PPC');
        if (names.has('view_smm_inquiries')) allowedSources.push('SMM');
        if (names.has('view_website_inquiries')) allowedSources.push('Website');

        filter = allowedSources.length
          ? { $or: [
              { createdBy: req.user._id },
              // case-insensitive exact match so 'Website' / 'website' both qualify
              { source: { $in: allowedSources.map((s) => new RegExp(`^${s}$`, 'i')) } },
            ] }
          : { createdBy: req.user._id }; // legacy behaviour: own inquiries only
      }
    }

    const inquiries = await Inquiry.find(filter)
      .populate('createdBy', 'First_Name Last_Name Role')
      .populate('convertedBy', 'First_Name Last_Name')
      .sort({ createdAt: -1 });

    res.status(200).json({ inquiries });
  } catch (err) {
    console.error('Error fetching inquiries:', err);
    res.status(500).json({
      message: 'Error fetching inquiries',
      error: err.message || 'An unexpected error occurred'
    });
  }
};

export const getInquiryById = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Not found' });
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};

    // Only update provided fields
    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.email !== undefined) updateData.email = req.body.email.trim();
    if (req.body.phone !== undefined) updateData.phone = req.body.phone.trim();
    if (req.body.reason !== undefined) updateData.reason = req.body.reason.trim();
    if (req.body.message !== undefined) updateData.message = req.body.message.trim();
    if (req.body.brand !== undefined) updateData.brand = req.body.brand?.trim() || '';
    if (req.body.businessName !== undefined) updateData.businessName = req.body.businessName?.trim() || '';
    if (req.body.serviceWebsite !== undefined) updateData.serviceWebsite = !!req.body.serviceWebsite;
    if (req.body.serviceLogo !== undefined) updateData.serviceLogo = !!req.body.serviceLogo;
    if (req.body.serviceSmm !== undefined) updateData.serviceSmm = !!req.body.serviceSmm;
    if (req.body.serviceOther !== undefined) updateData.serviceOther = !!req.body.serviceOther;
    if (req.body.finalQuotation !== undefined) updateData.finalQuotation = req.body.finalQuotation?.trim() || '';
    if (req.body.lastCalled !== undefined) updateData.lastCalled = req.body.lastCalled || null;
    if (req.body.source !== undefined) updateData.source = req.body.source;
    if (req.body.sourceUrl !== undefined) updateData.sourceUrl = normalizeSourceUrl(req.body.sourceUrl);
    // Mark-only converted flag from the edit form's dropdown. This intentionally does
    // NOT create a client — only the explicit convert-to-client action does that.
    if (req.body.isConverted !== undefined) updateData.isConverted = !!req.body.isConverted;

    const inquiry = await Inquiry.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found', error: 'Not found' });
    }

    await logInquiry(req, 'updated', inquiry, { changed: Object.keys(updateData) });

    res.status(200).json({ message: 'Inquiry updated successfully', inquiry });
  } catch (err) {
    console.error('Error updating inquiry:', err);

    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: 'Validation error',
        error: validationErrors.join(', ')
      });
    }

    res.status(500).json({
      message: 'Error updating inquiry',
      error: err.message || 'An unexpected error occurred'
    });
  }
};

export const deleteInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Not found' });
    // Logged with the record attached — once it is gone, the log is the only
    // place left that knows who this was.
    await logInquiry(req, 'deleted', inquiry);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const convertInquiryToClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated', error: 'Authentication required' });
    }

    // Find the inquiry with populated creator
    const inquiry = await Inquiry.findById(id).populate('createdBy', 'First_Name Last_Name Role');
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found', error: 'Inquiry not found' });
    }

    if (inquiry.isConverted) {
      return res.status(400).json({
        message: 'Inquiry already converted',
        error: 'Inquiry already converted to client'
      });
    }

    // Get the user who created the inquiry (they should get the client assigned)
    const creatorUserId = inquiry.createdBy?._id || inquiry.createdBy;

    // If inquiry creator is not found, fall back to converter (admin)
    const assignToUserId = creatorUserId || req.user._id;

    // Create new client from inquiry data
    const clientData = {
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      brand: inquiry.brand?.trim() || '',
      createdBy: assignToUserId  // Assign to inquiry creator
    };

    // Generate brand-specific client ID if brand is provided
    if (clientData.brand && clientData.brand.trim() !== '') {
      const clientId = await generateClientId(clientData.brand);
      if (clientId) {
        clientData.clientId = clientId;
      }
    }

    const newClient = await Client.create(clientData);

    // Get creator's role for assignment
    let creatorRole = inquiry.createdBy?.Role;
    if (!creatorRole && creatorUserId) {
      const creator = await User.findById(creatorUserId);
      creatorRole = creator?.Role;
    }

    // Create assignment for the user who created the inquiry (not the converter)
    // Only assign non-Admin users - Admins can see all clients without assignment
    const validRoles = ['Front', 'Upsell', 'Production', 'Employee']; // Admin excluded
    if (creatorRole && validRoles.includes(creatorRole) && assignToUserId) {
      try {
        // Check if assignment already exists
        const existingAssignment = await Assignment.findOne({
          clientId: newClient._id,
          userId: assignToUserId
        });

        if (!existingAssignment) {
          await Assignment.create({
            clientId: newClient._id,
            userId: assignToUserId,
            role: creatorRole
          });
        }
      } catch (assignmentError) {
        console.error('Error creating assignment (non-critical):', assignmentError);
      }
    } else if (creatorRole === 'Admin') {
      console.log(`Admin user converted inquiry to client - no assignment needed (Admin can see all clients)`);
    }

    // Update inquiry to mark as converted
    await Inquiry.findByIdAndUpdate(id, {
      isConverted: true,
      convertedToClientId: newClient._id,
      convertedAt: new Date(),
      convertedBy: req.user._id
    });

    // Link any invoices billed to this inquiry to the new client so they show up in the
    // client's payment history (non-critical — never blocks the conversion).
    try {
      const { linkInquiryInvoicesToClient } = await import('./InvoiceController.js');
      await linkInquiryInvoicesToClient(id, newClient);
    } catch (linkErr) {
      console.error('Linking inquiry invoices on convert failed (non-critical):', linkErr.message);
    }

    const updatedInquiry = await Inquiry.findById(id).populate('convertedBy', 'First_Name Last_Name');
    const populatedClient = await Client.findById(newClient._id).populate('createdBy', 'First_Name Last_Name Role');

    res.status(201).json({
      message: 'Inquiry successfully converted to client',
      client: populatedClient,
      inquiry: updatedInquiry
    });
  } catch (err) {
    console.error('Error converting inquiry to client:', err);

    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: 'Validation error',
        error: validationErrors.join(', ')
      });
    }

    res.status(500).json({
      message: 'Error converting inquiry to client',
      error: err.message || 'An unexpected error occurred'
    });
  }
}; 