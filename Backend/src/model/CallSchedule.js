import mongoose from 'mongoose';

const callScheduleSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String, // Format: "HH:MM" (24-hour format)
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'missed'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientEmail: {
    type: String,
    required: true,
    trim: true
  },
  clientPhone: {
    type: String,
    required: true,
    trim: true
  },
  userRole: {
    type: String,
    required: true,
    trim: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
callScheduleSchema.index({ userId: 1, scheduledDate: 1 });
callScheduleSchema.index({ scheduledDate: 1, scheduledTime: 1 });
callScheduleSchema.index({ status: 1 });

export default mongoose.model('CallSchedule', callScheduleSchema);
