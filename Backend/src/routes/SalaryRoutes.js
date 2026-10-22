import express from "express";
import {
  createSalary, createBulkSalary, getSalaries, getSalaryById, updateSalary, deleteSalary,
  getPayslip, getMonthPayslips,
} from "../controllers/SalaryController.js";
import { authMiddleware, staffOnly } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();
// Payroll is internal: logged-in staff only (was previously reachable without a token).
router.use(authMiddleware, staffOnly);

// Same permissions the Salary page checks before showing these controls.
router.post("/", requirePermission("add_salary"), createSalary);
router.post("/bulk", requirePermission("add_salary"), createBulkSalary);
router.get("/", requirePermission("view_salary"), getSalaries);
// Before "/:id" so "payslips" is never read as an id.
router.get("/payslips", requirePermission("view_salary"), getMonthPayslips);
router.get("/:id/payslip", requirePermission("view_salary"), getPayslip);
router.get("/:id", requirePermission("view_salary"), getSalaryById);
router.put("/:id", requirePermission("edit_salary"), updateSalary);
router.delete("/:id", requirePermission("delete_salary"), deleteSalary);

export default router; 