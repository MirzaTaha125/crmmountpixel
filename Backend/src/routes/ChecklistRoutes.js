import express from 'express';
import {
  createChecklist,
  getAllChecklists,
  getMyChecklists,
  getChecklistById,
  updateChecklist,
  toggleChecklistItem,
  deleteChecklist,
} from '../controllers/ChecklistController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/', createChecklist);
router.get('/', getAllChecklists);
router.get('/mine', getMyChecklists); // must precede '/:id'
router.get('/:id', getChecklistById);
router.put('/:id', updateChecklist);
router.patch('/:id/items/:itemId', toggleChecklistItem);
router.delete('/:id', deleteChecklist);

export default router;
