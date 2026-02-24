import express from 'express';
import {
  createCallSchedule,
  getAllCallSchedules,
  getUserCallSchedules,
  getUserAssignedClients,
  updateCallSchedule,
  deleteCallSchedule,
  getCalendarData
} from '../controllers/CallScheduleController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Specific routes first
router.get('/my-schedules', getUserCallSchedules);
router.get('/assigned-clients', getUserAssignedClients);
router.get('/all', getAllCallSchedules);
router.get('/calendar', getCalendarData);

// Default GET route for admin (after specific routes)
router.get('/', getAllCallSchedules);

// Other routes
router.post('/', createCallSchedule);
router.put('/:id', updateCallSchedule);
router.delete('/:id', deleteCallSchedule);

export default router;
