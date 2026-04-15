import { useState } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme, getColors } from '../theme';
import { FaFileExcel, FaSpinner, FaChartBar, FaSync, FaExclamationTriangle, FaFilter, FaCalendarAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const API_URL = getApiBaseUrl();
const BRANDS = ['Webdevelopers Inc', 'American Design Eagle', 'Mount Pixels'];

function ReportsPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const months = [
    { value: 1, label: 'JANUARY' }, { value: 2, label: 'FEBRUARY' }, { value: 3, label: 'MARCH' },
    { value: 4, label: 'APRIL' }, { value: 5, label: 'MAY' }, { value: 6, label: 'JUNE' },
    { value: 7, label: 'JULY' }, { value: 8, label: 'AUGUST' }, { value: 9, label: 'SEPTEMBER' },
    { value: 10, label: 'OCTOBER' }, { value: 11, label: 'NOVEMBER' }, { value: 12, label: 'DECEMBER' }
  ];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchBrandData = async (brand) => {
    let dateParams = [];
    if (filterType === 'month') dateParams = [`month=${selectedMonth}`, `year=${selectedYear}`];
    else if (filterType === 'date' && startDate && endDate) dateParams = [`startDate=${startDate}`, `endDate=${endDate}`];

    let expensesUrl = `${API_URL}/api/expenses?brand=${encodeURIComponent(brand)}`;
    if (dateParams.length > 0) expensesUrl += `&${dateParams.join('&')}`;
    const expensesRes = await axios.get(expensesUrl, { headers: getAuthHeaders() });
    const expenses = expensesRes.data.expenses || [];
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

    let paymentsUrl = `${API_URL}/api/payment-history?status=Completed`;
    if (dateParams.length > 0) paymentsUrl += `&${dateParams.join('&')}`;
    const paymentsRes = await axios.get(paymentsUrl, { headers: getAuthHeaders() });
    const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
    const brandPayments = payments.filter(p => (p.clientId?.brand || '') === brand);
    const totalGrossRevenue = brandPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalFees = brandPayments.reduce((sum, p) => sum + parseFloat(p.taxFee || 0), 0);
    const totalRevenue = totalGrossRevenue - totalFees;

    let disputesUrl = `${API_URL}/api/disputes?brand=${encodeURIComponent(brand)}`;
    if (dateParams.length > 0) disputesUrl += `&${dateParams.join('&')}`;
    const disputesRes = await axios.get(disputesUrl, { headers: getAuthHeaders() });
    const disputes = Array.isArray(disputesRes.data) ? disputesRes.data : (disputesRes.data?.disputes || []);
    const totalChargebacks = disputes.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

    let paymentDisputesUrl = `${API_URL}/api/payment-history?status=Dispute`;
    if (dateParams.length > 0) paymentDisputesUrl += `&${dateParams.join('&')}`;
    const paymentDisputesRes = await axios.get(paymentDisputesUrl, { headers: getAuthHeaders() });
    const paymentDisputes = Array.isArray(paymentDisputesRes.data) ? paymentDisputesRes.data : [];
    const brandPaymentDisputes = paymentDisputes.filter(p => (p.clientId?.brand || '') === brand);
    const totalPaymentDisputes = brandPaymentDisputes.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalAllChargebacks = totalChargebacks + totalPaymentDisputes;

    let pendingUrl = `${API_URL}/api/payment-history?status=Pending`;
    if (dateParams.length > 0) pendingUrl += `&${dateParams.join('&')}`;
    const pendingRes = await axios.get(pendingUrl, { headers: getAuthHeaders() });
    const pendingPayments = Array.isArray(pendingRes.data) ? pendingRes.data : [];
    const brandPendingPayments = pendingPayments.filter(p => (p.clientId?.brand || '') === brand);
    const totalPending = brandPendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return {
      brand,
      expenses: totalExpenses,
      grossRevenue: totalGrossRevenue,
      fees: totalFees,
      revenue: totalRevenue,
      chargebacks: totalAllChargebacks,
      pending: totalPending,
      netAmount: totalRevenue - totalExpenses - totalAllChargebacks,
    };
  };

  const handleGenerateReport = async () => {
    if (filterType === 'date' && (!startDate || !endDate)) return alert('Select date range');
    setReportLoading(true);
    try {
      const all = await Promise.all(BRANDS.map(b => fetchBrandData(b)));
      setReportData(all);
    } catch {
      alert('Failed to sync financial data');
    } finally { setReportLoading(false); }
  };

  const handleExportToExcel = async () => {
    if (!reportData) return alert('Generate report first');
    setExportLoading(true);
    try {
      const workbook = XLSX.utils.book_new();
      const _reportTitle = filterType === 'month' ? `Financial report ${selectedMonth}/${selectedYear}` : `Financial report ${startDate} to ${endDate}`;
      const summaryData = [['BRAND', 'GROSS REVENUE', 'PAYPAL FEES', 'NET REVENUE', 'EXPENSES', 'CHARGEBACKS', 'PENDING', 'NET YIELD'], ...reportData.map(d => [d.brand, d.grossRevenue, d.fees, d.revenue, d.expenses, d.chargebacks, d.pending, d.netAmount])];
      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Summary');
      XLSX.writeFile(workbook, `Financial_Analytics_${new Date().getTime()}.xlsx`);
    } catch { alert('Export failed'); } finally { setExportLoading(false); }
  };

  const fmt = (n) => `$${parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

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
      }}>
        <div>
          <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Financial Analytics & Intelligence
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            Consolidated Revenue, Expenditure & Brand Performance Audit
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <button onClick={handleExportToExcel} disabled={!reportData || exportLoading} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: '#059669', color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}>
            <FaFileExcel /> Export Ledger
          </button>
          <button onClick={handleGenerateReport} disabled={reportLoading} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}>
            {reportLoading ? <FaSpinner className="animate-spin" /> : <FaSync />} Generate Matrix
          </button>
        </div>
      </div>

      {/* QUICK STATS ROW (VISIBLE AFTER GENERATION) */}
      {reportData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1px',
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
          boxShadow: theme.shadows.sm,
          border: `1px solid ${colors.border}`,
          marginBottom: theme.spacing.lg,
          background: colors.border
        }}>
          {[
            { label: 'Consolidated Gross', val: reportData.reduce((s,d)=>s+d.grossRevenue,0), color: colors.textPrimary, bg: colors.tableHeaderBg },
            { label: 'Operational Outflow', val: reportData.reduce((s,d)=>s+d.expenses,0), color: colors.error, bg: colors.white },
            { label: 'Disputed Capital', val: reportData.reduce((s,d)=>s+d.chargebacks,0), color: '#f59e0b', bg: colors.white },
            { label: 'Net Group Yield', val: reportData.reduce((s,d)=>s+d.netAmount,0), color: '#10b981', bg: colors.white }
          ].map((s, idx) => (
            <div key={idx} style={{ padding: theme.spacing.md, background: s.bg }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: s.color }}>{fmt(s.val)}</div>
            </div>
          ))}
        </div>
      )}

      {/* CONTROL GRID */}
      <div style={{ 
        background: colors.white, 
        padding: theme.spacing.lg, 
        marginBottom: theme.spacing.lg,
        borderRadius: theme.radius.md,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: theme.spacing.md }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button onClick={() => setFilterType('month')} style={{ flex: 1, padding: '8px', background: filterType === 'month' ? colors.sidebarBg : colors.white, color: filterType === 'month' ? colors.white : colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: `${theme.radius.sm} 0 0 ${theme.radius.sm}`, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', outline: 'none' }}>Month</button>
            <button onClick={() => setFilterType('date')} style={{ flex: 1, padding: '8px', background: filterType === 'date' ? colors.sidebarBg : colors.white, color: filterType === 'date' ? colors.white : colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: `0 ${theme.radius.sm} ${theme.radius.sm} 0`, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', outline: 'none' }}>Range</button>
          </div>
          {filterType === 'month' ? (
            <>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '11px', background: colors.white, outline: 'none' }}>{months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '11px', background: colors.white, outline: 'none' }}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
            </>
          ) : (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '11px', background: colors.white, outline: 'none' }} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '11px', background: colors.white, outline: 'none' }} />
            </>
          )}
        </div>
      </div>

      {/* DATA GRID (LIVE SUMMARY) */}
      {reportData ? (
        <div style={{ 
          background: colors.white, 
          borderRadius: theme.radius.lg, 
          border: `1px solid ${colors.borderLight}`,
          boxShadow: theme.shadows.md,
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: colors.tableHeaderBg }}>
                <tr>
                  {['Brand Identity', 'Gross REV', 'PLatf. Fees', 'Net REV', 'Expenses', 'Disputes', 'Pending', 'Net Yield'].map((h, idx) => (
                    <th key={idx} style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                      textAlign: idx === 0 ? 'left' : 'right',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      color: colors.textPrimary,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: `2px solid ${colors.border}`,
                      borderRight: idx < 7 ? `1px solid ${colors.border}` : 'none'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((d, idx) => (
                  <tr key={idx} style={{ 
                    borderBottom: `1px solid ${colors.borderLight}`, 
                    background: colors.white // Uniform white background
                  }}>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{d.brand}</td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px' }}>{fmt(d.grossRevenue)}</td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', color: colors.error }}>-{fmt(d.fees)}</td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: '#10b981' }}>{fmt(d.revenue)}</td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', color: colors.error }}>{fmt(d.expenses)}</td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', color: '#f59e0b' }}>{fmt(d.chargebacks)}</td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', color: colors.textTertiary }}>{fmt(d.pending)}</td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', fontWeight: '800', color: d.netAmount >= 0 ? '#10b981' : colors.error }}>{fmt(d.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: colors.tableHeaderBg, borderTop: `2px solid ${colors.border}` }}>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: '10px', fontWeight: '900' }}>TOTALS (GROUP)</td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', fontWeight: '900' }}>{fmt(reportData.reduce((s,d)=>s+d.grossRevenue,0))}</td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', fontWeight: '900', color: colors.error }}>-{fmt(reportData.reduce((s,d)=>s+d.fees,0))}</td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#10b981' }}>{fmt(reportData.reduce((s,d)=>s+d.revenue,0))}</td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', fontWeight: '900', color: colors.error }}>{fmt(reportData.reduce((s,d)=>s+d.expenses,0))}</td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#f59e0b' }}>{fmt(reportData.reduce((s,d)=>s+d.chargebacks,0))}</td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', fontWeight: '900' }}>{fmt(reportData.reduce((s,d)=>s+d.pending,0))}</td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right', fontSize: '11px', fontWeight: '900', color: reportData.reduce((s,d)=>s+d.netAmount,0) >= 0 ? '#10b981' : colors.error }}>{fmt(reportData.reduce((s,d)=>s+d.netAmount,0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ padding: '80px', textAlign: 'center', background: colors.white, borderRadius: theme.radius.lg, border: `1px solid ${colors.borderLight}`, boxShadow: theme.shadows.sm }}>
          <FaChartBar style={{ fontSize: '48px', color: colors.border, marginBottom: '20px' }} />
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase' }}>Analytical engine ready. Select parameters and generate matrix.</div>
        </div>
      )}

      {/* INFO FOOTER */}
      <div style={{ 
        padding: theme.spacing.xl, 
        background: colors.white, 
        borderRadius: theme.radius.lg, 
        border: `1px solid ${colors.borderLight}`, 
        boxShadow: theme.shadows.sm,
        marginTop: theme.spacing.xl 
      }}>
        <h4 style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', color: colors.textPrimary }}>Logical Report Parameters</h4>
        <div style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: '1.8' }}>
          • <strong>NET REVENUE:</strong> Gross yield minus payment processor (PayPal) fees.<br />
          • <strong>DISPUTES:</strong> Includes active chargebacks and manual dispute entries.<br />
          • <strong>NET YIELD:</strong> Final retained capital after deducting expenses and disputed funds.<br />
          • <strong>AUDIT TRAIL:</strong> Exported XLS files contain row-level transaction data for all brand vectors.
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
