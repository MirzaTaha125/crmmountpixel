import express from 'express';
import { getAccountingLedger, computeAccountingLedger } from '../controllers/AccountingController.js';
import { listRuns, getRun, createOrGetRun, updateRun, finalizeRun, deleteRun } from '../controllers/AccountingRunController.js';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
// Owner-level financial data: the profit waterfall, shareholder payouts,
// withdrawals and money held in the US. These pages only ever open from the
// admin panel, and no permission exists for them, so the API requires an
// administrator rather than accepting any signed-in staff member.
router.use(authMiddleware, adminOnly);

// Live ledger — default settings (standalone page).
router.get('/ledger',           getAccountingLedger);
// Live ledger — accepts wizard allocation overrides (no DB writes).
router.post('/ledger/compute',  computeAccountingLedger);

// Accounting Runs (wizard-completed periods).
router.get('/runs',             listRuns);
router.get('/runs/:id',         getRun);
router.post('/runs',            createOrGetRun);
router.put('/runs/:id',         updateRun);
router.post('/runs/:id/finalize', finalizeRun);
router.delete('/runs/:id',      deleteRun);

export default router;
