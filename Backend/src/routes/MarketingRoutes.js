import express from 'express';
import { listMarketing, upsertMarketing, deleteMarketing, getMarketingReport } from '../controllers/MarketingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/report', getMarketingReport);   // per-brand target vs actual (computed)
router.get('/',       listMarketing);
router.post('/',      upsertMarketing);
router.delete('/:id', deleteMarketing);

export default router;
