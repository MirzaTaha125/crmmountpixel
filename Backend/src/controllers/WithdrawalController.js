import Withdrawal from '../model/Withdrawal.js';

// Common date-filter parser — matches the Accounting page's month/year filter
// so a "current period" query is trivial from the frontend.
function buildDateFilter({ month, year, startDate, endDate }) {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end   = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }
  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }
  return null;   // no filter — return all
}

// GET /api/withdrawals
// Query: month, year, startDate, endDate (all optional). No filter = all rows.
export const listWithdrawals = async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const filter = dateFilter ? { date: dateFilter } : {};
    const rows = await Withdrawal.find(filter)
      .sort({ date: -1 })
      .populate('createdBy', 'First_Name Last_Name Email')
      .lean();
    const totalUSD = rows.reduce((s, r) => s + (r.amount || 0), 0);
    const totalPKR = rows.reduce((s, r) => s + (r.amountPKR || 0), 0);
    res.json({ withdrawals: rows, totalUSD, totalPKR });
  } catch (err) {
    console.error('listWithdrawals error:', err);
    res.status(500).json({ message: 'Error listing withdrawals', error: err.message });
  }
};

// POST /api/withdrawals
export const createWithdrawal = async (req, res) => {
  try {
    const { amount, exchangeRate, amountPKR, date, fromAccount, toAccount, method, notes } = req.body || {};
    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: 'amount is required' });
    }
    const usd = parseFloat(amount);
    if (isNaN(usd) || usd < 0) return res.status(400).json({ message: 'amount must be a positive number' });

    const rate = exchangeRate != null && exchangeRate !== '' ? parseFloat(exchangeRate) : null;
    // If a rate is given but PKR isn't, auto-compute it for convenience.
    const pkr  = amountPKR != null && amountPKR !== '' ? parseFloat(amountPKR)
                : (rate ? usd * rate : null);

    const doc = await Withdrawal.create({
      amount: usd,
      exchangeRate: rate,
      amountPKR: pkr,
      date: date ? new Date(date) : new Date(),
      fromAccount: (fromAccount || '').trim(),
      toAccount:   (toAccount   || '').trim(),
      method:      method || 'Wire',
      notes:       (notes || '').trim(),
      createdBy:   req.user?._id || null,
    });
    res.status(201).json({ withdrawal: doc });
  } catch (err) {
    console.error('createWithdrawal error:', err);
    res.status(500).json({ message: 'Error creating withdrawal', error: err.message });
  }
};

// PUT /api/withdrawals/:id
export const updateWithdrawal = async (req, res) => {
  try {
    const doc = await Withdrawal.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Withdrawal not found' });

    const { amount, exchangeRate, amountPKR, date, fromAccount, toAccount, method, notes } = req.body || {};
    if (amount !== undefined) {
      const usd = parseFloat(amount);
      if (isNaN(usd) || usd < 0) return res.status(400).json({ message: 'amount must be a positive number' });
      doc.amount = usd;
    }
    if (exchangeRate !== undefined) doc.exchangeRate = exchangeRate === '' || exchangeRate === null ? null : parseFloat(exchangeRate);
    if (amountPKR    !== undefined) doc.amountPKR    = amountPKR    === '' || amountPKR    === null ? null : parseFloat(amountPKR);
    // Auto-compute PKR if the admin gave rate but no explicit PKR.
    if ((amountPKR === undefined || amountPKR === null || amountPKR === '') && doc.exchangeRate) {
      doc.amountPKR = doc.amount * doc.exchangeRate;
    }
    if (date        !== undefined) doc.date        = new Date(date);
    if (fromAccount !== undefined) doc.fromAccount = String(fromAccount).trim();
    if (toAccount   !== undefined) doc.toAccount   = String(toAccount).trim();
    if (method      !== undefined) doc.method      = method;
    if (notes       !== undefined) doc.notes       = String(notes).trim();
    await doc.save();
    res.json({ withdrawal: doc });
  } catch (err) {
    console.error('updateWithdrawal error:', err);
    res.status(500).json({ message: 'Error updating withdrawal', error: err.message });
  }
};

// DELETE /api/withdrawals/:id
export const deleteWithdrawal = async (req, res) => {
  try {
    const doc = await Withdrawal.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Withdrawal not found' });
    res.json({ message: 'Withdrawal deleted' });
  } catch (err) {
    console.error('deleteWithdrawal error:', err);
    res.status(500).json({ message: 'Error deleting withdrawal', error: err.message });
  }
};
