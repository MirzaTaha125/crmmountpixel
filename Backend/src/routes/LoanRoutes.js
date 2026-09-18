import express from "express";
import { getLoans, createLoan, updateLoan, deleteLoan } from "../controllers/LoanController.js";
import { authMiddleware, staffOnly } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware, staffOnly);

router.get("/", getLoans);
router.post("/", createLoan);
router.put("/:id", updateLoan);
router.delete("/:id", deleteLoan);

export default router;
