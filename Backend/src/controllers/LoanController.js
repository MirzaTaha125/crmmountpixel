import Loan from "../model/Loan.js";
import Employee from "../model/Employee.js";

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
    res.status(200).json({ message: "Loan deleted" });
  } catch (error) {
    console.error('deleteLoan error:', error);
    res.status(500).json({ message: "Error deleting loan", error: error.message });
  }
}
