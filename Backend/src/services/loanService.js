import Loan from "../model/Loan.js";

// Months since year 0 — lets two (month, year) periods be compared with one number.
const periodIndex = (month, year) => Number(year) * 12 + Number(month);

// Deduct this period's installment from every active loan the employee has, and
// record each deduction on its loan. `maxDeductible` caps the combined total so
// a short month can never push net pay below zero — whatever isn't taken stays
// on the loan's balance and comes out of later salaries.
//
// Safe to call twice for the same period: a loan that already has a repayment
// for (month, year) is skipped, so regenerating a salary never double-deducts.
export async function applyLoanDeductions({ employeeId, salaryId, month, year, maxDeductible }) {
  const loans = await Loan.find({ employee: employeeId, status: 'active' }).sort({ createdAt: 1 });
  const current = periodIndex(month, year);
  let budget = Math.max(0, Number(maxDeductible) || 0);
  const split = [];

  for (const loan of loans) {
    if (budget <= 0) break;
    if (periodIndex(loan.startMonth, loan.startYear) > current) continue;
    if (loan.repayments.some(r => r.month === Number(month) && r.year === Number(year))) continue;

    const remaining = loan.remainingAmount;
    if (remaining <= 0) continue;

    const amount = Math.round(Math.min(loan.installmentAmount, remaining, budget));
    if (amount <= 0) continue;

    loan.repayments.push({ salary: salaryId, amount, month: Number(month), year: Number(year) });
    if (loan.remainingAmount <= 0) loan.status = 'completed';
    await loan.save();

    split.push({ loan: loan._id, amount });
    budget -= amount;
  }

  return { total: split.reduce((s, d) => s + d.amount, 0), split };
}

// Undo the deductions made against one salary — called when that salary is
// deleted, so the employee isn't charged for a slip that no longer exists.
// A loan that had been marked completed by that deduction reopens.
export async function reverseLoanDeductions(salaryId) {
  const loans = await Loan.find({ 'repayments.salary': salaryId });
  for (const loan of loans) {
    loan.repayments = loan.repayments.filter(r => String(r.salary) !== String(salaryId));
    if (loan.status === 'completed' && loan.remainingAmount > 0) loan.status = 'active';
    await loan.save();
  }
}
