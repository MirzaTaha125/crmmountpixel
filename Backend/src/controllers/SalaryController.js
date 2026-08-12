import Salary from "../model/Salary.js";
import Employee from "../model/Employee.js";

export async function createSalary(req, res) {
  try {
    const { employee, totalWorkingDays, presentDays, additionalAmount } = req.body;
    if (!employee || !totalWorkingDays || !presentDays) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Fetch employee salary
    const emp = await Employee.findById(employee);
    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Get current month and year
    const now = new Date();
    const month = now.getMonth() + 1; // JS months are 0-indexed
    const year = now.getFullYear();

    // Calculate salaryAmount
    const salaryAmount = (emp.salary / totalWorkingDays) * presentDays + (Number(additionalAmount) || 0);

    const salary = await Salary.create({
      employee,
      month,
      year,
      totalWorkingDays,
      presentDays,
      salaryAmount,
      additionalAmount,
    });
    res.status(201).json({ message: "Salary created successfully", salary });
  } catch (error) {
    res.status(500).json({ message: "Error creating salary", error });
  }
}

export async function createBulkSalary(req, res) {
  try {
    // req.body should be an array of salary objects
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const salaryDocs = [];
    for (const item of req.body) {
      const { employee, totalWorkingDays, presentDays, additionalAmount } = item;
      if (!employee || !totalWorkingDays || !presentDays) {
        return res.status(400).json({ message: "Missing required fields in bulk item" });
      }
      const emp = await Employee.findById(employee);
      if (!emp) {
        return res.status(404).json({ message: `Employee not found for ID ${employee}` });
      }
      const salaryAmount = (emp.salary / totalWorkingDays) * presentDays + (Number(additionalAmount) || 0);
      salaryDocs.push({
        employee,
        month,
        year,
        totalWorkingDays,
        presentDays,
        salaryAmount,
        additionalAmount,
      });
    }
    const salaries = await Salary.insertMany(salaryDocs);
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
    res.status(200).json({ message: "Salary deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting salary", error });
  }
} 