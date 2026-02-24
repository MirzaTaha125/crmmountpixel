import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme, getColors } from '../theme';
import { FaPlus, FaEdit, FaTrash, FaDollarSign, FaChartLine, FaArrowUp, FaArrowDown, FaSpinner, FaTimes, FaMoneyBillWave, FaFileExcel, FaEllipsisV } from 'react-icons/fa';
import * as XLSX from 'xlsx-js-style';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

const API_URL = getApiBaseUrl();

const EXPENSE_CATEGORIES = ['Office', 'Marketing', 'Salary', 'Utilities', 'Transport', 'Other'];

function ExpensesPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('month'); // 'month' or 'date'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryExchangeRate, setSalaryExchangeRate] = useState('280');
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close menu when clicking outside
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
      
      if (selectedBrand) {
        params.push(`brand=${encodeURIComponent(selectedBrand)}`);
      }
      
      if (params.length > 0) {
        url += params.join('&');
      } else {
        // If no filters, fetch all
        url = `${API_URL}/api/expenses`;
      }
      
      const res = await axios.get(url, {
        headers: getAuthHeaders()
      });
      setExpenses(res.data.expenses || []);
    } catch (err) {
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
        // If date filter is selected but dates not set, don't fetch summary
        setSummaryLoading(false);
        return;
      }
      
      if (selectedBrand) {
        params.push(`brand=${encodeURIComponent(selectedBrand)}`);
      }
      
      url += params.join('&');
      
      const res = await axios.get(url, {
        headers: getAuthHeaders()
      });
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
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      // Reset exchange rate to default when switching to PKR, or clear when switching to USD
      if (name === 'currency') {
        if (value === 'PKR') {
          updated.exchangeRate = '280';
        } else {
          updated.exchangeRate = '280'; // Keep default but won't be used
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (!form.title || !form.amount || !form.category) {
        setFormError('Please fill in all required fields');
        setFormLoading(false);
        return;
      }

      if (form.currency === 'PKR' && (!form.exchangeRate || parseFloat(form.exchangeRate) <= 0)) {
        setFormError('Please enter a valid exchange rate for PKR');
        setFormLoading(false);
        return;
      }

      if (editingExpense) {
        await axios.put(`${API_URL}/api/expenses/${editingExpense._id}`, form, {
          headers: getAuthHeaders()
        });
      } else {
        await axios.post(`${API_URL}/api/expenses`, form, {
          headers: getAuthHeaders()
        });
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
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      await axios.delete(`${API_URL}/api/expenses/${id}`, {
        headers: getAuthHeaders()
      });
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  const handleExportToExcel = async () => {
    if (expenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    try {
      // Fetch completed payments from PaymentHistory (same as dashboard summary)
      let paymentUrl = `${API_URL}/api/payment-history?`;
      const params = [];

      // Add status filter for completed payments
      params.push('status=Completed');
      
      if (filterType === 'month') {
        params.push(`month=${selectedMonth}`, `year=${selectedYear}`);
      } else if (filterType === 'date' && startDate && endDate) {
        params.push(`startDate=${startDate}`, `endDate=${endDate}`);
      }
      
      if (selectedBrand) {
        params.push(`brand=${encodeURIComponent(selectedBrand)}`);
      }
      
      paymentUrl += params.join('&');

      const paymentRes = await axios.get(paymentUrl, {
        headers: getAuthHeaders()
        });
        
      // PaymentHistory already returns completed payments filtered by paymentDate
      let paidPayments = paymentRes.data || [];
      
      // Apply brand filter on frontend if needed (since PaymentHistory route doesn't support brand filter)
      if (selectedBrand && paidPayments.length > 0) {
        paidPayments = paidPayments.filter(payment => {
          const paymentBrand = payment.brand || payment.clientId?.brand || '';
          return paymentBrand === selectedBrand;
        });
      }

      // Prepare expenses data
      const expensesData = expenses.map(expense => ({
        'Type': 'Expense',
        'Date': expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
        'Title/Client': expense.title,
        'Description': expense.description || '',
        'Category': expense.category,
        'Brand': expense.brand || '-',
        'Payment Method': expense.paymentMethod || '-',
        'Invoice Number': '-', // Expenses don't have invoice numbers
        'Amount (USD)': -parseFloat(expense.amount || 0).toFixed(2), // Negative for expenses
        'Original Amount': expense.originalAmount ? parseFloat(expense.originalAmount).toFixed(2) : parseFloat(expense.amount || 0).toFixed(2),
        'Original Currency': expense.originalCurrency || expense.currency || 'USD',
        'Exchange Rate': expense.exchangeRate ? parseFloat(expense.exchangeRate).toFixed(2) : '-',
        'Created At': expense.createdAt ? new Date(expense.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
      }));

      // Prepare paid payments data (from PaymentHistory)
      const paymentsData = paidPayments.map(payment => {
        // PaymentHistory has clientId populated, get client name
        // Handle both populated object and ID string cases
        let clientName = '-';
        if (payment.clientId) {
          if (typeof payment.clientId === 'object' && payment.clientId.name) {
            clientName = payment.clientId.name;
          } else if (typeof payment.clientId === 'string') {
            // If clientId is not populated, we can't get the name here
            clientName = '-';
          }
        }
        
        const clientBrand = payment.brand || (payment.clientId && typeof payment.clientId === 'object' ? payment.clientId.brand : '') || '-';
        
        // Calculate amount after taxes (amount - taxFee)
        const amountAfterTax = parseFloat(payment.amount || 0) - parseFloat(payment.taxFee || 0);
        
        return {
          'Type': 'Payment',
          'Date': payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
          'Title/Client': clientName,
          'Description': payment.description || '-',
          'Category': '-',
          'Brand': clientBrand,
          'Payment Method': payment.paymentMethod || '-',
          'Invoice Number': payment.invoiceNumber || '-',
          'Amount (USD)': amountAfterTax.toFixed(2), // Amount after taxes
          'Original Amount': parseFloat(payment.amount || 0).toFixed(2),
          'Original Currency': payment.currency || 'USD',
          'Exchange Rate': '-',
          'Created At': payment.createdAt ? new Date(payment.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
        };
      });

      // Combine and sort by date
      const allData = [...expensesData, ...paymentsData].sort((a, b) => {
        const dateA = new Date(a.Date);
        const dateB = new Date(b.Date);
        return dateA - dateB;
      });

      // Calculate totals
      const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      // Calculate payments after taxes (amount - taxFee)
      const totalPayments = paidPayments.reduce((sum, pay) => {
        const amount = parseFloat(pay.amount || 0);
        const taxFee = parseFloat(pay.taxFee || 0);
        return sum + (amount - taxFee);
      }, 0);
      const netAmount = totalPayments - totalExpenses;

      // Add summary rows
      const summaryRows = [
        {
          'Type': '',
        'Date': '',
          'Title/Client': '',
        'Description': '',
        'Category': '',
        'Brand': '',
        'Payment Method': '',
          'Invoice Number': '',
          'Amount (USD)': '',
        'Original Amount': '',
        'Original Currency': '',
        'Exchange Rate': '',
        'Created At': ''
        },
        {
          'Type': 'SUMMARY',
          'Date': '',
          'Title/Client': 'Total Expenses',
          'Description': '',
          'Category': '',
          'Brand': '',
          'Payment Method': '',
        'Invoice Number': '',
          'Amount (USD)': `-${totalExpenses.toFixed(2)}`,
          'Original Amount': '',
          'Original Currency': '',
          'Exchange Rate': '',
          'Created At': ''
        },
        {
          'Type': 'SUMMARY',
          'Date': '',
          'Title/Client': 'Total Payments (Paid)',
          'Description': '',
          'Category': '',
        'Brand': '',
        'Payment Method': '',
          'Invoice Number': '',
          'Amount (USD)': totalPayments.toFixed(2),
          'Original Amount': '',
          'Original Currency': '',
          'Exchange Rate': '',
          'Created At': ''
        },
        {
          'Type': 'SUMMARY',
          'Date': '',
          'Title/Client': 'NET AMOUNT',
          'Description': '',
          'Category': '',
          'Brand': '',
          'Payment Method': '',
          'Invoice Number': '',
          'Amount (USD)': netAmount.toFixed(2),
          'Original Amount': '',
          'Original Currency': '',
          'Exchange Rate': '',
          'Created At': ''
        }
      ];

      const worksheetData = [...allData, ...summaryRows];

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Auto-size columns
      const maxWidth = 50;
      const colWidths = [];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Find the Type column index
      const headers = Object.keys(worksheetData[0] || {});
      const typeColumnIndex = headers.indexOf('Type');
      
      // First pass: calculate column widths
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLength = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellLength = cell.v.toString().length;
            if (cellLength > maxLength) maxLength = cellLength;
          }
        }
        colWidths.push({ wch: Math.min(maxLength + 2, maxWidth) });
      }
      worksheet['!cols'] = colWidths;

      // Second pass: Apply background colors to entire rows
      if (typeColumnIndex >= 0) {
        // Define color styles (works with xlsx-js-style library)
        const redFill = { fgColor: { rgb: "FFFFE5E5" } }; // Light red for expenses
        const greenFill = { fgColor: { rgb: "FFE5F5E5" } }; // Light green for payments
        const grayFill = { fgColor: { rgb: "FFF0F0F0" } }; // Light gray for summary
        
        for (let R = range.s.r + 1; R <= range.e.r; ++R) { // Start from row 1 (skip header)
          const typeCellAddress = XLSX.utils.encode_cell({ r: R, c: typeColumnIndex });
          const typeCell = worksheet[typeCellAddress];
          
          if (typeCell && typeCell.v) {
            const cellType = typeCell.v.toString();
            let fillStyle = null;
            
            if (cellType === 'Expense') {
              fillStyle = redFill;
            } else if (cellType === 'Payment') {
              fillStyle = greenFill;
            } else if (cellType === 'SUMMARY') {
              fillStyle = grayFill;
            }
            
            // Apply color to all cells in this row
            if (fillStyle) {
              for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = worksheet[cellAddress];
                if (cell) {
                  if (!cell.s) cell.s = {};
                  cell.s.fill = fillStyle;
                } else {
                  // Create empty cell with style
                  worksheet[cellAddress] = { v: '', t: 's', s: { fill: fillStyle } };
                }
              }
            }
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

      // Generate filename with filter info if applicable
      let fileName = `expenses_and_payments_${new Date().toISOString().split('T')[0]}`;
      if (filterType === 'month') {
        fileName += `_${selectedMonth}_${selectedYear}`;
      } else if (filterType === 'date' && startDate && endDate) {
        fileName += `_${startDate}_to_${endDate}`;
      }
      if (selectedBrand) {
        fileName += `_${selectedBrand.replace(/\s+/g, '_')}`;
      }
      fileName += '.xlsx';
      
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  const handleDeductSalary = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSalaryLoading(true);
    setSalaryError('');
    setSuccessMessage('');

    try {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const month = selectedMonth;
      const year = selectedYear;

      console.log('Deducting salary for:', month, year);

      // Fetch salaries for the selected month
      const salaryRes = await axios.get(`${API_URL}/api/salaries?month=${month}&year=${year}`, {
        headers: getAuthHeaders()
      });

      const salaries = salaryRes.data.salaries || [];
      console.log('Fetched salaries:', salaries);

      if (salaries.length === 0) {
        setSalaryError('No salaries found for the selected month');
        setSalaryLoading(false);
        return;
      }

      // Calculate total PKR amount
      const totalPKRAmount = salaries.reduce((sum, salary) => {
        const amount = parseFloat(salary.amount) || 0;
        return sum + amount;
      }, 0);

      console.log('Total PKR amount:', totalPKRAmount);

      if (totalPKRAmount === 0) {
        setSalaryError('Total salary amount is zero');
        setSalaryLoading(false);
        return;
      }

      // Convert to USD using exchange rate
      const exchangeRate = parseFloat(salaryExchangeRate) || 280;
      const totalUSDAmount = totalPKRAmount / exchangeRate;

      console.log('Exchange rate:', exchangeRate);
      console.log('Total USD amount:', totalUSDAmount);

      // Create expense entry
      const expenseData = {
        title: 'Salary',
        description: `Salary deduction for ${months[month - 1]} ${year} (${salaries.length} employee${salaries.length > 1 ? 's' : ''})`,
        amount: totalUSDAmount,
        category: 'Salary',
        currency: 'PKR',
        originalAmount: totalPKRAmount,
        originalCurrency: 'PKR',
        exchangeRate: exchangeRate,
        expenseDate: `${year}-${String(month).padStart(2, '0')}-01`
      };

      console.log('Creating expense with data:', expenseData);

      const expenseRes = await axios.post(`${API_URL}/api/expenses`, expenseData, {
        headers: getAuthHeaders()
      });

      console.log('Expense created:', expenseRes.data);

      if (!expenseRes.data || !expenseRes.data._id) {
        throw new Error('Expense was not created successfully');
      }

      setSuccessMessage(`Salary deducted successfully! Total: PKR ${totalPKRAmount.toLocaleString()} (USD ${totalUSDAmount.toFixed(2)})`);
      setSalaryModalOpen(false);
      setSalaryExchangeRate('280');
      
      // Refresh expenses list
      fetchExpenses();
      fetchSummary();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error deducting salary:', err);
      setSalaryError(err.response?.data?.message || err.message || 'Failed to deduct salary');
    } finally {
      setSalaryLoading(false);
    }
  };

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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div style={{ width: '100%', fontFamily: theme.typography.fontFamily }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        flexWrap: 'wrap',
        gap: theme.spacing.md,
      }}>
        <div>
          <h2 style={{
            fontSize: theme.typography.fontSizes['3xl'],
            fontWeight: theme.typography.fontWeights.bold,
            color: colors.textPrimary,
            margin: 0,
            marginBottom: theme.spacing.xs,
          }}>
            Expenses
          </h2>
          <p style={{
            fontSize: theme.typography.fontSizes.base,
            color: colors.textSecondary,
            margin: 0,
          }}>
            Track and manage your business expenses
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center' }}>
          <button
            onClick={() => setSalaryModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              background: colors.accent || '#10b981',
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.base,
              cursor: 'pointer',
              boxShadow: theme.shadows.sm,
              transition: `all ${theme.transitions.normal}`,
            }}
          >
            <FaMoneyBillWave />
            + Salary
          </button>
          <button
            onClick={handleExportToExcel}
            disabled={expenses.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              background: expenses.length === 0 ? colors.border : '#059669',
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.base,
              cursor: expenses.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: theme.shadows.sm,
              transition: `all ${theme.transitions.normal}`,
              opacity: expenses.length === 0 ? 0.6 : 1,
            }}
          >
            <FaFileExcel />
            Export to Excel
          </button>
          <button
            onClick={handleAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              background: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.base,
              cursor: 'pointer',
              boxShadow: theme.shadows.sm,
              transition: `all ${theme.transitions.normal}`,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = colors.primaryDark;
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = theme.shadows.md;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = colors.primary;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = theme.shadows.sm;
            }}
          >
            <FaPlus />
            Add Expense
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div style={{
        background: colors.white,
        borderRadius: theme.radius.lg,
        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
        marginBottom: theme.spacing.xl,
        border: `1px solid ${colors.border}`,
        boxShadow: theme.shadows.xs,
      }}>
        <div style={{
          display: 'flex',
          gap: theme.spacing.lg,
          alignItems: 'center',
          flexWrap: 'wrap',
          width: '100%',
        }}>
          {/* Filter Type Buttons */}
          <div style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center' }}>
            <label style={{
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              color: colors.textSecondary,
              whiteSpace: 'nowrap',
              marginRight: theme.spacing.xs,
            }}>
              Filter:
            </label>
            <button
              onClick={() => {
                setFilterType('month');
                setStartDate('');
                setEndDate('');
              }}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.sm,
                background: filterType === 'month' ? colors.primary : colors.white,
                color: filterType === 'month' ? colors.white : colors.textPrimary,
                cursor: 'pointer',
                fontWeight: theme.typography.fontWeights.medium,
                transition: theme.transitions.default,
                whiteSpace: 'nowrap',
              }}
            >
              Month
            </button>
            <button
              onClick={() => {
                setFilterType('date');
                setSelectedMonth(new Date().getMonth() + 1);
                setSelectedYear(new Date().getFullYear());
              }}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.sm,
                background: filterType === 'date' ? colors.primary : colors.white,
                color: filterType === 'date' ? colors.white : colors.textPrimary,
                cursor: 'pointer',
                fontWeight: theme.typography.fontWeights.medium,
                transition: theme.transitions.default,
                whiteSpace: 'nowrap',
              }}
            >
              Date Range
            </button>
          </div>

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '32px',
            background: colors.border,
            margin: `0 ${theme.spacing.xs}`,
          }} />

          {/* Month/Year or Date Range */}
          {filterType === 'month' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                <label style={{
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textSecondary,
                  whiteSpace: 'nowrap',
                }}>
                  Month:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.sm,
                    background: colors.white,
                    cursor: 'pointer',
                    minWidth: '120px',
                  }}
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                <label style={{
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textSecondary,
                  whiteSpace: 'nowrap',
                }}>
                  Year:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.sm,
                    background: colors.white,
                    cursor: 'pointer',
                    minWidth: '100px',
                  }}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                <label style={{
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textSecondary,
                  whiteSpace: 'nowrap',
                }}>
                  Start:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.sm,
                    background: colors.white,
                    cursor: 'pointer',
                    minWidth: '140px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                <label style={{
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textSecondary,
                  whiteSpace: 'nowrap',
                }}>
                  End:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.sm,
                    background: colors.white,
                    cursor: 'pointer',
                    minWidth: '140px',
                  }}
                />
              </div>
            </>
          )}

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '32px',
            background: colors.border,
            margin: `0 ${theme.spacing.xs}`,
          }} />

          {/* Brand Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
            <label style={{
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              color: colors.textSecondary,
              whiteSpace: 'nowrap',
            }}>
              Brand:
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.sm,
                background: colors.white,
                cursor: 'pointer',
                minWidth: '180px',
              }}
            >
              <option value="">All Brands</option>
              <option value="Webdevelopers Inc">Webdevelopers Inc</option>
              <option value="American Design Eagle">American Design Eagle</option>
              <option value="Mount Pixels">Mount Pixels</option>
            </select>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      {summaryLoading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
          background: colors.white,
          borderRadius: theme.radius.lg,
          border: `1px solid ${colors.border}`,
        }}>
          <FaSpinner style={{
            animation: 'spin 1s linear infinite',
            fontSize: '1.5rem',
            marginRight: theme.spacing.md,
            color: colors.primary,
          }} />
          <span style={{ color: colors.textSecondary }}>Loading summary...</span>
        </div>
      ) : summary ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}>
          <div style={{
            background: colors.errorLight,
            padding: theme.spacing.xl,
            borderRadius: theme.radius.lg,
            border: `1px solid ${colors.error}30`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}>
              <FaDollarSign style={{ fontSize: '24px', color: colors.error }} />
              <div style={{
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.semibold,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Total Expenses
              </div>
            </div>
            <div style={{
              fontSize: theme.typography.fontSizes['3xl'],
              fontWeight: theme.typography.fontWeights.bold,
              color: colors.error,
            }}>
              ${summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{
            background: colors.successLight,
            padding: theme.spacing.xl,
            borderRadius: theme.radius.lg,
            border: `1px solid ${colors.success}30`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}>
              <FaChartLine style={{ fontSize: '24px', color: colors.success }} />
              <div style={{
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.semibold,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Payments Received
              </div>
            </div>
            <div style={{
              fontSize: theme.typography.fontSizes['3xl'],
              fontWeight: theme.typography.fontWeights.bold,
              color: colors.success,
            }}>
              ${summary.totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{
            background: summary.isProfit ? colors.successLight : colors.warningLight,
            padding: theme.spacing.xl,
            borderRadius: theme.radius.lg,
            border: `1px solid ${summary.isProfit ? colors.success : colors.warning}30`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}>
              {summary.isProfit ? (
                <FaArrowUp style={{ fontSize: '24px', color: colors.success }} />
              ) : (
                <FaArrowDown style={{ fontSize: '24px', color: '#000000' }} />
              )}
              <div style={{
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.semibold,
                color: summary.isProfit ? colors.textSecondary : '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {summary.isProfit ? 'Profit' : 'Loss'}
              </div>
            </div>
            <div style={{
              fontSize: theme.typography.fontSizes['3xl'],
              fontWeight: theme.typography.fontWeights.bold,
              color: summary.isProfit ? colors.success : '#000000',
            }}>
              ${Math.abs(summary.profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {summary.breakEvenAmount > 0 && (
            <div style={{
              background: colors.infoLight,
              padding: theme.spacing.xl,
              borderRadius: theme.radius.lg,
              border: `1px solid ${colors.info}30`,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.sm,
              }}>
                <FaDollarSign style={{ fontSize: '24px', color: colors.info }} />
                <div style={{
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Need to Earn
                </div>
              </div>
              <div style={{
                fontSize: theme.typography.fontSizes['3xl'],
                fontWeight: theme.typography.fontWeights.bold,
                color: colors.info,
              }}>
                ${summary.breakEvenAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{
                fontSize: theme.typography.fontSizes.xs,
                color: colors.textSecondary,
                marginTop: theme.spacing.xs,
              }}>
                To break even or make profit
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: theme.spacing.md,
          background: colors.errorLight,
          color: colors.error,
          borderRadius: theme.radius.md,
          marginBottom: theme.spacing.lg,
          fontSize: theme.typography.fontSizes.sm,
        }}>
          {error}
        </div>
      )}

      {/* Expenses Table */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing['3xl'],
          color: colors.textSecondary,
        }}>
          <FaSpinner style={{
            animation: 'spin 1s linear infinite',
            fontSize: '2rem',
            marginRight: theme.spacing.md,
          }} />
          Loading expenses...
        </div>
      ) : expenses.length === 0 ? (
        <div style={{
          padding: theme.spacing['3xl'],
          textAlign: 'center',
          color: colors.textSecondary,
        }}>
          <FaDollarSign style={{ fontSize: '48px', marginBottom: theme.spacing.md, opacity: 0.5 }} />
          <p style={{ fontSize: theme.typography.fontSizes.lg, margin: 0 }}>
            No expenses found for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </p>
        </div>
      ) : (
        <div style={{
          background: colors.white,
          borderRadius: theme.radius.xl,
          border: `1px solid ${colors.borderLight}`,
          overflow: 'hidden',
          boxShadow: theme.shadows.sm,
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead style={{
                background: colors.primaryBg,
                borderBottom: `1px solid ${colors.border}`,
              }}>
                <tr>
                  {['Date', 'Title', 'Description', 'Category', 'Brand', 'Payment Method', 'Amount', 'Actions'].map(header => (
                    <th key={header} style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontWeight: theme.typography.fontWeights.semibold,
                      fontSize: theme.typography.fontSizes.sm,
                      color: colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr
                    key={expense._id}
                    style={{
                      borderBottom: `1px solid ${colors.borderLight}`,
                      transition: `background ${theme.transitions.fast}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : '-'}
                    </td>
                    <td style={{
                      padding: theme.spacing.md,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: colors.textPrimary,
                    }}>
                      {expense.title}
                    </td>
                    <td style={{
                      padding: theme.spacing.md,
                      color: colors.textSecondary,
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {expense.description || '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                        borderRadius: theme.radius.full,
                        fontSize: theme.typography.fontSizes.xs,
                        fontWeight: theme.typography.fontWeights.medium,
                        background: colors.primaryBg,
                        color: colors.primary,
                      }}>
                        {expense.category}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {expense.brand || '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {expense.paymentMethod || '-'}
                    </td>
                    <td style={{
                      padding: theme.spacing.md,
                      fontWeight: theme.typography.fontWeights.bold,
                      color: colors.error,
                    }}>
                      ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: theme.spacing.md, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ position: 'relative', display: 'inline-block' }} data-menu-container>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === expense._id ? null : expense._id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: theme.radius.sm,
                            fontSize: '18px',
                            color: colors.textPrimary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.primaryBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FaEllipsisV />
                        </button>
                        {openMenuId === expense._id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              background: colors.white,
                              border: `1px solid ${colors.border}`,
                              borderRadius: theme.radius.md,
                              boxShadow: theme.shadows.md,
                              zIndex: 1000,
                              minWidth: '150px',
                              marginTop: '4px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(expense);
                                setOpenMenuId(null);
                              }}
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.sm,
                                color: colors.textPrimary,
                                borderBottom: `1px solid ${colors.borderLight}`,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.primaryBg;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <FaEdit style={{ fontSize: '14px' }} />
                              <span>Edit</span>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(expense._id);
                                setOpenMenuId(null);
                              }}
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.sm,
                                color: colors.error,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.errorLight;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <FaTrash style={{ fontSize: '14px' }} />
                              <span>Delete</span>
                            </div>
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
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Title"
            name="title"
            value={form.title}
            onChange={handleFormChange}
            required
            placeholder="Enter expense title"
          />
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              color: colors.textPrimary,
            }}>
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleFormChange}
              placeholder="Enter expense description (optional)"
              rows={3}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                fontFamily: theme.typography.fontFamily,
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.semibold,
                color: colors.textPrimary,
              }}>
                Amount <span style={{ color: colors.error }}>*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleFormChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: theme.typography.fontSizes.base,
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.semibold,
                color: colors.textPrimary,
              }}>
                Currency <span style={{ color: colors.error }}>*</span>
              </label>
              <select
                name="currency"
                value={form.currency}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: theme.typography.fontSizes.base,
                  cursor: 'pointer',
                }}
              >
                <option value="USD">USD</option>
                <option value="PKR">PKR</option>
              </select>
            </div>
          </div>
          {form.currency === 'PKR' && (
            <div style={{ marginBottom: theme.spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.semibold,
                color: colors.textPrimary,
              }}>
                PKR Exchange Rate <span style={{ color: colors.error }}>*</span>
              </label>
              <input
                type="number"
                name="exchangeRate"
                value={form.exchangeRate}
                onChange={handleFormChange}
                required
                min="0.01"
                step="0.01"
                placeholder="280"
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: theme.typography.fontSizes.base,
                }}
              />
              <p style={{
                margin: `${theme.spacing.xs} 0 0 0`,
                fontSize: theme.typography.fontSizes.xs,
                color: colors.textSecondary,
                fontStyle: 'italic'
              }}>
                PKR amount per 1 USD (e.g., 280 means 280 PKR = 1 USD)
              </p>
            </div>
          )}
          {form.currency === 'PKR' && form.amount && form.exchangeRate && (
            <div style={{
              padding: theme.spacing.md,
              background: colors.primaryBg,
              borderRadius: theme.radius.md,
              marginBottom: theme.spacing.lg,
              border: `1px solid ${colors.primary}`,
            }}>
              <p style={{
                margin: 0,
                fontSize: theme.typography.fontSizes.sm,
                color: colors.textPrimary,
                fontWeight: theme.typography.fontWeights.medium,
              }}>
                <strong>Conversion:</strong> {parseFloat(form.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR = ${((parseFloat(form.amount) / parseFloat(form.exchangeRate))).toFixed(2)} USD
                <span style={{ fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary, marginLeft: theme.spacing.xs }}>
                  (Rate: {form.exchangeRate} PKR = 1 USD)
                </span>
              </p>
            </div>
          )}
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              color: colors.textPrimary,
            }}>
              Category <span style={{ color: colors.error }}>*</span>
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleFormChange}
              required
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                cursor: 'pointer',
              }}
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              color: colors.textPrimary,
            }}>
              Brand
            </label>
            <select
              name="brand"
              value={form.brand}
              onChange={handleFormChange}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                cursor: 'pointer',
              }}
            >
              <option value="">Select Brand</option>
              <option value="Webdevelopers Inc">Webdevelopers Inc</option>
              <option value="American Design Eagle">American Design Eagle</option>
              <option value="Mount Pixels">Mount Pixels</option>
            </select>
          </div>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              color: colors.textPrimary,
            }}>
              Payment Method
            </label>
            <select
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleFormChange}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                cursor: 'pointer',
              }}
            >
              <option value="">Select Payment Method</option>
              <option value="PayPal">PayPal</option>
              <option value="Zelle">Zelle</option>
              <option value="Bank">PK Bank</option>
              <option value="Bank">US Bank</option>

            </select>
          </div>
          <Input
            label="Date"
            name="expenseDate"
            type="date"
            value={form.expenseDate}
            onChange={handleFormChange}
            required
          />
          {formError && (
            <div style={{
              padding: theme.spacing.md,
              background: colors.errorLight,
              color: colors.error,
              borderRadius: theme.radius.md,
              marginBottom: theme.spacing.lg,
              fontSize: theme.typography.fontSizes.sm,
            }}>
              {formError}
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: theme.spacing.md,
            marginTop: theme.spacing.xl,
          }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={formLoading}
            >
              {formLoading ? (
                <>
                  <FaSpinner style={{ animation: 'spin 1s linear infinite', marginRight: theme.spacing.xs }} />
                  Saving...
                </>
              ) : (
                editingExpense ? 'Update Expense' : 'Add Expense'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Salary Deduction Modal */}
      <Modal
        open={salaryModalOpen}
        onClose={() => {
          setSalaryModalOpen(false);
          setSalaryError('');
          setSalaryExchangeRate('280');
        }}
        title="Deduct Salary"
        maxWidth="500px"
      >
        <form onSubmit={handleDeductSalary}>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <p style={{
              fontSize: theme.typography.fontSizes.base,
              color: colors.textSecondary,
              marginBottom: theme.spacing.md,
            }}>
              This will deduct salaries for <strong>{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</strong> and create a single expense entry.
            </p>
            <div style={{ marginBottom: theme.spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.semibold,
                color: colors.textPrimary,
              }}>
                PKR Exchange Rate
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={salaryExchangeRate}
                onChange={(e) => setSalaryExchangeRate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: theme.typography.fontSizes.base,
                }}
              />
            </div>
            {salaryError && (
              <div style={{
                padding: theme.spacing.md,
                background: colors.errorLight,
                color: colors.error,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
                fontSize: theme.typography.fontSizes.sm,
              }}>
                {salaryError}
              </div>
            )}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: theme.spacing.md,
            marginTop: theme.spacing.xl,
          }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSalaryModalOpen(false);
                setSalaryError('');
                setSalaryExchangeRate('280');
              }}
              disabled={salaryLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={salaryLoading}
            >
              {salaryLoading ? 'Processing...' : 'Deduct Salary'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Success Message */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: theme.spacing.xl,
          right: theme.spacing.xl,
          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
          background: '#10b981',
          color: colors.white,
          borderRadius: theme.radius.md,
          boxShadow: theme.shadows.lg,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}>
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.white,
              cursor: 'pointer',
              fontSize: theme.typography.fontSizes.lg,
              padding: 0,
              marginLeft: theme.spacing.sm,
            }}
          >
            <FaTimes />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ExpensesPage;

