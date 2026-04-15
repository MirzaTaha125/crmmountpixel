import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme, getColors } from '../theme';
import { FaPlus, FaEdit, FaTrash, FaDollarSign, FaChartLine, FaArrowUp, FaArrowDown, FaSpinner, FaMoneyBillWave, FaFileExcel, FaEllipsisV, FaFilter, FaCalendarAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx-js-style';

const API_URL = getApiBaseUrl();
const EXPENSE_CATEGORIES = ['Office', 'Marketing', 'Salary', 'Utilities', 'Transport', 'Other'];

function ExpensesPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'Other',
    brand: '',
    paymentMethod: '',
    expenseDate: new Date().toISOString().split('T')[0],
    currency: 'USD',
    exchangeRate: '280'
  });
  const [_formLoading, setFormLoading] = useState(false);
  const [_formError, setFormError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('month'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [summary, setSummary] = useState(null);
  const [_summaryLoading, setSummaryLoading] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryExchangeRate, setSalaryExchangeRate] = useState('280');
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState('');
  const [_successMessage, _setSuccessMessage] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('[data-menu-container]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [selectedMonth, selectedYear, filterType, startDate, endDate, selectedBrand]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_URL}/api/expenses?`;
      const params = [];
      if (filterType === 'month') {
        params.push(`month=${selectedMonth}`, `year=${selectedYear}`);
      } else if (filterType === 'date' && startDate && endDate) {
        params.push(`startDate=${startDate}`, `endDate=${endDate}`);
      }
      if (selectedBrand) params.push(`brand=${encodeURIComponent(selectedBrand)}`);
      
      if (params.length > 0) url += params.join('&');
      else url = `${API_URL}/api/expenses`;
      
      const res = await axios.get(url, { headers: getAuthHeaders() });
      setExpenses(res.data.expenses || []);
    } catch {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      let url = `${API_URL}/api/expenses/summary?`;
      const params = [];
      if (filterType === 'month') {
        params.push(`month=${selectedMonth}`, `year=${selectedYear}`);
      } else if (filterType === 'date' && startDate && endDate) {
        params.push(`startDate=${startDate}`, `endDate=${endDate}`);
      } else {
        setSummaryLoading(false);
        return;
      }
      if (selectedBrand) params.push(`brand=${encodeURIComponent(selectedBrand)}`);
      url += params.join('&');
      const res = await axios.get(url, { headers: getAuthHeaders() });
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingExpense(null);
    setForm({
      title: '',
      description: '',
      amount: '',
      category: 'Other',
      brand: '',
      paymentMethod: '',
      expenseDate: new Date().toISOString().split('T')[0],
      currency: 'USD',
      exchangeRate: '280'
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setForm({
      title: expense.title,
      description: expense.description || '',
      amount: expense.originalAmount || expense.amount,
      category: expense.category,
      brand: expense.brand || '',
      paymentMethod: expense.paymentMethod || '',
      expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      currency: expense.originalCurrency || expense.currency || 'USD',
      exchangeRate: expense.exchangeRate ? expense.exchangeRate.toString() : '280'
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      if (!form.title || !form.amount || !form.category) {
        setFormError('Required fields missing');
        setFormLoading(false);
        return;
      }
      if (editingExpense) {
        await axios.put(`${API_URL}/api/expenses/${editingExpense._id}`, form, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_URL}/api/expenses`, form, { headers: getAuthHeaders() });
      }
      setModalOpen(false);
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`${API_URL}/api/expenses/${id}`, { headers: getAuthHeaders() });
      fetchExpenses();
      fetchSummary();
    } catch {
      alert('Delete failed');
    }
  };

  const handleExportToExcel = async () => {
    if (expenses.length === 0) return alert('Nothing to export');
    try {
      let paymentUrl = `${API_URL}/api/payment-history?status=Completed&`;
      if (filterType === 'month') {
        paymentUrl += `month=${selectedMonth}&year=${selectedYear}`;
      } else if (filterType === 'date' && startDate && endDate) {
        paymentUrl += `startDate=${startDate}&endDate=${endDate}`;
      }
      const paymentRes = await axios.get(paymentUrl, { headers: getAuthHeaders() });
      let paidPayments = paymentRes.data || [];
      if (selectedBrand) {
        paidPayments = paidPayments.filter(p => (p.brand || p.clientId?.brand) === selectedBrand);
      }

      const expensesData = expenses.map(e => ({
        'Type': 'EXPENSE',
        'Date': new Date(e.expenseDate).toLocaleDateString(),
        'Subject': e.title,
        'Category': e.category,
        'Amount (USD)': -parseFloat(e.amount).toFixed(2),
        'Original': `${e.originalAmount || e.amount} ${e.originalCurrency || 'USD'}`
      }));

      const paymentsData = paidPayments.map(p => ({
        'Type': 'REVENUE',
        'Date': new Date(p.paymentDate).toLocaleDateString(),
        'Subject': p.clientId?.name || '-',
        'Category': 'Services',
        'Amount (USD)': (parseFloat(p.amount) - parseFloat(p.taxFee || 0)).toFixed(2),
        'Original': `${p.amount} ${p.currency || 'USD'}`
      }));

      const combined = [...expensesData, ...paymentsData].sort((a,b) => new Date(a.Date) - new Date(b.Date));
      const ws = XLSX.utils.json_to_sheet(combined);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
      XLSX.writeFile(wb, `Ledger_${new Date().getTime()}.xlsx`);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleDeductSalary = async (e) => {
    e.preventDefault();
    setSalaryLoading(true);
    setSalaryError('');
    try {
      const salaryRes = await axios.get(`${API_URL}/api/salaries?month=${selectedMonth}&year=${selectedYear}`, { headers: getAuthHeaders() });
      const salaries = salaryRes.data.salaries || [];
      if (salaries.length === 0) throw new Error('No salary data for month');
      const totalPKR = salaries.reduce((s, sal) => s + (parseFloat(sal.salaryAmount) || 0), 0);
      const exRate = parseFloat(salaryExchangeRate) || 280;

      if (isNaN(totalPKR) || totalPKR <= 0) {
        throw new Error('Calculated payroll total is invalid or zero');
      }

      const expenseData = {
        title: 'Payroll Deduction',
        description: `Automated payroll for ${selectedMonth}/${selectedYear}`,
        amount: totalPKR,
        category: 'Salary',
        brand: '', // Explicitly set to empty for global expense
        currency: 'PKR',
        originalAmount: totalPKR,
        originalCurrency: 'PKR',
        exchangeRate: exRate,
        expenseDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      };
      await axios.post(`${API_URL}/api/expenses`, expenseData, { headers: getAuthHeaders() });
      setSalaryModalOpen(false);
      fetchExpenses();
      fetchSummary();
    } catch (err) {
       setSalaryError(err.response?.data?.message || err.message || 'Payroll sync failed');
    } finally {
      setSalaryLoading(false);
    }
  };

  const months = [
    { value: 1, label: 'JANUARY' }, { value: 2, label: 'FEBRUARY' }, { value: 3, label: 'MARCH' },
    { value: 4, label: 'APRIL' }, { value: 5, label: 'MAY' }, { value: 6, label: 'JUNE' },
    { value: 7, label: 'JULY' }, { value: 8, label: 'AUGUST' }, { value: 9, label: 'SEPTEMBER' },
    { value: 10, label: 'OCTOBER' }, { value: 11, label: 'NOVEMBER' }, { value: 12, label: 'DECEMBER' }
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div style={{ width: '100%', fontFamily: 'inherit' }}>
      {/* HEADER ROW */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        background: colors.white,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm,
        flexWrap: 'wrap',
        gap: theme.spacing.md
      }} className="expenses-header">
        <style>{`
          @media (max-width: 600px) {
            .expenses-header {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .expenses-header > div:last-child {
              width: 100% !important;
              flex-direction: column !important;
              gap: ${theme.spacing.sm} !important;
            }
            .expenses-header button {
              width: 100% !important;
              justify-content: center !important;
            }
            .expenses-control-grid {
              flex-direction: column !important;
            }
          }
        `}</style>
        <div>
          <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Financial Disbursement Ledger
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            Corporate Expense Tracking & Payroll Deductions
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
          <button onClick={() => setSalaryModalOpen(true)} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: '#10b981', color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}><FaMoneyBillWave /> Salary Sync</button>
          <button onClick={handleExportToExcel} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: '#059669', color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}><FaFileExcel /> Export XLS</button>
          <button onClick={handleAdd} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}><FaPlus /> New Expense</button>
        </div>
      </div>

      {/* QUICK STATS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1px',
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        boxShadow: theme.shadows.sm,
        background: colors.border,
        marginBottom: theme.spacing.md
      }}>
        <div style={{ padding: theme.spacing.md, background: colors.tableHeaderBg }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Monthly Outflow</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.error }}>${summary?.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: colors.textTertiary, marginTop: '2px' }}>DEBITED FROM OPERATIONAL FUNDS</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Revenue (Gross)</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: '#10b981' }}>${summary?.totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: colors.textTertiary, marginTop: '2px' }}>AFTER PLATFORM FEE DEDUCTIONS</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Net Yield</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: summary?.isProfit ? '#10b981' : colors.error }}>
            {summary?.isProfit ? '+' : '-'}${Math.abs(summary?.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: colors.textTertiary, marginTop: '2px' }}>OPERATIONAL PERFORMANCE INDEX</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Break Even</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary }}>${summary?.breakEvenAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: colors.textTertiary, marginTop: '2px' }}>TARGET FOR RETAINED EARNINGS</div>
        </div>
      </div>

      {/* CONTROL GRID */}
      <div style={{ 
        background: colors.white, 
        padding: theme.spacing.lg, 
        marginBottom: theme.spacing.lg,
        borderRadius: theme.radius.md,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: theme.spacing.md }} className="expenses-control-grid">
          <div style={{ display: 'flex', gap: '2px' }}>
            <button onClick={() => setFilterType('month')} style={{ flex: 1, padding: '8px', background: filterType === 'month' ? colors.sidebarBg : colors.white, color: filterType === 'month' ? colors.white : colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: `${theme.radius.sm} 0 0 ${theme.radius.sm}`, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', outline: 'none' }}>Month</button>
            <button onClick={() => setFilterType('date')} style={{ flex: 1, padding: '8px', background: filterType === 'date' ? colors.sidebarBg : colors.white, color: filterType === 'date' ? colors.white : colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: `0 ${theme.radius.sm} ${theme.radius.sm} 0`, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', outline: 'none' }}>Range</button>
          </div>
          {filterType === 'month' ? (
            <>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>{months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
            </>
          ) : (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} />
            </>
          )}
          <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
            <option value="">ALL BRANDS</option><option value="Webdevelopers Inc">Webdevelopers Inc</option><option value="American Design Eagle">American Design Eagle</option><option value="Mount Pixels">Mount Pixels</option>
          </select>
        </div>
      </div>

      {/* DATA GRID */}
      <div style={{ 
        background: colors.white, 
        borderRadius: theme.radius.lg, 
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.md,
        overflow: 'hidden' 
      }}>
        <div style={{ 
          overflowX: 'auto', 
          WebkitOverflowScrolling: 'touch',
          borderRadius: `${theme.radius.lg} ${theme.radius.lg} 0 0` 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: colors.tableHeaderBg }}>
              <tr>
                {['Transaction Date', 'Subject / Payee', 'Category', 'Original Value', 'Debit (USD)', 'Control'].map((h, idx) => (
                  <th key={idx} style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    textAlign: 'left',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: colors.textPrimary,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    borderBottom: `2px solid ${colors.border}`,
                    borderRight: idx < 5 ? `1px solid ${colors.border}` : 'none'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>Scanning financial records...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No disbursements indexed for current selection.</td></tr>
              ) : expenses.map((expense, idx) => (
                <tr key={expense._id} style={{ 
                  borderBottom: `1px solid ${colors.borderLight}`, 
                  background: colors.white // Uniform row color
                }}>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary }}>{new Date(expense.expenseDate).toLocaleDateString()}</td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary, textTransform: 'uppercase' }}>{expense.title}</div>
                    <div style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold', textTransform: 'uppercase' }}>BRAND: {expense.brand || 'GLOBAL'}</div>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <span style={{ padding: '3px 7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.full, fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: colors.textSecondary }}>{expense.category}</span>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: '10px', color: colors.textTertiary }}>
                    {expense.originalCurrency || 'USD'} {parseFloat(expense.originalAmount || expense.amount).toLocaleString()}
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.error }}>
                    -${parseFloat(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, position: 'relative' }}>
                    <div style={{ position: 'relative' }} data-menu-container>
                      <button 
                        className="action-menu-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === expense._id ? null : expense._id);
                        }}
                        style={{ background: 'none', border: 'none', color: colors.textTertiary, cursor: 'pointer', padding: '5px' }}
                      >
                        <FaEllipsisV />
                      </button>
                      
                      {openMenuId === expense._id && (
                        <div style={{
                          position: 'absolute',
                          right: '100%',
                          top: idx > expenses.length - 3 ? 'auto' : '0',
                          bottom: idx > expenses.length - 3 ? '0' : 'auto',
                          background: colors.white,
                          border: `1px solid ${colors.border}`,
                          borderRadius: theme.radius.md,
                          boxShadow: theme.shadows.lg,
                          zIndex: 100,
                          minWidth: '120px',
                          overflow: 'hidden'
                        }}>
                          <button onClick={() => handleEdit(expense)} style={{ width: '100%', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: colors.textPrimary, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', hover: { background: colors.primaryBg } }} onMouseEnter={(e) => e.target.style.background = colors.primaryBg} onMouseLeave={(e) => e.target.style.background = 'none'}>
                            <FaEdit style={{ color: colors.textSecondary }} /> EDIT
                          </button>
                          <button onClick={() => handleDelete(expense._id)} style={{ width: '100%', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: colors.error, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', hover: { background: colors.primaryBg } }} onMouseEnter={(e) => e.target.style.background = colors.primaryBg} onMouseLeave={(e) => e.target.style.background = 'none'}>
                            <FaTrash /> DELETE
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW EXPENSE MODAL */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: theme.spacing.md }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: '95%', maxWidth: 500, boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 20px`, color: colors.textPrimary, fontWeight: theme.typography.fontWeights.bold, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0` }}>
              {editingExpense ? 'EXPENSE: AUTHORIZE UPDATE' : 'EXPENSE: LOG NEW DISBURSEMENT'}
            </div>
            <form onSubmit={handleSubmit} style={{ padding: theme.spacing.xl }}>
              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Transaction Title</label>
                <input name="title" value={form.title} onChange={handleFormChange} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Nominal Amount</label>
                  <input type="number" name="amount" value={form.amount} onChange={handleFormChange} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Currency Index</label>
                  <select name="currency" value={form.currency} onChange={handleFormChange} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }}><option value="USD">USD - United States Dollar</option><option value="PKR">PKR - Pakistan Rupee</option></select>
                </div>
              </div>
              {form.currency === 'PKR' && (
                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Exchange Parity (PKR/$)</label>
                  <input type="number" name="exchangeRate" value={form.exchangeRate} onChange={handleFormChange} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Classification</label>
                  <select name="category" value={form.category} onChange={handleFormChange} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Ledger Brand</label>
                  <select name="brand" value={form.brand} onChange={handleFormChange} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }}><option value="">-- NO BRAND --</option><option value="Webdevelopers Inc">Webdevelopers Inc</option><option value="American Design Eagle">American Design Eagle</option><option value="Mount Pixels">Mount Pixels</option></select>
                </div>
              </div>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Transaction Timestamp</label>
                <input type="date" name="expenseDate" value={form.expenseDate} onChange={handleFormChange} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.sm }}>Commit Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY SYNC MODAL */}
      {salaryModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: theme.spacing.md }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: '95%', maxWidth: 400, boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 20px`, color: colors.textPrimary, fontWeight: theme.typography.fontWeights.bold, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0` }}>
              PAYROLL: EXECUTE SYNC / DEDUCTION
            </div>
            <form onSubmit={handleDeductSalary} style={{ padding: theme.spacing.xl }}>
              <p style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: theme.spacing.md }}>Executing payroll deduction will scan current month salary registry and create a consolidated expense entry in the ledger.</p>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Conversion Rate (PKR/$)</label>
                <input type="number" value={salaryExchangeRate} onChange={(e) => setSalaryExchangeRate(e.target.value)} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }} />
              </div>
              {salaryError && <div style={{ color: colors.error, fontSize: '10px', fontWeight: 'bold', marginBottom: theme.spacing.md }}>{salaryError}</div>}
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSalaryModalOpen(false)} style={{ padding: '8px 16px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' }}>Abort</button>
                <button type="submit" disabled={salaryLoading} style={{ padding: '8px 16px', background: '#10b981', color: colors.white, border: 'none', borderRadius: theme.radius.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.sm }}>{salaryLoading ? 'Syncing...' : 'Execute Sync'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensesPage;
