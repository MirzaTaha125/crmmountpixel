import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  totalWorkingDays: { type: Number, required: true },
  presentDays: { type: Number, required: true },
  salaryAmount: { type: Number, required: true },
  additionalAmount: { type: Number },
  // Older records stored salaryAmount WITH additionalAmount already added in,
  // while every screen added it a second time. New records keep them separate
  // and set this to false. Deliberately no default: a missing value marks an
  // old record, so readers can subtract instead of rewriting history.
  additionalInBase: { type: Boolean },
  // The frontend has always sent this, but it wasn't in the schema so Mongoose
  // silently dropped it — the reason never reached the table or the slip.
  additionalAmountReason: { type: String, trim: true, default: '' },
  // Total loan installments taken out of this salary, plus the per-loan split
  // so a delete can hand each amount back to the right loan.
  loanDeduction: { type: Number, default: 0 },
  loanDeductions: {
    type: [{
      loan:   { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
      amount: { type: Number },
      _id: false,
    }],
    default: [],
  },
}, { timestamps: true });

const Salary = mongoose.model("Salary", salarySchema);
export default Salary; 