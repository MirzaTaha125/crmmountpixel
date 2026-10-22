import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    // Includes the sub-scoped Marketing/PPC and Marketing/SMM values so the
    // Expenses form can save a channel-tagged marketing expense that the
    // Marketing report + Accounting waterfall can then count correctly.
    // Legacy "Marketing" (no channel) is kept for backward-compat with old rows.
    enum: [
      'Office', 'Marketing', 'Marketing/PPC', 'Marketing/SMM',
      'Salary', 'Utilities', 'Transport', 'Other'
    ],
    trim: true
  },
  expenseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currency: {
    type: String,
    enum: ['USD', 'PKR'],
    default: 'USD',
    trim: true
  },
  originalAmount: {
    type: Number,
    min: 0
  },
  originalCurrency: {
    type: String,
    enum: ['USD', 'PKR'],
    trim: true
  },
  exchangeRate: {
    type: Number,
    min: 0.01
  },
  brand: {
    type: String,
    trim: true,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['PayPal', 'Zelle', 'Bank'],
    trim: true
  },
  // Set when this expense was posted automatically from a Salary record. Such
  // rows are owned by that salary: editing or deleting the salary rewrites or
  // removes them, so the Expenses screen keeps them read-only.
  salaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salary',
    default: null
  }
}, {
  timestamps: true
});

// One expense per salary, but plenty of rows have no salary at all.
expenseSchema.index({ salaryId: 1 }, { unique: true, sparse: true });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;


