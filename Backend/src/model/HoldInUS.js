import mongoose from 'mongoose';

// Per-brand, per-month "hold in US" amount — dollars the admin wants to
// keep in the US account for that brand instead of moving to Pakistan.
// Subtracted from the brand's Gross Revenue in the Accounting waterfall.
const holdInUSSchema = new mongoose.Schema({
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  amount:  { type: Number, required: true, min: 0 },
  month:   { type: Number, required: true, min: 1, max: 12 },
  year:    { type: Number, required: true },
  reason:  { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// One hold per brand per month — upsert-friendly unique index.
holdInUSSchema.index({ brandId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('HoldInUS', holdInUSSchema);
