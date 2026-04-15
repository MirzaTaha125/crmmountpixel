import React, { useEffect, useState } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { usePermissions } from '../contexts/PermissionContext';
import { FaTrash, FaEdit, FaUserPlus, FaCheck, FaPlus, FaSpinner, FaTimes, FaSearch, FaExclamationTriangle, FaFileExcel, FaEllipsisV, FaFilter, FaCalendarAlt, FaBox } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { theme, getColors } from '../theme';

const API_URL = getApiBaseUrl();

function InquiriesPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  usePermissions();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '', message: '', brand: '', businessName: '', serviceWebsite: false, serviceLogo: false, serviceSmm: false, serviceOther: false, finalQuotation: '', lastCalled: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [convertInquiry, setConvertInquiry] = useState(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [_filterStartDate, _setFilterStartDate] = useState('');
  const [_filterEndDate, _setFilterEndDate] = useState('');
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
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/inquiries`, { headers: getAuthHeaders() });
      setInquiries(res.data.inquiries || res.data);
    } catch {
      setError('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/inquiries/${id}`, { headers: getAuthHeaders() });
      fetchInquiries();
    } catch {
      setError('Deletion aborted by server');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = (inq) => {
    setForm({ 
      ...inq, 
      reason: inq.reason || inq.message || '',
      message: inq.message || inq.reason || '',
      brand: inq.brand || '',
      businessName: inq.businessName || '',
      serviceWebsite: !!inq.serviceWebsite,
      serviceLogo: !!inq.serviceLogo,
      serviceSmm: !!inq.serviceSmm,
      serviceOther: !!inq.serviceOther,
      finalQuotation: inq.finalQuotation || '',
      lastCalled: inq.lastCalled ? new Date(inq.lastCalled).toISOString().split('T')[0] : '' 
    });
    setFormError('');
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleAddOpen = () => {
    setForm({ name: '', email: '', phone: '', reason: '', message: '', brand: '', businessName: '', serviceWebsite: false, serviceLogo: false, serviceSmm: false, serviceOther: false, finalQuotation: '', lastCalled: '' });
    setFormError('');
    setModalMode('add');
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleConvertOpen = (inq) => {
    setConvertInquiry(inq);
    setConvertModalOpen(true);
  };

  const handleConvertSubmit = async () => {
    if (!convertInquiry) return;
    setConvertLoading(true);
    try {
      await axios.post(`${API_URL}/api/inquiries/${convertInquiry._id}/convert`, {}, { headers: getAuthHeaders() });
      setConvertModalOpen(false);
      setConvertInquiry(null);
      fetchInquiries();
    } catch (err) {
      alert(err.response?.data?.message || 'Conversion failed');
    } finally {
      setConvertLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...form, reason: form.reason || form.message, message: form.message || form.reason };
      if (modalMode === 'add') {
        await axios.post(`${API_URL}/api/inquiries`, payload, { headers: getAuthHeaders() });
      } else {
        await axios.put(`${API_URL}/api/inquiries/${form._id}`, payload, { headers: getAuthHeaders() });
      }
      setModalOpen(false);
      fetchInquiries();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportToExcel = () => {
    if (filteredInquiries.length === 0) return alert('No inquiries to export');
    const worksheetData = filteredInquiries.map(i => ({
      'Name': i.name, 'Email': i.email, 'Phone': i.phone, 'Project': i.businessName || '-', 'Brand': i.brand || '-', 'Quotation': i.finalQuotation || '-', 'Status': i.isConverted ? 'Converted' : 'Pending'
    }));
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inquiries');
    XLSX.writeFile(wb, `Inquiries_Ledger_${new Date().getTime()}.xlsx`);
  };

  const filteredInquiries = inquiries.filter(inq => {
    if (filterBrand && inq.brand !== filterBrand) return false;
    if (filterMonth) {
      const month = String(new Date(inq.createdAt).getMonth() + 1).padStart(2, '0');
      if (month !== filterMonth) return false;
    }
    if (filterYear) {
      if (String(new Date(inq.createdAt).getFullYear()) !== filterYear) return false;
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return inq.name?.toLowerCase().includes(s) || inq.email?.toLowerCase().includes(s) || inq.phone?.toLowerCase().includes(s) || inq.businessName?.toLowerCase().includes(s);
    }
    return true;
  });

  // Calculate stats
  const totalLeads = inquiries.length;
  const convertedLeads = inquiries.filter(i => i.isConverted).length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
  const pendingLeads = totalLeads - convertedLeads;

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
      }} className="inquiries-header">
        <style>{`
          @media (max-width: 600px) {
            .inquiries-header {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .inquiries-header > div:last-child {
              width: 100% !important;
              flex-direction: column !important;
              gap: ${theme.spacing.sm} !important;
            }
            .inquiries-header button {
              width: 100% !important;
              justify-content: center !important;
            }
            .inquiries-control-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
        <div>
          <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Inquiry Management Console
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            Lead Acquisition & Client Conversion Pipeline
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
          <button onClick={handleExportToExcel} disabled={inquiries.length === 0} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: '#059669', color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}>
            <FaFileExcel /> Export Leads
          </button>
          <button onClick={handleAddOpen} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}>
            <FaPlus /> Log Inquiry
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
        background: colors.border
      }}>
        <div style={{ padding: theme.spacing.md, background: colors.tableHeaderBg }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Total Acquisition</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary }}>{totalLeads} LEADS</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Conversion Velocity</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: '#10b981' }}>{conversionRate}% RATE</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Active Pipeline</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.warningDark }}>{pendingLeads} PENDING</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Success Index</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary }}>{convertedLeads} CLOSED</div>
        </div>
      </div>

      {/* CONTROL GRID */}
      <div style={{ 
        background: colors.tableHeaderBg, 
        padding: theme.spacing.lg, 
        marginBottom: theme.spacing.lg,
        borderBottom: `2px solid ${colors.border}`
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: theme.spacing.md }} className="inquiries-control-grid">
          <div style={{ position: 'relative' }}>
            <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: colors.textTertiary }} />
            <input type="text" placeholder="Search leads..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '8px 10px 8px 30px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', background: colors.white, outline: 'none' }} />
          </div>
          <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '12px', background: colors.white }}>
            <option value="">ALL BRANDS</option><option value="Webdevelopers Inc">Webdevelopers Inc</option><option value="American Design Eagle">American Design Eagle</option><option value="Mount Pixels">Mount Pixels</option>
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '12px', background: colors.white }}>
            <option value="">ALL MONTHS</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={String(i+1).padStart(2, '0')}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '12px', background: colors.white, outline: 'none' }}>
            <option value="">ALL YEARS</option>
            {Array.from({ length: 5 }, (_, i) => <option key={i} value={String(new Date().getFullYear()-i)}>{new Date().getFullYear()-i}</option>)}
          </select>
        </div>
      </div>

      {/* DATA GRID */}
      <div style={{ background: colors.white, borderBottom: `1px solid ${colors.borderLight}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead style={{ background: colors.tableHeaderBg }}>
              <tr>
                {['Client Prospect', 'Brand / Origin', 'Services Selection', 'Acquisition Date', 'Status', 'Controls'].map((h, idx) => (
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
                <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>Scanning lead registry...</td></tr>
              ) : filteredInquiries.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No prospects found for current audit selection.</td></tr>
              ) : filteredInquiries.map((inq, idx) => (
                <tr key={inq._id} style={{ borderBottom: `1px solid ${colors.borderLight}`, background: idx % 2 === 0 ? colors.white : colors.primaryBg }}>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary, textTransform: 'uppercase' }}>{inq.name}</div>
                    <div style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold' }}>{inq.email} | {inq.phone}</div>
                  </td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' }}>{inq.brand || 'ORGANIC'}</div>
                    <div style={{ fontSize: '9px', color: colors.textTertiary }}>{inq.source || 'WEBSITE'}</div>
                  </td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {inq.serviceWebsite && <span style={{ padding: '2px 6px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '8px', fontWeight: 'bold' }}>WEB</span>}
                      {inq.serviceLogo && <span style={{ padding: '2px 6px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '8px', fontWeight: 'bold' }}>LOGO</span>}
                      {inq.serviceSmm && <span style={{ padding: '2px 6px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: '8px', fontWeight: 'bold' }}>SMM</span>}
                    </div>
                  </td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}`, fontSize: '10px', fontWeight: 'bold', color: colors.textTertiary }}>{new Date(inq.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <span style={{ display: 'inline-block', padding: '4px 8px', background: inq.isConverted ? '#10b98122' : colors.warningLight, color: inq.isConverted ? '#10b981' : colors.warningDark, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', borderRadius: theme.radius.full, border: `1px solid ${inq.isConverted ? '#10b98133' : colors.warningDark + '33'}` }}>
                      {inq.isConverted ? 'Converted' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <div style={{ display: 'flex', gap: theme.spacing.md }}>
                      {!inq.isConverted && <button onClick={() => handleConvertOpen(inq)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }} title="Convert to Client"><FaUserPlus /></button>}
                      <button onClick={() => handleEditOpen(inq)} style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}><FaEdit /></button>
                      <button onClick={() => handleDelete(inq._id)} style={{ background: 'none', border: 'none', color: colors.error, cursor: 'pointer' }}><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INQUIRY MODAL */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: theme.spacing.md }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.lg, width: '95%', maxWidth: 800, boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, overflow: 'hidden', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 20px`, color: colors.textPrimary, fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}` }}>
              {modalMode === 'add' ? 'Lead Acquisition: Log New Inquiry' : 'Lead Acquisition: Update Record'}
            </div>
            <form onSubmit={handleFormSubmit} style={{ padding: theme.spacing.xl, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>PROSPECT NAME</label><input name="name" value={form.name} onChange={handleFormChange} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}` }} /></div>
                <div><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>EMAIL ADDRESS</label><input name="email" value={form.email} onChange={handleFormChange} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}` }} /></div>
                <div><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>PHONE NUMBER</label><input name="phone" value={form.phone} onChange={handleFormChange} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}` }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>BUSINESS IDENTITY</label><input name="businessName" value={form.businessName} onChange={handleFormChange} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm }} /></div>
                <div><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>ASSIGNED BRAND</label><select name="brand" value={form.brand} onChange={handleFormChange} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm }}><option value="">-- NO BRAND --</option><option value="Webdevelopers Inc">Webdevelopers Inc</option><option value="American Design Eagle">American Design Eagle</option><option value="Mount Pixels">Mount Pixels</option></select></div>
              </div>
              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>SERVICES REQUESTED</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  {['serviceWebsite', 'serviceLogo', 'serviceSmm', 'serviceOther'].map(s => <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold' }}><input type="checkbox" name={s} checked={form[s]} onChange={handleFormChange} /> {s.slice(7).toUpperCase()}</label>)}
                </div>
              </div>
              <div style={{ marginBottom: theme.spacing.lg }}><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>MESSAGE / REQUIREMENT</label><textarea name="message" value={form.message} onChange={handleFormChange} rows={3} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, resize: 'none' }} /></div>
              {formError && <div style={{ color: colors.error, fontSize: '10px', fontWeight: 'bold', marginBottom: '10px' }}>{formError}</div>}
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', background: 'none', border: `1px solid ${colors.border}`, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Cancel</button>
                <button type="submit" disabled={formLoading} style={{ padding: '8px 16px', background: colors.sidebarBg, color: colors.white, border: 'none', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{formLoading ? 'Processing...' : 'Save Inquiry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERSION MODAL */}
      {convertModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: theme.spacing.md }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.lg, width: '95%', maxWidth: 400, boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 20px`, color: colors.textPrimary, fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}` }}>
              Pipeline: Execute Client Conversion
            </div>
            <div style={{ padding: theme.spacing.xl }}>
              <p style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: theme.spacing.lg }}>Are you sure you want to convert <strong>{convertInquiry?.name}</strong> to a functional client? This will migrate lead data to the main client registry.</p>
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setConvertModalOpen(false)} style={{ padding: '8px 16px', background: 'none', border: `1px solid ${colors.border}`, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Abort</button>
                <button onClick={handleConvertSubmit} disabled={convertLoading} style={{ padding: '8px 16px', background: '#10b981', color: colors.white, border: 'none', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{convertLoading ? 'Converting...' : 'Finalize Conversion'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InquiriesPage;
