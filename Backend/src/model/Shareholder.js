import mongoose from 'mongoose';

// A shareholder on a brand. Percentages across a brand's active shareholders
// should sum to at most 100 — enforced in the controller, not the schema,
// because a partial write (adding one at a time) may briefly exceed until
// the admin balances the numbers.
const shareholderSchema = new mongoose.Schema({
  brandId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
  name:       { type: String, required: true, trim: true },
  email:      { type: String, trim: true, lowercase: true, default: '' },
  percentage: { type: Number, required: true, min: 0, max: 100 },
  notes:      { type: String, trim: true, default: '' },
  active:     { type: Boolean, default: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Fast lookup of all shareholders for a brand.
shareholderSchema.index({ brandId: 1, active: 1 });

export default mongoose.model('Shareholder', shareholderSchema);
