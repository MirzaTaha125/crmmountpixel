import mongoose from 'mongoose';

const userPermissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Compound index to ensure unique user-permission combinations
userPermissionSchema.index({ userId: 1, permissionName: 1 }, { unique: true });

// Index for efficient queries
userPermissionSchema.index({ userId: 1 });

const UserPermission = mongoose.model('UserPermission', userPermissionSchema);
export default UserPermission;



