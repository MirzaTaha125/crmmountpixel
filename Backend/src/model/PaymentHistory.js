import mongoose from 'mongoose';

const paymentHistorySchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  taxFee: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'PKR',
    trim: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Credit Card', 'Bank Transfer', 'PayPal', 'Zelle', 'Cash', 'Check', 'Other'],
    trim: true
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded', 'Dispute'],
    default: 'Completed'
  },
  transactionId: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  brand: {
    type: String,
    trim: true,
    enum: ['Webdevelopers Inc', 'American Design Eagle', 'Mount Pixels', ''],
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
paymentHistorySchema.index({ clientId: 1, paymentDate: -1 });
paymentHistorySchema.index({ userId: 1, paymentDate: -1 });
paymentHistorySchema.index({ status: 1 });

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);
export default PaymentHistory;