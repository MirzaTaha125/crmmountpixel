import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['Client Chargeback', 'Non-Client Chargeback'],
    trim: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null // null for non-client chargebacks
  },
  clientName: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'PKR'],
    default: 'USD',
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Won', 'Loss', 'Approved', 'Send'],
    default: 'Active',
    trim: true
  },
  disputeDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true,
    enum: ['Webdevelopers Inc', 'American Design Eagle', 'Mount Pixels'],
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const Dispute = mongoose.model('Dispute', disputeSchema);
export default Dispute;


