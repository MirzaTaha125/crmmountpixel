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

// ─── Describing a record ────────────────────────────────────────────────────
//
// A log line should say what was touched, not only that something was. This
// matters most for deletions: by the time anyone reads the log, the record is
// gone, and "Deleted an inquiry" tells them nothing.

const LABELS = {
  Inquiry:       (d) => [d.name, d.email, d.phone].filter(Boolean),
  Client:        (d) => [d.name, d.clientId, d.email].filter(Boolean),
  Employee:      (d) => [d.Name || d.name, d.designation, d.email].filter(Boolean),
  Expense:       (d) => [d.title, d.category, d.amount != null && `$${d.amount}`, d.brand].filter(Boolean),
  Salary:        (d) => [d.employeeName, d.month && d.year && `${d.month}/${d.year}`, d.salaryAmount != null && `PKR ${d.salaryAmount}`].filter(Boolean),
  Package:       (d) => [d.name, d.price != null && `$${d.price}`].filter(Boolean),
  CustomPackage: (d) => [d.name, d.clientName, d.price != null && `$${d.price}`].filter(Boolean),
  Brand:         (d) => [d.name, d.code].filter(Boolean),
  Dispute:       (d) => [d.clientName || d.client, d.amount != null && `$${d.amount}`, d.status].filter(Boolean),
  Loan:          (d) => [d.employeeName, d.principal != null && `PKR ${d.principal}`, d.reason].filter(Boolean),
  CallSchedule:  (d) => [d.clientName || d.title, d.scheduledAt && new Date(d.scheduledAt).toISOString().slice(0, 10)].filter(Boolean),
  ProjectDetail: (d) => [d.packageName, d.clientName, d.status].filter(Boolean),
  ClientAsset:   (d) => [d.name, d.category].filter(Boolean),
  HostingDomain: (d) => [d.name, d.type].filter(Boolean),
  Assignment:    (d) => [d.userName, d.role, d.clientName].filter(Boolean),
  User:          (d) => [`${d.First_Name || ''} ${d.Last_Name || ''}`.trim(), d.Email, d.Role].filter(Boolean),
  PaymentHistory:(d) => [d.description, d.amount != null && `$${d.amount}`, d.status].filter(Boolean),
};

// Never copy these into a log, whatever they are attached to.
const SECRET_KEYS = /password|secret|token|twoFactorSecret|asstpassword/i;

export function describeRecord(entityType, doc) {
  if (!doc) return '';
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const parts = LABELS[entityType] ? LABELS[entityType](plain) : [];
  const label = parts.filter(Boolean).join(' · ');
  return label || String(plain.name || plain.title || plain._id || '');
}

// A copy of the record safe to keep in a log: no secrets, no sprawling arrays.
export function snapshotRecord(doc) {
  if (!doc) return {};
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const out = {};
  for (const [key, value] of Object.entries(plain)) {
    if (SECRET_KEYS.test(key)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Populated references are flattened to something readable.
      out[key] = value.name || value.Name || value.title || String(value._id || '');
      continue;
    }
    if (Array.isArray(value)) { out[key] = `${value.length} item(s)`; continue; }
    out[key] = value;
  }
  return out;
}

const VERBS = { created: 'Created', updated: 'Updated', deleted: 'Deleted' };

// One call for every ordinary create / update / delete.
//
//   await logRecordChange({ req, verb: 'deleted', entityType: 'Inquiry',
//                           module: 'Inquiries', doc: inquiry });
//
// Never throws: a log that fails must not fail the thing being logged.
export async function logRecordChange({ req, verb, entityType, module, doc, extra = {} }) {
  const label = describeRecord(entityType, doc);
  const noun = entityType.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return logActivity({
    userId: req?.user?._id ?? null,
    action: `${entityType.toLowerCase()}_${verb}`,
    entityType,
    entityId: doc?._id,
    description: `${VERBS[verb] || verb} ${noun}${label ? ` — ${label}` : ''}`,
    details: { record: snapshotRecord(doc), ...extra },
    module,
    req,
  });
}
