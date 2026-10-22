import Expense from "../model/Expense.js";
import Employee from "../model/Employee.js";

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Salary figures are kept in PKR; expenses are stored in USD with the original
// amount alongside. Same env var and fallback the manual expense form uses, so
// a payroll row and a hand-entered one convert identically.
const pkrToUsdRate = () => parseFloat(process.env.PKR_TO_USD_RATE) || 280;

// What the salary costs the company for the period: pay for days worked plus
// anything extra. Loan installments are deliberately NOT subtracted — they
// recover money that was handed over earlier and never booked as an expense,
// so taking them off here would under-report payroll permanently.
const grossPay = (salary) =>
  (Number(salary.salaryAmount) || 0) + (Number(salary.additionalAmount) || 0);

// Create or update the Expense that mirrors a salary. Returns the expense, or
// null when there's nothing to post (a zero-value salary).
//
// The salary owns this row: the link lives on both documents so an edit lands
// on the same expense instead of stacking up duplicates.
export async function syncSalaryExpense(salary, userId) {
  const grossPKR = Math.round(grossPay(salary));

  // Nothing worth posting — drop any row left over from a previous version.
  if (grossPKR <= 0) {
    await removeSalaryExpense(salary);
    return null;
  }

  const employee = await Employee.findById(salary.employee).select('Name').lean();
  const rate = pkrToUsdRate();
  const usd = Math.round((grossPKR / rate) * 100) / 100;
  const periodLabel = `${MONTHS[(salary.month || 1) - 1]} ${salary.year}`;

  const fields = {
    title: `Salary — ${employee?.Name || 'Employee'} — ${periodLabel}`,
    description: `Payroll for ${periodLabel}. ${salary.presentDays}/${salary.totalWorkingDays} days worked.`,
    amount: usd,
    category: 'Salary',
    brand: '',                // payroll isn't tied to a single brand
    expenseDate: new Date(salary.year, (salary.month || 1) - 1, 1),
    currency: 'USD',
    originalAmount: grossPKR,
    originalCurrency: 'PKR',
    exchangeRate: rate,
    salaryId: salary._id,
  };

  if (salary.expenseId) {
    const updated = await Expense.findByIdAndUpdate(salary.expenseId, fields, { new: true });
    if (updated) return updated;
    // The expense was deleted behind our back — fall through and make a new one.
  }

  // An expense may already point at this salary even when the salary lost its
  // own link (a half-finished write). Reuse it rather than tripping the index.
  const existing = await Expense.findOne({ salaryId: salary._id });
  if (existing) {
    const updated = await Expense.findByIdAndUpdate(existing._id, fields, { new: true });
    salary.expenseId = updated._id;
    await salary.save();
    return updated;
  }

  const created = await Expense.create({ ...fields, createdBy: userId || null });
  salary.expenseId = created._id;
  await salary.save();
  return created;
}

// Drop the expense a salary posted, used when that salary is deleted.
//
// Only the expense side is touched. The caller is usually holding a salary that
// has just been removed from the collection, and calling save() on it would
// insert the whole thing straight back.
export async function removeSalaryExpense(salary) {
  if (salary.expenseId) await Expense.findByIdAndDelete(salary.expenseId);
  // Belt and braces: clear anything still pointing here.
  await Expense.deleteMany({ salaryId: salary._id });
  salary.expenseId = null;
}
