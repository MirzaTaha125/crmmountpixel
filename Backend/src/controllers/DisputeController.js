import Dispute from '../model/Dispute.js';

// Create a new dispute
export const createDispute = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated', error: 'Authentication required' });
    }

    const { type, clientId, clientName, amount, currency, description, status, disputeDate, notes, brand } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ message: 'Type and amount are required' });
    }

    if (type === 'Client Chargeback' && !clientId && !clientName) {
      return res.status(400).json({ message: 'Client ID or Client Name is required for client chargebacks' });
    }

    const dispute = await Dispute.create({
      type: type.trim(),
      clientId: clientId || null,
      clientName: clientName?.trim() || '',
      amount: parseFloat(amount),
      currency: currency || 'USD',
      description: description?.trim() || '',
      status: status || 'Active',
      disputeDate: disputeDate ? new Date(disputeDate) : new Date(),
      notes: notes?.trim() || '',
      brand: brand?.trim() || '',
      createdBy: req.user._id
    });

    res.status(201).json({ 
      message: 'Dispute created successfully', 
      dispute
    });
  } catch (error) {
    console.error('Error creating dispute:', error);
    res.status(500).json({ message: 'Error creating dispute', error: error.message });
  }
};

// Get all disputes
export const getAllDisputes = async (req, res) => {
  try {
    const { month, year, startDate, endDate, brand, status, type } = req.query;
    
    let filter = {};
    
    // Date range filter (takes priority over month/year)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.disputeDate = { $gte: start, $lte: end };
    } else if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.disputeDate = { $gte: start, $lte: end };
    }
    
    // Brand filter
    if (brand) {
      filter.brand = brand;
    }
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Type filter
    if (type) {
      filter.type = type;
    }
    
    const disputes = await Dispute.find(filter)
      .populate('clientId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ disputeDate: -1, createdAt: -1 });
    
    res.json({ disputes });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ message: 'Error fetching disputes', error: error.message });
  }
};

// Get dispute by ID
export const getDisputeById = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('clientId', 'name email phone')
      .populate('createdBy', 'name email');
    
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    res.json(dispute);
  } catch (error) {
    console.error('Error fetching dispute:', error);
    res.status(500).json({ message: 'Error fetching dispute', error: error.message });
  }
};

// Update dispute
export const updateDispute = async (req, res) => {
  try {
    const { type, clientId, clientName, amount, currency, description, status, disputeDate, notes, brand } = req.body;
    
    const dispute = await Dispute.findById(req.params.id);
    
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    if (type !== undefined) dispute.type = type.trim();
    if (clientId !== undefined) dispute.clientId = clientId || null;
    if (clientName !== undefined) dispute.clientName = clientName?.trim() || '';
    if (amount !== undefined) dispute.amount = parseFloat(amount);
    if (currency !== undefined) dispute.currency = currency;
    if (description !== undefined) dispute.description = description?.trim() || '';
    if (status !== undefined) dispute.status = status;
    if (disputeDate !== undefined) dispute.disputeDate = new Date(disputeDate);
    if (notes !== undefined) dispute.notes = notes?.trim() || '';
    if (brand !== undefined) dispute.brand = brand?.trim() || '';
    
    await dispute.save();
    
    const updatedDispute = await Dispute.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('createdBy', 'name email');
    
    res.json({ 
      message: 'Dispute updated successfully', 
      dispute: updatedDispute
    });
  } catch (error) {
    console.error('Error updating dispute:', error);
    res.status(500).json({ message: 'Error updating dispute', error: error.message });
  }
};

// Delete dispute
export const deleteDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndDelete(req.params.id);
    
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    res.json({ message: 'Dispute deleted successfully' });
  } catch (error) {
    console.error('Error deleting dispute:', error);
    res.status(500).json({ message: 'Error deleting dispute', error: error.message });
  }
};


