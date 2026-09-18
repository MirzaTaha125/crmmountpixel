import MarketingMetric from '../model/MarketingMetric.js';
import Brand from '../model/Brand.js';
import Expense from '../model/Expense.js';
import PaymentHistory from '../model/PaymentHistory.js';

// GET /api/marketing?month=X&year=Y
// Returns all metric rows for the given period, joined lightly with brand info.
export const listMarketing = async (req, res) => {
  try {
    const { month, year, brandId } = req.query;
    const filter = {};
    if (month)   filter.month   = parseInt(month, 10);
    if (year)    filter.year    = parseInt(year, 10);
    if (brandId) filter.brandId = brandId;
    const rows = await MarketingMetric.find(filter)
      .populate('brandId', 'name mainColor')
      .lean();
    res.json({ metrics: rows });
  } catch (err) {
    console.error('listMarketing error:', err);
    res.status(500).json({ message: 'Error listing marketing metrics', error: err.message });
  }
};

// POST /api/marketing
// Upsert a metric row by (brandId, channel, month, year).
// Body: { brandId, channel, month, year, targetSpend?, targetSales?, targetROI?, actualSpend?, actualSales?, notes? }
export const upsertMarketing = async (req, res) => {
  try {
    const { brandId, channel, month, year } = req.body || {};
    if (!brandId || !channel || !month || !year) {
      return res.status(400).json({ message: 'brandId, channel, month, and year are required.' });
    }
    if (!['PPC', 'SMM'].includes(channel)) {
      return res.status(400).json({ message: 'channel must be PPC or SMM.' });
    }

    const setDoc = {
      targetSpend: parseFloat(req.body.targetSpend) || 0,
      targetSales: parseFloat(req.body.targetSales) || 0,
      targetROI:   parseFloat(req.body.targetROI)   || 0,
      actualSpend: parseFloat(req.body.actualSpend) || 0,
      actualSales: parseFloat(req.body.actualSales) || 0,
      notes:       (req.body.notes || '').trim(),
      updatedBy:   req.user?._id || null,
    };
    const doc = await MarketingMetric.findOneAndUpdate(
      { brandId, channel, month: parseInt(month, 10), year: parseInt(year, 10) },
      { $set: setDoc },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ metric: doc });
  } catch (err) {
    console.error('upsertMarketing error:', err);
    res.status(500).json({ message: 'Error saving marketing metric', error: err.message });
  }
};

// GET /api/marketing/report?month=X&year=Y
//
// Returns one row per brand, each with PPC + SMM breakdown showing both the
// user-entered TARGETS (from MarketingMetric) and the AUTO-COMPUTED ACTUALS:
//   • actualSpend per channel — from Expense records where
//         brand = brandName AND category = "Marketing/PPC" | "Marketing/SMM"
//   • actualSales per channel — the brand's TOTAL revenue split by spend ratio
//         (proxy attribution — invoices don't tell us which channel brought the
//          customer, so we prorate by ad spend share).
//   • actualROI per channel — (actualSales − actualSpend) / actualSpend × 100.
//
// This same endpoint powers both the standalone Marketing page and the
// prefilled Marketing step inside the accounting wizard.
export const getMarketingReport = async (req, res) => {
  try {
    const { month, year, brandId } = req.query;
    const m = month ? parseInt(month, 10) : (new Date().getMonth() + 1);
    const y = year  ? parseInt(year, 10)  : new Date().getFullYear();

    // Month window used by the Expense + PaymentHistory queries.
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59, 999);

    // 1) Brand catalog — optionally filtered to one brand.
    const brandFilter = brandId ? { _id: brandId } : {};
    const brands = await Brand.find(brandFilter)
      .select('_id name logo mainColor')
      .sort({ name: 1 })
      .lean();

    if (brands.length === 0) return res.json({ period: { month: m, year: y }, brands: [] });

    // 2) All target metrics for the period, one round trip.
    const metrics = await MarketingMetric.find({ month: m, year: y }).lean();
    const metricByBrandChannel = new Map();
    for (const mm of metrics) {
      metricByBrandChannel.set(`${mm.brandId}::${mm.channel}`, mm);
    }

    // 3) All marketing expenses in the period, one round trip.
    // Category prefix "Marketing/" is the convention — anything else is skipped.
    const marketingExpenses = await Expense.find({
      expenseDate: { $gte: start, $lte: end },
      category: { $in: ['Marketing/PPC', 'Marketing/SMM'] },
    }).lean();
    const spendByBrandChannel = new Map();
    for (const e of marketingExpenses) {
      const brand = (e.brand || '').trim();
      if (!brand) continue;
      const channel = e.category === 'Marketing/PPC' ? 'PPC' : 'SMM';
      const key = `${brand}::${channel}`;
      spendByBrandChannel.set(key, (spendByBrandChannel.get(key) || 0) + parseFloat(e.amount || 0));
    }

    // 4) Total revenue per brand for the period (gross — before any deduction).
    const payments = await PaymentHistory.find({
      status: 'Completed',
      paymentDate: { $gte: start, $lte: end },
    }).populate('clientId', 'brand').lean();
    const revenueByBrand = new Map();
    for (const p of payments) {
      const brand = (p.brand || p.clientId?.brand || '').trim();
      if (!brand) continue;
      revenueByBrand.set(brand, (revenueByBrand.get(brand) || 0) + parseFloat(p.amount || 0));
    }

    // 5) Assemble per-brand rows.
    const out = brands.map((b) => {
      const bId  = String(b._id);
      const rev  = revenueByBrand.get(b.name) || 0;
      const buildChannel = (channel) => {
        const t   = metricByBrandChannel.get(`${bId}::${channel}`) || {};
        const spend = spendByBrandChannel.get(`${b.name}::${channel}`) || 0;
        return {
          _id:          t._id || null,
          targetSpend:  Number(t.targetSpend || 0),
          targetSales:  Number(t.targetSales || 0),
          targetROI:    Number(t.targetROI   || 0),
          actualSpend:  spend,
          // actualSales + actualROI are filled below once we know both channels' spend.
          actualSales:  0,
          actualROI:    0,
        };
      };
      const ppc = buildChannel('PPC');
      const smm = buildChannel('SMM');
      const totalSpend = ppc.actualSpend + smm.actualSpend;

      // Prorate the brand's revenue across the two channels by spend share so
      // each channel has a comparable "sales" number for ROI. If neither
      // channel had spend, sales stays at 0 for both.
      if (totalSpend > 0) {
        ppc.actualSales = rev * (ppc.actualSpend / totalSpend);
        smm.actualSales = rev * (smm.actualSpend / totalSpend);
      }
      const roi = (spend, sales) => spend > 0 ? ((sales - spend) / spend) * 100 : 0;
      ppc.actualROI = roi(ppc.actualSpend, ppc.actualSales);
      smm.actualROI = roi(smm.actualSpend, smm.actualSales);

      return {
        brandId: b._id,
        name:    b.name,
        logo:    b.logo || '',
        mainColor: b.mainColor || '#0f172a',
        channels: { PPC: ppc, SMM: smm },
        totals: {
          targetSpend: ppc.targetSpend + smm.targetSpend,
          targetSales: ppc.targetSales + smm.targetSales,
          actualSpend: totalSpend,
          actualSales: rev,
          actualROI:   roi(totalSpend, rev),
        },
      };
    });

    res.json({ period: { month: m, year: y }, brands: out });
  } catch (err) {
    console.error('getMarketingReport error:', err);
    res.status(500).json({ message: 'Error building marketing report', error: err.message });
  }
};

// DELETE /api/marketing/:id
export const deleteMarketing = async (req, res) => {
  try {
    const doc = await MarketingMetric.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Metric not found' });
    res.json({ message: 'Metric deleted' });
  } catch (err) {
    console.error('deleteMarketing error:', err);
    res.status(500).json({ message: 'Error deleting metric', error: err.message });
  }
};
