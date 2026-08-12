import express from 'express';
import {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions as getUserPermissionsController,
  updateUserPermissions
} from '../controllers/PermissionController.js';
import { getUserPermissions } from '../controllers/RoleController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all permissions (Admin only)
router.get('/', getAllPermissions);

// Get user's permissions
router.get('/my-permissions', (req, res) => {
  // Use the current user's ID for the getUserPermissions function
  req.params.userId = req.user._id;
  getUserPermissions(req, res);
});

// Get permissions for a specific role (Admin only)
router.get('/role/:role', getRolePermissions);

// Update permissions for a specific role (Admin only)
router.put('/role/:role', updateRolePermissions);

// Get permissions for a specific user (Admin only)
router.get('/user/:userId', getUserPermissionsController);

// Update permissions for a specific user (Admin only)
router.put('/user/:userId', updateUserPermissions);

export default router;

