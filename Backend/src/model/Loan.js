import mongoose from "mongoose";

// One installment actually taken out of a salary. Linked back to the Salary row
// so deleting that salary can reverse the deduction cleanly.
const repaymentSchema = new mongoose.Schema({
  salary: { type: mongoose.Schema.Types.ObjectId, ref: 'Salary', default: null },
  amount: { type: Number, required: true, min: 0 },
  month:  { type: Number, required: true }, // 1-12, the salary period it came out of
  year:   { type: Number, required: true },
}, { _id: true, timestamps: true });

// A loan given to an employee, repaid in fixed monthly installments that are
// deducted automatically whenever a salary is generated for them.
const loanSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  principal: { type: Number, required: true, min: 1 },          // total amount lent (PKR)
  installments: { type: Number, required: true, min: 1 },       // number of months to repay over
  installmentAmount: { type: Number, required: true, min: 1 },  // deducted per salary
  // First salary period the deduction applies to. Salaries for earlier periods
  // are left untouched even if generated after the loan was recorded.
  startMonth: { type: Number, required: true, min: 1, max: 12 },
  startYear:  { type: Number, required: true },
  reason: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  repayments: { type: [repaymentSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Derived, never stored — avoids the paid/remaining figures drifting from the
// repayment list.
loanSchema.virtual('paidAmount').get(function () {
  return (this.repayments || []).reduce((s, r) => s + (r.amount || 0), 0);
});
loanSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.principal - this.paidAmount);
});

loanSchema.index({ employee: 1, status: 1 });

const Loan = mongoose.model("Loan", loanSchema);
export default Loan;
