import Salary from "../model/Salary.js";
import Employee from "../model/Employee.js";
import { applyLoanDeductions, reverseLoanDeductions } from "../services/loanService.js";
import { syncSalaryExpense, removeSalaryExpense } from "../services/salaryExpenseService.js";
import { buildPayslipDocument, payslipFileName, MONTHS } from "../services/payslipPdf.js";
import { logRecordChange } from '../services/activityLogService.js';

// The pay period the admin picked in the form. Falls back to the current month
// only when nothing valid was sent (the old behaviour ignored the choice entirely).
function resolvePeriod({ month, year }) {
  const now = new Date();
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  return {
    month: m >= 1 && m <= 12 ? m : now.getMonth() + 1,
    year: y >= 2000 && y <= 2100 ? y : now.getFullYear(),
  };
}

// Pay for days worked only. The additional amount is stored in its own field
// and added once, when totals are shown — never folded in here.
const basePay = (emp, totalWorkingDays, presentDays) =>
  Math.round((emp.salary / totalWorkingDays) * presentDays);

// Take this period's loan installments out of a freshly created salary and
// stamp the result on it. Failures are logged, not thrown: the salary itself is
// already saved and must not be lost because a loan update hiccuped.
async function attachLoanDeductions(salary, overrideTotal) {
  try {
    const { total, split } = await applyLoanDeductions({
      employeeId: salary.employee,
      salaryId: salary._id,
      month: salary.month,
      year: salary.year,
      // Gross for the period: base + additional (kept separate on new records).
      maxDeductible: (salary.salaryAmount || 0) + (salary.additionalAmount || 0),
      overrideTotal,
    });
    // Always written back, not just when positive: an admin who sets the
    // deduction to 0 must see it land as 0, not keep a stale figure.
    salary.loanDeduction = total;
    salary.loanDeductions = split;
    await salary.save();
  } catch (err) {
    console.error('Loan deduction failed for salary', String(salary._id), err.message);
  }
  return salary;
}

// Post (or re-post) the matching row in the expense ledger. Like the loan step,
// a failure here is logged rather than thrown: the salary is already saved and
// losing it would be worse than a ledger row that needs a retry.
async function postToExpenses(salary, userId) {
  try {
    await syncSalaryExpense(salary, userId);
  } catch (err) {
    console.error('Expense sync failed for salary', String(salary._id), err.message);
  }
  return salary;
}

export async function createSalary(req, res) {
  try {
    const { employee, totalWorkingDays, presentDays, additionalAmount, additionalAmountReason } = req.body;
    if (!employee || !totalWorkingDays || !presentDays) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Fetch employee salary
    const emp = await Employee.findById(employee);
    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { month, year } = resolvePeriod(req.body);

    const salary = await Salary.create({
      employee,
      month,
      year,
      totalWorkingDays,
      presentDays,
      salaryAmount: basePay(emp, totalWorkingDays, presentDays),
      additionalAmount: Number(additionalAmount) || 0,
      additionalAmountReason: additionalAmountReason || '',
      additionalInBase: false,
    });
    await attachLoanDeductions(salary, req.body.loanDeduction);
    await postToExpenses(salary, req.user?._id);
    await logRecordChange({ req, verb: 'created', entityType: 'Salary', module: 'Salary', doc: salary });
    res.status(201).json({ message: "Salary created successfully", salary });
  } catch (error) {
    res.status(500).json({ message: "Error creating salary", error });
  }
}

export async function createBulkSalary(req, res) {
  try {
    // req.body should be an array of salary objects
    const salaryDocs = [];
    for (const item of req.body) {
      const { month, year } = resolvePeriod(item);
      const { employee, totalWorkingDays, presentDays, additionalAmount, additionalAmountReason } = item;
      if (!employee || !totalWorkingDays || !presentDays) {
        return res.status(400).json({ message: "Missing required fields in bulk item" });
      }
      const emp = await Employee.findById(employee);
      if (!emp) {
        return res.status(404).json({ message: `Employee not found for ID ${employee}` });
      }
      salaryDocs.push({
        employee,
        month,
        year,
        totalWorkingDays,
        presentDays,
        salaryAmount: basePay(emp, totalWorkingDays, presentDays),
        additionalAmount: Number(additionalAmount) || 0,
        additionalAmountReason: additionalAmountReason || '',
        additionalInBase: false,
      });
    }
    const salaries = await Salary.insertMany(salaryDocs);
    // Sequential on purpose: two rows for the same employee must not race on
    // the same loan document.
    // Each row may carry its own typed loan amount, matched back by employee.
    const overrideByEmployee = new Map(
      (req.body || [])
        .filter((item) => item && item.loanDeduction !== undefined && item.loanDeduction !== null && item.loanDeduction !== '')
        .map((item) => [String(item.employee), item.loanDeduction])
    );
    for (const s of salaries) {
      await attachLoanDeductions(s, overrideByEmployee.get(String(s.employee)));
      await postToExpenses(s, req.user?._id);
    }
    // Populate employee field for all created salaries
    const populatedSalaries = await Salary.find({ _id: { $in: salaries.map(s => s._id) } }).populate('employee');
    await logRecordChange({
      req, verb: 'created', entityType: 'Salary', module: 'Salary',
      doc: populatedSalaries[0],
      extra: { bulk: true, count: populatedSalaries.length, month: populatedSalaries[0]?.month, year: populatedSalaries[0]?.year },
    });
    res.status(201).json({ message: "Bulk salaries created successfully", salaries: populatedSalaries });
  } catch (error) {
    res.status(500).json({ message: "Error creating bulk salaries", error });
  }
}

export async function getSalaries(req, res) {
  try {
    const { employeeName, month, year } = req.query;
    const filter = {};
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    let salaries = await Salary.find(filter).populate('employee');
    if (employeeName) {
      salaries = salaries.filter(sal => sal.employee && sal.employee.Name && sal.employee.Name.toLowerCase().includes(employeeName.toLowerCase()));
    }
    res.status(200).json({ message: "Salaries fetched successfully", salaries });
  } catch (error) {
    res.status(500).json({ message: "Error fetching salaries", error });
  }
}

export async function getSalaryById(req, res) {
  try {
    const salary = await Salary.findById(req.params.id).populate('employee');
    if (!salary) return res.status(404).json({ message: "Salary not found" });
    res.status(200).json({ message: "Salary found", salary });
  } catch (error) {
    res.status(500).json({ message: "Error fetching salary", error });
  }
}

export async function updateSalary(req, res) {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) return res.status(404).json({ message: "Salary not found" });

    const emp = await Employee.findById(salary.employee);
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    // Only the fields the edit form owns. Everything else — the loan split, the
    // expense link — is recomputed below rather than taken from the request.
    if (req.body.totalWorkingDays !== undefined) {
      const total = parseInt(req.body.totalWorkingDays, 10);
      if (!total || total < 1) return res.status(400).json({ message: "Working days in the month must be at least 1." });
      salary.totalWorkingDays = total;
    }
    if (req.body.presentDays !== undefined) {
      const present = parseInt(req.body.presentDays, 10);
      if (Number.isNaN(present) || present < 0) return res.status(400).json({ message: "Days worked can't be negative." });
      if (present > salary.totalWorkingDays) {
        return res.status(400).json({ message: `Days worked can't be more than ${salary.totalWorkingDays}.` });
      }
      salary.presentDays = present;
    }
    if (req.body.additionalAmount !== undefined) salary.additionalAmount = Number(req.body.additionalAmount) || 0;
    if (req.body.additionalAmountReason !== undefined) {
      salary.additionalAmountReason = String(req.body.additionalAmountReason || '').trim();
    }
    if (req.body.month !== undefined || req.body.year !== undefined) {
      const { month, year } = resolvePeriod({ month: req.body.month ?? salary.month, year: req.body.year ?? salary.year });
      salary.month = month;
      salary.year = year;
    }

    // Days or the employee's rate may have changed — the stored amount is
    // always derived, never trusted from the request.
    salary.salaryAmount = basePay(emp, salary.totalWorkingDays, salary.presentDays);
    salary.additionalInBase = false;
    await salary.save();

    // Redo the loan installment for the (possibly new) period and amount: hand
    // back what this salary took, then take it again under the new figures.
    await reverseLoanDeductions(salary._id);
    salary.loanDeduction = 0;
    salary.loanDeductions = [];
    await salary.save();
    await attachLoanDeductions(salary, req.body.loanDeduction);

    await postToExpenses(salary, req.user?._id);

    const populated = await Salary.findById(salary._id).populate('employee');
    await logRecordChange({ req, verb: 'updated', entityType: 'Salary', module: 'Salary', doc: populated });
    res.status(200).json({ message: "Salary updated successfully", salary: populated });
  } catch (error) {
    console.error('updateSalary error:', error);
    res.status(500).json({ message: "Error updating salary", error: error.message });
  }
}

export async function deleteSalary(req, res) {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);
    if (!salary) return res.status(404).json({ message: "Salary not found" });
    // Hand any loan installments taken from this salary back to their loans,
    // and take its row back out of the expense ledger.
    await reverseLoanDeductions(salary._id);
    await removeSalaryExpense(salary);
    await logRecordChange({ req, verb: 'deleted', entityType: 'Salary', module: 'Salary', doc: salary });
    res.status(200).json({ message: "Salary deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting salary", error });
  }
}

// GET /api/salaries/:id/payslip — one slip.
export async function getPayslip(req, res) {
  try {
    const salary = await Salary.findById(req.params.id).populate('employee');
    if (!salary) return res.status(404).json({ message: "Salary not found" });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${payslipFileName(salary)}"`);
    buildPayslipDocument([salary]).pipe(res);
  } catch (error) {
    res.status(500).json({ message: "Error building payslip", error: error.message });
  }
}

// GET /api/salaries/payslips?month=&year=
//
// Every slip for one month in a single file, one per page. A single PDF rather
// than a zip of thirty: it prints in one go, needs no unpacking, and keeps the
// backend free of an archive dependency.
export async function getMonthPayslips(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) {
      return res.status(400).json({ message: "A valid month and year are required" });
    }

    const salaries = await Salary.find({ month, year }).populate('employee');
    salaries.sort((a, b) => String(a.employee?.Name || '').localeCompare(String(b.employee?.Name || '')));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslips-${MONTHS[month - 1].toLowerCase()}-${year}.pdf"`,
    );
    buildPayslipDocument(salaries).pipe(res);
  } catch (error) {
    res.status(500).json({ message: "Error building payslips", error: error.message });
  }
}
