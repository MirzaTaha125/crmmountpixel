import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme, getColors } from '../theme';
import { FaPlus, FaEdit, FaTrash, FaEllipsisV, FaFileExcel } from 'react-icons/fa';
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
  const [error, setError] = useState('');
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
      
      if (filterBrand) {
        params.push(`brand=${encodeURIComponent(filterBrand)}`);
      }
      
      if (filterStatus) {
        params.push(`status=${encodeURIComponent(filterStatus)}`);
      }
      
      if (filterDisputeType) {
        params.push(`type=${encodeURIComponent(filterDisputeType)}`);
      }
      
      if (params.length > 0) {
        url += params.join('&');
      } else {
        url = `${API_URL}/api/disputes`;
      }
      
      const res = await axios.get(url, {
        headers: getAuthHeaders()
      });
      // Backend returns { disputes: [...] }, so access res.data.disputes
      const disputesData = Array.isArray(res.data) ? res.data : (res.data?.disputes || res.data || []);
      setDisputes(Array.isArray(disputesData) ? disputesData : []);
    } catch (err) {
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
      
      if (params.length > 0) {
        url += `&${params.join('&')}`;
      }
      
      const res = await axios.get(url, {
        headers: getAuthHeaders()
      });
      
      // Transform payment history to dispute-like format
      const paymentsData = Array.isArray(res.data) ? res.data : (res.data?.payments || []);
      let transformed = paymentsData.map(payment => ({
        _id: payment._id,
        type: 'Client Chargeback',
        clientId: payment.clientId?._id || payment.clientId,
        clientName: payment.clientId?.name || '',
        amount: payment.amount,
        currency: payment.currency || 'USD',
        description: payment.description || '',
        status: 'Active', // Payment disputes are always Active
        disputeDate: payment.paymentDate || payment.createdAt,
        notes: payment.notes || '',
        brand: payment.clientId?.brand || '',
        source: 'payment_history',
        invoiceNumber: payment.invoiceNumber || '',
        paymentMethod: payment.paymentMethod || ''
      }));
      
      // Apply brand filter if set
      if (filterBrand) {
        transformed = transformed.filter(p => p.brand === filterBrand);
      }
      
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
    
    if (value.length >= 2) {
      setClientDropdownOpen(true);
    } else {
      setClientDropdownOpen(false);
    }
  };

  const handleClientSelect = (client) => {
    setForm(prev => ({ ...prev, clientId: client._id, clientName: client.name }));
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

      const payload = {
        ...form,
        amount: parseFloat(form.amount)
      };

      if (editingDispute) {
        await axios.put(`${API_URL}/api/disputes/${editingDispute._id}`, payload, {
          headers: getAuthHeaders()
        });
      } else {
        await axios.post(`${API_URL}/api/disputes`, payload, {
          headers: getAuthHeaders()
        });
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
      await axios.delete(`${API_URL}/api/disputes/${disputeId}`, {
        headers: getAuthHeaders()
      });
      fetchDisputes();
    } catch (err) {
      alert('Failed to delete dispute');
    }
  };

  // Combine disputes and payment disputes
  const allDisputes = [...(Array.isArray(disputes) ? disputes : []), ...(Array.isArray(paymentDisputes) ? paymentDisputes : [])];

  const handleExportToExcel = () => {
    if (allDisputes.length === 0) {
      alert('No disputes to export');
      return;
    }

    setExportLoading(true);

    try {
      const worksheetData = allDisputes.map(dispute => ({
        'Type': dispute.type,
        'Client Name': dispute.clientName || dispute.clientId?.name || '-',
        'Client Email': dispute.clientId?.email || '-',
        'Amount': parseFloat(dispute.amount || 0).toFixed(2),
        'Currency': dispute.currency || 'USD',
        'Description': dispute.description || '-',
        'Status': dispute.status,
        'Brand': dispute.brand || '-',
        'Dispute Date': dispute.disputeDate ? new Date(dispute.disputeDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
        'Notes': dispute.notes || '-',
        'Created At': dispute.createdAt ? new Date(dispute.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
      }));

      const totalAmount = allDisputes.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
      const summaryRow = {
        'Type': '',
        'Client Name': 'SUMMARY',
        'Client Email': '',
        'Amount': totalAmount.toFixed(2),
        'Currency': 'USD',
        'Description': '',
        'Status': `Total: ${allDisputes.length} | Active: ${allDisputes.filter(d => d.status === 'Active').length} | Won: ${allDisputes.filter(d => d.status === 'Won').length} | Loss: ${allDisputes.filter(d => d.status === 'Loss').length}`,
        'Brand': '',
        'Dispute Date': '',
        'Notes': '',
        'Created At': ''
      };
      worksheetData.push(summaryRow);

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      const maxWidth = 50;
      const colWidths = [];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLength = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellLength = cell.v.toString().length;
            if (cellLength > maxLength) {
              maxLength = cellLength;
            }
          }
        }
        colWidths.push({ wch: Math.min(maxLength + 2, maxWidth) });
      }
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Disputes');

      let filename = 'Disputes';
      if (filterType === 'month') {
        const monthName = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
        filename += `_${monthName}_${selectedYear}`;
      } else if (filterType === 'date' && startDate && endDate) {
        filename += `_${startDate}_to_${endDate}`;
      }
      if (filterBrand) {
        filename += `_${filterBrand.replace(/\s+/g, '_')}`;
      }
      filename += '.xlsx';

      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export to Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
  ).slice(0, 10);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: colors.text }}>Disputes</h2>
      </div>

      {/* Filter Section */}
      <div style={{
        background: colors.cardBg,
        borderRadius: 12,
        padding: '16px 24px',
        marginBottom: 24,
        border: `1px solid ${colors.border}`,
        boxShadow: colors.cardShadow,
      }}>
        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
          width: '100%',
        }}>
          {/* Filter Type Buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.text,
              whiteSpace: 'nowrap',
              marginRight: 8,
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
                padding: '6px 16px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                background: filterType === 'month' ? colors.accent : colors.cardBg,
                color: filterType === 'month' ? '#fff' : colors.text,
                cursor: 'pointer',
                fontWeight: 500,
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
                padding: '6px 16px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                background: filterType === 'date' ? colors.accent : colors.cardBg,
                color: filterType === 'date' ? '#fff' : colors.text,
                cursor: 'pointer',
                fontWeight: 500,
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
            margin: '0 8px',
          }} />

          {/* Month/Year or Date Range */}
          {filterType === 'month' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                }}>
                  Month:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    fontSize: 14,
                    background: colors.cardBg,
                    cursor: 'pointer',
                    minWidth: '120px',
                  }}
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                }}>
                  Year:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    fontSize: 14,
                    background: colors.cardBg,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                }}>
                  Start:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    fontSize: 14,
                    background: colors.cardBg,
                    cursor: 'pointer',
                    minWidth: '140px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
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
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    fontSize: 14,
                    background: colors.cardBg,
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
            margin: '0 8px',
          }} />

          {/* Brand Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.text,
              whiteSpace: 'nowrap',
            }}>
              Brand:
            </label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                background: colors.cardBg,
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

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.text,
              whiteSpace: 'nowrap',
            }}>
              Status:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                background: colors.cardBg,
                cursor: 'pointer',
                minWidth: '140px',
              }}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Won">Won</option>
              <option value="Loss">Loss</option>
              <option value="Approved">Approved</option>
              <option value="Send">Send</option>
            </select>
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.text,
              whiteSpace: 'nowrap',
            }}>
              Type:
            </label>
            <select
              value={filterDisputeType}
              onChange={(e) => setFilterDisputeType(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                background: colors.cardBg,
                cursor: 'pointer',
                minWidth: '180px',
              }}
            >
              <option value="">All Types</option>
              <option value="Client Chargeback">Client Chargeback</option>
              <option value="Non-Client Chargeback">Non-Client Chargeback</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', alignItems: 'center' }}>
            <button 
              onClick={handleExportToExcel}
              disabled={exportLoading || allDisputes.length === 0}
              style={{ 
                padding: '8px 20px', 
                background: exportLoading || allDisputes.length === 0 ? colors.accentLight : '#10b981', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                fontWeight: 600, 
                fontSize: 14,
                cursor: exportLoading || allDisputes.length === 0 ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: exportLoading || allDisputes.length === 0 ? 0.6 : 1,
              }}
            >
              <FaFileExcel />
              {exportLoading ? 'Exporting...' : 'Export to Excel'}
            </button>
            <button 
              onClick={handleAdd}
              style={{ 
                padding: '10px 28px', 
                background: colors.accent, 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                fontWeight: 800, 
                fontSize: 18,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FaPlus />
              Add Dispute
            </button>
          </div>
        </div>
      </div>

      {/* Disputes Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.text }}>Loading...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.dangerDark }}>{error}</div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: '100%', background: colors.cardBg, borderRadius: 10, boxShadow: colors.cardShadow }}>
            <thead>
              <tr>
                <th style={{ padding: 10 }}>Type</th>
                <th style={{ padding: 10 }}>Client</th>
                <th style={{ padding: 10 }}>Amount</th>
                <th style={{ padding: 10 }}>Currency</th>
                <th style={{ padding: 10 }}>Status</th>
                <th style={{ padding: 10 }}>Brand</th>
                <th style={{ padding: 10 }}>Dispute Date</th>
                <th style={{ padding: 10 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allDisputes.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: colors.muted, padding: 40 }}>No disputes found.</td></tr>
              ) : allDisputes.map(dispute => (
                <tr key={dispute._id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: 10 }}>
                    {dispute.source === 'payment_history' ? (
                      <span style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>Payment Dispute</span>
                    ) : (
                      dispute.type
                    )}
                  </td>
                  <td style={{ padding: 10 }}>{dispute.clientName || dispute.clientId?.name || '-'}</td>
                  <td style={{ padding: 10 }}>${parseFloat(dispute.amount || 0).toFixed(2)}</td>
                  <td style={{ padding: 10 }}>{dispute.currency || 'USD'}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: 
                        dispute.status === 'Won' ? '#10b98120' :
                        dispute.status === 'Loss' ? '#ef444420' :
                        dispute.status === 'Approved' ? '#3b82f620' :
                        dispute.status === 'Send' ? '#f59e0b20' :
                        '#6366f120',
                      color:
                        dispute.status === 'Won' ? '#10b981' :
                        dispute.status === 'Loss' ? '#ef4444' :
                        dispute.status === 'Approved' ? '#3b82f6' :
                        dispute.status === 'Send' ? '#f59e0b' :
                        '#6366f1',
                    }}>
                      {dispute.status}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>{dispute.brand || dispute.clientId?.brand || '-'}</td>
                  <td style={{ padding: 10 }}>{dispute.disputeDate ? new Date(dispute.disputeDate).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: 10, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    {dispute.source === 'payment_history' ? (
                      <span style={{ fontSize: 12, color: colors.textSecondary }}>From Payment</span>
                    ) : (
                      <div style={{ position: 'relative', display: 'inline-block' }} data-menu-container>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === dispute._id ? null : dispute._id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '18px',
                            color: colors.text || '#333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.accentLight || 'rgba(0,0,0,0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FaEllipsisV />
                        </button>
                        {openMenuId === dispute._id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              background: colors.cardBg || '#fff',
                              border: `1px solid ${colors.border || '#ddd'}`,
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              zIndex: 1000,
                              minWidth: '150px',
                              marginTop: '4px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(dispute);
                                setOpenMenuId(null);
                              }}
                              style={{
                                padding: '10px 16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: colors.text || '#333',
                                borderBottom: `1px solid ${colors.border || '#eee'}`,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.accentLight || 'rgba(0,0,0,0.05)';
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
                                handleDelete(dispute._id);
                                setOpenMenuId(null);
                              }}
                              style={{
                                padding: '10px 16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: colors.dangerDark || '#dc2626',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.accentLight || 'rgba(0,0,0,0.05)';
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.cardBg, borderRadius: 20, padding: '48px 56px', minWidth: 800, maxWidth: 1200, width: '90%', boxShadow: colors.cardShadow, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 32, fontWeight: 800, color: colors.text, fontSize: 28 }}>
              {editingDispute ? 'Edit Dispute' : 'Add Dispute'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Type *</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                    required
                  >
                    <option value="Client Chargeback">Client Chargeback</option>
                    <option value="Non-Client Chargeback">Non-Client Chargeback</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Status *</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Won">Won</option>
                    <option value="Loss">Loss</option>
                    <option value="Approved">Approved</option>
                    <option value="Send">Send</option>
                  </select>
                </div>
              </div>

              {/* Client Selection - Full Width */}
              {form.type === 'Client Chargeback' && (
                <div style={{ position: 'relative' }}>
                  <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Client *</label>
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={handleClientSearch}
                    onFocus={() => { if (filteredClients.length > 0) setClientDropdownOpen(true); }}
                    onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                    placeholder="Search and select client..."
                    style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                    required={form.type === 'Client Chargeback'}
                  />
                  {clientDropdownOpen && filteredClients.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: colors.cardBg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 7,
                      zIndex: 10,
                      maxHeight: 200,
                      overflowY: 'auto',
                      marginTop: 4,
                      boxShadow: colors.cardShadow,
                    }}>
                      {filteredClients.map(client => (
                        <div
                          key={client._id}
                          onMouseDown={() => handleClientSelect(client)}
                          style={{
                            padding: 10,
                            cursor: 'pointer',
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.accentLight;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {client.name} {client.email && `(${client.email})`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {form.type === 'Non-Client Chargeback' && (
                <div>
                  <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Client Name (Manual Entry)</label>
                  <input
                    type="text"
                    name="clientName"
                    value={form.clientName}
                    onChange={handleFormChange}
                    placeholder="Enter client name manually"
                    style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                  />
                </div>
              )}

              {/* Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleFormChange}
                    step="0.01"
                    min="0"
                    style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Currency</label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                  >
                    <option value="USD">USD</option>
                    <option value="PKR">PKR</option>
                  </select>
                </div>
              </div>

              {/* Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Brand</label>
                  <select
                    name="brand"
                    value={form.brand}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                  >
                    <option value="">-- Select Brand --</option>
                    <option value="Webdevelopers Inc">Webdevelopers Inc</option>
                    <option value="American Design Eagle">American Design Eagle</option>
                    <option value="Mount Pixels">Mount Pixels</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Dispute Date *</label>
                  <input
                    type="date"
                    name="disputeDate"
                    value={form.disputeDate}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                    required
                  />
                </div>
              </div>

              {/* Full Width Text Areas */}
              <div>
                <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, color: colors.text, display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                />
              </div>

              {formError && <div style={{ color: colors.dangerDark, marginBottom: 12, fontWeight: 700 }}>{formError}</div>}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingDispute(null);
                    setFormError('');
                  }}
                  style={{ padding: '10px 22px', background: colors.accentLight, color: colors.text, border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={{ padding: '10px 22px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16 }}
                >
                  {formLoading ? 'Saving...' : editingDispute ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DisputesPage;

