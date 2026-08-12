import express from 'express';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
  getUsersWithRoles,
  getUserPermissions
} from '../controllers/RoleController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// User role assignment routes - MUST come before /:id route to avoid conflicts
router.post('/assign', assignRoleToUser);
router.get('/users/with-roles', getUsersWithRoles);
router.get('/user/:userId/permissions', getUserPermissions);

// Role management routes
router.get('/', getAllRoles);
router.get('/:id', getRoleById);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
