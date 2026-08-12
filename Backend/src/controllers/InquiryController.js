import Inquiry from '../model/Inquiry.js';
import Client from '../model/Client.js';
import Assignment from '../model/Assignment.js';
import User from '../model/User.js';
import PaymentLink from '../model/PaymentLink.js';
import PaymentHistory from '../model/PaymentHistory.js';
import { generateClientId } from './ClientController.js';
import { emitNewInquiry } from '../socket.js';

export const createInquiry = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated', error: 'Authentication required' });
    }

    // Validate required fields
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({
        message: 'Validation error',
        error: 'Name, email, and phone are required fields'
      });
    }

    // Ensure at least reason or message is provided
    if (!req.body.reason && !req.body.message) {
      return res.status(400).json({
        message: 'Validation error',
        error: 'Either reason or message must be provided'
      });
    }

    // Prepare inquiry data
    const inquiryData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      reason: req.body.reason?.trim() || req.body.message?.trim() || '',
      message: req.body.message?.trim() || req.body.reason?.trim() || '',
      source: req.body.source || 'Manual Entry',
      brand: req.body.brand?.trim() || '',
      businessName: req.body.businessName?.trim() || '',
      serviceWebsite: !!req.body.serviceWebsite,
      serviceLogo: !!req.body.serviceLogo,
      serviceSmm: !!req.body.serviceSmm,
      serviceOther: !!req.body.serviceOther,
      finalQuotation: req.body.finalQuotation?.trim() || '',
      lastCalled: req.body.lastCalled || undefined,
      createdBy: req.user._id,
      createdByName: `${req.user.First_Name || ''} ${req.user.Last_Name || ''}`.trim() || 'Unknown User',
      createdByRole: req.user.Role || 'Employee'
    };

    const inquiry = await Inquiry.create(inquiryData);

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
    // Mark-only converted flag from the edit form's dropdown. This intentionally does
    // NOT create a client — only the explicit convert-to-client action does that.
    if (req.body.isConverted !== undefined) updateData.isConverted = !!req.body.isConverted;

    const inquiry = await Inquiry.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found', error: 'Not found' });
    }

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