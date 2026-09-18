import Brand from '../model/Brand.js';
import PaymentHistory from '../model/PaymentHistory.js';
import Expense from '../model/Expense.js';
import Shareholder from '../model/Shareholder.js';
import HoldInUS from '../model/HoldInUS.js';

// Default charity rate — can be overridden per wizard run.
const DEFAULT_CHARITY_PERCENT = 5;

// Classify a raw PaymentHistory.paymentMethod string into the three accounting
// buckets. Anything that isn't PayPal / Stripe is "manual" (Cheque, Wire, etc.).
function providerBucket(method) {
  const m = String(method || '').toLowerCase();
  if (m === 'paypal') return 'paypal';
  if (m === 'stripe') return 'stripe';
  return 'manual';
}

// Parse ?brands= into a normalized array. Missing/empty → null (all brands).
function parseBrandsQuery(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const list = s.split(',').map((v) => v.trim()).filter(Boolean);
  return list.length ? [...new Set(list)] : null;
}

// Build the Mongo date filter. Defaults to current month if nothing sent.
function buildDateFilter({ month, year, startDate, endDate }) {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end   = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }
  const m = month ? parseInt(month, 10) : (new Date().getMonth() + 1);
  const y = year  ? parseInt(year, 10)  : new Date().getFullYear();
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 0, 23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

// ─────────────────────────────────────────────────────────────────────────
// Core computation. Pure function — no req/res. Shared between GET (default
// settings from DB) and POST (wizard overrides).
// ─────────────────────────────────────────────────────────────────────────
async function computeLedger({ month, year, startDate, endDate, brandsQuery, overrides = {} }) {
  const dateFilter      = buildDateFilter({ month, year, startDate, endDate });
  const requestedBrands = parseBrandsQuery(brandsQuery);

  // 1) Brand catalog.
  const allBrandsDocs = await Brand.find().select('_id name logo mainColor').lean();
  const allBrandNames = allBrandsDocs.map((b) => b.name);
  const totalBrandCount = allBrandsDocs.length;

  const selectedBrandNames = requestedBrands
    ? requestedBrands.filter((n) => allBrandNames.includes(n))
    : allBrandNames;

  // 2) All completed payments in the period — single query.
  const payments = await PaymentHistory.find({
    status: 'Completed',
    paymentDate: dateFilter,
  })
    .populate('clientId', 'name email brand')
    .sort({ paymentDate: -1 })
    .lean();
  const paymentBrand = (p) => (p.brand || p.clientId?.brand || '').trim();

  // 3) All expenses in the period — single query.
  const expenses = await Expense.find({ expenseDate: dateFilter }).lean();
  const expenseBrand = (e) => (e.brand || '').trim();

  // 4) Office expenses = unattached expenses.
  const officeExpenseItems = expenses.filter((e) => !expenseBrand(e));
  const officeExpenseTotal = officeExpenseItems.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const officeSharePerBrand = totalBrandCount > 0 ? officeExpenseTotal / totalBrandCount : 0;

  // 5) Per-brand rows (only SELECTED brands).
  const rows = [];
  for (const brand of allBrandsDocs) {
    if (!selectedBrandNames.includes(brand.name)) continue;

    const brandPayments = payments.filter((p) => paymentBrand(p) === brand.name);
    let paypal = 0, stripe = 0, manual = 0;
    const invoices = [];
    for (const p of brandPayments) {
      const amount = parseFloat(p.amount || 0);
      const bucket = providerBucket(p.paymentMethod);
      if      (bucket === 'paypal') paypal += amount;
      else if (bucket === 'stripe') stripe += amount;
      else                          manual += amount;
      invoices.push({
        _id:           p._id,
        invoiceNumber: p.invoiceNumber || null,
        clientName:    p.clientId?.name || p.description || '—',
        provider:      bucket,
        method:        p.paymentMethod || '',
        amount,
        paymentDate:   p.paymentDate,
        description:   p.description || '',
      });
    }
    const revenueTotal = paypal + stripe + manual;

    const brandExpenses = expenses.filter((e) => expenseBrand(e) === brand.name);
    const expensesTotal = brandExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    const byCategoryMap = new Map();
    const expenseItems = [];
    for (const e of brandExpenses) {
      const cat = e.category || 'Uncategorized';
      byCategoryMap.set(cat, (byCategoryMap.get(cat) || 0) + parseFloat(e.amount || 0));
      expenseItems.push({
        _id:          e._id,
        category:     cat,
        description:  e.description || '',
        amount:       parseFloat(e.amount || 0),
        expenseDate:  e.expenseDate,
      });
    }
    const byCategory = [...byCategoryMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    rows.push({
      brandId:  brand._id,
      name:     brand.name,
      logo:     brand.logo || '',
      mainColor: brand.mainColor || '#6366f1',
      revenue: { total: revenueTotal, paypal, stripe, manual, invoices },
      expenses: { total: expensesTotal, byCategory, items: expenseItems },
      balance: revenueTotal - expensesTotal,
    });
  }

  // 6) Totals across selected.
  const totalRevenue  = rows.reduce((s, r) => s + r.revenue.total,  0);
  const totalPaypal   = rows.reduce((s, r) => s + r.revenue.paypal, 0);
  const totalStripe   = rows.reduce((s, r) => s + r.revenue.stripe, 0);
  const totalManual   = rows.reduce((s, r) => s + r.revenue.manual, 0);
  const totalExpenses = rows.reduce((s, r) => s + r.expenses.total, 0);
  const combinedBalance = totalRevenue - totalExpenses;

  for (const r of rows) {
    r.contributionPercent = totalRevenue > 0
      ? Math.round((r.revenue.total / totalRevenue) * 100)
      : 0;
  }

  // ── OFFICE ALLOCATION ─────────────────────────────────────────────────
  // Two modes:
  //   'equal'  — each SELECTED brand pays its 1/N share of the office total.
  //              (Non-selected brands' shares are excluded from the view.)
  //   'manual' — admin provides per-brand amounts (overrides.officeAllocations).
  //              Any brand not listed gets 0.
  const officeMethod = overrides.officeMethod || 'equal';
  const officeAllocMap = new Map(
    (overrides.officeAllocations || []).map((a) => [String(a.brandId), parseFloat(a.amount) || 0])
  );
  for (const r of rows) {
    if (officeMethod === 'manual') {
      r.officeShare = officeAllocMap.get(String(r.brandId)) || 0;
    } else {
      r.officeShare = officeSharePerBrand;
    }
  }
  const officeShareForSelection = rows.reduce((s, r) => s + r.officeShare, 0);

  // ── HOLD IN US ────────────────────────────────────────────────────────
  // 'equal' — split overrides.holdTotal across selected brands.
  // 'manual' — per-brand from overrides.holdAllocations.
  // Neither provided → fall back to HoldInUS rows in the DB for this period.
  const holdMonth = month ? parseInt(month, 10) : (new Date().getMonth() + 1);
  const holdYear  = year  ? parseInt(year, 10)  : new Date().getFullYear();

  let holdSource = null; // 'overrides' | 'db'
  if (overrides.holdMethod === 'equal') {
    holdSource = 'overrides';
    const total = parseFloat(overrides.holdTotal) || 0;
    const per   = rows.length > 0 ? total / rows.length : 0;
    for (const r of rows) r.holdInUS = per;
  } else if (overrides.holdMethod === 'manual') {
    holdSource = 'overrides';
    const map = new Map((overrides.holdAllocations || []).map((a) => [String(a.brandId), parseFloat(a.amount) || 0]));
    for (const r of rows) r.holdInUS = map.get(String(r.brandId)) || 0;
  } else {
    // Fall back to persisted HoldInUS rows for the month.
    holdSource = 'db';
    const brandIdsAll = allBrandsDocs.map((b) => b._id);
    const holdRows = brandIdsAll.length
      ? await HoldInUS.find({ brandId: { $in: brandIdsAll }, month: holdMonth, year: holdYear }).lean()
      : [];
    const holdByBrand = new Map(holdRows.map((h) => [String(h.brandId), h]));
    for (const r of rows) {
      const hold = holdByBrand.get(String(r.brandId));
      r.holdInUS       = hold ? (hold.amount || 0) : 0;
      r.holdInUSId     = hold ? hold._id : null;
      r.holdInUSReason = hold ? (hold.reason || '') : '';
    }
  }

  // ── Per-brand gross / net revenue ─────────────────────────────────────
  for (const r of rows) {
    r.grossRevenue = r.balance - r.officeShare;
    r.netRevenue   = r.grossRevenue - r.holdInUS;
  }

  const holdInUSForSelection = rows.reduce((s, r) => s + r.holdInUS, 0);
  const postOffice           = combinedBalance - officeShareForSelection;
  const totalNetRevenue      = postOffice - holdInUSForSelection;
  const charityPercent       = overrides.charityPercent != null
    ? parseFloat(overrides.charityPercent) || 0
    : DEFAULT_CHARITY_PERCENT;
  const charityAmount = Math.max(0, totalNetRevenue * (charityPercent / 100));
  const netProfit     = totalNetRevenue - charityAmount;

  // ── Per-brand net-profit share (proportional by net revenue) ─────────
  const totalPositiveNetRev = rows.reduce((s, r) => s + Math.max(0, r.netRevenue), 0);
  for (const r of rows) {
    const weight = totalPositiveNetRev > 0 ? Math.max(0, r.netRevenue) / totalPositiveNetRev : 0;
    r.brandNetProfitShare = netProfit * weight;
  }

  // ── Shareholders ─────────────────────────────────────────────────────
  const brandIds = rows.map((r) => r.brandId);
  const shareholderRows = brandIds.length
    ? await Shareholder.find({ brandId: { $in: brandIds }, active: true })
        .select('brandId name email percentage')
        .lean()
    : [];
  const shByBrand = new Map();
  for (const sh of shareholderRows) {
    const key = String(sh.brandId);
    if (!shByBrand.has(key)) shByBrand.set(key, []);
    shByBrand.get(key).push(sh);
  }
  for (const r of rows) {
    const list = shByBrand.get(String(r.brandId)) || [];
    const totalPct = list.reduce((s, x) => s + (x.percentage || 0), 0);
    r.shareholders = list.map((x) => ({
      _id: x._id, name: x.name, email: x.email || '',
      percentage: x.percentage,
      amount: r.brandNetProfitShare * ((x.percentage || 0) / 100),
    }));
    r.shareholderPercentTotal = totalPct;
    r.shareholderUnallocated  = r.brandNetProfitShare * ((100 - Math.min(100, totalPct)) / 100);
  }

  return {
    period: {
      month: month ? parseInt(month, 10) : (new Date().getMonth() + 1),
      year:  year  ? parseInt(year, 10)  : new Date().getFullYear(),
      startDate: startDate || null,
      endDate:   endDate   || null,
    },
    allBrands:          allBrandNames,
    selectedBrands:     selectedBrandNames,
    totalBrandCount,
    selectedBrandCount: rows.length,

    rows,

    totals: {
      revenue: { total: totalRevenue, paypal: totalPaypal, stripe: totalStripe, manual: totalManual },
      expenses: { total: totalExpenses },
      balance: combinedBalance,
      officeSharePerBrand,
      officeShare: officeShareForSelection,
      officeBreakdown: officeExpenseItems.map((e) => ({
        _id:         e._id,
        category:    e.category || 'Uncategorized',
        description: e.description || '',
        amount:      parseFloat(e.amount || 0),
        expenseDate: e.expenseDate,
      })),
      officeTotalAllBrands: officeExpenseTotal,
      postOffice,
      holdInUS: holdInUSForSelection,
      totalNetRevenue,
      charityPercent,
      charityAmount,
      netProfit,
    },

    meta: {
      generatedAt: new Date().toISOString(),
      charityPercent,
      holdSource,
      officeMethod,
      holdMethod: overrides.holdMethod || null,
    },
  };
}

// GET /api/accounting/ledger — default settings (used by the standalone page).
export const getAccountingLedger = async (req, res) => {
  try {
    const { month, year, startDate, endDate, brands: brandsQuery } = req.query;
    const ledger = await computeLedger({ month, year, startDate, endDate, brandsQuery });
    res.json(ledger);
  } catch (err) {
    console.error('getAccountingLedger error:', err);
    res.status(500).json({ message: 'Error building accounting ledger', error: err.message });
  }
};

// POST /api/accounting/ledger/compute — wizard version that accepts allocation
// overrides in the body (no DB writes). Used to preview totals live as the
// admin fills in office / hold allocations.
export const computeAccountingLedger = async (req, res) => {
  try {
    const { month, year, brands: brandsQuery,
      officeMethod, officeAllocations,
      holdMethod, holdTotal, holdAllocations,
      charityPercent,
    } = req.body || {};
    const ledger = await computeLedger({
      month, year, brandsQuery,
      overrides: {
        officeMethod, officeAllocations,
        holdMethod, holdTotal, holdAllocations,
        charityPercent,
      },
    });
    res.json(ledger);
  } catch (err) {
    console.error('computeAccountingLedger error:', err);
    res.status(500).json({ message: 'Error building accounting ledger', error: err.message });
  }
};
