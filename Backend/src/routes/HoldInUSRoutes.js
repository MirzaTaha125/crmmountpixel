import express from 'express';
import { listHolds, upsertHold, deleteHold } from '../controllers/HoldInUSController.js';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
// Owner-level financial data: the profit waterfall, shareholder payouts,
// withdrawals and money held in the US. These pages only ever open from the
// admin panel, and no permission exists for them, so the API requires an
// administrator rather than accepting any signed-in staff member.
router.use(authMiddleware, adminOnly);

router.get('/',       listHolds);
router.post('/',      upsertHold);
router.delete('/:id', deleteHold);

export default router;
