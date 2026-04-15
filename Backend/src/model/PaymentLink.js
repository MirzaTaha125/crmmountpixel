import mongoose from 'mongoose';

const paymentLinkSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientEmail: { type: String },
  packageName: { type: String, required: true },
  packageDescription: { type: String },
  packagePrice: { type: Number, required: true },
  additionalAmount: { type: Number, default: 0 },
  additionalDescription: { type: String },
  total: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Expired'], default: 'Pending' },
  linkId: { type: String, required: true, unique: true },
  invoiceNumber: { type: String },
  brand: { type: String, trim: true, enum: ['Webdevelopers Inc', 'American Design Eagle', 'Mount Pixels', ''], default: '' },
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  paypalInvoiceId: { type: String, default: null },
  paypalInvoiceUrl: { type: String, default: null },
  paypalInvoiceStatus: { type: String, default: null } // DRAFT | SENT | PAID | CANCELLED | REFUNDED
});

paymentLinkSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

const PaymentLink = mongoose.model('PaymentLink', paymentLinkSchema);
export default PaymentLink; 