import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { sendEmail } from '../services/emailService';
import getApiBaseUrl from '../apiBase';
import { usePermissions } from '../contexts/PermissionContext';
import ClientDetailsModal from './ClientDetailsModal';
import { theme, getColors } from '../theme';
import { FaPlus, FaSearch, FaTrash, FaEnvelope, FaEye, FaSpinner, FaTimes, FaFileExcel, FaEllipsisV } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const API_URL = getApiBaseUrl();

function ClientsPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const { hasPermission, canDo } = usePermissions();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientForm, setClientForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    companyName: '',
    brand: '',
    password: ''
  });
  const [clientError, setClientError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailClient, setEmailClient] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterAssignment, setFilterAssignment] = useState(() => {
    // Check if there's a filter value from dashboard
    const savedFilter = localStorage.getItem('clientsPageFilterAssignment');
    if (savedFilter) {
      localStorage.removeItem('clientsPageFilterAssignment'); // Clear after reading
      return savedFilter;
    }
    return '';
  });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsClient, setDetailsClient] = useState(null);
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

  function getAuthHeaders() {
    const token = localStorage.getItem('token') || 
                  (() => {
                    const user = JSON.parse(localStorage.getItem('crm_user') || 'null');
                    return user?.token;
                  })();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users`, { headers: getAuthHeaders() });
      setUsers((res.data || []).filter(u => u.Role === 'Employee'));
    } catch (err) {}
  };

  const fetchClients = async (filters = {}) => {
    setLoading(true);
    try {
      const params = {};
      if (filters.name) params.name = filters.name;
      if (filters.status) params.status = filters.status;
      if (filters.brand) params.brand = filters.brand;
      if (filters.employee) {
        if (filters.employee === 'unassigned') {
          params.assignedEmployee = 'unassigned';
        } else {
          params.assignedEmployee = filters.employee;
        }
      }
      // Handle assignment status filter (assigned/unassigned)
      if (filters.assignment) {
        params.assignedEmployee = filters.assignment;
      }
      const res = await axios.get(`${API_URL}/api/clients`, { params, headers: getAuthHeaders() });
      setClients(res.data.clients || []);
      setClientError('');
    } catch (err) {
      setClientError('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchClients(); 
    fetchUsers(); 
  }, []);

  useEffect(() => {
    fetchClients({ name: filterName, status: filterStatus, employee: filterEmployee, brand: filterBrand, assignment: filterAssignment });
  }, [filterName, filterStatus, filterEmployee, filterBrand, filterAssignment]);

  const openClientAddModal = () => {
    setClientForm({ 
      name: '', email: '', phone: '', companyName: '', brand: '', password: ''
    });
    setSelectedClient(null);
    setClientModalOpen(true);
    setClientError('');
  };

  const openClientEditModal = (client) => {
    setClientForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      companyName: client.companyName || '',
      brand: client.brand || '',
      password: '' // Don't show existing password, leave blank for optional update
    });
    setSelectedClient(client);
    setClientModalOpen(true);
    setClientError('');
  };

  const closeClientModal = () => {
    setClientModalOpen(false);
    setSelectedClient(null);
    setClientError('');
  };

  const handleClientFormChange = (e) => {
    const { name, value } = e.target;
    setClientForm(f => ({ ...f, [name]: value }));
  };

  const handleClientSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClientError('');

    if (!clientForm.name || !clientForm.email || !clientForm.phone) {
      setClientError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      if (!selectedClient && !hasPermission('add_clients')) {
        setClientError('You do not have permission to add clients');
        setLoading(false);
        return;
      }

      const payload = { ...clientForm };
      if (payload.assignedEmployee === '') payload.assignedEmployee = null;
      if (!payload.assignedEmployee) delete payload.assignedEmployee;

      if (selectedClient) {
        if (!hasPermission('edit_clients')) {
          setClientError('You do not have permission to edit clients');
          setLoading(false);
          return;
        }
        await axios.put(`${API_URL}/api/clients/${selectedClient._id}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/api/clients`, payload, { headers });
      }
      setClientModalOpen(false);
      fetchClients();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error saving client';
      setClientError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClientDelete = async (client) => {
    if (!window.confirm(`Are you sure you want to delete ${client.name}?`)) return;
    
    if (!hasPermission('delete_clients')) {
      setClientError('You do not have permission to delete clients');
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/clients/${client._id}`, { headers: getAuthHeaders() });
      fetchClients();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Error deleting client';
      setClientError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const openEmailModal = (client) => {
    setEmailClient(client);
    setEmailSubject('');
    setEmailMessage('');
    setEmailStatus('');
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setEmailModalOpen(false);
    setEmailClient(null);
    setEmailStatus('');
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailStatus('Sending...');
    try {
      await sendEmail({
        to: emailClient.email,
        toName: emailClient.name,
        subject: emailSubject || 'Message from CRM',
        html: emailMessage.replace(/\n/g, '<br>'),
        text: emailMessage,
      });
      setEmailStatus('Email sent successfully!');
      setTimeout(() => closeEmailModal(), 1500);
    } catch (err) {
      setEmailStatus(err.message || 'Failed to send email. Please check your work email configuration.');
    }
  };

  const handleExportToExcel = async () => {
    if (clients.length === 0) {
      alert('No clients to export');
      return;
    }

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      
      // Fetch payment history for all clients
      const clientsWithPayments = await Promise.all(
        clients.map(async (client) => {
          try {
            const paymentRes = await axios.get(
              `${API_URL}/api/payment-history/client/${client._id}`,
              { headers }
            );
            const paymentHistory = paymentRes.data || [];
            
            // Calculate totals from payment history
            const totalAmount = paymentHistory.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
            const paidAmount = paymentHistory
              .filter(payment => payment.status === 'Completed')
              .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
            const dueAmount = paymentHistory
              .filter(payment => payment.status === 'Pending')
              .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
            
            return {
              'Client ID': client.clientId || '-',
              'Name': client.name,
              'Email': client.email,
              'Phone': client.phone,
              'Company Name': client.companyName || '',
              'Brand': client.brand || '',
              'Total Amount': totalAmount,
              'Paid Amount': paidAmount,
              'Due Amount': dueAmount,
              'Status': client.status || 'Active',
              'Created At': client.createdAt ? new Date(client.createdAt).toLocaleString() : '',
              'Updated At': client.updatedAt ? new Date(client.updatedAt).toLocaleString() : ''
            };
          } catch (err) {
            console.error(`Error fetching payment history for client ${client._id}:`, err);
            // If payment history fetch fails, use client's own fields as fallback
            return {
              'Client ID': client.clientId || '-',
              'Name': client.name,
              'Email': client.email,
              'Phone': client.phone,
              'Company Name': client.companyName || '',
              'Brand': client.brand || '',
              'Total Amount': client.totalAmount || 0,
              'Paid Amount': client.paidAmount || 0,
              'Due Amount': client.dueAmount || 0,
              'Status': client.status || 'Active',
              'Created At': client.createdAt ? new Date(client.createdAt).toLocaleString() : '',
              'Updated At': client.updatedAt ? new Date(client.updatedAt).toLocaleString() : ''
            };
          }
        })
      );

      // Prepare data with proper formatting
      const formattedData = clientsWithPayments.map(client => ({
        'Client ID': client['Client ID'] || '-',
        'Name': client.Name,
        'Email': client.Email,
        'Phone': client.Phone,
        'Company Name': client['Company Name'] || '-',
        'Brand': client.Brand || '-',
        'Total Amount': parseFloat(client['Total Amount'] || 0).toFixed(2),
        'Paid Amount': parseFloat(client['Paid Amount'] || 0).toFixed(2),
        'Due Amount': parseFloat(client['Due Amount'] || 0).toFixed(2),
        'Status': client.Status,
        'Created At': client['Created At'],
        'Updated At': client['Updated At']
      }));

      // Add summary row
      const totalClients = formattedData.length;
      const grandTotalAmount = clientsWithPayments.reduce((sum, c) => sum + parseFloat(c['Total Amount'] || 0), 0);
      const grandPaidAmount = clientsWithPayments.reduce((sum, c) => sum + parseFloat(c['Paid Amount'] || 0), 0);
      const grandDueAmount = clientsWithPayments.reduce((sum, c) => sum + parseFloat(c['Due Amount'] || 0), 0);
      
      const summaryRow = {
        'Client ID': '',
        'Name': 'TOTAL',
        'Email': '',
        'Phone': '',
        'Company Name': `${totalClients} Clients`,
        'Brand': '',
        'Total Amount': grandTotalAmount.toFixed(2),
        'Paid Amount': grandPaidAmount.toFixed(2),
        'Due Amount': grandDueAmount.toFixed(2),
        'Status': '',
        'Created At': '',
        'Updated At': ''
      };
      formattedData.push(summaryRow);

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Auto-size columns
      const maxWidth = 50;
      const colWidths = [];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
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

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

      // Generate filename with filter info if applicable
      let fileName = `clients_${new Date().toISOString().split('T')[0]}`;
      if (filterName) {
        fileName += `_filtered`;
      }
      if (filterStatus && filterStatus !== 'All') {
        fileName += `_${filterStatus}`;
      }
      if (filterBrand) {
        fileName += `_${filterBrand.replace(/\s+/g, '_')}`;
      }
      if (filterEmployee) {
        fileName += `_employee_${filterEmployee.replace(/\s+/g, '_')}`;
      }
      fileName += '.xlsx';
      
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            Clients
          </h2>
          <p style={{
            fontSize: theme.typography.fontSizes.base,
            color: colors.textSecondary,
            margin: 0,
          }}>
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center' }}>
          <button
            onClick={handleExportToExcel}
            disabled={clients.length === 0 || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              background: clients.length === 0 || loading ? colors.border : '#059669',
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.base,
              cursor: clients.length === 0 || loading ? 'not-allowed' : 'pointer',
              boxShadow: theme.shadows.sm,
              transition: `all ${theme.transitions.normal}`,
              opacity: clients.length === 0 || loading ? 0.6 : 1,
            }}
          >
            {loading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaFileExcel />}
            {loading ? 'Exporting...' : 'Export to Excel'}
          </button>
        {hasPermission('add_clients') && (
          <button
            onClick={openClientAddModal}
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
            Add Client
          </button>
        )}
        </div>
      </div>

      {/* Error Message */}
      {clientError && (
        <div style={{
          padding: theme.spacing.md,
          background: colors.errorLight,
          color: colors.error,
          borderRadius: theme.radius.md,
          marginBottom: theme.spacing.lg,
          border: `1px solid ${colors.error}`,
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.medium,
        }}>
          {clientError}
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
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
            placeholder="Search by name or client ID (e.g., ADE001)..."
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            style={{
              width: '100%',
              padding: `${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.sm} ${theme.spacing['2xl']}`,
              borderRadius: theme.radius.md,
              border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.base,
              color: colors.textPrimary,
              background: colors.white,
              transition: `all ${theme.transitions.normal}`,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary;
              e.target.style.boxShadow = `0 0 0 3px ${colors.primaryBg}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.base,
            color: colors.textPrimary,
            background: colors.white,
            cursor: 'pointer',
            minWidth: '150px',
          }}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Processing">Processing</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
        </select>
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
          value={filterAssignment}
          onChange={e => setFilterAssignment(e.target.value)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.base,
            color: colors.textPrimary,
            background: colors.white,
            cursor: 'pointer',
            minWidth: '150px',
          }}
        >
          <option value="">All Clients</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {/* Table */}
      {loading && !clients.length ? (
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
          Loading clients...
        </div>
      ) : clients.length === 0 ? (
        <div style={{
          padding: theme.spacing['3xl'],
          textAlign: 'center',
          color: colors.textSecondary,
        }}>
          <p style={{ fontSize: theme.typography.fontSizes.lg, margin: 0 }}>
            No clients found
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
                  {[
                    'Client ID',
                    canDo('view_client_name') && 'Name',
                    canDo('view_client_email') && 'Email',
                    canDo('view_client_phone') && 'Phone',
                    'Company',
                    'Brand',
                    'Status',
                    'Created',
                    'Actions'
                  ].filter(Boolean).map(header => (
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
                {[...clients].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(client => (
                  <tr
                    key={client._id}
                    style={{
                      borderBottom: `1px solid ${colors.borderLight}`,
                      cursor: 'pointer',
                      transition: `background ${theme.transitions.fast}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    onClick={() => {
                      setDetailsClient(client);
                      setDetailsModalOpen(true);
                    }}
                  >
                    <td style={{
                      padding: theme.spacing.md,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: colors.primary,
                      fontFamily: 'monospace',
                    }}>
                      {client.clientId || '-'}
                    </td>
                    {canDo('view_client_name') && (
                    <td style={{
                      padding: theme.spacing.md,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: colors.textPrimary,
                    }}>
                      {client.name}
                    </td>
                    )}
                    {canDo('view_client_email') && (
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {client.email}
                    </td>
                    )}
                    {canDo('view_client_phone') && (
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {client.phone}
                    </td>
                    )}
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {client.companyName || '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {client.brand || '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                        borderRadius: theme.radius.full,
                        fontSize: theme.typography.fontSizes.xs,
                        fontWeight: theme.typography.fontWeights.medium,
                        background: client.status === 'Active' ? colors.successLight : 
                                   client.status === 'Processing' ? colors.infoLight :
                                   client.status === 'Completed' ? colors.successLight : colors.warningLight,
                        color: client.status === 'Active' ? colors.success :
                               client.status === 'Processing' ? colors.info :
                               client.status === 'Completed' ? colors.success : colors.warning,
                      }}>
                        {client.status}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ position: 'relative', display: 'inline-block' }} data-menu-container>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === client._id ? null : client._id);
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
                        {openMenuId === client._id && (
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
                                setDetailsClient(client);
                                setDetailsModalOpen(true);
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
                              <FaEye style={{ fontSize: '14px' }} />
                              <span>View Details</span>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                openEmailModal(client);
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
                                e.currentTarget.style.backgroundColor = colors.infoLight;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <FaEnvelope style={{ fontSize: '14px' }} />
                              <span>Send Email</span>
                            </div>
                        {hasPermission('delete_clients') && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClientDelete(client);
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
                            )}
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

      {/* Add/Edit Client Modal */}
      {clientModalOpen && (
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
          if (e.target === e.currentTarget) closeClientModal();
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
                {selectedClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button
                onClick={closeClientModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  padding: theme.spacing.xs,
                  borderRadius: theme.radius.md,
                  display: 'flex',
                  alignItems: 'center',
                  transition: `all ${theme.transitions.normal}`,
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = colors.hover;
                  e.target.style.color = colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = colors.textSecondary;
                }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleClientSave} style={{ padding: theme.spacing.xl }}>
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
                  value={clientForm.name}
                  onChange={handleClientFormChange}
                  required
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    color: colors.textPrimary,
                    background: colors.white,
                    transition: `all ${theme.transitions.normal}`,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.primary;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.primaryBg}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.border;
                    e.target.style.boxShadow = 'none';
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
                    value={clientForm.email}
                    onChange={handleClientFormChange}
                    required
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: theme.typography.fontSizes.base,
                      color: colors.textPrimary,
                      background: colors.white,
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
                    value={clientForm.phone}
                    onChange={handleClientFormChange}
                    required
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: theme.typography.fontSizes.base,
                      color: colors.textPrimary,
                      background: colors.white,
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
                  Company Name
                </label>
                <input
                  name="companyName"
                  value={clientForm.companyName}
                  onChange={handleClientFormChange}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    color: colors.textPrimary,
                    background: colors.white,
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
                  value={clientForm.brand}
                  onChange={handleClientFormChange}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: 'pointer',
                    background: colors.white,
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
                  Password {selectedClient ? '(leave blank to keep current)' : '(optional - for client panel access)'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={clientForm.password}
                  onChange={handleClientFormChange}
                  placeholder={selectedClient ? "Enter new password or leave blank" : "Set password for client panel access"}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    color: colors.textPrimary,
                    background: colors.white,
                  }}
                />
                {!selectedClient && (
                  <p style={{
                    margin: `${theme.spacing.xs} 0 0 0`,
                    fontSize: theme.typography.fontSizes.xs,
                    color: colors.textSecondary,
                    fontStyle: 'italic'
                  }}>
                    If set, the client can log in to view their pending invoices
                  </p>
                )}
              </div>


              {clientError && (
                <div style={{
                  padding: theme.spacing.md,
                  background: colors.errorLight,
                  color: colors.error,
                  borderRadius: theme.radius.md,
                  marginBottom: theme.spacing.lg,
                  fontSize: theme.typography.fontSizes.sm,
                }}>
                  {clientError}
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
                  onClick={closeClientModal}
                  disabled={loading}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    background: colors.white,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: theme.radius.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: `all ${theme.transitions.normal}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.target.style.background = colors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = colors.white;
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    background: colors.primary,
                    color: colors.white,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    transition: `all ${theme.transitions.normal}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.background = colors.primaryDark;
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = colors.primary;
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {loading && <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />}
                  {selectedClient ? 'Save Changes' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModalOpen && emailClient && (
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
          if (e.target === e.currentTarget) closeEmailModal();
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
                color: colors.textPrimary,
              }}>
                Send Email
              </h3>
              <button
                onClick={closeEmailModal}
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

            <form onSubmit={handleSendEmail} style={{ padding: theme.spacing.xl }}>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                }}>
                  To
                </label>
                <input
                  value={emailClient.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    background: colors.hover,
                    color: colors.textSecondary,
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
                  Subject <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
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

              <div style={{ marginBottom: theme.spacing.xl }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                }}>
                  Message <span style={{ color: colors.error }}>*</span>
                </label>
                <textarea
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  required
                  rows={6}
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

              {emailStatus && (
                <div style={{
                  padding: theme.spacing.md,
                  background: emailStatus.includes('success') ? colors.successLight : colors.errorLight,
                  color: emailStatus.includes('success') ? colors.success : colors.error,
                  borderRadius: theme.radius.md,
                  marginBottom: theme.spacing.lg,
                  fontSize: theme.typography.fontSizes.sm,
                }}>
                  {emailStatus}
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
                  onClick={closeEmailModal}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    background: colors.white,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: theme.radius.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    background: colors.primary,
                    color: colors.white,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: 'pointer',
                  }}
                >
                  Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      <ClientDetailsModal 
        client={detailsClient} 
        open={detailsModalOpen} 
        onClose={() => {
          setDetailsModalOpen(false);
          setDetailsClient(null);
        }} 
        colors={colors} 
        userRole="Admin" 
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ClientsPage;
