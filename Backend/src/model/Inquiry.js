import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  reason: { type: String },
  message: { type: String },
  source: { type: String, default: 'Website' },
  brand: { type: String, trim: true, enum: ['Webdevelopers Inc', 'American Design Eagle', 'Mount Pixels'], default: '' },
  businessName: { type: String, trim: true },
  serviceWebsite: { type: Boolean, default: false },
  serviceLogo: { type: Boolean, default: false },
  serviceSmm: { type: Boolean, default: false },
  serviceOther: { type: Boolean, default: false },
  finalQuotation: { type: String, trim: true },
  lastCalled: { type: Date },
  // User tracking fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: { type: String },
  createdByRole: { type: String },
  // Conversion tracking
  isConverted: { type: Boolean, default: false },
  convertedToClientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  convertedAt: { type: Date, default: null },
  convertedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Add validation to ensure at least reason or message is provided
inquirySchema.pre('validate', function (next) {
  if (!this.reason && !this.message) {
    this.invalidate('reason', 'Either reason or message must be provided');
  }
  next();
});

const Inquiry = mongoose.model('Inquiry', inquirySchema);
export default Inquiry; 