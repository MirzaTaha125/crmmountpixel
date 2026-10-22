import Loan from "../model/Loan.js";

// Months since year 0 — lets two (month, year) periods be compared with one number.
const periodIndex = (month, year) => Number(year) * 12 + Number(month);

// Deduct this period's installment from every active loan the employee has, and
// record each deduction on its loan. `maxDeductible` caps the combined total so
// a short month can never push net pay below zero — whatever isn't taken stays
// on the loan's balance and comes out of later salaries.
//
// `overrideTotal` replaces the usual per-loan installment with an amount the
// admin typed on the salary form: a bigger payment to clear a loan faster, a
// smaller one for a tight month, or 0 to skip this month entirely. It is still
// capped by what the employee earned and by what is actually owed, and it is
// spread across the employee's loans oldest-first.
//
// Safe to call twice for the same period: a loan that already has a repayment
// for (month, year) is skipped, so regenerating a salary never double-deducts.
// Works out what would come out, without writing anything.
//
// Both the figure the bulk salary sheet shows before you save and the deduction
// that is actually taken run through this, so the number on screen is the
// number that gets taken. Returns the loan documents alongside the split so the
// caller can save them without a second query.
export async function planLoanDeductions({ employeeId, month, year, maxDeductible, overrideTotal }) {
  const loans = await Loan.find({ employee: employeeId, status: 'active' }).sort({ createdAt: 1 });
  const current = periodIndex(month, year);

  // null/undefined means "work it out from the loans"; 0 is a real instruction
  // to take nothing this month.
  const hasOverride = overrideTotal !== undefined && overrideTotal !== null && overrideTotal !== '';
  const requested = hasOverride ? Math.max(0, Math.round(Number(overrideTotal) || 0)) : null;

  let budget = Math.max(0, Number(maxDeductible) || 0);
  if (hasOverride) budget = Math.min(budget, requested);
  const split = [];

  for (const loan of loans) {
    if (budget <= 0) break;
    if (periodIndex(loan.startMonth, loan.startYear) > current) continue;
    if (loan.repayments.some(r => r.month === Number(month) && r.year === Number(year))) continue;

    const remaining = loan.remainingAmount;
    if (remaining <= 0) continue;

    // With an override the installment is not the limit — the balance is.
    const perLoanCap = hasOverride ? remaining : loan.installmentAmount;
    const amount = Math.round(Math.min(perLoanCap, remaining, budget));
    if (amount <= 0) continue;

    split.push({ loan: loan._id, amount, doc: loan });
    budget -= amount;
  }

  return { total: split.reduce((s, d) => s + d.amount, 0), split };
}

export async function applyLoanDeductions({ employeeId, salaryId, month, year, maxDeductible, overrideTotal }) {
  const { total, split } = await planLoanDeductions({
    employeeId, month, year, maxDeductible, overrideTotal,
  });

  for (const entry of split) {
    const loan = entry.doc;
    loan.repayments.push({ salary: salaryId, amount: entry.amount, month: Number(month), year: Number(year) });
    if (loan.remainingAmount <= 0) loan.status = 'completed';
    await loan.save();
  }

  // The loan documents are an internal detail of the plan; what is stamped on
  // the salary is just the loan id and the amount.
  return { total, split: split.map(({ loan, amount }) => ({ loan, amount })) };
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
