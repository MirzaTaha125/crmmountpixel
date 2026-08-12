import Employee from "../model/Employee.js";

export async function createEmployee(req, res) {
  try {
    // Remove Pass field if it's empty or not provided
    const employeeData = { ...req.body };
    if (!employeeData.Pass || employeeData.Pass.trim() === '') {
      delete employeeData.Pass;
    }
    const employee = await Employee.create(employeeData);
    res.status(201).json({ message: "Employee created successfully", employee });
  } catch (error) {
    res.status(500).json({ message: "Error creating employee", error });
  }
}

export async function getEmployees(req, res) {
  try {
    const { name, designation } = req.query;
    const filter = {};
    if (name) filter.Name = { $regex: name, $options: 'i' };
    if (designation) filter.designation = designation;
    const employees = await Employee.find(filter);
    res.status(200).json({ message: "Employees fetched successfully", employees });
  } catch (error) {
    res.status(500).json({ message: "Error fetching employees", error });
  }
}

export async function getEmployeeById(req, res) {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.status(200).json({ message: "Employee found", employee });
  } catch (error) {
    res.status(500).json({ message: "Error fetching employee", error });
  }
}

export async function updateEmployee(req, res) {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.status(200).json({ message: "Employee updated successfully", employee });
  } catch (error) {
    res.status(500).json({ message: "Error updating employee", error });
  }
}

export async function deleteEmployee(req, res) {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting employee", error });
  }
} 