import express from "express";
import { createSalary, createBulkSalary, getSalaries, getSalaryById, updateSalary, deleteSalary } from "../controllers/SalaryController.js";

const router = express.Router();

router.post("/", createSalary);
router.post("/bulk", createBulkSalary);
router.get("/", getSalaries);
router.get("/:id", getSalaryById);
router.put("/:id", updateSalary);
router.delete("/:id", deleteSalary);

export default router; 