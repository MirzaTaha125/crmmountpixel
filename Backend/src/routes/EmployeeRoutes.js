import express from "express";
import { createEmployee, getEmployees, getEmployeeById, updateEmployee, deleteEmployee } from "../controllers/EmployeeController.js";

import { authMiddleware, staffOnly } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();
// Staff records hold CNIC, salary, address and bank account numbers. These
// routes used to be reachable with no token at all.
router.use(authMiddleware, staffOnly);

router.post("/", requirePermission("add_employees"), createEmployee);
router.get("/", requirePermission("view_employees"), getEmployees);
router.get("/:id", requirePermission("view_employees"), getEmployeeById);
router.put("/:id", requirePermission("edit_employees"), updateEmployee);
router.delete("/:id", requirePermission("delete_employees"), deleteEmployee);

export default router; 