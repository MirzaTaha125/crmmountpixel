import React, { useState } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme, getColors } from '../theme';
import { FaFileExcel, FaSpinner } from 'react-icons/fa';
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

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchBrandData = async (brand) => {
    let dateFilter = {};
    let dateParams = [];

    if (filterType === 'month') {
      const start = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      const end = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0, 23, 59, 59);
      dateFilter = { $gte: start, $lte: end };
      dateParams = [`month=${selectedMonth}`, `year=${selectedYear}`];
    } else if (filterType === 'date' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
      dateParams = [`startDate=${startDate}`, `endDate=${endDate}`];
    }

    // Fetch expenses
    let expensesUrl = `${API_URL}/api/expenses?brand=${encodeURIComponent(brand)}`;
    if (dateParams.length > 0) {
      expensesUrl += `&${dateParams.join('&')}`;
    }
    const expensesRes = await axios.get(expensesUrl, { headers: getAuthHeaders() });
    const expenses = expensesRes.data.expenses || [];
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

    // Fetch payments (revenue) - Completed status
    let paymentsUrl = `${API_URL}/api/payment-history?status=Completed`;
    if (dateParams.length > 0) {
      paymentsUrl += `&${dateParams.join('&')}`;
    }
    const paymentsRes = await axios.get(paymentsUrl, { headers: getAuthHeaders() });
    const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
    // Filter by brand from client
    const brandPayments = payments.filter(p => {
      const clientBrand = p.clientId?.brand || '';
      return clientBrand === brand;
    });
    const totalRevenue = brandPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Fetch chargebacks/disputes
    let disputesUrl = `${API_URL}/api/disputes?brand=${encodeURIComponent(brand)}`;
    if (dateParams.length > 0) {
      disputesUrl += `&${dateParams.join('&')}`;
    }
    const disputesRes = await axios.get(disputesUrl, { headers: getAuthHeaders() });
    const disputes = Array.isArray(disputesRes.data) ? disputesRes.data : (disputesRes.data?.disputes || []);
    const totalChargebacks = disputes.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

    // Fetch payment disputes (from payment history with status Dispute)
    let paymentDisputesUrl = `${API_URL}/api/payment-history?status=Dispute`;
    if (dateParams.length > 0) {
      paymentDisputesUrl += `&${dateParams.join('&')}`;
    }
    const paymentDisputesRes = await axios.get(paymentDisputesUrl, { headers: getAuthHeaders() });
    const paymentDisputes = Array.isArray(paymentDisputesRes.data) ? paymentDisputesRes.data : [];
    const brandPaymentDisputes = paymentDisputes.filter(p => {
      const clientBrand = p.clientId?.brand || '';
      return clientBrand === brand;
    });
    const totalPaymentDisputes = brandPaymentDisputes.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Total chargebacks (manual + payment disputes)
    const totalAllChargebacks = totalChargebacks + totalPaymentDisputes;

    // Fetch pending payments
    let pendingUrl = `${API_URL}/api/payment-history?status=Pending`;
    if (dateParams.length > 0) {
      pendingUrl += `&${dateParams.join('&')}`;
    }
    const pendingRes = await axios.get(pendingUrl, { headers: getAuthHeaders() });
    const pendingPayments = Array.isArray(pendingRes.data) ? pendingRes.data : [];
    const brandPendingPayments = pendingPayments.filter(p => {
      const clientBrand = p.clientId?.brand || '';
      return clientBrand === brand;
    });
    const totalPending = brandPendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return {
      brand,
      expenses: totalExpenses,
      revenue: totalRevenue,
      chargebacks: totalAllChargebacks,
      pending: totalPending,
      netAmount: totalRevenue - totalExpenses - totalAllChargebacks
    };
  };

  const handleExportToExcel = async () => {
    if (!filterType || (filterType === 'month' && (!selectedMonth || !selectedYear)) || 
        (filterType === 'date' && (!startDate || !endDate))) {
      alert('Please select a date range (month/year or date range)');
      return;
    }

    setExportLoading(true);

    try {
      // Fetch data for all brands
      const brandDataPromises = BRANDS.map(brand => fetchBrandData(brand));
      const allBrandData = await Promise.all(brandDataPromises);

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Create summary sheet with proper structure
      const reportTitle = filterType === 'month' 
        ? `Financial Report - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
        : `Financial Report - ${startDate} to ${endDate}`;
      
      const summaryData = [
        [reportTitle],
        [],
        ['BRAND SUMMARY'],
        [],
        ['Brand', '', 'Total Expenses', 'Total Revenue', 'Total Chargebacks', 'Total Pending', 'Net Amount'],
        [],
        ...allBrandData.map(data => [
          data.brand,
          '',
          parseFloat(data.expenses).toFixed(2),
          parseFloat(data.revenue).toFixed(2),
          parseFloat(data.chargebacks).toFixed(2),
          parseFloat(data.pending).toFixed(2),
          parseFloat(data.netAmount).toFixed(2)
        ]),
        [],
        ['TOTAL', '', 
          allBrandData.reduce((sum, d) => sum + d.expenses, 0).toFixed(2),
          allBrandData.reduce((sum, d) => sum + d.revenue, 0).toFixed(2),
          allBrandData.reduce((sum, d) => sum + d.chargebacks, 0).toFixed(2),
          allBrandData.reduce((sum, d) => sum + d.pending, 0).toFixed(2),
          allBrandData.reduce((sum, d) => sum + d.netAmount, 0).toFixed(2)
        ],
        [],
        ['Note: All amounts are in USD. Net Amount = Revenue - Expenses - Chargebacks.']
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      // Set column widths for summary
      summarySheet['!cols'] = [
        { wch: 25 }, // Brand
        { wch: 2 },  // Gap
        { wch: 18 }, // Total Expenses
        { wch: 18 }, // Total Revenue
        { wch: 18 }, // Total Chargebacks
        { wch: 18 }, // Total Pending
        { wch: 18 }  // Net Amount
      ];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Create detailed sheets for each brand
      for (const brandData of allBrandData) {
        const brand = brandData.brand;
        
        // Fetch detailed expenses
        let expensesUrl = `${API_URL}/api/expenses?brand=${encodeURIComponent(brand)}`;
        if (filterType === 'month') {
          expensesUrl += `&month=${selectedMonth}&year=${selectedYear}`;
        } else if (filterType === 'date' && startDate && endDate) {
          expensesUrl += `&startDate=${startDate}&endDate=${endDate}`;
        }
        const expensesRes = await axios.get(expensesUrl, { headers: getAuthHeaders() });
        const expenses = expensesRes.data.expenses || [];

        // Fetch detailed payments
        let paymentsUrl = `${API_URL}/api/payment-history?status=Completed`;
        if (filterType === 'month') {
          paymentsUrl += `&month=${selectedMonth}&year=${selectedYear}`;
        } else if (filterType === 'date' && startDate && endDate) {
          paymentsUrl += `&startDate=${startDate}&endDate=${endDate}`;
        }
        const paymentsRes = await axios.get(paymentsUrl, { headers: getAuthHeaders() });
        const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
        const brandPayments = payments.filter(p => {
          const clientBrand = p.clientId?.brand || '';
          return clientBrand === brand;
        });

        // Fetch detailed disputes
        let disputesUrl = `${API_URL}/api/disputes?brand=${encodeURIComponent(brand)}`;
        if (filterType === 'month') {
          disputesUrl += `&month=${selectedMonth}&year=${selectedYear}`;
        } else if (filterType === 'date' && startDate && endDate) {
          disputesUrl += `&startDate=${startDate}&endDate=${endDate}`;
        }
        const disputesRes = await axios.get(disputesUrl, { headers: getAuthHeaders() });
        const disputes = Array.isArray(disputesRes.data) ? disputesRes.data : (disputesRes.data?.disputes || []);

        // Fetch payment disputes
        let paymentDisputesUrl = `${API_URL}/api/payment-history?status=Dispute`;
        if (filterType === 'month') {
          paymentDisputesUrl += `&month=${selectedMonth}&year=${selectedYear}`;
        } else if (filterType === 'date' && startDate && endDate) {
          paymentDisputesUrl += `&startDate=${startDate}&endDate=${endDate}`;
        }
        const paymentDisputesRes = await axios.get(paymentDisputesUrl, { headers: getAuthHeaders() });
        const paymentDisputes = Array.isArray(paymentDisputesRes.data) ? paymentDisputesRes.data : [];
        const brandPaymentDisputes = paymentDisputes.filter(p => {
          const clientBrand = p.clientId?.brand || '';
          return clientBrand === brand;
        });

        // Fetch pending payments
        let pendingUrl = `${API_URL}/api/payment-history?status=Pending`;
        if (filterType === 'month') {
          pendingUrl += `&month=${selectedMonth}&year=${selectedYear}`;
        } else if (filterType === 'date' && startDate && endDate) {
          pendingUrl += `&startDate=${startDate}&endDate=${endDate}`;
        }
        const pendingRes = await axios.get(pendingUrl, { headers: getAuthHeaders() });
        const pendingPayments = Array.isArray(pendingRes.data) ? pendingRes.data : [];
        const brandPendingPayments = pendingPayments.filter(p => {
          const clientBrand = p.clientId?.brand || '';
          return clientBrand === brand;
        });

        // Create brand sheet data with proper structure and spacing
        const brandReportTitle = filterType === 'month' 
          ? `${brand} - Financial Report (${months.find(m => m.value === selectedMonth)?.label} ${selectedYear})`
          : `${brand} - Financial Report (${startDate} to ${endDate})`;
        
        const brandSheetData = [
          [brandReportTitle],
          [],
          ['SUMMARY'],
          [],
          ['Item', 'Amount (USD)'],
          ['Total Expenses', parseFloat(brandData.expenses).toFixed(2)],
          ['Total Revenue', parseFloat(brandData.revenue).toFixed(2)],
          ['Total Chargebacks', parseFloat(brandData.chargebacks).toFixed(2)],
          ['Total Pending', parseFloat(brandData.pending).toFixed(2)],
          ['Net Amount', parseFloat(brandData.netAmount).toFixed(2)],
          [],
          [],
          ['═══════════════════════════════════════════════════════════════════════════════'],
          [],
          ['EXPENSES'],
          [],
          ['Title', 'Description', 'Category', 'Amount', 'Currency', 'Payment Method', 'Date'],
          [],
          ...expenses.map(exp => [
            exp.title || '-',
            exp.description || '-',
            exp.category || '-',
            parseFloat(exp.amount || 0).toFixed(2),
            exp.currency || 'USD',
            exp.paymentMethod || '-',
            exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : '-'
          ]),
          [],
          ['TOTAL EXPENSES', '', '', parseFloat(brandData.expenses).toFixed(2), '', '', ''],
          [],
          [],
          ['═══════════════════════════════════════════════════════════════════════════════'],
          [],
          ['REVENUE (Completed Payments)'],
          [],
          ['Invoice #', 'Client', 'Amount', 'Currency', 'Payment Method', 'Date', 'Description'],
          [],
          ...brandPayments.map(p => [
            p.invoiceNumber || '-',
            p.clientId?.name || '-',
            parseFloat(p.amount || 0).toFixed(2),
            p.currency || 'USD',
            p.paymentMethod || '-',
            p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '-',
            p.description || '-'
          ]),
          [],
          ['TOTAL REVENUE', '', parseFloat(brandData.revenue).toFixed(2), '', '', '', ''],
          [],
          [],
          ['═══════════════════════════════════════════════════════════════════════════════'],
          [],
          ['CHARGEBACKS (Disputes)'],
          [],
          ['Type', 'Client', 'Amount', 'Currency', 'Status', 'Date', 'Description'],
          [],
          ...disputes.map(d => [
            d.type || '-',
            d.clientName || d.clientId?.name || '-',
            parseFloat(d.amount || 0).toFixed(2),
            d.currency || 'USD',
            d.status || '-',
            d.disputeDate ? new Date(d.disputeDate).toLocaleDateString() : '-',
            d.description || '-'
          ]),
          ...brandPaymentDisputes.map(p => [
            'Payment Dispute',
            p.clientId?.name || '-',
            parseFloat(p.amount || 0).toFixed(2),
            p.currency || 'USD',
            'Active',
            p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '-',
            p.description || '-'
          ]),
          [],
          ['TOTAL CHARGEBACKS', '', parseFloat(brandData.chargebacks).toFixed(2), '', '', '', ''],
          [],
          [],
          ['═══════════════════════════════════════════════════════════════════════════════'],
          [],
          ['PENDING PAYMENTS'],
          [],
          ['Invoice #', 'Client', 'Amount', 'Currency', 'Payment Method', 'Date', 'Description'],
          [],
          ...brandPendingPayments.map(p => [
            p.invoiceNumber || '-',
            p.clientId?.name || '-',
            parseFloat(p.amount || 0).toFixed(2),
            p.currency || 'USD',
            p.paymentMethod || '-',
            p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '-',
            p.description || '-'
          ]),
          [],
          ['TOTAL PENDING', '', parseFloat(brandData.pending).toFixed(2), '', '', '', '']
        ];

        const brandSheet = XLSX.utils.aoa_to_sheet(brandSheetData);
        // Set column widths with proper spacing
        brandSheet['!cols'] = [
          { wch: 25 }, // Title/Invoice #/Type
          { wch: 30 }, // Description/Client
          { wch: 15 }, // Category/Amount
          { wch: 12 }, // Amount/Currency
          { wch: 18 }, // Currency/Payment Method
          { wch: 15 }, // Payment Method/Status
          { wch: 12 }, // Date
          { wch: 30 }  // Description (last column)
        ];
        XLSX.utils.book_append_sheet(workbook, brandSheet, brand.substring(0, 31)); // Excel sheet name limit
      }

      // Generate filename
      let filename = 'Financial_Report';
      if (filterType === 'month') {
        filename += `_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}`;
      } else if (filterType === 'date' && startDate && endDate) {
        filename += `_${startDate}_to_${endDate}`;
      }
      filename += '.xlsx';

      // Write file
      XLSX.writeFile(workbook, filename);
      
      alert('Report exported successfully!');
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Failed to export report. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ padding: theme.spacing.xl, maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: theme.spacing.xl }}>
        <h1 style={{ 
          fontSize: theme.typography.fontSizes['2xl'], 
          fontWeight: theme.typography.fontWeights.bold, 
          color: colors.textPrimary,
          marginBottom: theme.spacing.sm
        }}>
          Financial Reports
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: theme.typography.fontSizes.base }}>
          Export comprehensive financial reports by brand with expenses, revenue, chargebacks, and pending amounts.
        </p>
      </div>

      {/* Filter Section */}
      <div style={{
        background: colors.cardBg,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.sm,
        marginBottom: theme.spacing.xl,
        border: `1px solid ${colors.borderLight}`
      }}>
        <div style={{ marginBottom: theme.spacing.md }}>
          <label style={{ 
            display: 'block', 
            marginBottom: theme.spacing.xs, 
            color: colors.textPrimary, 
            fontWeight: theme.typography.fontWeights.semibold 
          }}>
            Filter Type
          </label>
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <button
              onClick={() => setFilterType('month')}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                background: filterType === 'month' ? colors.primary : colors.accentLight,
                color: filterType === 'month' ? colors.white : colors.textPrimary,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontWeight: theme.typography.fontWeights.semibold,
                transition: `all ${theme.transitions.normal}`
              }}
            >
              Month
            </button>
            <button
              onClick={() => setFilterType('date')}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                background: filterType === 'date' ? colors.primary : colors.accentLight,
                color: filterType === 'date' ? colors.white : colors.textPrimary,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontWeight: theme.typography.fontWeights.semibold,
                transition: `all ${theme.transitions.normal}`
              }}
            >
              Date Range
            </button>
          </div>
        </div>

        {filterType === 'month' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: theme.spacing.xs, 
                color: colors.textPrimary, 
                fontWeight: theme.typography.fontWeights.semibold 
              }}>
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  color: colors.textPrimary,
                  fontSize: theme.typography.fontSizes.base
                }}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: theme.spacing.xs, 
                color: colors.textPrimary, 
                fontWeight: theme.typography.fontWeights.semibold 
              }}>
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  color: colors.textPrimary,
                  fontSize: theme.typography.fontSizes.base
                }}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: theme.spacing.xs, 
                color: colors.textPrimary, 
                fontWeight: theme.typography.fontWeights.semibold 
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  color: colors.textPrimary,
                  fontSize: theme.typography.fontSizes.base
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: theme.spacing.xs, 
                color: colors.textPrimary, 
                fontWeight: theme.typography.fontWeights.semibold 
              }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  color: colors.textPrimary,
                  fontSize: theme.typography.fontSizes.base
                }}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: theme.spacing.lg, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleExportToExcel}
            disabled={exportLoading || (filterType === 'month' && (!selectedMonth || !selectedYear)) || 
                     (filterType === 'date' && (!startDate || !endDate))}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              background: exportLoading ? colors.accentLight : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: theme.radius.md,
              fontSize: theme.typography.fontSizes.base,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: exportLoading || (filterType === 'month' && (!selectedMonth || !selectedYear)) || 
                     (filterType === 'date' && (!startDate || !endDate)) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              opacity: exportLoading || (filterType === 'month' && (!selectedMonth || !selectedYear)) || 
                      (filterType === 'date' && (!startDate || !endDate)) ? 0.6 : 1,
              transition: `all ${theme.transitions.normal}`
            }}
            onMouseEnter={(e) => {
              if (!exportLoading && !((filterType === 'month' && (!selectedMonth || !selectedYear)) || 
                  (filterType === 'date' && (!startDate || !endDate)))) {
                e.target.style.background = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (!exportLoading) {
                e.target.style.background = '#10b981';
              }
            }}
          >
            {exportLoading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaFileExcel />}
            {exportLoading ? 'Generating Report...' : 'Export to Excel'}
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div style={{
        background: colors.cardBg,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.sm,
        border: `1px solid ${colors.borderLight}`
      }}>
        <h3 style={{ 
          fontSize: theme.typography.fontSizes.lg, 
          fontWeight: theme.typography.fontWeights.semibold, 
          color: colors.textPrimary,
          marginBottom: theme.spacing.md
        }}>
          Report Information
        </h3>
        <div style={{ color: colors.textSecondary, fontSize: theme.typography.fontSizes.base, lineHeight: 1.6 }}>
          <p style={{ marginBottom: theme.spacing.sm }}>
            <strong>Summary Sheet:</strong> Overview of all brands with total expenses, revenue, chargebacks, pending amounts, and net amounts.
          </p>
          <p style={{ marginBottom: theme.spacing.sm }}>
            <strong>Brand Sheets:</strong> Detailed breakdown for each brand including:
          </p>
          <ul style={{ marginLeft: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
            <li>Summary totals</li>
            <li>Detailed expense list</li>
            <li>Completed payment list (revenue)</li>
            <li>Chargeback/dispute list</li>
            <li>Pending payment list</li>
          </ul>
          <p style={{ marginTop: theme.spacing.md, fontStyle: 'italic' }}>
            <strong>Note:</strong> Revenue is calculated from completed payments. Chargebacks include both manual disputes and payment disputes. Net Amount = Revenue - Expenses - Chargebacks.
          </p>
        </div>
      </div>
    </div>
    </>
  );
}

export default ReportsPage;

