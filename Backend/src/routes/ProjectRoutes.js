import express from 'express';
import {
  getClientProjects,
  getUserProjects,
  addProject,
  updateProject,
  deleteProject,
  getProjectStatistics
} from '../controllers/ProjectController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get projects for a specific client
router.get('/client/:clientId', getClientProjects);

// Get all projects for user's assigned clients
router.get('/', getUserProjects);

// Get project statistics
router.get('/statistics', getProjectStatistics);

// Add new project
router.post('/', addProject);

// Update project
router.put('/:id', updateProject);

// Delete project
router.delete('/:id', deleteProject);

export default router;




