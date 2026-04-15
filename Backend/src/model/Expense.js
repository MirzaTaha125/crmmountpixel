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
    enum: ['Office', 'Marketing', 'Salary', 'Utilities', 'Transport', 'Other'],
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
    enum: ['Webdevelopers Inc', 'American Design Eagle', 'Mount Pixels', ''],
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['PayPal', 'Zelle', 'Bank'],
    trim: true
  }
}, {
  timestamps: true
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;


