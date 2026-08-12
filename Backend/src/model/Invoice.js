import mongoose from 'mongoose';

// Snapshot of the brand at the moment a manual invoice was created. If the
// admin later changes the brand's logo, color, phone, etc., the invoice keeps
// showing what the client actually received. Standard e-commerce practice.
const brandSnapshotSchema = new mongoose.Schema({
  _id:              false,
  brandId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  name:             { type: String, default: '' },
  code:             { type: String, default: '' },
  logo:             { type: String, default: '' },
  mainColor:        { type: String, default: '#6366f1' },
  phone:            { type: String, default: '' },
  email:            { type: String, default: '' },
  officialWebsites: { type: [String], default: [] },
}, { _id: false });

// Snapshot of the specific payment account chosen when the manual invoice was
// created — so re-editing the brand's payment accounts later can't rewrite
// history on already-issued invoices.
const paymentAccountSnapshotSchema = new mongoose.Schema({
  method:  { type: String, default: '' },
  label:   { type: String, default: '' },
  details: { type: String, default: '' },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  clientId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  inquiryId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry' },
  clientName:          { type: String, required: true },
  clientEmail:         { type: String },
  title:               { type: String, required: true },
  amount:              { type: Number, required: true },
  description:         { type: String },
  brand:               { type: String },   // brand *name* string (kept for back-compat with PayPal/Stripe path)
  invoiceNumber:       { type: String },
  status:              { type: String, enum: ['Pending', 'Paid', 'Cancelled', 'Refunded'], default: 'Pending' },
  provider:            { type: String, enum: ['paypal', 'stripe', 'manual'], default: 'paypal' },

  // Admin-controlled dates. issuedDate defaults to the moment the invoice is
  // created; dueDate is optional and shown on the invoice if present.
  issuedDate:          { type: Date, default: Date.now },
  dueDate:             { type: Date, default: null },

  // PayPal fields
  paypalInvoiceId:     { type: String },
  paypalInvoiceUrl:    { type: String },
  paypalInvoiceStatus: { type: String },
  paypalFee:           { type: Number },

  // Stripe fields
  stripeInvoiceId:     { type: String },
  stripeInvoiceUrl:    { type: String },
  stripeInvoiceStatus: { type: String },
  stripeFee:           { type: Number },

  // Manual invoice fields
  manualPaymentMethod:           { type: String, default: '' }, // 'Cheque' | 'Wire' | 'Online' | 'Zelle' | 'Taptap' | 'Cashapp'
  manualPaymentAccountSnapshot:  { type: paymentAccountSnapshotSchema, default: null },
  brandSnapshot:                 { type: brandSnapshotSchema, default: null },

  // Public shareable link slug — random, unguessable. Any invoice that has
  // one can be viewed at /invoice/<slug> without authentication. Only manual
  // invoices carry a slug; PayPal/Stripe rows leave the field unset (NOT null)
  // so the partial-unique index below can rely on `$type: 'string'` filtering.
  publicSlug:          { type: String },

  netAmount:           { type: Number },
  paidAt:              { type: Date },
  createdBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Partial unique index on publicSlug — only indexes documents where publicSlug
// is a string, so any number of PayPal/Stripe rows with publicSlug=null can
// coexist without triggering a duplicate-key error. `sparse` alone doesn't
// help here because the field IS present (just null); `partialFilterExpression`
// gives us the actual "index only when set" behaviour.
invoiceSchema.index(
  { publicSlug: 1 },
  { unique: true, partialFilterExpression: { publicSlug: { $type: 'string' } } }
);

export default mongoose.model('Invoice', invoiceSchema);
