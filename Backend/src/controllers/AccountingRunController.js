import AccountingRun from '../model/AccountingRun.js';

// GET /api/accounting/runs
// List of all runs, newest first. Frontend uses this for the main table.
export const listRuns = async (req, res) => {
  try {
    const runs = await AccountingRun.find()
      .sort({ year: -1, month: -1, updatedAt: -1 })
      .populate('createdBy', 'First_Name Last_Name Email')
      .lean();
    res.json({ runs });
  } catch (err) {
    console.error('listRuns error:', err);
    res.status(500).json({ message: 'Error listing runs', error: err.message });
  }
};

// GET /api/accounting/runs/:id
export const getRun = async (req, res) => {
  try {
    const run = await AccountingRun.findById(req.params.id)
      .populate('createdBy', 'First_Name Last_Name Email')
      .lean();
    if (!run) return res.status(404).json({ message: 'Run not found' });
    res.json({ run });
  } catch (err) {
    console.error('getRun error:', err);
    res.status(500).json({ message: 'Error loading run', error: err.message });
  }
};

// POST /api/accounting/runs
// Body: { month, year }.  Creates (or returns existing) draft for that period.
// The unique (month, year) index means callers hitting this repeatedly are
// idempotent — they always get the same draft back.
export const createOrGetRun = async (req, res) => {
  try {
    const { month, year } = req.body || {};
    if (!month || !year) return res.status(400).json({ message: 'month and year are required.' });
    const m = parseInt(month, 10);
    const y = parseInt(year,  10);

    let run = await AccountingRun.findOne({ month: m, year: y });
    if (!run) {
      run = await AccountingRun.create({
        month: m, year: y, status: 'draft',
        createdBy: req.user?._id || null,
      });
    }
    res.json({ run });
  } catch (err) {
    console.error('createOrGetRun error:', err);
    res.status(500).json({ message: 'Error creating run', error: err.message });
  }
};

// PUT /api/accounting/runs/:id
// Save wizard progress (allocations, methods). Not finalized yet.
export const updateRun = async (req, res) => {
  try {
    const run = await AccountingRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if (run.status === 'completed') {
      return res.status(400).json({ message: 'Run is finalized and cannot be edited. Delete and start over if you need to redo.' });
    }
    const {
      officeMethod, officeAllocations,
      holdMethod, holdTotal, holdAllocations,
      charityPercent,
    } = req.body || {};
    if (officeMethod)      run.officeMethod      = officeMethod;
    if (officeAllocations) run.officeAllocations = officeAllocations;
    if (holdMethod)        run.holdMethod        = holdMethod;
    if (holdTotal != null) run.holdTotal         = parseFloat(holdTotal) || 0;
    if (holdAllocations)   run.holdAllocations   = holdAllocations;
    if (charityPercent != null) run.charityPercent = parseFloat(charityPercent);
    await run.save();
    res.json({ run });
  } catch (err) {
    console.error('updateRun error:', err);
    res.status(500).json({ message: 'Error updating run', error: err.message });
  }
};

// POST /api/accounting/runs/:id/finalize
// Body: { snapshot } — the full computed ledger the frontend just showed.
// Marks the run completed + freezes the report so historical views stay stable.
export const finalizeRun = async (req, res) => {
  try {
    const run = await AccountingRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if (run.status === 'completed') {
      return res.status(400).json({ message: 'Run already finalized.' });
    }
    const { snapshot } = req.body || {};
    run.snapshot    = snapshot || null;
    run.status      = 'completed';
    run.completedAt = new Date();
    await run.save();
    res.json({ run });
  } catch (err) {
    console.error('finalizeRun error:', err);
    res.status(500).json({ message: 'Error finalizing run', error: err.message });
  }
};

// DELETE /api/accounting/runs/:id
export const deleteRun = async (req, res) => {
  try {
    const doc = await AccountingRun.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Run not found' });
    res.json({ message: 'Run deleted' });
  } catch (err) {
    console.error('deleteRun error:', err);
    res.status(500).json({ message: 'Error deleting run', error: err.message });
  }
};
