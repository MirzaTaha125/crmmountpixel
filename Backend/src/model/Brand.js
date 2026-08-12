import mongoose from 'mongoose';

// A "payment account" describes one way a brand can accept manual payments
// (Wire, Zelle, Cheque, etc.). A brand can have multiple — admin picks which
// one to show on each manual invoice at creation time.
const paymentAccountSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ['Cheque', 'Wire', 'Online', 'Zelle', 'Taptap', 'Cashapp'],
  },
  label: { type: String, trim: true, default: '' },  // nickname like "Chase Business Wire"
  details: { type: String, trim: true, default: '' }, // multiline instructions shown on the invoice
}, { _id: true, timestamps: true });

// A brand the business operates under. The `code` is entered manually by an admin
// (e.g. a short prefix they "start" themselves) and must be unique.
const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  // Long random token that public brand websites send with their inquiry
  // submissions so the CRM can auto-tag the inquiry with the right brand.
  // Kept separate from `code` (which is short and prefixes client IDs) so the
  // two never leak into each other. Optional — brands without one just won't
  // auto-link from the public API.
  publicCode: {
    type: String,
    unique: true,
    sparse: true,   // multiple null values allowed
    trim: true,
    default: null,
  },
  // Normalized hostnames (e.g. "mountpixels.com") for the brand's official
  // websites. Requests to /api/public/* are only accepted when the request's
  // Origin header matches one of these entries. Also used to auto-tag inquiries
  // with the correct brand when the code isn't sent explicitly.
  officialWebsites: {
    type: [String],
    default: [],
  },
  // Main brand color used to accent manual invoices (header underline, totals,
  // buttons). Any CSS-valid color string; frontend defaults to indigo.
  mainColor: {
    type: String,
    trim: true,
    default: '#6366f1',
  },
  // List of payment accounts this brand accepts on manual invoices. Admin picks
  // which one is displayed on each invoice at creation time.
  paymentAccounts: {
    type: [paymentAccountSchema],
    default: [],
  },
  logo: {
    type: String, // relative path to an uploaded file, e.g. /uploads/brands/<file>
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
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

const Brand = mongoose.model('Brand', brandSchema);
export default Brand;
