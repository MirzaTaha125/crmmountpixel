import React, { useEffect, useState } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { usePermissions } from '../contexts/PermissionContext';
import { FaTrash, FaEdit, FaUserPlus, FaCheck, FaPlus, FaSpinner, FaTimes, FaSearch, FaExclamationTriangle, FaFileExcel, FaEllipsisV } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { theme, getColors } from '../theme';

const API_URL = getApiBaseUrl();

function InquiriesPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const { canDo, hasPermission } = usePermissions();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
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
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/inquiries`, {
        headers: getAuthHeaders()
      });
      setInquiries(res.data.inquiries || res.data);
    } catch (err) {
      setError('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/inquiries/${id}`, {
        headers: getAuthHeaders()
      });
      fetchInquiries();
    } catch (err) {
      setError('Failed to delete inquiry');
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
      await axios.post(`${API_URL}/api/inquiries/${convertInquiry._id}/convert`, {}, {
        headers: getAuthHeaders()
      });
      setConvertModalOpen(false);
      setConvertInquiry(null);
      fetchInquiries();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to convert inquiry. Please try again.');
    } finally {
      setConvertLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    
    if (!form.name || !form.email || !form.phone || (!form.reason && !form.message)) {
      setFormError('Please fill in all required fields');
      setFormLoading(false);
      return;
    }

    try {
      const headers = getAuthHeaders();
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        reason: form.reason || form.message,
        message: form.message || form.reason,
        brand: form.brand || '',
        businessName: form.businessName || '',
        serviceWebsite: form.serviceWebsite,
        serviceLogo: form.serviceLogo,
        serviceSmm: form.serviceSmm,
        serviceOther: form.serviceOther,
        finalQuotation: form.finalQuotation || '',
        lastCalled: form.lastCalled || undefined
      };

      if (modalMode === 'add') {
        if (!hasPermission('add_inquiries')) {
          setFormError('You do not have permission to add inquiries');
          setFormLoading(false);
          return;
        }
        await axios.post(`${API_URL}/api/inquiries`, payload, { headers });
      } else {
        await axios.put(`${API_URL}/api/inquiries/${form._id}`, payload, { headers });
      }
      setModalOpen(false);
      setForm({ name: '', email: '', phone: '', reason: '', message: '', brand: '', businessName: '', serviceWebsite: false, serviceLogo: false, serviceSmm: false, serviceOther: false, finalQuotation: '', lastCalled: '' });
      fetchInquiries();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to save inquiry';
      setFormError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportToExcel = () => {
    if (filteredInquiries.length === 0) {
      alert('No inquiries to export');
      return;
    }

    const worksheetData = filteredInquiries.map(inquiry => ({
      'Name': inquiry.name,
      'Email': inquiry.email,
      'Phone': inquiry.phone,
      'Reason': inquiry.reason || '',
      'Message': inquiry.message || '',
      'Brand': inquiry.brand || '',
      'Business Name': inquiry.businessName || '',
      'Services': [
        inquiry.serviceWebsite ? 'Website' : null,
        inquiry.serviceLogo ? 'Logo' : null,
        inquiry.serviceSmm ? 'SMM' : null,
        inquiry.serviceOther ? 'Other' : null
      ].filter(Boolean).join(', '),
      'Final Quotation': inquiry.finalQuotation || '',
      'Source': inquiry.source || 'Website',
      'Last Called': inquiry.lastCalled ? new Date(inquiry.lastCalled).toLocaleDateString() : '',
      'Is Converted': inquiry.isConverted ? 'Yes' : 'No',
      'Created At': inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleString() : '',
      'Created By': inquiry.createdByName || '',
      'Created By Role': inquiry.createdByRole || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inquiries');

    const fileName = `inquiries_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const filteredInquiries = inquiries.filter(inq => {
    // Brand filter
    if (filterBrand && inq.brand !== filterBrand) {
      return false;
    }
    
    // Month filter
    if (filterMonth) {
      const inqDate = new Date(inq.createdAt);
      const month = String(inqDate.getMonth() + 1).padStart(2, '0');
      if (month !== filterMonth) return false;
    }

    // Year filter
    if (filterYear) {
      const inqDate = new Date(inq.createdAt);
      const year = String(inqDate.getFullYear());
      if (year !== filterYear) return false;
    }

    // Date Range filter
    if (filterStartDate || filterEndDate) {
      const inqDate = new Date(inq.createdAt);
      inqDate.setHours(0, 0, 0, 0);

      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        if (inqDate < start) return false;
      }

      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (inqDate > end) return false;
      }
    }
    
    // Search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      inq.name?.toLowerCase().includes(search) ||
      inq.email?.toLowerCase().includes(search) ||
      inq.phone?.toLowerCase().includes(search) ||
      inq.businessName?.toLowerCase().includes(search) ||
      inq.finalQuotation?.toLowerCase().includes(search) ||
      inq.reason?.toLowerCase().includes(search) ||
      inq.message?.toLowerCase().includes(search)
    );
  });

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
            Inquiries
          </h2>
          <p style={{
            fontSize: theme.typography.fontSizes.base,
            color: colors.textSecondary,
            margin: 0,
          }}>
            {filteredInquiries.length} {filteredInquiries.length === 1 ? 'inquiry' : 'inquiries'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center' }}>
          <button
            onClick={handleExportToExcel}
            disabled={inquiries.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              background: inquiries.length === 0 ? colors.border : '#059669',
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.base,
              cursor: inquiries.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: theme.shadows.sm,
              transition: `all ${theme.transitions.normal}`,
              opacity: inquiries.length === 0 ? 0.6 : 1,
            }}
          >
            <FaFileExcel />
            Export to Excel
          </button>
          {hasPermission('add_inquiries') && (
            <button
              onClick={handleAddOpen}
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
            Add Inquiry
          </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: theme.spacing.md,
          background: colors.errorLight,
          color: colors.error,
          borderRadius: theme.radius.md,
          marginBottom: theme.spacing.lg,
          border: `1px solid ${colors.error}`,
          fontSize: theme.typography.fontSizes.sm,
        }}>
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div style={{
        display: 'flex',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{
          position: 'relative',
          flex: 1,
          minWidth: '200px',
          maxWidth: '400px',
        }}>
          <FaSearch style={{
            position: 'absolute',
            left: theme.spacing.md,
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.textTertiary,
            fontSize: theme.typography.fontSizes.sm,
          }} />
          <input
            type="text"
            placeholder="Search inquiries..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: `${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.sm} ${theme.spacing['2xl']}`,
              borderRadius: theme.radius.md,
              border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.base,
              color: colors.textPrimary,
              background: colors.white,
            }}
          />
        </div>
        <select
          value={filterBrand}
          onChange={e => setFilterBrand(e.target.value)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.base,
            color: colors.textPrimary,
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

        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.base,
            color: colors.textPrimary,
            background: colors.white,
            cursor: 'pointer',
            minWidth: '130px',
          }}
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => {
            const date = new Date(2025, i, 1);
            const monthVal = String(i + 1).padStart(2, '0');
            return (
              <option key={monthVal} value={monthVal}>
                {date.toLocaleString('default', { month: 'long' })}
              </option>
            );
          })}
        </select>

        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.base,
            color: colors.textPrimary,
            background: colors.white,
            cursor: 'pointer',
            minWidth: '110px',
          }}
        >
          <option value="">All Years</option>
          {Array.from({ length: 5 }, (_, i) => {
            const year = new Date().getFullYear() - i;
            return (
              <option key={year} value={String(year)}>
                {year}
              </option>
            );
          })}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
            <span style={{ fontSize: theme.typography.fontSizes.sm, color: colors.textSecondary }}>From:</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                color: colors.textPrimary,
                background: colors.white,
                cursor: 'pointer',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
            <span style={{ fontSize: theme.typography.fontSizes.sm, color: colors.textSecondary }}>To:</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                color: colors.textPrimary,
                background: colors.white,
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {(filterBrand || filterMonth || filterYear || filterStartDate || filterEndDate || searchTerm) && (
          <button
            onClick={() => {
              setFilterBrand('');
              setFilterMonth('');
              setFilterYear('');
              setFilterStartDate('');
              setFilterEndDate('');
              setSearchTerm('');
            }}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              background: 'transparent',
              color: colors.primary,
              border: `1px solid ${colors.primary}`,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: theme.typography.fontSizes.sm,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            <FaTimes /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading && !inquiries.length ? (
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
          Loading inquiries...
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div style={{
          padding: theme.spacing['3xl'],
          textAlign: 'center',
          color: colors.textSecondary,
        }}>
          <p style={{ fontSize: theme.typography.fontSizes.lg, margin: 0 }}>
            {searchTerm ? 'No inquiries match your search' : 'No inquiries found'}
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
                  {['Name', 'Business Name', 'Services', 'Quotation', 'Email', 'Phone', 'Reason', 'Brand', 'Created By', 'Role', 'Date', 'Last Called', 'Status', 'Actions'].map(header => (
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
                {filteredInquiries.map(inq => (
                    <tr
                      key={inq._id}
                      onClick={() => handleEditOpen(inq)}
                      style={{
                        borderBottom: `1px solid ${colors.borderLight}`,
                        transition: `background ${theme.transitions.fast}`,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.hover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                    <td style={{
                      padding: theme.spacing.md,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: colors.textPrimary,
                    }}>
                      {inq.name}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {inq.businessName || '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {inq.serviceWebsite && <span style={{ padding: '2px 6px', background: colors.primaryBg, borderRadius: '4px', fontSize: '10px' }}>Web</span>}
                        {inq.serviceLogo && <span style={{ padding: '2px 6px', background: colors.primaryBg, borderRadius: '4px', fontSize: '10px' }}>Logo</span>}
                        {inq.serviceSmm && <span style={{ padding: '2px 6px', background: colors.primaryBg, borderRadius: '4px', fontSize: '10px' }}>SMM</span>}
                        {inq.serviceOther && <span style={{ padding: '2px 6px', background: colors.primaryBg, borderRadius: '4px', fontSize: '10px' }}>Other</span>}
                        {!inq.serviceWebsite && !inq.serviceLogo && !inq.serviceSmm && !inq.serviceOther && '-'}
                      </div>
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold }}>
                      {inq.finalQuotation || '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {inq.email}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {inq.phone}
                    </td>
                    <td style={{
                      padding: theme.spacing.md,
                      color: colors.textSecondary,
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {inq.reason || inq.message || '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {inq.brand || '-'}
                    </td>
                    <td style={{
                      padding: theme.spacing.md,
                      fontWeight: theme.typography.fontWeights.medium,
                      color: colors.textPrimary,
                    }}>
                      {inq.createdByName || 'Unknown'}
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                        borderRadius: theme.radius.full,
                        fontSize: theme.typography.fontSizes.xs,
                        fontWeight: theme.typography.fontWeights.medium,
                        background: inq.createdByRole === 'Employee' ? '#e3f2fd' : 
                                   inq.createdByRole === 'Front' ? '#f3e5f5' : 
                                   inq.createdByRole === 'Upsell' ? '#e8f5e8' : 
                                   inq.createdByRole === 'Production' ? '#fff3e0' : colors.hover,
                        color: inq.createdByRole === 'Employee' ? '#1976d2' : 
                               inq.createdByRole === 'Front' ? '#7b1fa2' : 
                               inq.createdByRole === 'Upsell' ? '#388e3c' : 
                               inq.createdByRole === 'Production' ? '#f57c00' : colors.textSecondary,
                      }}>
                        {inq.createdByRole || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {inq.lastCalled ? new Date(inq.lastCalled).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
                      {inq.isConverted ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs,
                          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.fontSizes.xs,
                          fontWeight: theme.typography.fontWeights.medium,
                          background: colors.successLight,
                          color: '#000000',
                        }}>
                          <FaCheck /> Converted
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.fontSizes.xs,
                          fontWeight: theme.typography.fontWeights.medium,
                          background: colors.warningLight,
                          color: '#000000',
                        }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ position: 'relative', display: 'inline-block' }} data-menu-container>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === inq._id ? null : inq._id);
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
                        {openMenuId === inq._id && (
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
                            {!inq.isConverted && hasPermission('convert_inquiries') && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConvertOpen(inq);
                                  setOpenMenuId(null);
                                }}
                                style={{
                                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: theme.spacing.sm,
                                  color: colors.success,
                                  borderBottom: `1px solid ${colors.borderLight}`,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = colors.successLight;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <FaUserPlus style={{ fontSize: '14px' }} />
                                <span>Convert to Client</span>
                              </div>
                            )}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditOpen(inq);
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
                                handleDelete(inq._id);
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
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: theme.zIndex.modalBackdrop,
          padding: theme.spacing.lg,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
        >
          <div style={{
            background: colors.white,
            borderRadius: theme.radius['2xl'],
            boxShadow: theme.shadows.xl,
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            zIndex: theme.zIndex.modal,
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: theme.spacing.xl,
              borderBottom: `1px solid ${colors.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: theme.typography.fontSizes['2xl'],
                fontWeight: theme.typography.fontWeights.bold,
                color: colors.textPrimary,
              }}>
                {modalMode === 'add' ? 'Add Inquiry' : 'Edit Inquiry'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  padding: theme.spacing.xs,
                  borderRadius: theme.radius.md,
                }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ padding: theme.spacing.xl }}>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                }}>
                  Name <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
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

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                }}>
                  Business Name
                </label>
                <input
                  name="businessName"
                  value={form.businessName}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                  }}
                />
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.sm,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                }}>
                  Services Requested
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.md }}>
                  {[
                    { id: 'serviceWebsite', label: 'Website' },
                    { id: 'serviceLogo', label: 'Logo' },
                    { id: 'serviceSmm', label: 'SMM' },
                    { id: 'serviceOther', label: 'Other' },
                  ].map((service) => (
                    <label key={service.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      cursor: 'pointer',
                      fontSize: theme.typography.fontSizes.sm,
                      color: colors.textPrimary,
                    }}>
                      <input
                        type="checkbox"
                        name={service.id}
                        checked={form[service.id]}
                        onChange={handleFormChange}
                        style={{ cursor: 'pointer' }}
                      />
                      {service.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                }}>
                  Final Quotation
                </label>
                <input
                  name="finalQuotation"
                  value={form.finalQuotation}
                  onChange={handleFormChange}
                  placeholder="e.g. $500"
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
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
                    Email <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
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
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: colors.textPrimary,
                  }}>
                    Phone <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
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
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                }}>
                  Reason / Message <span style={{ color: colors.error }}>*</span>
                </label>
                <textarea
                  name="reason"
                  value={form.reason || form.message || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(f => ({ ...f, reason: value, message: value }));
                  }}
                  required
                  rows={4}
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

              <div style={{ marginBottom: theme.spacing.xl }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                }}>
                  Last Called
                </label>
                <input
                  name="lastCalled"
                  type="date"
                  value={form.lastCalled}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                  }}
                />
              </div>

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
                paddingTop: theme.spacing.md,
                borderTop: `1px solid ${colors.borderLight}`,
              }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={formLoading}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    background: colors.white,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: theme.radius.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    background: colors.primary,
                    color: colors.white,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    opacity: formLoading ? 0.6 : 1,
                  }}
                >
                  {formLoading && <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />}
                  {modalMode === 'add' ? 'Add Inquiry' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Warning Modal */}
      {convertModalOpen && convertInquiry && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: theme.zIndex.modalBackdrop,
          padding: theme.spacing.lg,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !convertLoading) {
            setConvertModalOpen(false);
            setConvertInquiry(null);
          }
        }}
        >
          <div style={{
            background: colors.white,
            borderRadius: theme.radius['2xl'],
            boxShadow: theme.shadows.xl,
            width: '100%',
            maxWidth: '500px',
            zIndex: theme.zIndex.modal,
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: theme.spacing.xl,
              borderBottom: `1px solid ${colors.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: theme.typography.fontSizes['2xl'],
                fontWeight: theme.typography.fontWeights.bold,
                color: 'black',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}>
                <FaExclamationTriangle style={{ fontSize: '20px' }} /> Warning
              </h3>
              <button
                onClick={() => {
                  if (!convertLoading) {
                    setConvertModalOpen(false);
                    setConvertInquiry(null);
                  }
                }}
                disabled={convertLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textSecondary,
                  cursor: convertLoading ? 'not-allowed' : 'pointer',
                  fontSize: '1.5rem',
                  padding: theme.spacing.xs,
                  borderRadius: theme.radius.md,
                  opacity: convertLoading ? 0.5 : 1,
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: theme.spacing.xl }}>
              <div style={{
                padding: theme.spacing.lg,
                background: colors.warningLight,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
                border: `2px solid ${colors.warning}`,
              }}>
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes.base,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: '#92400e', // Darker brown/orange for better contrast on light yellow
                  lineHeight: theme.typography.lineHeights.relaxed,
                }}>
                  Are you sure you want to convert this inquiry to a client?
                </p>
              </div>

              <div style={{
                padding: theme.spacing.md,
                background: colors.primaryBg,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
                fontSize: theme.typography.fontSizes.sm,
                color: colors.textPrimary,
              }}>
                <div style={{ fontWeight: theme.typography.fontWeights.semibold, marginBottom: theme.spacing.sm }}>
                  Inquiry Details:
                </div>
                <div style={{ marginBottom: theme.spacing.xs }}><strong>Name:</strong> {convertInquiry.name}</div>
                <div style={{ marginBottom: theme.spacing.xs }}><strong>Email:</strong> {convertInquiry.email}</div>
                <div style={{ marginBottom: theme.spacing.sm }}><strong>Phone:</strong> {convertInquiry.phone}</div>
                {convertInquiry.createdByName && (
                  <div style={{
                    marginTop: theme.spacing.sm,
                    paddingTop: theme.spacing.sm,
                    borderTop: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ marginBottom: theme.spacing.xs, color: colors.textPrimary }}>
                      <strong style={{ color: colors.textPrimary }}>Created By:</strong> {convertInquiry.createdByName}
                      {convertInquiry.createdByRole && ` (${convertInquiry.createdByRole})`}
                    </div>
                    <div style={{
                      marginTop: theme.spacing.xs,
                      padding: theme.spacing.xs,
                      background: colors.successLight,
                      borderRadius: theme.radius.sm,
                      color: '#065f46', // Darker green for better contrast on light green
                      fontSize: theme.typography.fontSizes.xs,
                      fontWeight: theme.typography.fontWeights.medium,
                    }}>
                      ⓘ The client will be automatically assigned to {convertInquiry.createdByName || 'the inquiry creator'}
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: theme.spacing.md,
                paddingTop: theme.spacing.md,
                borderTop: `1px solid ${colors.borderLight}`,
              }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!convertLoading) {
                      setConvertModalOpen(false);
                      setConvertInquiry(null);
                    }
                  }}
                  disabled={convertLoading}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    background: colors.white,
                    color: 'black',
                    border: `1px solid ${colors.border}`,
                    borderRadius: theme.radius.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: convertLoading ? 'not-allowed' : 'pointer',
                    opacity: convertLoading ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConvertSubmit}
                  disabled={convertLoading}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    background: colors.warning,
                    color: 'black',
                    border: 'none',
                    borderRadius: theme.radius.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: convertLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    opacity: convertLoading ? 0.6 : 1,
                  }}
                >
                  {convertLoading && <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />}
                  Convert to Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default InquiriesPage;
