import express from "express";
import { createUser, getUsers, updateUser, deleteUser, getUser, loginUser, logoutUser } from "../controllers/UserController.js";
import { authMiddleware, staffOnly, adminOnly } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// Public: the only way in.
router.post("/login", loginUser)

router.post("/logout", authMiddleware, logoutUser)

// Reading the staff directory is for signed-in staff. Previously these were
// wide open, which also meant anyone could POST a user with Role "Admin" and
// own the system.
router.get("/", authMiddleware, staffOnly, requirePermission("view_users"), getUsers)
router.get("/:id", authMiddleware, staffOnly, getUser)

// Creating, editing and removing accounts — including setting a role — is an
// administrator action.
router.post("/", authMiddleware, staffOnly, adminOnly, createUser)
router.put("/:id", authMiddleware, staffOnly, adminOnly, updateUser)
router.delete("/:id", authMiddleware, staffOnly, adminOnly, deleteUser)

export default router;