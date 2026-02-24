import express from "express";
import { createUser, getUsers, updateUser, deleteUser, getUser, loginUser, logoutUser } from "../controllers/UserController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getUsers)

router.post("/", createUser)

router.post("/login", loginUser)

// Logout route (requires authentication)
router.post("/logout", authMiddleware, logoutUser)

router.get("/:id", getUser)

router.put("/:id", updateUser)

router.delete("/:id", deleteUser)

export default router;