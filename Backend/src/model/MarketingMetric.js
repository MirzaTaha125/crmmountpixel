import mongoose from 'mongoose';

// One row per brand × channel × month. Admin enters target + actual
// numbers manually; ROI is computed on the fly, not stored (avoids drift).
const marketingMetricSchema = new mongoose.Schema({
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  channel: { type: String, enum: ['PPC', 'SMM'], required: true },
  month:   { type: Number, required: true, min: 1, max: 12 },
  year:    { type: Number, required: true },

  targetSpend: { type: Number, default: 0, min: 0 },
  targetSales: { type: Number, default: 0, min: 0 },
  targetROI:   { type: Number, default: 0 },   // percent

  actualSpend: { type: Number, default: 0, min: 0 },
  actualSales: { type: Number, default: 0, min: 0 },

  notes:     { type: String, trim: true, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// One (brandId, channel, month, year) — upsert-friendly.
marketingMetricSchema.index({ brandId: 1, channel: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('MarketingMetric', marketingMetricSchema);
