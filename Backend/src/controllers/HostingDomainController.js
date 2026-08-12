import HostingDomain from '../model/HostingDomain.js';
import Client from '../model/Client.js';
import Assignment from '../model/Assignment.js';
import mongoose from 'mongoose';

// Get hosting/domain records for the authenticated client (client panel)
export const getMyHostingDomains = async (req, res) => {
  try {
    console.log('=== getMyHostingDomains CALLED ===');
    console.log('req.client exists:', !!req.client);
    console.log('req.user exists:', !!req.user);
    
    if (!req.client) {
      console.error('No client found in request - authentication failed');
      return res.status(401).json({ message: 'Client authentication required' });
    }

    const clientId = req.client._id;
    console.log('Client ID from token:', clientId.toString());
    console.log('Client ID type:', typeof clientId);
    
    // Try multiple query formats to ensure we find records
    let records = await HostingDomain.find({ clientId: clientId })
      .sort({ startDate: -1 });
    
    console.log('Query result (direct clientId):', records.length, 'records');
    
    // If no records found, try with ObjectId conversion
    if (records.length === 0) {
      const clientObjectId = new mongoose.Types.ObjectId(clientId);
      records = await HostingDomain.find({ clientId: clientObjectId })
        .sort({ startDate: -1 });
      console.log('Query result (ObjectId):', records.length, 'records');
    }
    
    // Debug: Check all records in database to see what clientIds exist
    if (records.length === 0) {
      const allRecords = await HostingDomain.find({}).limit(5);
      console.log('Sample records in database (first 5):');
      allRecords.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, {
          _id: record._id,
          clientId: record.clientId?.toString(),
          clientIdType: record.clientId?.constructor?.name,
          name: record.name,
          type: record.type
        });
      });
      console.log('Looking for clientId:', clientId.toString());
    }
    
    console.log('Returning', records.length, 'records');
    return res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching hosting/domain records:', error);
    res.status(500).json({ message: 'Error fetching hosting/domain records', error: error.message });
  }
};

// Get all hosting/domain records for a client
export const getClientHostingDomains = async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log('getClientHostingDomains called with clientId:', clientId);
    console.log('req.client:', req.client ? { _id: req.client._id.toString() } : 'null');
    console.log('req.user:', req.user ? { _id: req.user._id.toString(), Role: req.user.Role } : 'null');

    // If it's a client accessing their own data
    if (req.client) {
      const clientIdStr = req.client._id.toString();
      const paramClientIdStr = clientId.toString();
      
      console.log('Comparing client IDs:', clientIdStr, '===', paramClientIdStr);
      
      if (clientIdStr === paramClientIdStr) {
        // Use ObjectId to ensure proper query
        const clientObjectId = new mongoose.Types.ObjectId(req.client._id);
        const records = await HostingDomain.find({ clientId: clientObjectId })
          .sort({ startDate: -1 });
        console.log('Found records for client:', records.length);
        return res.status(200).json(records);
      } else {
        console.log('Client ID mismatch - client cannot access other client data');
        return res.status(403).json({ message: 'Access denied - you can only view your own data' });
      }
    }

    // If it's a user (employee/admin) accessing client data
    if (req.user) {
      const userId = req.user._id;

      // Check if user has access to this client
      if (req.user.Role !== 'Admin') {
        const assignment = await Assignment.findOne({ userId, clientId });
        if (!assignment) {
          return res.status(403).json({ message: 'Access denied to this client' });
        }
      }

      // Use ObjectId to ensure proper query
      const clientObjectId = new mongoose.Types.ObjectId(clientId);
      const records = await HostingDomain.find({ clientId: clientObjectId })
        .sort({ startDate: -1 });

      return res.status(200).json(records);
    }

    return res.status(401).json({ message: 'Unauthorized' });
  } catch (error) {
    console.error('Error fetching hosting/domain records:', error);
    res.status(500).json({ message: 'Error fetching hosting/domain records', error: error.message });
  }
};

// Create new hosting/domain record
export const createHostingDomain = async (req, res) => {
  try {
    const { clientId, type, name, duration, startDate, endDate, notes } = req.body;
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

    if (!type || !name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Type, name, start date, and end date are required' });
    }

    const record = await HostingDomain.create({
      clientId,
      type,
      name,
      duration: duration || '',
      startDate,
      endDate,
      notes: notes || ''
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating hosting/domain record:', error);
    res.status(500).json({ message: 'Error creating hosting/domain record', error: error.message });
  }
};

// Update hosting/domain record
export const updateHostingDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, duration, startDate, endDate, notes } = req.body;
    const userId = req.user._id;

    const record = await HostingDomain.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'Hosting/domain record not found' });
    }

    // Check if user has access to this client
    if (req.user.Role !== 'Admin') {
      const assignment = await Assignment.findOne({ userId, clientId: record.clientId });
      if (!assignment) {
        return res.status(403).json({ message: 'Access denied to this record' });
      }
    }

    if (!type || !name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Type, name, start date, and end date are required' });
    }

    const updatedRecord = await HostingDomain.findByIdAndUpdate(
      id,
      {
        type,
        name,
        duration: duration || '',
        startDate,
        endDate,
        notes: notes || ''
      },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating hosting/domain record:', error);
    res.status(500).json({ message: 'Error updating hosting/domain record', error: error.message });
  }
};

// Delete hosting/domain record
export const deleteHostingDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const record = await HostingDomain.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'Hosting/domain record not found' });
    }

    // Check if user has access to this client
    if (req.user.Role !== 'Admin') {
      const assignment = await Assignment.findOne({ userId, clientId: record.clientId });
      if (!assignment) {
        return res.status(403).json({ message: 'Access denied to this record' });
      }
    }

    await HostingDomain.findByIdAndDelete(id);
    res.status(200).json({ message: 'Hosting/domain record deleted successfully' });
  } catch (error) {
    console.error('Error deleting hosting/domain record:', error);
    res.status(500).json({ message: 'Error deleting hosting/domain record', error: error.message });
  }
};

