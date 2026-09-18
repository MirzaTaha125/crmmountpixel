import express from 'express';
import { listHolds, upsertHold, deleteHold } from '../controllers/HoldInUSController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/',       listHolds);
router.post('/',      upsertHold);
router.delete('/:id', deleteHold);

export default router;
