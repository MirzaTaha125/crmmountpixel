import ActivityLog from '../model/ActivityLog.js';
import User from '../model/User.js';
import Client from '../model/Client.js';

/**
 * Get all activity logs with filters
 * Only accessible by Admin users
 */
export async function getActivityLogs(req, res) {
  try {
    // Only Admin can view activity logs
    if (req.user.Role !== 'Admin') {
      return res.status(403).json({ 
        message: 'Access denied', 
        error: 'Only administrators can view activity logs' 
      });
    }

    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entityType,
      module,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter
    const filter = {};

    if (userId) {
      filter.userId = userId;
    }

    if (action) {
      filter.action = action;
    }

    if (entityType) {
      filter.entityType = entityType;
    }

    if (module) {
      filter.module = module;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Search filter (searches in description)
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get logs with pagination - first get raw logs to identify client actions
    const rawLogs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() to get plain objects

    // Separate client actions and user actions
    const clientActionLogs = rawLogs.filter(log => 
      log.action && log.action.startsWith('client_') && log.userId
    );
    const userActionLogs = rawLogs.filter(log => 
      !log.action || !log.action.startsWith('client_')
    );

    // Fetch clients for client actions
    const clientIds = clientActionLogs.map(log => log.userId).filter(Boolean);
    const clientMap = {};
    if (clientIds.length > 0) {
      const clients = await Client.find({ _id: { $in: clientIds } }).select('name email').lean();
      clients.forEach(client => {
        const nameParts = client.name.split(' ');
        clientMap[client._id.toString()] = {
          First_Name: nameParts[0] || client.name,
          Last_Name: nameParts.slice(1).join(' ') || '',
          Email: client.email,
          Role: 'Client',
          isClient: true
        };
      });
    }

    // Fetch users for user actions
    const userIds = userActionLogs.map(log => log.userId).filter(Boolean);
    const userMap = {};
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds } }).select('First_Name Last_Name Email Role').lean();
      users.forEach(user => {
        userMap[user._id.toString()] = {
          First_Name: user.First_Name,
          Last_Name: user.Last_Name,
          Email: user.Email,
          Role: user.Role
        };
      });
    }

    // Combine and populate userId appropriately
    const logs = rawLogs.map(log => {
      if (log.userId) {
        const userIdStr = log.userId.toString();
        if (log.action && log.action.startsWith('client_')) {
          // For client actions, use clientMap
          if (clientMap[userIdStr]) {
            log.userId = clientMap[userIdStr];
          }
        } else {
          // For user actions, use userMap
          if (userMap[userIdStr]) {
            log.userId = userMap[userIdStr];
          }
        }
      }
      return log;
    });

    // Get total count for pagination
    const total = await ActivityLog.countDocuments(filter);

    res.status(200).json({
      message: 'Activity logs fetched successfully',
      logs,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ 
      message: 'Error fetching activity logs', 
      error: error.message 
    });
  }
}

/**
 * Get activity logs for a specific user
 */
export async function getUserActivityLogs(req, res) {
  try {
    if (req.user.Role !== 'Admin') {
      return res.status(403).json({ 
        message: 'Access denied', 
        error: 'Only administrators can view activity logs' 
      });
    }

    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const logs = await ActivityLog.find({ userId })
      .populate('userId', 'First_Name Last_Name Email Role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ActivityLog.countDocuments({ userId });

    res.status(200).json({
      message: 'User activity logs fetched successfully',
      logs,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    res.status(500).json({ 
      message: 'Error fetching user activity logs', 
      error: error.message 
    });
  }
}

/**
 * Get activity logs for a specific entity
 */
export async function getEntityActivityLogs(req, res) {
  try {
    if (req.user.Role !== 'Admin') {
      return res.status(403).json({ 
        message: 'Access denied', 
        error: 'Only administrators can view activity logs' 
      });
    }

    const { entityType, entityId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const logs = await ActivityLog.find({ 
      entityType, 
      entityId 
    })
      .populate('userId', 'First_Name Last_Name Email Role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ActivityLog.countDocuments({ entityType, entityId });

    res.status(200).json({
      message: 'Entity activity logs fetched successfully',
      logs,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching entity activity logs:', error);
    res.status(500).json({ 
      message: 'Error fetching entity activity logs', 
      error: error.message 
    });
  }
}

/**
 * Get activity log statistics
 */
export async function getActivityLogStats(req, res) {
  try {
    if (req.user.Role !== 'Admin') {
      return res.status(403).json({ 
        message: 'Access denied', 
        error: 'Only administrators can view activity logs' 
      });
    }

    const { startDate, endDate } = req.query;
    const dateFilter = {};

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // Get stats by action
    const actionStats = await ActivityLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get stats by module
    const moduleStats = await ActivityLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get stats by user
    const userStats = await ActivityLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Populate user names
    const userIds = userStats.map(stat => stat._id);
    const users = await User.find({ _id: { $in: userIds } }).select('First_Name Last_Name Email');
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = `${user.First_Name} ${user.Last_Name}`;
    });

    const userStatsWithNames = userStats.map(stat => ({
      userId: stat._id,
      userName: userMap[stat._id.toString()] || 'Unknown',
      count: stat.count
    }));

    res.status(200).json({
      message: 'Activity log statistics fetched successfully',
      stats: {
        byAction: actionStats,
        byModule: moduleStats,
        byUser: userStatsWithNames,
        total: await ActivityLog.countDocuments(dateFilter)
      }
    });
  } catch (error) {
    console.error('Error fetching activity log statistics:', error);
    res.status(500).json({ 
      message: 'Error fetching activity log statistics', 
      error: error.message 
    });
  }
}

/**
 * Clear/delete all activity logs
 * Only accessible by Admin users
 */
export async function clearActivityLogs(req, res) {
  try {
    // Only Admin can clear activity logs
    if (req.user.Role !== 'Admin') {
      return res.status(403).json({ 
        message: 'Access denied', 
        error: 'Only administrators can clear activity logs' 
      });
    }

    const { days } = req.query; // Optional: clear logs older than X days

    let filter = {};
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      filter.createdAt = { $lt: daysAgo };
    }

    // Get count before deletion for logging
    const countBeforeDeletion = await ActivityLog.countDocuments(filter);

    // Delete logs
    const result = await ActivityLog.deleteMany(filter);
    
    // Log the clearing action (create after deletion so it's not deleted if clearing all logs)
    await ActivityLog.create({
      userId: req.user._id,
      action: 'settings_updated',
      entityType: 'System',
      description: `Activity logs cleared by ${req.user.First_Name} ${req.user.Last_Name}${days ? ` (logs older than ${days} days)` : ' (all logs)'}`,
      details: { 
        deletedCount: result.deletedCount,
        clearedBy: req.user._id,
        clearedByEmail: req.user.Email,
        daysFilter: days || null
      },
      module: 'System',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      message: 'Activity logs cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing activity logs:', error);
    res.status(500).json({ 
      message: 'Error clearing activity logs', 
      error: error.message 
    });
  }
}


