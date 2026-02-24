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
    enum: [
      // User actions
      'user_created', 'user_updated', 'user_deleted', 'user_login', 'user_logout', 'user_login_failed',
      // Client actions
      'client_created', 'client_updated', 'client_deleted', 'client_login', 'client_logout', 'client_login_failed',
      // Package actions
      'package_created', 'package_updated', 'package_deleted',
      // Payment actions
      'payment_created', 'payment_updated', 'payment_deleted', 'payment_link_created', 'payment_link_updated', 'payment_link_deleted', 'payment_completed', 'payment_status_changed',
      // Employee actions
      'employee_created', 'employee_updated', 'employee_deleted',
      // Salary actions
      'salary_created', 'salary_updated', 'salary_deleted',
      // Expense actions
      'expense_created', 'expense_updated', 'expense_deleted',
      // Inquiry actions
      'inquiry_created', 'inquiry_updated', 'inquiry_deleted', 'inquiry_status_changed',
      // Project actions
      'project_created', 'project_updated', 'project_deleted',
      // Permission actions
      'permission_granted', 'permission_revoked', 'role_updated',
      // Email actions
      'email_sent',
      // 2FA actions
      '2fa_setup_initiated', '2fa_enabled', '2fa_disabled', '2fa_verification_success', '2fa_verification_failed', '2fa_backup_code_used', '2fa_permanent_backup_code_used', '2fa_backup_codes_regenerated', 'user_login_password_verified',
      // Other actions
      'data_exported', 'report_generated', 'settings_updated'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['User', 'Client', 'Package', 'Payment', 'PaymentLink', 'Employee', 'Salary', 'Expense', 'Inquiry', 'Project', 'Permission', 'Email', 'System', 'Other']
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

