import mongoose from 'mongoose';

// A single task row within a checklist.
const checklistItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  // Optional description of the work done, entered by the assignee when ticking the item.
  note: {
    type: String,
    trim: true,
    default: '',
  },
}, { _id: true });

// A checklist is a set of task rows tied to a Brand and assigned to one User.
// Assigning a checklist to several users creates one document per user, so each
// assignee tracks their own independent progress (the "Brand Status").
const checklistSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: {
    type: [checklistItemSchema],
    default: [],
  },
  assignedDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
  },
  // Set when every item is completed (cleared if an item is later un-ticked).
  completedAt: {
    type: Date,
    default: null,
  },
  // Captured when an assignee completes a task after the end date has passed.
  delayReason: {
    type: String,
    trim: true,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

const Checklist = mongoose.model('Checklist', checklistSchema);
export default Checklist;
