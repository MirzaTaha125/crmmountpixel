import express from "express";
import {
  getLoans, createLoan, updateLoan, deleteLoan, previewLoanDeductions,
} from "../controllers/LoanController.js";
import { authMiddleware, staffOnly } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();
router.use(authMiddleware, staffOnly);

// Loans are a tab on the Salary page, so they follow the salary permissions.
router.get("/", requirePermission("view_salary"), getLoans);
// Before any "/:id" handler so "preview" is never read as an id.
router.post("/preview", requirePermission("add_salary"), previewLoanDeductions);
router.post("/", requirePermission("add_salary"), createLoan);
router.put("/:id", requirePermission("edit_salary"), updateLoan);
router.delete("/:id", requirePermission("delete_salary"), deleteLoan);

export default router;
