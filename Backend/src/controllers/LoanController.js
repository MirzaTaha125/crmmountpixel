import Loan from "../model/Loan.js";
import Employee from "../model/Employee.js";
import { planLoanDeductions } from "../services/loanService.js";
import { logRecordChange } from '../services/activityLogService.js';

const populateEmployee = (q) => q.populate('employee', 'Name designation salary');

// GET /api/loans?employee=&status=
export async function getLoans(req, res) {
  try {
    const { employee, status } = req.query;
    const filter = {};
    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    const loans = await populateEmployee(Loan.find(filter).sort({ createdAt: -1 }));
    res.status(200).json({ loans });
  } catch (error) {
    console.error('getLoans error:', error);
    res.status(500).json({ message: "Error fetching loans", error: error.message });
  }
}

// POST /api/loans
// Body: { employee, principal, installments, startMonth, startYear, reason? }
// The per-month installment is derived (rounded up), so the last month simply
// takes whatever balance is left.
export async function createLoan(req, res) {
  try {
    const { employee, reason } = req.body;
    const principal = Math.round(Number(req.body.principal));
    const installments = parseInt(req.body.installments, 10);
    const startMonth = parseInt(req.body.startMonth, 10);
    const startYear = parseInt(req.body.startYear, 10);

    if (!employee) return res.status(400).json({ message: "Select the employee taking the loan." });
    if (!principal || principal < 1) return res.status(400).json({ message: "Loan amount must be greater than 0." });
    if (!installments || installments < 1 || installments > 120) {
      return res.status(400).json({ message: "Repayment period must be between 1 and 120 months." });
    }
    if (!startMonth || startMonth < 1 || startMonth > 12 || !startYear) {
      return res.status(400).json({ message: "Pick the month the first installment should be deducted." });
    }

    const emp = await Employee.findById(employee);
    if (!emp) return res.status(404).json({ message: "Employee not found." });

    const loan = await Loan.create({
      employee,
      principal,
      installments,
      installmentAmount: Math.ceil(principal / installments),
      startMonth,
      startYear,
      reason: (reason || '').trim(),
      createdBy: req.user?._id || null,
    });
    const populated = await populateEmployee(Loan.findById(loan._id));
    await logRecordChange({ req, verb: 'created', entityType: 'Loan', module: 'Salary', doc: populated });
    res.status(201).json({ message: "Loan recorded", loan: populated });
  } catch (error) {
    console.error('createLoan error:', error);
    res.status(500).json({ message: "Error creating loan", error: error.message });
  }
}

// PUT /api/loans/:id
// Editable: reason, installmentAmount, and status (cancel / reactivate).
// Principal and repayments are history and are not rewritten here.
export async function updateLoan(req, res) {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found." });

    const { reason, installmentAmount, status } = req.body;
    if (reason !== undefined) loan.reason = String(reason).trim();

    if (installmentAmount !== undefined) {
      const amt = Math.round(Number(installmentAmount));
      if (!amt || amt < 1) return res.status(400).json({ message: "Monthly installment must be greater than 0." });
      loan.installmentAmount = amt;
    }

    if (status !== undefined) {
      if (!['active', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Status can only be set to active or cancelled." });
      }
      if (status === 'active' && loan.remainingAmount <= 0) {
        return res.status(400).json({ message: "This loan is fully repaid and can't be reactivated." });
      }
      loan.status = status;
    }

    await loan.save();
    const populated = await populateEmployee(Loan.findById(loan._id));
    await logRecordChange({ req, verb: 'updated', entityType: 'Loan', module: 'Salary', doc: populated });
    res.status(200).json({ message: "Loan updated", loan: populated });
  } catch (error) {
    console.error('updateLoan error:', error);
    res.status(500).json({ message: "Error updating loan", error: error.message });
  }
}

// DELETE /api/loans/:id
// Only a loan nothing has been deducted for yet can be deleted — once a salary
// has taken an installment, deleting would orphan that deduction, so the loan
// has to be cancelled instead.
export async function deleteLoan(req, res) {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found." });
    if (loan.repayments.length > 0) {
      return res.status(409).json({
        message: "Installments have already been deducted from salaries for this loan. Cancel it instead of deleting.",
      });
    }
    await loan.deleteOne();
    await logRecordChange({ req, verb: 'deleted', entityType: 'Loan', module: 'Salary', doc: loan });
    res.status(200).json({ message: "Loan deleted" });
  } catch (error) {
    console.error('deleteLoan error:', error);
    res.status(500).json({ message: "Error deleting loan", error: error.message });
  }
}

// POST /api/loans/preview
//
// What the bulk salary sheet shows in its "loan" column before anything is
// saved. Read-only: it runs the same plan the deduction itself runs, so the
// figure on screen is the figure that will be taken — and it is still only a
// suggestion, because the sheet lets each row be edited before saving.
export async function previewLoanDeductions(req, res) {
  try {
    const { month, year, rows } = req.body || {};
    if (!Array.isArray(rows)) {
      return res.status(400).json({ message: "rows must be an array" });
    }

    const previews = {};
    for (const row of rows) {
      if (!row?.employee) continue;
      const { total, split } = await planLoanDeductions({
        employeeId: row.employee,
        month,
        year,
        maxDeductible: row.maxDeductible,
      });
      previews[String(row.employee)] = { total, count: split.length };
    }

    res.status(200).json({ previews });
  } catch (error) {
    res.status(500).json({ message: "Error previewing loan deductions", error: error.message });
  }
}
