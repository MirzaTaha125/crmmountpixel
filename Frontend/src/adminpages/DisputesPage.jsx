import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { getColors, theme } from '../theme';
import { FaPlus, FaEdit, FaTrash, FaEllipsisV, FaFileExcel, FaFilter, FaSearch, FaChevronDown, FaChartBar, FaCalendarAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const API_URL = getApiBaseUrl();

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

function DisputesPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const [disputes, setDisputes] = useState([]);
  const [paymentDisputes, setPaymentDisputes] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDispute, setEditingDispute] = useState(null);
  const [form, setForm] = useState({
    type: 'Client Chargeback',
    clientId: '',
    clientName: '',
    amount: '',
    currency: 'USD',
    description: '',
    status: 'Active',
    disputeDate: new Date().toISOString().split('T')[0],
    notes: '',
    brand: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDisputeType, setFilterDisputeType] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

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
    fetchDisputes();
    fetchPaymentDisputes();
    fetchClients();
  }, [selectedMonth, selectedYear, filterType, startDate, endDate, filterBrand, filterStatus, filterDisputeType]);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/clients`, {
        headers: getAuthHeaders()
      });
      setClients(res.data.clients || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchDisputes = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_URL}/api/disputes?`;
      const params = [];
      
      if (filterType === 'month') {
        params.push(`month=${selectedMonth}`, `year=${selectedYear}`);
      } else if (filterType === 'date' && startDate && endDate) {
        params.push(`startDate=${startDate}`, `endDate=${endDate}`);
      }
      
      if (filterBrand) params.push(`brand=${encodeURIComponent(filterBrand)}`);
      if (filterStatus) params.push(`status=${encodeURIComponent(filterStatus)}`);
      if (filterDisputeType) params.push(`type=${encodeURIComponent(filterDisputeType)}`);
      
      if (params.length > 0) url += params.join('&');
      else url = `${API_URL}/api/disputes`;
      
      const res = await axios.get(url, { headers: getAuthHeaders() });
      const disputesData = Array.isArray(res.data) ? res.data : (res.data?.disputes || res.data || []);
      setDisputes(Array.isArray(disputesData) ? disputesData : []);
    } catch {
      setError('Failed to fetch disputes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentDisputes = async () => {
    try {
      let url = `${API_URL}/api/payment-history?status=Dispute`;
      const params = [];
      if (filterType === 'month') {
        params.push(`month=${selectedMonth}`, `year=${selectedYear}`);
      } else if (filterType === 'date' && startDate && endDate) {
        params.push(`startDate=${startDate}`, `endDate=${endDate}`);
      }
      if (params.length > 0) url += `&${params.join('&')}`;
      const res = await axios.get(url, { headers: getAuthHeaders() });
      const paymentsData = Array.isArray(res.data) ? res.data : (res.data?.payments || []);
      let transformed = paymentsData.map(payment => ({
        _id: payment._id,
        type: 'Client Chargeback',
        clientId: payment.clientId?._id || payment.clientId,
        clientName: payment.clientId?.name || '',
        amount: payment.amount,
        currency: payment.currency || 'USD',
        description: payment.description || '',
        status: 'Active',
        disputeDate: payment.paymentDate || payment.createdAt,
        notes: payment.notes || '',
        brand: payment.clientId?.brand || '',
        source: 'payment_history',
        invoiceNumber: payment.invoiceNumber || '',
        paymentMethod: payment.paymentMethod || ''
      }));
      if (filterBrand) transformed = transformed.filter(p => p.brand === filterBrand);
      setPaymentDisputes(transformed);
    } catch (err) {
      console.error('Error fetching payment disputes:', err);
    }
  };

  const handleAdd = () => {
    setEditingDispute(null);
    setForm({
      type: 'Client Chargeback',
      clientId: '',
      clientName: '',
      amount: '',
      currency: 'USD',
      description: '',
      status: 'Active',
      disputeDate: new Date().toISOString().split('T')[0],
      notes: '',
      brand: ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleEdit = (dispute) => {
    setEditingDispute(dispute);
    setForm({
      type: dispute.type,
      clientId: dispute.clientId?._id || dispute.clientId || '',
      clientName: dispute.clientName || dispute.clientId?.name || '',
      amount: dispute.amount,
      currency: dispute.currency || 'USD',
      description: dispute.description || '',
      status: dispute.status,
      disputeDate: dispute.disputeDate ? new Date(dispute.disputeDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: dispute.notes || '',
      brand: dispute.brand || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'type' && value === 'Non-Client Chargeback') {
      setForm(prev => ({ ...prev, clientId: '', clientName: '' }));
    }
  };

  const handleClientSearch = (e) => {
    const value = e.target.value;
    setClientSearchTerm(value);
    setForm(prev => ({ ...prev, clientName: value, clientId: '' }));
    if (value.length >= 2) setClientDropdownOpen(true);
    else setClientDropdownOpen(false);
  };

  const handleClientSelect = (client) => {
    setForm(prev => ({ ...prev, clientId: client._id, clientName: client.name, brand: client.brand || prev.brand }));
    setClientSearchTerm(client.name);
    setClientDropdownOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      if (!form.type || !form.amount) {
        setFormError('Type and amount are required');
        setFormLoading(false);
        return;
      }
      if (form.type === 'Client Chargeback' && !form.clientId && !form.clientName) {
        setFormError('Client is required for client chargebacks');
        setFormLoading(false);
        return;
      }
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editingDispute) {
        await axios.put(`${API_URL}/api/disputes/${editingDispute._id}`, payload, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_URL}/api/disputes`, payload, { headers: getAuthHeaders() });
      }
      setModalOpen(false);
      fetchDisputes();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Error saving dispute');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (disputeId) => {
    if (!window.confirm('Are you sure you want to delete this dispute?')) return;
    try {
      await axios.delete(`${API_URL}/api/disputes/${disputeId}`, { headers: getAuthHeaders() });
      fetchDisputes();
    } catch {
      alert('Failed to delete dispute');
    }
  };

  const allDisputes = [...(Array.isArray(disputes) ? disputes : []), ...(Array.isArray(paymentDisputes) ? paymentDisputes : [])];

  const handleExportToExcel = () => {
    if (allDisputes.length === 0) return alert('No disputes to export');
    setExportLoading(true);
    try {
      const worksheetData = allDisputes.map(dispute => ({
        'Type': dispute.type,
        'Client': dispute.clientName || dispute.clientId?.name || '-',
        'Amount': parseFloat(dispute.amount || 0).toFixed(2),
        'Status': dispute.status,
        'Brand': dispute.brand || '-',
        'Date': dispute.disputeDate ? new Date(dispute.disputeDate).toLocaleDateString() : '',
        'Notes': dispute.notes || '-'
      }));
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Disputes');
      XLSX.writeFile(workbook, `Disputes_Ledger_${new Date().getTime()}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const filteredClients = clients.filter(client => client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())).slice(0, 10);

  // Statistics calculation
  const totalVolume = allDisputes.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  const totalLoss = allDisputes.filter(d => d.status === 'Loss').reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  const totalWon = allDisputes.filter(d => d.status === 'Won').reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  const activeCount = allDisputes.filter(d => d.status === 'Active').length;

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
            Disputes Ledger
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            Financial Conflict & Resolution Management
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <button
            onClick={handleExportToExcel}
            disabled={exportLoading || allDisputes.length === 0}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              background: colors.white,
              color: '#10b981',
              border: `1px solid #10b981`,
              borderRadius: theme.radius.md,
              fontWeight: 'bold',
              fontSize: theme.typography.fontSizes['2xs'],
              textTransform: 'uppercase',
              cursor: (exportLoading || allDisputes.length === 0) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              opacity: (exportLoading || allDisputes.length === 0) ? 0.5 : 1,
              boxShadow: theme.shadows.sm
            }}
          >
            <FaFileExcel /> {exportLoading ? 'Exporting...' : 'Export XLS'}
          </button>
          <button
            onClick={handleAdd}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              background: colors.sidebarBg,
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              fontWeight: 'bold',
              fontSize: theme.typography.fontSizes['2xs'],
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              boxShadow: theme.shadows.sm
            }}
          >
            <FaPlus /> Create Entry
          </button>
        </div>
      </div>

      {/* QUICK STATS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1px',
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        boxShadow: theme.shadows.sm,
        background: colors.border,
        marginBottom: theme.spacing.lg
      }}>
        <div style={{ padding: theme.spacing.md, background: colors.tableHeaderBg }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Active Volume</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary }}>${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: colors.textTertiary, marginTop: '2px' }}>{activeCount} PENDING CASES</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Total Recovery</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: '#10b981' }}>${totalWon.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Net Loss</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.error }}>${totalLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Success Rate</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary }}>
            {totalVolume > 0 ? ((totalWon / (totalWon + totalLoss || 1)) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* FILTERS PANEL / CONTROL GRID */}
      <div style={{ 
        background: colors.white, 
        padding: theme.spacing.lg, 
        marginBottom: theme.spacing.lg,
        borderRadius: theme.radius.md,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: theme.spacing.md }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button onClick={() => setFilterType('month')} style={{ flex: 1, padding: '8px', background: filterType === 'month' ? colors.sidebarBg : colors.white, color: filterType === 'month' ? colors.white : colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: `${theme.radius.sm} 0 0 ${theme.radius.sm}`, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', outline: 'none' }}>Month</button>
            <button onClick={() => setFilterType('date')} style={{ flex: 1, padding: '8px', background: filterType === 'date' ? colors.sidebarBg : colors.white, color: filterType === 'date' ? colors.white : colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: `0 ${theme.radius.sm} ${theme.radius.sm} 0`, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', outline: 'none' }}>Range</button>
          </div>

          {filterType === 'month' ? (
            <>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          ) : (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} />
            </>
          )}

          <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
            <option value="">ALL BRANDS</option>
            <option value="Webdevelopers Inc">Webdevelopers Inc</option>
            <option value="American Design Eagle">American Design Eagle</option>
            <option value="Mount Pixels">Mount Pixels</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
            <option value="">ALL STATUS</option>
            <option value="Active">ACTIVE</option>
            <option value="Won">WON</option>
            <option value="Loss">LOSS</option>
            <option value="Approved">APPROVED</option>
            <option value="Send">SEND</option>
          </select>

          <select value={filterDisputeType} onChange={(e) => setFilterDisputeType(e.target.value)} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
            <option value="">ALL TYPES</option>
            <option value="Client Chargeback">CLIENT CHARGEBACK</option>
            <option value="Non-Client Chargeback">NON-CLIENT</option>
          </select>
        </div>
      </div>

      {/* DATA GRID */}
      <div style={{ 
        background: colors.white, 
        borderRadius: theme.radius.lg, 
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.md,
        overflow: 'visible' 
      }}>
        <div style={{ overflowX: 'auto', borderRadius: `${theme.radius.lg} ${theme.radius.lg} 0 0` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: colors.tableHeaderBg }}>
              <tr>
                {['Client / Brand', 'Category', 'Amount', 'Status', 'Filing Date', 'Controls'].map((h, idx) => (
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
                <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>Scanning records...</td></tr>
              ) : allDisputes.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No conflict data on record for selection.</td></tr>
              ) : allDisputes.map((dispute, idx) => (
                <tr key={dispute._id} style={{ 
                  borderBottom: `1px solid ${colors.borderLight}`,
                  background: colors.white, // Uniform white background
                  transition: 'background 0.2s'
                }}>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary, textTransform: 'uppercase' }}>
                      {dispute.clientName || dispute.clientId?.name || 'MANUAL ENTRY'}
                    </div>
                    <div style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold', textTransform: 'uppercase' }}>
                      BRAND: {dispute.brand || dispute.clientId?.brand || 'NOT SPECIFIED'}
                    </div>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' }}>
                      {dispute.source === 'payment_history' ? 'SYSTEM TRIGGER' : dispute.type}
                    </div>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary }}>
                      {dispute.currency || 'USD'} {parseFloat(dispute.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: 
                        dispute.status === 'Won' ? '#10b98122' :
                        dispute.status === 'Loss' ? colors.error + '22' :
                        '#6366f122',
                      color:
                        dispute.status === 'Won' ? '#10b981' :
                        dispute.status === 'Loss' ? colors.error :
                        '#6366f1',
                      fontWeight: 'bold',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      borderRadius: theme.radius.full, // Standardized full radius
                      border: `1px solid ${
                        dispute.status === 'Won' ? '#10b98133' :
                        dispute.status === 'Loss' ? colors.error + '33' :
                        '#6366f133'
                      }`
                    }}>
                      {dispute.status}
                    </span>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary }}>
                      {dispute.disputeDate ? new Date(dispute.disputeDate).toLocaleDateString() : '-'}
                    </div>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <div style={{ position: 'relative' }} data-menu-container>
                      {dispute.source === 'payment_history' ? (
                        <div style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold' }}>SYSTEM LOCKED</div>
                      ) : (
                        <>
                          <button 
                            className="action-menu-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === dispute._id ? null : dispute._id);
                            }}
                            style={{ background: 'none', border: 'none', color: colors.textTertiary, cursor: 'pointer', padding: '5px' }}
                          >
                            <FaEllipsisV />
                          </button>
                          
                          {openMenuId === dispute._id && (
                            <div style={{
                              position: 'absolute',
                              right: '100%',
                              top: idx > allDisputes.length - 3 ? 'auto' : '0',
                              bottom: idx > allDisputes.length - 3 ? '0' : 'auto',
                              background: colors.white,
                              border: `1px solid ${colors.border}`,
                              borderRadius: theme.radius.md,
                              boxShadow: theme.shadows.lg,
                              zIndex: 100,
                              minWidth: '120px',
                              overflow: 'hidden'
                            }}>
                              <button onClick={() => handleEdit(dispute)} style={{ width: '100%', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: colors.textPrimary, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={(e) => e.target.style.background = colors.primaryBg} onMouseLeave={(e) => e.target.style.background = 'none'}>
                                <FaEdit style={{ color: colors.textSecondary }} /> EDIT
                              </button>
                              <button onClick={() => handleDelete(dispute._id)} style={{ width: '100%', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: colors.error, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={(e) => e.target.style.background = colors.primaryBg} onMouseLeave={(e) => e.target.style.background = 'none'}>
                                <FaTrash /> DELETE
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: 800, boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 20px`, color: colors.textPrimary, fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0` }}>
              {editingDispute ? `Conflict Resolution: Case Update # ${editingDispute._id.slice(-6)}` : 'Conflict Resolution: Initiate Dispute Entry'}
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: theme.spacing.xl }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Classification *</label>
                  <select name="type" value={form.type} onChange={handleFormChange} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required>
                    <option value="Client Chargeback">Client Chargeback</option>
                    <option value="Non-Client Chargeback">Non-Client Chargeback</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Current Status *</label>
                  <select name="status" value={form.status} onChange={handleFormChange} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required>
                    <option value="Active">Active</option>
                    <option value="Won">Won</option>
                    <option value="Loss">Loss</option>
                    <option value="Approved">Approved</option>
                    <option value="Send">Send</option>
                  </select>
                </div>
              </div>

              {form.type === 'Client Chargeback' ? (
                <div style={{ position: 'relative', marginBottom: theme.spacing.lg }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Search Registry *</label>
                  <input type="text" value={clientSearchTerm} onChange={handleClientSearch} onFocus={() => setClientDropdownOpen(true)} placeholder="Enter client name or ID..." style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
                  {clientDropdownOpen && filteredClients.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: colors.white, border: `1px solid ${colors.border}`, zIndex: 10, maxHeight: 150, overflowY: 'auto', boxShadow: theme.shadows.lg, borderRadius: theme.radius.md }}>
                      {filteredClients.map(c => <div key={c._id} onMouseDown={() => handleClientSelect(c)} style={{ padding: theme.spacing.sm, cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }} onMouseEnter={(e) => e.target.style.background = colors.primaryBg} onMouseLeave={(e) => e.target.style.background = 'none'}>{c.name} ({c.brand})</div>)}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginBottom: theme.spacing.lg }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Entity Name</label>
                  <input type="text" name="clientName" value={form.clientName} onChange={handleFormChange} placeholder="Manual entity input..." style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Amount / Value *</label>
                  <input type="number" name="amount" value={form.amount} onChange={handleFormChange} step="0.01" style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Occurrence Date *</label>
                  <input type="date" name="disputeDate" value={form.disputeDate} onChange={handleFormChange} style={{ width: '100%', padding: '7px', borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
                </div>
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Internal Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={2} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, resize: 'none', outline: 'none' }} />
              </div>

              {formError && <div style={{ color: colors.error, fontSize: '10px', fontWeight: 'bold', marginBottom: theme.spacing.md, textTransform: 'uppercase' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={formLoading} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: formLoading ? 'not-allowed' : 'pointer', boxShadow: theme.shadows.sm }}>{formLoading ? 'Processing...' : (editingDispute ? 'Finalize Edit' : 'Commit Entry')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DisputesPage;
