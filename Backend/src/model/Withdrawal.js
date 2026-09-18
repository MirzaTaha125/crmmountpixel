import mongoose from 'mongoose';

// A recorded withdrawal from a US account to a Pakistan (or elsewhere) account.
// Informational-only for now — does NOT reduce brand balances on the Accounting
// page. Purely a ledger the admin uses to keep track of real money movement.
const withdrawalSchema = new mongoose.Schema({
  amount:       { type: Number, required: true, min: 0 },   // USD
  exchangeRate: { type: Number, default: null, min: 0 },    // USD → PKR (optional)
  amountPKR:    { type: Number, default: null, min: 0 },    // convenience mirror; can be null
  date:         { type: Date,   required: true, default: () => new Date() },
  fromAccount:  { type: String, trim: true, default: '' },  // e.g. "PayPal Business", "Wise USD"
  toAccount:    { type: String, trim: true, default: '' },  // e.g. "HBL 1234"
  method:       { type: String, enum: ['Wire', 'Wise', 'Payoneer', 'Bank', 'Other'], default: 'Wire' },
  notes:        { type: String, trim: true, default: '' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

withdrawalSchema.index({ date: -1 });

export default mongoose.model('Withdrawal', withdrawalSchema);
