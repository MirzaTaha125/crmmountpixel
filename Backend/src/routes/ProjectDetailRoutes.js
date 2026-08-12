import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  createProjectDetail,
  getProjectDetails,
  updateProjectDetail,
  deleteProjectDetail
} from '../controllers/ProjectDetailController.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getProjectDetails);
router.post('/', createProjectDetail);
router.put('/:id', updateProjectDetail);
router.delete('/:id', deleteProjectDetail);

export default router; 