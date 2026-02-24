import express from 'express';
import {
  getActivityLogs,
  getUserActivityLogs,
  getEntityActivityLogs,
  getActivityLogStats,
  clearActivityLogs
} from '../controllers/ActivityLogController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all activity logs with filters
router.get('/', getActivityLogs);

// Get activity log statistics
router.get('/stats', getActivityLogStats);

// Get activity logs for a specific user
router.get('/user/:userId', getUserActivityLogs);

// Get activity logs for a specific entity
router.get('/entity/:entityType/:entityId', getEntityActivityLogs);

// Clear/delete activity logs
router.delete('/', clearActivityLogs);

export default router;


