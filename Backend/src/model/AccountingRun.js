import mongoose from 'mongoose';

// A single wizard-completed accounting run for a specific month/year.
// Stores WHAT the admin chose (allocation methods + amounts) plus a JSON
// snapshot of the fully-computed report at finalize time — so historical
// runs never drift when brands or shareholders change later.
const allocationSchema = new mongoose.Schema({
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  amount:  { type: Number, required: true, min: 0 },
}, { _id: false });

const accountingRunSchema = new mongoose.Schema({
  month: { type: Number, required: true, min: 1, max: 12 },
  year:  { type: Number, required: true },
  status: { type: String, enum: ['draft', 'completed'], default: 'draft' },

  // Office allocation choice. 'equal' = split office total across all brands.
  // 'manual' = admin sets per-brand amounts (validated to sum to office total).
  officeMethod:      { type: String, enum: ['equal', 'manual'], default: 'equal' },
  officeAllocations: { type: [allocationSchema], default: [] },

  // Hold-in-US: same shape. Either equal split of a chosen total, or manual per brand.
  holdMethod:      { type: String, enum: ['equal', 'manual'], default: 'manual' },
  holdTotal:       { type: Number, default: 0, min: 0 },
  holdAllocations: { type: [allocationSchema], default: [] },

  charityPercent: { type: Number, default: 5, min: 0, max: 100 },

  // Frozen report at completion time (what the frontend displays for
  // historical runs). Free-form JSON — same shape as the live ledger.
  snapshot: { type: mongoose.Schema.Types.Mixed, default: null },

  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

// One run per (month, year) — enforced so users don't fork history accidentally.
accountingRunSchema.index({ month: 1, year: 1 }, { unique: true });

export default mongoose.model('AccountingRun', accountingRunSchema);
