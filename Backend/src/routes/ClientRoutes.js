import express from "express";
import { authMiddleware, clientAuthMiddleware } from "../middleware/authMiddleware.js";
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  loginClient,
  logoutClient,
  getClientPendingInvoices,
  getMyProfile
} from "../controllers/ClientController.js";
import { generateClientPDF } from "../controllers/ClientPDFController.js";

const router = express.Router();

// Public route for client login
router.post("/login", loginClient);

// Client logout route (requires client authentication)
router.post("/logout", clientAuthMiddleware, logoutClient);

// Client-specific routes (require client authentication)
router.get("/my-profile", clientAuthMiddleware, getMyProfile);
router.get("/pending-invoices", clientAuthMiddleware, getClientPendingInvoices);

// All other routes protected with authMiddleware (for users)
router.use(authMiddleware);

router.get("/", getClients);
router.post("/", createClient);
// PDF route must come before /:id route to avoid route conflict
router.get("/:id/pdf", generateClientPDF);
router.get("/:id", getClient);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

export default router;
