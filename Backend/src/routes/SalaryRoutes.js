import express from "express";
import { createSalary, createBulkSalary, getSalaries, getSalaryById, updateSalary, deleteSalary } from "../controllers/SalaryController.js";
import { authMiddleware, staffOnly } from "../middleware/authMiddleware.js";

const router = express.Router();
// Payroll is internal: logged-in staff only (was previously reachable without a token).
router.use(authMiddleware, staffOnly);

router.post("/", createSalary);
router.post("/bulk", createBulkSalary);
router.get("/", getSalaries);
router.get("/:id", getSalaryById);
router.put("/:id", updateSalary);
router.delete("/:id", deleteSalary);

export default router; 