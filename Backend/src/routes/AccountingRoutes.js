import express from 'express';
import { getAccountingLedger, computeAccountingLedger } from '../controllers/AccountingController.js';
import { listRuns, getRun, createOrGetRun, updateRun, finalizeRun, deleteRun } from '../controllers/AccountingRunController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

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
