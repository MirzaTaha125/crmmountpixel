import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { theme, getColors } from '../theme';
import getApiBaseUrl from '../apiBase';
import { usePermissions } from '../contexts/PermissionContext';
import { FaTrash, FaEnvelope, FaEllipsisV, FaFileInvoice, FaSyncAlt, FaFileExcel, FaPlus } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const API_URL = getApiBaseUrl();

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];

const ppStatusColor = (s) => ({
  PAID:'#059669', MARKED_AS_PAID:'#059669',
  SENT:'#2563eb', PAYMENT_PENDING:'#d97706', PARTIALLY_PAID:'#d97706',
  DRAFT:'#6b7280', CANCELLED:'#dc2626', REFUNDED:'#dc2626',
})[s] || '#6b7280';

const ppStatusBg = (s) => ({
  PAID:'rgba(16,185,129,.15)', MARKED_AS_PAID:'rgba(16,185,129,.15)',
  SENT:'rgba(59,130,246,.15)', PAYMENT_PENDING:'rgba(245,158,11,.15)', PARTIALLY_PAID:'rgba(245,158,11,.15)',
  DRAFT:'rgba(107,114,128,.15)', CANCELLED:'rgba(239,68,68,.15)', REFUNDED:'rgba(239,68,68,.15)',
})[s] || 'rgba(107,114,128,.15)';

const ppStatusLabel = (s) => ({
  SENT:'Sent', DRAFT:'Draft', PAID:'Paid', MARKED_AS_PAID:'Paid',
  CANCELLED:'Cancelled', REFUNDED:'Refunded',
  PARTIALLY_PAID:'Partially Paid', PAYMENT_PENDING:'Pending',
})[s] || s || '—';

const crmColor = (s) => ({Paid:'#059669',Pending:'#d97706',Cancelled:'#dc2626',Refunded:'#dc2626'})[s]||'#6b7280';
const crmBg   = (s) => ({Paid:'rgba(16,185,129,.15)',Pending:'rgba(245,158,11,.15)',Cancelled:'rgba(239,68,68,.15)',Refunded:'rgba(239,68,68,.15)'})[s]||'rgba(107,114,128,.15)';

function authHeaders() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function PaymentGeneratorPage({ colors: colorsProp }) {
  const { canDo } = usePermissions();
  const colors = colorsProp || getColors();

  // ── invoice list ──
  const [invoices, setInvoices]         = useState([]);
  const [listLoading, setListLoading]   = useState(false);
  const [filterType, setFilterType]     = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [openMenuId, setOpenMenuId]     = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // ── create modal ──
  const [showCreate, setShowCreate]     = useState(false);
  const [form, setForm]                 = useState({ clientName:'', clientEmail:'', title:'', amount:'', description:'' });
  const [clientOptions, setClientOptions] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen]   = useState(false);
  const [selectedClientId, setSelectedClientId]       = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState('');
  const [invoiceMode, setInvoiceMode]     = useState('manual'); // 'manual' | 'package'
  const [packages, setPackages]           = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');

  // ── socket + toast ──
  const socketRef = useRef(null);
  const [toast, setToast] = useState(null);

  // ── send-email modal ──
  const [showEmailModal, setShowEmailModal]   = useState(false);
  const [emailTarget, setEmailTarget]         = useState(null); // invoice object
  const [emailTo, setEmailTo]                 = useState('');
  const [emailNote, setEmailNote]             = useState('');
  const [emailLoading, setEmailLoading]       = useState(false);
  const [emailStatus, setEmailStatus]         = useState('');

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchInvoices = async () => {
    setListLoading(true);
    try {
      const params = [];
      if (filterType === 'month') {
        params.push(`month=${selectedMonth}`, `year=${selectedYear}`);
      } else if (filterType === 'date' && startDate && endDate) {
        params.push(`startDate=${startDate}`, `endDate=${endDate}`);
      }
      const url = `${API_URL}/api/invoices${params.length ? '?' + params.join('&') : ''}`;
      const res = await axios.get(url, { headers: authHeaders() });
      setInvoices(res.data);
    } catch (e) { console.error(e); }
    finally { setListLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, [filterType, selectedMonth, selectedYear, startDate, endDate]); // eslint-disable-line

  // close menu on outside click
  useEffect(() => {
    const h = (e) => { if (!e.target.closest('[data-menu]')) setOpenMenuId(null); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  // ── socket: listen for invoice_paid ──────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('invoice_paid', (data) => {
      setToast({
        message: `Payment received from ${data.clientName}!`,
        sub: `${data.title} — $${parseFloat(data.amount).toFixed(2)}${data.invoiceNumber ? ` (${data.invoiceNumber})` : ''}`,
      });
      fetchInvoices();
      setTimeout(() => setToast(null), 6000);
    });
    return () => socket.disconnect();
  }, []); // eslint-disable-line

  // ── open create modal ─────────────────────────────────────────────────────
  const openCreateModal = async () => {
    setShowCreate(true);
    setInvoiceMode('manual');
    setSelectedPackageId('');
    setForm({ clientName:'', clientEmail:'', title:'', amount:'', description:'' });
    setCreateError('');
    if (packages.length === 0) {
      try {
        const res = await axios.get(`${API_URL}/api/packages`, { headers: authHeaders() });
        setPackages(res.data || []);
      } catch { /* ignore */ }
    }
  };

  const selectPackage = (pkgId) => {
    setSelectedPackageId(pkgId);
    const pkg = packages.find(p => p._id === pkgId);
    if (pkg) {
      setForm(f => ({
        ...f,
        title: pkg.name,
        amount: pkg.price,
        description: pkg.description || '',
      }));
    } else {
      setForm(f => ({ ...f, title: '', amount: '', description: '' }));
    }
  };

  // ── client autocomplete ───────────────────────────────────────────────────
  const handleClientNameChange = async (val) => {
    setForm(f => ({ ...f, clientName: val, clientEmail: '' }));
    setSelectedClientId('');
    if (val.length < 2) { setClientOptions([]); setClientDropdownOpen(false); return; }
    setClientSearchLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/clients?name=${encodeURIComponent(val)}`, { headers: authHeaders() });
      setClientOptions(res.data.clients || []);
      setClientDropdownOpen(true);
    } catch { setClientOptions([]); }
    finally { setClientSearchLoading(false); }
  };

  const selectClient = (client) => {
    setForm(f => ({ ...f, clientName: client.name, clientEmail: client.email || '' }));
    setSelectedClientId(client._id);
    setClientOptions([]);
    setClientDropdownOpen(false);
  };

  // ── create invoice ────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canDo('use_payment_generator')) { setCreateError('No permission'); return; }
    setCreateLoading(true);
    setCreateError('');
    try {
      await axios.post(`${API_URL}/api/invoices`, {
        clientId: selectedClientId || undefined,
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        title: form.title,
        amount: parseFloat(form.amount),
        description: form.description,
      }, { headers: authHeaders() });
      setShowCreate(false);
      setForm({ clientName:'', clientEmail:'', title:'', amount:'', description:'' });
      setSelectedClientId('');
      fetchInvoices();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create invoice');
    } finally { setCreateLoading(false); }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await axios.delete(`${API_URL}/api/invoices/${id}`, { headers: authHeaders() });
      fetchInvoices();
    } catch { alert('Failed to delete invoice'); }
  };

  // ── sync PayPal ───────────────────────────────────────────────────────────
  const handleSync = async (inv) => {
    setOpenMenuId(null);
    try {
      const res = await axios.get(`${API_URL}/api/invoices/${inv._id}/sync-paypal`, { headers: authHeaders() });
      const d = res.data;
      const feeInfo = d.paypalFee != null
        ? `\nFee: $${parseFloat(d.paypalFee).toFixed(2)} | Net: $${parseFloat(d.netAmount).toFixed(2)}`
        : '\nFee: not fetched (check backend terminal)';
      alert(`PayPal Status: ${d.paypalInvoiceStatus}\nCRM Status: ${d.status}${feeInfo}`);
      fetchInvoices();
    } catch { alert('Sync failed'); }
  };

  // ── create PayPal invoice for existing ───────────────────────────────────
  const handleCreatePaypal = async (inv) => {
    setOpenMenuId(null);
    try {
      await axios.post(`${API_URL}/api/invoices/${inv._id}/create-paypal`, {}, { headers: authHeaders() });
      alert('PayPal invoice created and sent!');
      fetchInvoices();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create PayPal invoice';
      alert('PayPal Error: ' + msg);
    }
  };

  // ── send email modal ──────────────────────────────────────────────────────
  const openEmailModal = (inv) => {
    setEmailTarget(inv);
    setEmailTo(inv.clientEmail || '');
    setEmailNote('');
    setEmailStatus('');
    setShowEmailModal(true);
    setOpenMenuId(null);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailStatus('');
    try {
      await axios.post(`${API_URL}/api/invoices/${emailTarget._id}/send-email`,
        { to: emailTo, toName: emailTarget.clientName, extraNote: emailNote },
        { headers: authHeaders() }
      );
      setEmailStatus('Email sent successfully!');
      setTimeout(() => setShowEmailModal(false), 1500);
    } catch (err) {
      setEmailStatus(err.response?.data?.message || 'Failed to send email. Check your work email configuration.');
    } finally { setEmailLoading(false); }
  };

  // ── export Excel ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!invoices.length) { alert('No invoices to export'); return; }
    setExportLoading(true);
    try {
      const data = invoices.map(inv => ({
        'Client':        inv.clientName,
        'Email':         inv.clientEmail || '-',
        'Title':         inv.title,
        'Description':   inv.description || '-',
        'Amount ($)':    parseFloat(inv.amount).toFixed(2),
        'Status':        inv.status,
        'PayPal Status': ppStatusLabel(inv.paypalInvoiceStatus),
        'Invoice #':     inv.invoiceNumber || '-',
        'Created':       new Date(inv.createdAt).toLocaleDateString(),
        'Paid At':       inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '-',
        'PayPal Link':   inv.paypalInvoiceUrl || '-',
      }));
      const ws  = XLSX.utils.json_to_sheet(data);
      const wb  = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
      XLSX.writeFile(wb, `Invoices_${selectedMonth}_${selectedYear}.xlsx`);
    } finally { setExportLoading(false); }
  };


  return (
    <div style={{ width: '100%', fontFamily: 'inherit' }}>
      {/* Toast Notification */}
      {toast && (
        <div 
          onClick={() => setToast(null)}
          style={{ 
            position: 'fixed', 
            bottom: '24px', 
            right: '24px', 
            zIndex: 9999, 
            background: colors.success, 
            color: colors.white, 
            padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
            boxShadow: theme.shadows.lg, 
            cursor: 'pointer',
            borderRadius: theme.radius.md,
            borderLeft: `5px solid ${colors.sidebarBg}`,
            minWidth: '300px'
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.sm, marginBottom: '2px', textTransform: 'uppercase' }}>{toast.message}</div>
          {toast.sub && <div style={{ fontSize: '10px', opacity: 0.9 }}>{toast.sub}</div>}
        </div>
      )}

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
            Invoice Generator
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            System Payroll & Client Billing
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              background: colors.white,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: theme.radius.md,
              fontWeight: 'bold',
              fontSize: theme.typography.fontSizes['2xs'],
              textTransform: 'uppercase',
              cursor: exportLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              boxShadow: theme.shadows.sm,
            }}
          >
            <FaFileExcel /> {exportLoading ? 'Exporting...' : 'Export XLS'}
          </button>
          {canDo('use_payment_generator') && (
            <button
              onClick={openCreateModal}
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
                boxShadow: theme.shadows.sm,
              }}
            >
              <FaPlus /> New Invoice
            </button>
          )}
        </div>
      </div>

      {/* CONTROL ROW (FILTERS) */}
      <div style={{
        background: colors.white,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderRadius: theme.radius.md,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm,
        display: 'flex',
        gap: theme.spacing.xl,
        alignItems: 'flex-end',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '6px', textTransform: 'uppercase' }}>Filter Method</label>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)} 
            style={{ padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none', minWidth: '150px' }}
          >
            <option value="month">Monthly Interval</option>
            <option value="date">Specific Date Range</option>
          </select>
        </div>

        {filterType === 'month' ? (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '6px', textTransform: 'uppercase' }}>Month</label>
              <select 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(Number(e.target.value))} 
                style={{ padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none', minWidth: '120px' }}
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '6px', textTransform: 'uppercase' }}>Year</label>
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(Number(e.target.value))} 
                style={{ padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none', minWidth: '100px' }}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '6px', textTransform: 'uppercase' }}>From</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                style={{ padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '6px', textTransform: 'uppercase' }}>To</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                style={{ padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} 
              />
            </div>
          </>
        )}

        <button 
          onClick={fetchInvoices} 
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
            height: '34px',
            boxShadow: theme.shadows.sm
          }}
        >
          Execute Search
        </button>
      </div>

      {/* DATA GRID */}
      <div style={{ 
        background: colors.white, 
        borderRadius: theme.radius.lg, 
        border: `1px solid ${colors.borderLight}`,
        overflow: 'hidden',
        boxShadow: theme.shadows.md,
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: colors.tableHeaderBg }}>
              <tr>
                {['Client Details', 'Invoice Subject', 'Financials', 'CRM Status', 'Provider Link', 'Identity', 'Issued', ''].map((h, idx) => (
                  <th key={idx} style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    textAlign: 'left',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: colors.textPrimary,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    borderBottom: `2px solid ${colors.border}`,
                    borderRight: idx < 6 ? `1px solid ${colors.border}` : 'none'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr><td colSpan={8} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>Fetching records...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No invoice data found for the selected period.</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv._id} style={{ 
                  borderBottom: `1px solid ${colors.borderLight}`,
                  background: colors.white,
                  transition: 'background 0.2s'
                }}>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary }}>{inv.clientName}</div>
                    <div style={{ fontSize: '10px', color: colors.textSecondary }}>{inv.clientEmail || '—'}</div>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary }}>
                    {inv.title}
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary }}>${parseFloat(inv.amount).toFixed(2)}</div>
                    {inv.netAmount != null && (
                      <div style={{ fontSize: '9px', color: colors.success, fontWeight: 'bold', marginTop: '2px' }}>
                        NET: ${parseFloat(inv.netAmount).toFixed(2)}
                        {inv.paypalFee ? ` (-$${parseFloat(inv.paypalFee).toFixed(2)})` : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      background: crmBg(inv.status), 
                      color: crmColor(inv.status), 
                      fontSize: '9px', 
                      fontWeight: 'bold', 
                      textTransform: 'uppercase',
                      borderRadius: theme.radius.full,
                      border: `1px solid ${crmColor(inv.status)}22`
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    {inv.paypalInvoiceStatus ? (
                      <span style={{ 
                        padding: '4px 10px', 
                        background: ppStatusBg(inv.paypalInvoiceStatus), 
                        color: ppStatusColor(inv.paypalInvoiceStatus), 
                        fontSize: '9px', 
                        fontWeight: 'bold', 
                        textTransform: 'uppercase',
                        borderRadius: theme.radius.full,
                        border: `1px solid ${ppStatusColor(inv.paypalInvoiceStatus)}22`
                      }}>
                        {ppStatusLabel(inv.paypalInvoiceStatus)}
                      </span>
                    ) : <span style={{ color: colors.textTertiary, fontSize: '9px' }}>—</span>}
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: '10px', color: colors.textSecondary, fontFamily: 'monospace' }}>
                    {inv.invoiceNumber || '—'}
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: '10px', color: colors.textSecondary, whiteSpace: 'nowrap' }}>
                    {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right' }}>
                    <div style={{ position: 'relative' }} data-menu>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === inv._id ? null : inv._id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: colors.textSecondary, fontSize: '16px' }}
                      >
                        <FaEllipsisV />
                      </button>
                      {openMenuId === inv._id && (
                        <div style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          right: 0, 
                          background: colors.white, 
                          border: `1px solid ${colors.borderLight}`, 
                          boxShadow: theme.shadows.lg, 
                          zIndex: 100, 
                          minWidth: '200px',
                          borderRadius: theme.radius.md,
                          marginTop: '4px',
                          overflow: 'hidden'
                        }}>
                          {inv.paypalInvoiceUrl && (
                            <a href={inv.paypalInvoiceUrl} target="_blank" rel="noopener noreferrer"
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: theme.spacing.sm, padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                textDecoration: 'none', color: '#0070ba', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: `1px solid ${colors.borderLight}`
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryBg}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <FaFileInvoice /> View Provider Link
                            </a>
                          )}
                          <div
                            onClick={() => openEmailModal(inv)}
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: theme.spacing.sm, padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              cursor: 'pointer', color: colors.textPrimary, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: `1px solid ${colors.borderLight}`
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryBg}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <FaEnvelope /> Relay via Email
                          </div>
                          {!inv.paypalInvoiceId && (
                            <div
                              onClick={() => handleCreatePaypal(inv)}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: theme.spacing.sm, padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                cursor: 'pointer', color: '#0070ba', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: `1px solid ${colors.borderLight}`
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryBg}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <FaFileInvoice /> Generate Provider Invoice
                            </div>
                          )}
                          {inv.paypalInvoiceId && (
                            <div
                              onClick={() => handleSync(inv)}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: theme.spacing.sm, padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                cursor: 'pointer', color: colors.sidebarBg, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: `1px solid ${colors.borderLight}`
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryBg}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <FaSyncAlt /> Synchronize Status
                            </div>
                          )}
                          <div
                            onClick={() => { setOpenMenuId(null); handleDelete(inv._id); }}
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: theme.spacing.sm, padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              cursor: 'pointer', color: colors.error, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.errorBg}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <FaTrash /> Purge Record
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

      {/* MODALS */}
      {showCreate && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: 500, boxShadow: theme.shadows.xl, border: `1px solid ${colors.borderLight}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `20px 24px`, color: colors.textPrimary, fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${colors.border}` }}>
              Bespoke Billing: Register New Record
            </div>
            
            <div style={{ padding: theme.spacing.md, background: colors.primaryBg, borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', gap: '4px' }}>
              {['manual', 'package'].map(mode => (
                <button key={mode} type="button"
                  onClick={() => { setInvoiceMode(mode); setSelectedPackageId(''); if (mode === 'manual') setForm(f => ({ ...f, title: '', amount: '', description: '' })); }}
                  style={{ 
                    flex: 1, padding: '10px 0', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase',
                    background: invoiceMode === mode ? colors.sidebarBg : colors.white,
                    color: invoiceMode === mode ? colors.white : colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    boxShadow: theme.shadows.sm,
                    transition: 'all 0.2s'
                  }}>
                  {mode === 'manual' ? 'Manual Entry' : 'Existing Package'}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreate} style={{ padding: theme.spacing.xl }}>
              {invoiceMode === 'package' && (
                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Select Package</label>
                  <select
                    value={selectedPackageId}
                    onChange={e => selectPackage(e.target.value)}
                    required
                    style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
                    <option value="">— Select stored package —</option>
                    {packages.map(pkg => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} (${pkg.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: theme.spacing.md, position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Client Name</label>
                <input
                  value={form.clientName}
                  onChange={e => handleClientNameChange(e.target.value)}
                  placeholder="Type to search clients..."
                  required
                  style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
                />
                {clientSearchLoading && <span style={{ position: 'absolute', right: 12, top: 28, fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold' }}>SEARCHING...</span>}
                {clientDropdownOpen && clientOptions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: colors.white, border: `1px solid ${colors.borderLight}`, zIndex: 10, maxHeight: 150, overflowY: 'auto', boxShadow: theme.shadows.md, borderRadius: theme.radius.md, marginTop: '4px' }}>
                    {clientOptions.map(cl => (
                      <div key={cl._id} onClick={() => selectClient(cl)}
                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '12px', borderBottom: `1px solid ${colors.borderLight}` }}
                        onMouseEnter={e => e.currentTarget.style.background = colors.primaryBg}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ fontWeight: 'bold', color: colors.textPrimary }}>{cl.name}</div>
                        <div style={{ fontSize: '10px', color: colors.textTertiary }}>{cl.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Contact Email</label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                  placeholder="Billing destination..."
                  style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Invoice Subject</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Brief title..."
                    required
                    style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Amount (USD)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                    style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: theme.spacing.xl }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Technical Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Supporting details for this transaction..."
                  rows={2}
                  style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none', resize: 'none' }}
                />
              </div>

              {createError && <p style={{ color: colors.error, fontSize: '10px', fontWeight: 'bold', marginBottom: theme.spacing.md, textTransform: 'uppercase' }}>{createError}</p>}

              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.sm }}>Discard</button>
                <button type="submit" disabled={createLoading} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: createLoading ? 'not-allowed' : 'pointer', boxShadow: theme.shadows.sm }}>
                  {createLoading ? 'Finalizing...' : 'Commit & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && emailTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.white, borderRadius: 0, width: 450, boxShadow: theme.shadows.xl, border: `2px solid ${colors.sidebarBg}`, overflow: 'hidden' }}>
            <div style={{ background: colors.sidebarBg, padding: `${theme.spacing.sm} ${theme.spacing.lg}`, color: colors.white, fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.sidebarActive}` }}>
              Relay Billing Data via Email
            </div>
            
            <div style={{ padding: theme.spacing.xl }}>
              <div style={{ background: colors.primaryBg, padding: theme.spacing.md, marginBottom: theme.spacing.lg, border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>Target Invoice</div>
                <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary }}>{emailTarget.title}</div>
                <div style={{ fontSize: '10px', color: colors.textSecondary, marginTop: '2px' }}>${parseFloat(emailTarget.amount).toFixed(2)} — {emailTarget.clientName}</div>
              </div>

              <form onSubmit={handleSendEmail}>
                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Target Recipient</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    required
                    style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
                  />
                </div>
                <div style={{ marginBottom: theme.spacing.lg }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Supplementary Message</label>
                  <textarea
                    value={emailNote}
                    onChange={e => setEmailNote(e.target.value)}
                    placeholder="Optional message additions..."
                    rows={3}
                    style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none', resize: 'none' }}
                  />
                </div>

                {emailStatus && (
                  <p style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: theme.spacing.md, textTransform: 'uppercase', color: emailStatus.includes('success') ? colors.success : colors.error }}>{emailStatus}</p>
                )}

                <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowEmailModal(false)} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 0, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={emailLoading} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: 0, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: emailLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                    <FaEnvelope /> {emailLoading ? 'Dispatching...' : 'Execute Relay'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
