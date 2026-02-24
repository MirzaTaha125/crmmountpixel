import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['Admin', 'Employee', 'Front', 'Upsell', 'Production'],
    trim: true
  },
  permissionName: {
    type: String,
    required: true,
    trim: true
  },
  granted: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique role-permission combinations
rolePermissionSchema.index({ role: 1, permissionName: 1 }, { unique: true });

const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);
export default RolePermission;

