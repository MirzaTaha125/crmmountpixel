import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for failed login attempts or client actions
  },
  action: {
    type: String,
    required: true,
    // Free-form action key. Convention: `<entity>_<verb>` e.g. 'employee_created',
    // 'package_updated', 'salary_deleted', plus auth actions like 'user_login',
    // 'client_login_failed', and 2FA actions like '2fa_enabled'.
    // NOTE: kept as a plain string (no enum) so any module can be audited without
    // failing validation. logActivity() swallows errors, so an enum mismatch would
    // otherwise silently drop the log entry.
  },
  entityType: {
    type: String,
    required: true,
    // e.g. 'User', 'Client', 'Employee', 'Package', 'Expense', 'Dispute',
    // 'CallSchedule', 'Assignment', 'HostingDomain', 'ClientAsset', 'System', etc.
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityType',
    required: false
  },
  description: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  module: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;

