import Client from "../model/Client.js";
import Package from "../model/Package.js";
import Assignment from "../model/Assignment.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import PaymentLink from "../model/PaymentLink.js";
import { logClientAction, logActivity } from "../services/activityLogService.js";

// Helper function to generate brand-specific client ID
export async function generateClientId(brand) {
  // Map brands to prefixes
  const brandPrefixes = {
    'American Design Eagle': 'ADE',
    'Webdevelopers Inc': 'WDI',
    'Mount Pixels': 'MP'
  };

  const prefix = brandPrefixes[brand] || '';
  if (!prefix) {
    return null; // No client ID for brands without a prefix
  }

  // Find the highest client ID for this brand
  const clients = await Client.find({ 
    brand: brand,
    clientId: { $exists: true, $ne: null }
  }).sort({ clientId: -1 }).limit(1);

  let nextNumber = 1;
  
  if (clients.length > 0 && clients[0].clientId) {
    // Extract the number from the existing client ID (e.g., "ADE001" -> 1)
    const match = clients[0].clientId.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1;
    }
  }

  // Format with leading zeros (3 digits)
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  return `${prefix}${formattedNumber}`;
}

// GET clients (filter by name/status + employee assigned filter)
export async function getClients(req, res) {
  try {
    const { name, status, assignedEmployee, brand } = req.query;
    const filter = {};
    
    // Search by name or clientId
    if (name) {
      // Search both name and clientId using $or
      filter.$or = [
        { name: { $regex: name, $options: 'i' } },
        { clientId: { $regex: name, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (brand && brand.trim() !== '') filter.brand = brand;
    
    if (req.user?.Role !== 'Admin') {
      // Find all assignments for this user
      const assignments = await Assignment.find({ userId: req.user._id });
      const clientIds = assignments.map(a => a.clientId);
      if (clientIds.length > 0) {
        // Ensure proper ObjectId comparison
        filter._id = { $in: clientIds };
      } else {
        // User has no assignments, return empty array
        return res.status(200).json({ message: "Clients fetched successfully", clients: [] });
      }
    }

    // Handle assignedEmployee filter if provided
    if (assignedEmployee && assignedEmployee !== 'unassigned' && assignedEmployee !== 'assigned') {
      // Filter by specific employee
      const assignments = await Assignment.find({ userId: assignedEmployee });
      const assignedClientIds = assignments.map(a => a.clientId);
      if (assignedClientIds.length > 0) {
        if (filter._id && filter._id.$in) {
          // Intersect with existing filter
          filter._id = { $in: assignedClientIds.filter(id => filter._id.$in.some(existingId => existingId.toString() === id.toString())) };
        } else {
          filter._id = { $in: assignedClientIds };
        }
      } else {
        return res.status(200).json({ message: "Clients fetched successfully", clients: [] });
      }
    } else if (assignedEmployee === 'unassigned') {
      // Filter for clients with no assignments
      const allAssignments = await Assignment.find();
      const assignedClientIds = allAssignments.map(a => a.clientId.toString());
      if (filter._id && filter._id.$in) {
        // Filter existing client IDs to exclude assigned ones
        filter._id = { $in: filter._id.$in.filter(id => !assignedClientIds.includes(id.toString())) };
      } else {
      filter._id = { $nin: assignedClientIds };
      }
    } else if (assignedEmployee === 'assigned') {
      // Filter for clients with at least one assignment
      const allAssignments = await Assignment.find();
      const assignedClientIds = allAssignments.map(a => a.clientId);
      if (assignedClientIds.length > 0) {
        if (filter._id && filter._id.$in) {
          // Intersect with existing filter
          filter._id = { $in: filter._id.$in.filter(id => assignedClientIds.some(assignedId => assignedId.toString() === id.toString())) };
        } else {
          filter._id = { $in: assignedClientIds };
        }
      } else {
        return res.status(200).json({ message: "Clients fetched successfully", clients: [] });
      }
    }

    const clients = await Client.find(filter).populate('createdBy', 'First_Name Last_Name Role').sort({ createdAt: -1 });
    res.status(200).json({ message: "Clients fetched successfully", clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      message: "Error fetching clients", 
      error: error.message || "An unexpected error occurred" 
    });
  }
}


// GET single client
export async function getClient(req, res) {
  try {
    const { id } = req.params;
    const client = await Client.findById(id).populate('createdBy', 'First_Name Last_Name Role');
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    // Check if user has access (Admin or assigned to this client)
    if (req.user?.Role !== 'Admin') {
      const assignment = await Assignment.findOne({ userId: req.user._id, clientId: id });
      if (!assignment) {
        return res.status(403).json({ 
          message: "Access denied", 
          error: "You don't have access to this client" 
        });
      }
    }
    
    res.status(200).json({ message: "Client found", client });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ 
      message: "Error fetching client", 
      error: error.message || "An unexpected error occurred" 
    });
  }
}

// CREATE client
export async function createClient(req, res) {
  try {
    // Validate required fields
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ 
        message: "Validation error", 
        error: "Name, email, and phone are required fields" 
      });
    }

    // Check if user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Automatically assign the client to the user who created it
    // Calculate dueAmount if totalAmount and paidAmount are provided
    const totalAmount = req.body.totalAmount ? parseFloat(req.body.totalAmount) : 0;
    const paidAmount = req.body.paidAmount ? parseFloat(req.body.paidAmount) : 0;
    const dueAmount = req.body.dueAmount ? parseFloat(req.body.dueAmount) : (totalAmount - paidAmount);
    
    const clientData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      companyName: req.body.companyName?.trim() || undefined,
      company: req.body.company?.trim() || undefined,
      address: req.body.address?.trim() || undefined,
      brand: req.body.brand?.trim() || '',
      totalAmount: totalAmount || undefined,
      paidAmount: paidAmount || undefined,
      dueAmount: dueAmount >= 0 ? dueAmount : 0,
      status: req.body.status || 'Active',
      createdBy: req.user._id
    };

    // Hash password if provided
    if (req.body.password && req.body.password.trim()) {
      clientData.password = await bcrypt.hash(req.body.password.trim(), 10);
    }
    
    // Generate brand-specific client ID
    if (clientData.brand && clientData.brand.trim() !== '') {
      const clientId = await generateClientId(clientData.brand);
      if (clientId) {
        clientData.clientId = clientId;
      }
    }
    
    const client = await Client.create(clientData);
    
    // Log activity (only for admin actions)
    if (req.user && req.user.Role === 'Admin') {
      await logClientAction(
        req.user._id,
        'client_created',
        client._id,
        `Created client: ${client.name} (${client.email})`,
        { clientId: client._id, name: client.name, email: client.email, brand: client.brand },
        req
      );
    }
    
    // Automatically create an assignment for the user who created the client
    // This ensures the client is automatically assigned to the creator
    // NOTE: Admins are NOT assigned - they can see all clients without assignment
    let assignment = null;
    const validRoles = ['Front', 'Upsell', 'Production', 'Employee']; // Admin excluded - they see all clients
    
    if (req.user.Role && validRoles.includes(req.user.Role)) {
      try {
        // Check if assignment already exists (avoid duplicates)
        const existingAssignment = await Assignment.findOne({
          clientId: client._id,
          userId: req.user._id
        });
        
        if (!existingAssignment) {
          assignment = await Assignment.create({
            clientId: client._id,
            userId: req.user._id,
            role: req.user.Role
          });
          console.log(`Assignment created for user ${req.user._id} to client ${client._id}`);
        } else {
          assignment = existingAssignment;
          console.log(`Assignment already exists for user ${req.user._id} to client ${client._id}`);
        }
      } catch (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        // Log but don't fail - assignment is helpful but not critical for client creation
        // The client was created successfully, assignment can be done manually later
      }
    } else if (req.user.Role === 'Admin') {
      console.log(`Admin user ${req.user._id} created client ${client._id} - no assignment needed (Admin can see all clients)`);
    } else {
      console.warn(`User role "${req.user.Role}" is not in valid roles list. Assignment not created.`);
    }
    
    const populatedClient = await Client.findById(client._id).populate('createdBy', 'First_Name Last_Name Role');
    
    // Include assignment info in response if created
    const response = {
      message: "Client created successfully",
      client: populatedClient
    };
    
    if (assignment) {
      response.assignment = {
        message: "Client automatically assigned to you",
        assignmentId: assignment._id
      };
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating client:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation error", 
        error: validationErrors.join(', ') 
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Duplicate entry", 
        error: "A client with this email already exists" 
      });
    }
    
    // Generic error
    res.status(500).json({ 
      message: "Error creating client", 
      error: error.message || "An unexpected error occurred" 
    });
  }
}

// UPDATE client (amounts or status)
export async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const updateData = {};
    
    // Only update provided fields
    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.email !== undefined) updateData.email = req.body.email.trim();
    if (req.body.phone !== undefined) updateData.phone = req.body.phone.trim();
    if (req.body.companyName !== undefined) updateData.companyName = req.body.companyName?.trim() || null;
    if (req.body.company !== undefined) updateData.company = req.body.company?.trim() || null;
    if (req.body.address !== undefined) updateData.address = req.body.address?.trim() || null;
    if (req.body.brand !== undefined) updateData.brand = req.body.brand?.trim() || '';
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.clientId !== undefined) updateData.clientId = req.body.clientId?.trim() || null;
    
    // Hash password if provided (only update if password is not empty)
    if (req.body.password !== undefined && req.body.password.trim()) {
      updateData.password = await bcrypt.hash(req.body.password.trim(), 10);
    }
    
    // Handle amount fields - fetch existing client if needed for calculations
    let existingClient = null;
    if (req.body.totalAmount !== undefined || req.body.paidAmount !== undefined || req.body.dueAmount !== undefined) {
      existingClient = await Client.findById(id);
    }
    
    if (req.body.totalAmount !== undefined) {
      updateData.totalAmount = parseFloat(req.body.totalAmount) || 0;
    }
    if (req.body.paidAmount !== undefined) {
      updateData.paidAmount = parseFloat(req.body.paidAmount) || 0;
    }
    // Auto-calculate dueAmount if totalAmount or paidAmount is updated
    if (req.body.totalAmount !== undefined || req.body.paidAmount !== undefined || req.body.dueAmount !== undefined) {
      const total = updateData.totalAmount !== undefined ? updateData.totalAmount : (existingClient?.totalAmount || 0);
      const paid = updateData.paidAmount !== undefined ? updateData.paidAmount : (existingClient?.paidAmount || 0);
      updateData.dueAmount = req.body.dueAmount !== undefined ? parseFloat(req.body.dueAmount) : (total - paid >= 0 ? total - paid : 0);
    }
    
    const client = await Client.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    // Log activity (only for admin actions)
    if (req.user && req.user.Role === 'Admin') {
      await logClientAction(
        req.user._id,
        'client_updated',
        client._id,
        `Updated client: ${client.name} (${client.email})`,
        { clientId: client._id, name: client.name, changes: updateData },
        req
      );
    }
    
    const populatedClient = await Client.findById(client._id).populate('createdBy', 'First_Name Last_Name Role');
    
    res.status(200).json({ message: "Client updated successfully", client: populatedClient });
  } catch (error) {
    console.error('Error updating client:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation error", 
        error: validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({ 
      message: "Error updating client", 
      error: error.message || "An unexpected error occurred" 
    });
  }
}

// DELETE client
export async function deleteClient(req, res) {
  try {
    const { id } = req.params;
    const client = await Client.findByIdAndDelete(id);
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    // Log activity (only for admin actions)
    if (req.user && req.user.Role === 'Admin') {
      await logClientAction(
        req.user._id,
        'client_deleted',
        client._id,
        `Deleted client: ${client.name} (${client.email})`,
        { clientId: client._id, name: client.name, email: client.email },
        req
      );
    }
    
    // Also delete associated assignments
    await Assignment.deleteMany({ clientId: id });
    
    // Delete associated chats and messages
    const Chat = (await import('../model/Chat.js')).default;
    const Message = (await import('../model/Message.js')).default;
    
    // Find all chats with this client
    const chats = await Chat.find({ clientId: id });
    const chatIds = chats.map(chat => chat._id);
    
    // Delete all messages in these chats
    if (chatIds.length > 0) {
      await Message.deleteMany({ chatId: { $in: chatIds } });
    }
    
    // Delete the chats
    await Chat.deleteMany({ clientId: id });
    
    res.status(200).json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ 
      message: "Error deleting client", 
      error: error.message || "An unexpected error occurred" 
    });
  }
}

// CLIENT LOGIN (for client panel access)
export async function loginClient(req, res) {
  try {
    const { Email, Password } = req.body;
    
    // Validate input
    if (!Email || !Password) {
      return res.status(400).json({ 
        message: "Validation error", 
        error: "Email and password are required" 
      });
    }

    const client = await Client.findOne({ email: Email.trim().toLowerCase() });
    if (!client) {
      // Log failed client login attempt
      await logActivity({
        userId: null,
        action: 'client_login_failed',
        entityType: 'Client',
        description: `Failed login attempt for client email: ${Email.trim().toLowerCase()} (Client not found)`,
        details: { email: Email.trim().toLowerCase(), reason: 'Client not found' },
        module: 'Authentication',
        req
      });
      
      return res.status(401).json({ 
        message: "Authentication failed", 
        error: "Invalid email or password" 
      });
    }
    
    // Check if client has a password set
    if (!client.password) {
      // Log failed client login attempt (no password set)
      await logActivity({
        userId: client._id,
        action: 'client_login_failed',
        entityType: 'Client',
        entityId: client._id,
        description: `Failed login attempt for client: ${client.name} (${client.email}) - No password set`,
        details: { clientId: client._id, email: client.email, reason: 'No password set' },
        module: 'Authentication',
        req
      });
      
      return res.status(401).json({ 
        message: "Authentication failed", 
        error: "Client account does not have a password set. Please contact your administrator." 
      });
    }
    
    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(Password, client.password);
    if (!isMatch) {
      // Log failed client login attempt (wrong password)
      await logActivity({
        userId: client._id,
        action: 'client_login_failed',
        entityType: 'Client',
        entityId: client._id,
        description: `Failed login attempt for client: ${client.name} (${client.email})`,
        details: { clientId: client._id, email: client.email, reason: 'Invalid password' },
        module: 'Authentication',
        req
      });
      
      return res.status(401).json({ 
        message: "Authentication failed", 
        error: "Invalid email or password" 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: client._id, type: 'Client', email: client.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    // Log successful client login
    await logActivity({
      userId: client._id,
      action: 'client_login',
      entityType: 'Client',
      entityId: client._id,
      description: `Client logged in: ${client.name} (${client.email})`,
      details: { clientId: client._id, email: client.email, name: client.name },
      module: 'Authentication',
      req
    });
    
    // Return client info (without password)
    res.status(200).json({
      message: "Login successful",
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        companyName: client.companyName,
        brand: client.brand || '',
        type: 'Client',
        token
      }
    });
  } catch (error) {
    console.error('Error during client login:', error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message || "An unexpected error occurred" 
    });
  }
}

// GET current client's profile (for client panel)
export async function getMyProfile(req, res) {
  try {
    if (!req.client) {
      return res.status(401).json({ message: 'Client authentication required' });
    }

    // Return client info (without password)
    res.status(200).json({
      message: "Client profile retrieved",
      client: {
        id: req.client._id,
        name: req.client.name,
        email: req.client.email,
        phone: req.client.phone,
        companyName: req.client.companyName,
        brand: req.client.brand || '',
        type: 'Client'
      }
    });
  } catch (error) {
    console.error('Error fetching client profile:', error);
    res.status(500).json({ 
      message: "Error fetching client profile", 
      error: error.message || "An unexpected error occurred" 
    });
  }
}

// GET client's pending invoices/payment links
export async function getClientPendingInvoices(req, res) {
  try {
    // This endpoint should be called with client authentication
    // The client ID should come from the JWT token
    const clientId = req.client?._id;
    
    if (!clientId) {
      return res.status(401).json({ 
        message: "Unauthorized", 
        error: "Client authentication required" 
      });
    }

    // Get all pending payment links for this client
    const pendingInvoices = await PaymentLink.find({
      clientId: clientId,
      status: { $in: ['Pending', 'Expired'] }
    }).sort({ createdAt: -1 });

    // Also get pending payment history records
    const PaymentHistory = (await import('../model/PaymentHistory.js')).default;
    const pendingPayments = await PaymentHistory.find({
      clientId: clientId,
      status: 'Pending'
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Pending invoices fetched successfully",
      invoices: pendingInvoices,
      payments: pendingPayments
    });
  } catch (error) {
    console.error('Error fetching client pending invoices:', error);
    res.status(500).json({ 
      message: "Error fetching pending invoices", 
      error: error.message || "An unexpected error occurred" 
    });
  }
}

// Logout endpoint for clients
export async function logoutClient(req, res) {
  try {
    if (!req.client) {
      return res.status(401).json({ 
        message: "Not authenticated", 
        error: "Client not authenticated" 
      });
    }

    // Log client logout
    await logActivity({
      userId: req.client._id,
      action: 'client_logout',
      entityType: 'Client',
      entityId: req.client._id,
      description: `Client logged out: ${req.client.name} (${req.client.email})`,
      details: { clientId: req.client._id, email: req.client.email, name: req.client.name },
      module: 'Authentication',
      req
    });

    res.status(200).json({ 
      message: "Logout successful" 
    });
  } catch (error) {
    console.error('Error during client logout:', error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message || "An unexpected error occurred" 
    });
  }
}
