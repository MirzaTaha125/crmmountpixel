import HoldInUS from '../model/HoldInUS.js';
import Brand from '../model/Brand.js';

// GET /api/holds?month=X&year=Y  (optional brandId)
export const listHolds = async (req, res) => {
  try {
    const { month, year, brandId } = req.query;
    const filter = {};
    if (month)   filter.month   = parseInt(month, 10);
    if (year)    filter.year    = parseInt(year, 10);
    if (brandId) filter.brandId = brandId;
    const rows = await HoldInUS.find(filter).populate('brandId', 'name mainColor').lean();
    res.json({ holds: rows });
  } catch (err) {
    console.error('listHolds error:', err);
    res.status(500).json({ message: 'Error listing holds', error: err.message });
  }
};

// POST /api/holds  — upsert (create or update) by (brandId, month, year)
// Body: { brandId, month, year, amount, reason? }
export const upsertHold = async (req, res) => {
  try {
    const { brandId, month, year, amount, reason } = req.body || {};
    if (!brandId || !month || !year || amount === undefined || amount === null) {
      return res.status(400).json({ message: 'brandId, month, year, and amount are required.' });
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) return res.status(400).json({ message: 'amount must be a non-negative number.' });

    const brand = await Brand.findById(brandId);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    const doc = await HoldInUS.findOneAndUpdate(
      { brandId, month: parseInt(month, 10), year: parseInt(year, 10) },
      {
        $set: {
          amount: amt,
          reason: (reason || '').trim(),
          createdBy: req.user?._id || null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ hold: doc });
  } catch (err) {
    console.error('upsertHold error:', err);
    res.status(500).json({ message: 'Error saving hold', error: err.message });
  }
};

// DELETE /api/holds/:id
export const deleteHold = async (req, res) => {
  try {
    const doc = await HoldInUS.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Hold not found' });
    res.json({ message: 'Hold deleted' });
  } catch (err) {
    console.error('deleteHold error:', err);
    res.status(500).json({ message: 'Error deleting hold', error: err.message });
  }
};
