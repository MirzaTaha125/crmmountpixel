import express from 'express';
import {
  listShareholders, createShareholder, updateShareholder, deleteShareholder,
} from '../controllers/ShareholderController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/',       listShareholders);
router.post('/',      createShareholder);
router.put('/:id',    updateShareholder);
router.delete('/:id', deleteShareholder);

export default router;
