import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  clientId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName:          { type: String, required: true },
  clientEmail:         { type: String },
  title:               { type: String, required: true },
  amount:              { type: Number, required: true },
  description:         { type: String },
  brand:               { type: String },
  invoiceNumber:       { type: String },
  status:              { type: String, enum: ['Pending', 'Paid', 'Cancelled', 'Refunded'], default: 'Pending' },
  paypalInvoiceId:     { type: String },
  paypalInvoiceUrl:    { type: String },
  paypalInvoiceStatus: { type: String },   // DRAFT | SENT | PAID | CANCELLED | REFUNDED
  paypalFee:           { type: Number },   // PayPal transaction fee deducted
  netAmount:           { type: Number },   // amount - paypalFee (actual received)
  paidAt:              { type: Date },
  createdBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Invoice', invoiceSchema);
