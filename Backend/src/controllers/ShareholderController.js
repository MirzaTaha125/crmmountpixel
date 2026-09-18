import Shareholder from '../model/Shareholder.js';
import Brand from '../model/Brand.js';

// Percentages across a brand's ACTIVE shareholders must never exceed 100.
// Called before create/update so the API never accepts an inconsistent state.
async function assertPercentageWithin100(brandId, { excludeId, addingPercentage }) {
  const filter = { brandId, active: true };
  if (excludeId) filter._id = { $ne: excludeId };
  const rows = await Shareholder.find(filter).select('percentage').lean();
  const currentSum = rows.reduce((s, r) => s + (r.percentage || 0), 0);
  const total = currentSum + (addingPercentage || 0);
  if (total > 100.0001) {
    const remaining = Math.max(0, 100 - currentSum);
    const err = new Error(`Total shareholder percentage would exceed 100% (currently ${currentSum.toFixed(2)}%, only ${remaining.toFixed(2)}% remaining).`);
    err.status = 400;
    throw err;
  }
}

// GET /api/shareholders?brandId=<id>
// List shareholders for a specific brand (or all if brandId omitted).
export const listShareholders = async (req, res) => {
  try {
    const { brandId } = req.query;
    const filter = {};
    if (brandId) filter.brandId = brandId;
    const rows = await Shareholder.find(filter).sort({ percentage: -1, createdAt: 1 }).lean();
    res.json({ shareholders: rows });
  } catch (err) {
    console.error('listShareholders error:', err);
    res.status(500).json({ message: 'Error listing shareholders', error: err.message });
  }
};

// POST /api/shareholders
// Body: { brandId, name, email?, percentage, notes?, active? }
export const createShareholder = async (req, res) => {
  try {
    const { brandId, name, email, percentage, notes, active } = req.body || {};
    if (!brandId || !name || percentage === undefined || percentage === null) {
      return res.status(400).json({ message: 'brandId, name, and percentage are required.' });
    }
    const brand = await Brand.findById(brandId);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ message: 'percentage must be between 0 and 100.' });
    }
    if (active !== false) {
      await assertPercentageWithin100(brandId, { addingPercentage: pct });
    }

    const doc = await Shareholder.create({
      brandId, name: name.trim(),
      email: (email || '').trim(),
      percentage: pct,
      notes: (notes || '').trim(),
      active: active !== false,
      createdBy: req.user?._id || null,
    });
    res.status(201).json({ shareholder: doc });
  } catch (err) {
    console.error('createShareholder error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error creating shareholder' });
  }
};

// PUT /api/shareholders/:id
export const updateShareholder = async (req, res) => {
  try {
    const doc = await Shareholder.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Shareholder not found' });

    const { name, email, percentage, notes, active } = req.body || {};

    let newPct = doc.percentage;
    if (percentage !== undefined && percentage !== null) {
      newPct = parseFloat(percentage);
      if (isNaN(newPct) || newPct < 0 || newPct > 100) {
        return res.status(400).json({ message: 'percentage must be between 0 and 100.' });
      }
    }
    const willBeActive = active !== undefined ? !!active : doc.active;

    if (willBeActive) {
      await assertPercentageWithin100(doc.brandId, {
        excludeId: doc._id,
        addingPercentage: newPct,
      });
    }

    if (name  !== undefined) doc.name  = String(name).trim();
    if (email !== undefined) doc.email = String(email).trim();
    if (percentage !== undefined && percentage !== null) doc.percentage = newPct;
    if (notes !== undefined) doc.notes = String(notes).trim();
    if (active !== undefined) doc.active = !!active;
    await doc.save();

    res.json({ shareholder: doc });
  } catch (err) {
    console.error('updateShareholder error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error updating shareholder' });
  }
};

// DELETE /api/shareholders/:id
export const deleteShareholder = async (req, res) => {
  try {
    const doc = await Shareholder.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Shareholder not found' });
    res.json({ message: 'Shareholder deleted' });
  } catch (err) {
    console.error('deleteShareholder error:', err);
    res.status(500).json({ message: 'Error deleting shareholder', error: err.message });
  }
};
