import mongoose from 'mongoose';

const hostingDomainSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Hosting', 'Domain', 'VPS'],
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
hostingDomainSchema.index({ clientId: 1, startDate: -1 });
hostingDomainSchema.index({ type: 1 });

const HostingDomain = mongoose.model('HostingDomain', hostingDomainSchema);
export default HostingDomain;

