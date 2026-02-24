import ActivityLog from '../model/ActivityLog.js';

/**
 * Logs an admin activity
 * @param {Object} logData - Log data
 * @param {string} logData.userId - User ID who performed the action
 * @param {string} logData.action - Action type (e.g., 'user_created', 'client_updated')
 * @param {string} logData.entityType - Entity type (e.g., 'User', 'Client')
 * @param {string|ObjectId} logData.entityId - Entity ID (optional)
 * @param {string} logData.description - Human-readable description
 * @param {Object} logData.details - Additional details (optional)
 * @param {string} logData.module - Module name (e.g., 'Users', 'Clients', 'Payments')
 * @param {Object} logData.req - Express request object (optional, for IP and user agent)
 * @returns {Promise<Object>} Created log entry
 */
export async function logActivity(logData) {
  try {
    const {
      userId,
      action,
      entityType,
      entityId,
      description,
      details = {},
      module,
      req
    } = logData;

    // Validate required fields (userId can be null for failed login attempts)
    if (userId === undefined || !action || !entityType || !description || !module) {
      console.error('Missing required fields for activity log:', logData);
      return null;
    }

    // Get IP address and user agent from request if provided
    const ipAddress = req ? (req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    const logEntry = await ActivityLog.create({
      userId,
      action,
      entityType,
      entityId,
      description,
      details,
      module,
      ipAddress,
      userAgent
    });

    return logEntry;
  } catch (error) {
    // Don't throw error - logging should never break the main flow
    console.error('Error creating activity log:', error);
    return null;
  }
}

/**
 * Logs a user action (shorthand for common user actions)
 */
export async function logUserAction(userId, action, description, details = {}, req = null) {
  return logActivity({
    userId,
    action,
    entityType: 'User',
    description,
    details,
    module: 'Users',
    req
  });
}

/**
 * Logs a client action
 */
export async function logClientAction(userId, action, entityId, description, details = {}, req = null) {
  return logActivity({
    userId,
    action,
    entityType: 'Client',
    entityId,
    description,
    details,
    module: 'Clients',
    req
  });
}

/**
 * Logs a payment action
 */
export async function logPaymentAction(userId, action, entityId, description, details = {}, req = null) {
  return logActivity({
    userId,
    action,
    entityType: 'Payment',
    entityId,
    description,
    details,
    module: 'Payments',
    req
  });
}

/**
 * Logs a payment link action
 */
export async function logPaymentLinkAction(userId, action, entityId, description, details = {}, req = null) {
  return logActivity({
    userId,
    action,
    entityType: 'PaymentLink',
    entityId,
    description,
    details,
    module: 'Payments',
    req
  });
}

/**
 * Logs a package action
 */
export async function logPackageAction(userId, action, entityId, description, details = {}, req = null) {
  return logActivity({
    userId,
    action,
    entityType: 'Package',
    entityId,
    description,
    details,
    module: 'Packages',
    req
  });
}

/**
 * Logs an employee action
 */
export async function logEmployeeAction(userId, action, entityId, description, details = {}, req = null) {
  return logActivity({
    userId,
    action,
    entityType: 'Employee',
    entityId,
    description,
    details,
    module: 'Employees',
    req
  });
}

/**
 * Logs an expense action
 */
export async function logExpenseAction(userId, action, entityId, description, details = {}, req = null) {
  return logActivity({
    userId,
    action,
    entityType: 'Expense',
    entityId,
    description,
    details,
    module: 'Expenses',
    req
  });
}

/**
 * Logs an inquiry action
 */
export async function logInquiryAction(userId, action, entityId, description, details = {}, req = null) {
  return logActivity({
    userId,
    action,
    entityType: 'Inquiry',
    entityId,
    description,
    details,
    module: 'Inquiries',
    req
  });
}

/**
 * Logs an email action
 */
export async function logEmailAction(userId, action, description, details = {}, req = null) {
  return logActivity({
    userId,
    action,
    entityType: 'Email',
    description,
    details,
    module: 'Email',
    req
  });
}

