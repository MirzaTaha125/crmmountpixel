import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['dashboard', 'clients', 'packages', 'users', 'employees', 'salary', 'payments', 'custom_packages', 'inquiries', 'schedule_calls', 'expenses', 'disputes', 'reports', 'permissions', 'activity_logs', '2fa_settings', 'emails', 'messaging'],
    trim: true
  }
}, {
  timestamps: true
});

const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;

