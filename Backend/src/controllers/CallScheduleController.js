import CallSchedule from '../model/CallSchedule.js';
import Client from '../model/Client.js';
import Assignment from '../model/Assignment.js';

// Create a new call schedule
export const createCallSchedule = async (req, res) => {
  try {
    const { clientId, scheduledDate, scheduledTime, reason, notes, userId: targetUserId } = req.body;
    const isAdmin = req.user.Role === 'Admin';
    
    // For admins, use the provided userId, otherwise use the logged-in user's ID
    const userId = isAdmin && targetUserId ? targetUserId : req.user._id;

    // Validate required fields
    if (!clientId || !scheduledDate || !scheduledTime || !reason) {
      return res.status(400).json({ 
        message: 'Missing required fields: clientId, scheduledDate, scheduledTime, reason' 
      });
    }

    // For non-admin users, check if they are assigned to this client
    if (!isAdmin) {
      const assignment = await Assignment.findOne({ 
        userId: req.user._id, 
        clientId: clientId 
      });
      
      if (!assignment) {
        return res.status(403).json({ 
          message: 'You are not assigned to this client' 
        });
      }
    }

    // Get client details
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get user details for the target user (if admin is scheduling for another user)
    let targetUser = req.user;
    if (isAdmin && targetUserId && targetUserId !== req.user._id.toString()) {
      const User = (await import('../model/User.js')).default;
      targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'Target user not found' });
      }
    }

    // Create the call schedule
    const callSchedule = new CallSchedule({
      clientId,
      userId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      reason,
      notes: notes || '',
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      userRole: targetUser.Role,
      userName: targetUser.First_Name + ' ' + targetUser.Last_Name
    });

    await callSchedule.save();

    // Populate the response
    const populatedSchedule = await CallSchedule.findById(callSchedule._id)
      .populate('clientId', 'name email phone')
      .populate('userId', 'First_Name Last_Name Role');

    res.status(201).json(populatedSchedule);
  } catch (error) {
    console.error('Error creating call schedule:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all call schedules (Admin only)
export const getAllCallSchedules = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.Role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const { startDate, endDate, status, userId } = req.query;
    
    let filter = {};
    
    // Date range filter
    if (startDate && endDate) {
      filter.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // User filter
    if (userId) {
      filter.userId = userId;
    }

    const schedules = await CallSchedule.find(filter)
      .populate('clientId', 'name email phone')
      .populate('userId', 'First_Name Last_Name Role')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching call schedules:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get call schedules for current user
export const getUserCallSchedules = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, status } = req.query;
    
    let filter = { userId };
    
    // Date range filter
    if (startDate && endDate) {
      filter.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    const schedules = await CallSchedule.find(filter)
      .populate('clientId', 'name email phone')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching user call schedules:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get assigned clients for current user (or all clients for admin)
export const getUserAssignedClients = async (req, res) => {
  try {
    const isAdmin = req.user.Role === 'Admin';
    
    if (isAdmin) {
      // Admin can see all clients
      const clients = await Client.find().select('name email phone brand').sort({ name: 1 });
      res.json(clients);
    } else {
      // Non-admin users only see their assigned clients
      const userId = req.user._id;
      const assignments = await Assignment.find({ userId })
        .populate('clientId', 'name email phone brand');
      
      const clients = assignments.map(assignment => assignment.clientId);
      res.json(clients);
    }
  } catch (error) {
    console.error('Error fetching assigned clients:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update call schedule
export const updateCallSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate, scheduledTime, reason, notes, status } = req.body;
    const userId = req.user._id;

    const schedule = await CallSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ message: 'Call schedule not found' });
    }

    // Check if user owns this schedule or is admin
    if (schedule.userId.toString() !== userId.toString() && req.user.Role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to update this schedule' });
    }

    // Update fields
    if (scheduledDate) schedule.scheduledDate = new Date(scheduledDate);
    if (scheduledTime) schedule.scheduledTime = scheduledTime;
    if (reason) schedule.reason = reason;
    if (notes !== undefined) schedule.notes = notes;
    if (status) schedule.status = status;

    await schedule.save();

    const updatedSchedule = await CallSchedule.findById(id)
      .populate('clientId', 'name email phone')
      .populate('userId', 'First_Name Last_Name Role');

    res.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating call schedule:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete call schedule
export const deleteCallSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const schedule = await CallSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ message: 'Call schedule not found' });
    }

    // Check if user owns this schedule or is admin
    if (schedule.userId.toString() !== userId.toString() && req.user.Role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete this schedule' });
    }

    await CallSchedule.findByIdAndDelete(id);
    res.json({ message: 'Call schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting call schedule:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get calendar data for admin (grouped by date)
export const getCalendarData = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.Role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const { month, year } = req.query;
    
    let startDate, endDate;
    
    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const schedules = await CallSchedule.find({
      scheduledDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('clientId', 'name email phone')
    .populate('userId', 'First_Name Last_Name Role')
    .sort({ scheduledDate: 1, scheduledTime: 1 });

    // Group by date using local timezone to avoid date shifting
    const calendarData = {};
    schedules.forEach(schedule => {
      // Use local date components to avoid timezone issues
      const date = new Date(schedule.scheduledDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push(schedule);
    });

    res.json(calendarData);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
