import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  createAssignment,
  getAssignments,
  updateAssignment,
  deleteAssignment
} from '../controllers/AssignmentController.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getAssignments);
router.post('/', createAssignment);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

export default router; 