import Salary from "../model/Salary.js";
import Employee from "../model/Employee.js";
import { applyLoanDeductions, reverseLoanDeductions } from "../services/loanService.js";

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
async function attachLoanDeductions(salary) {
  try {
    const { total, split } = await applyLoanDeductions({
      employeeId: salary.employee,
      salaryId: salary._id,
      month: salary.month,
      year: salary.year,
      // Gross for the period: base + additional (kept separate on new records).
      maxDeductible: (salary.salaryAmount || 0) + (salary.additionalAmount || 0),
    });
    if (total > 0) {
      salary.loanDeduction = total;
      salary.loanDeductions = split;
      await salary.save();
    }
  } catch (err) {
    console.error('Loan deduction failed for salary', String(salary._id), err.message);
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
    await attachLoanDeductions(salary);
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
    for (const s of salaries) await attachLoanDeductions(s);
    // Populate employee field for all created salaries
    const populatedSalaries = await Salary.find({ _id: { $in: salaries.map(s => s._id) } }).populate('employee');
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
    const salary = await Salary.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!salary) return res.status(404).json({ message: "Salary not found" });
    res.status(200).json({ message: "Salary updated successfully", salary });
  } catch (error) {
    res.status(500).json({ message: "Error updating salary", error });
  }
}

export async function deleteSalary(req, res) {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);
    if (!salary) return res.status(404).json({ message: "Salary not found" });
    // Hand any loan installments taken from this salary back to their loans.
    await reverseLoanDeductions(salary._id);
    res.status(200).json({ message: "Salary deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting salary", error });
  }
} 