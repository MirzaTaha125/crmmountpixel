import express from 'express';
import { 
  createDispute, 
  getAllDisputes, 
  getDisputeById, 
  updateDispute, 
  deleteDispute 
} from '../controllers/DisputeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createDispute);
router.get('/', authMiddleware, getAllDisputes);
router.get('/:id', authMiddleware, getDisputeById);
router.put('/:id', authMiddleware, updateDispute);
router.delete('/:id', authMiddleware, deleteDispute);

export default router;


