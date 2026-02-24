import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaFilter, FaSearch, FaDownload, FaClock, FaUser, FaTag, FaBox, FaTrash } from 'react-icons/fa';

const API_URL = getApiBaseUrl();

function ActivityLogsPage({ colors }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entityType: '',
    module: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearDays, setClearDays] = useState('');
  const [clearing, setClearing] = useState(false);

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await axios.get(`${API_URL}/api/activity-logs?${params}`, {
        headers: getAuthHeaders()
      });

      setLogs(response.data.logs || []);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to fetch activity logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await axios.get(`${API_URL}/api/activity-logs/stats?${params}`, {
        headers: getAuthHeaders()
      });

      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page]);

  useEffect(() => {
    // Reset to page 1 when filters change
    if (page === 1) {
      fetchLogs();
      fetchStats();
    } else {
      setPage(1);
    }
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      entityType: '',
      module: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setPage(1);
  };

  // Clear logs function
  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear activity logs? This action cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      const params = new URLSearchParams();
      if (clearDays) {
        params.append('days', clearDays);
      }

      await axios.delete(`${API_URL}/api/activity-logs${clearDays ? `?${params}` : ''}`, {
        headers: getAuthHeaders()
      });

      setShowClearModal(false);
      setClearDays('');
      setPage(1);
      await fetchLogs();
      await fetchStats();
      alert('Activity logs cleared successfully!');
    } catch (err) {
      console.error('Error clearing logs:', err);
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to clear activity logs');
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action) => {
    if (action.includes('created')) return '#27ae60';
    if (action.includes('updated')) return '#3498db';
    if (action.includes('deleted')) return '#e74c3c';
    if (action.includes('completed')) return '#2ecc71';
    if (action.includes('login') && !action.includes('failed')) return '#16a085';
    if (action.includes('logout')) return '#8e44ad';
    if (action.includes('login_failed')) return '#e67e22';
    return '#95a5a6';
  };

  const getActionIcon = (action) => {
    // Return empty string - emojis removed
    return '';
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: colors.text, fontWeight: 700, fontSize: 28 }}>Activity Logs</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '10px 20px',
              background: colors.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600
            }}
          >
            <FaFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button
            onClick={() => setShowClearModal(true)}
            style={{
              padding: '10px 20px',
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600
            }}
          >
            <FaTrash /> Clear Logs
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: colors.cardBg, padding: 20, borderRadius: 10, border: `1px solid ${colors.border}` }}>
            <div style={{ color: colors.muted, fontSize: 14, marginBottom: 8 }}>Total Activities</div>
            <div style={{ color: colors.text, fontSize: 32, fontWeight: 700 }}>{stats.total || 0}</div>
          </div>
          <div style={{ background: colors.cardBg, padding: 20, borderRadius: 10, border: `1px solid ${colors.border}` }}>
            <div style={{ color: colors.muted, fontSize: 14, marginBottom: 8 }}>Top Module</div>
            <div style={{ color: colors.text, fontSize: 18, fontWeight: 600 }}>
              {stats.byModule && stats.byModule.length > 0 ? stats.byModule[0]._id : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div style={{ 
          background: colors.cardBg, 
          padding: 20, 
          borderRadius: 10, 
          marginBottom: 24,
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: colors.text, fontWeight: 600 }}>Search</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search in descriptions..."
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 7,
                  border: `1px solid ${colors.border}`,
                  background: colors.accentLight,
                  color: colors.text
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: colors.text, fontWeight: 600 }}>Action</label>
              <select
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 7,
                  border: `1px solid ${colors.border}`,
                  background: colors.accentLight,
                  color: colors.text
                }}
              >
                <option value="">All Actions</option>
                <option value="user_created">User Created</option>
                <option value="user_updated">User Updated</option>
                <option value="user_deleted">User Deleted</option>
                <option value="client_created">Client Created</option>
                <option value="client_updated">Client Updated</option>
                <option value="client_deleted">Client Deleted</option>
                <option value="payment_link_created">Payment Link Created</option>
                <option value="payment_link_updated">Payment Link Updated</option>
                <option value="payment_link_deleted">Payment Link Deleted</option>
                <option value="payment_completed">Payment Completed</option>
                <option value="payment_created">Payment Created</option>
                <option value="payment_updated">Payment Updated</option>
                <option value="payment_deleted">Payment Deleted</option>
                <option value="payment_status_changed">Payment Status Changed</option>
                <option value="user_login">User Login</option>
                <option value="user_logout">User Logout</option>
                <option value="user_login_failed">User Login Failed</option>
                <option value="client_login">Client Login</option>
                <option value="client_logout">Client Logout</option>
                <option value="client_login_failed">Client Login Failed</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: colors.text, fontWeight: 600 }}>Module</label>
              <select
                name="module"
                value={filters.module}
                onChange={handleFilterChange}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 7,
                  border: `1px solid ${colors.border}`,
                  background: colors.accentLight,
                  color: colors.text
                }}
              >
                <option value="">All Modules</option>
                <option value="Users">Users</option>
                <option value="Clients">Clients</option>
                <option value="Payments">Payments</option>
                <option value="Packages">Packages</option>
                <option value="Employees">Employees</option>
                <option value="Expenses">Expenses</option>
                <option value="Inquiries">Inquiries</option>
                <option value="Authentication">Authentication</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: colors.text, fontWeight: 600 }}>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 7,
                  border: `1px solid ${colors.border}`,
                  background: colors.accentLight,
                  color: colors.text
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: colors.text, fontWeight: 600 }}>End Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 7,
                  border: `1px solid ${colors.border}`,
                  background: colors.accentLight,
                  color: colors.text
                }}
              />
            </div>
          </div>
          <button
            onClick={clearFilters}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: colors.accentLight,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: 7,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: 12,
          borderRadius: 7,
          marginBottom: 16,
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.muted }}>Loading logs...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.muted }}>No activity logs found</div>
      ) : (
        <>
          <div style={{
            background: colors.cardBg,
            borderRadius: 10,
            overflow: 'hidden',
            border: `1px solid ${colors.border}`,
            marginBottom: 16
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.accentLight, borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: 12, textAlign: 'left', color: colors.text, fontWeight: 700 }}>Time</th>
                  <th style={{ padding: 12, textAlign: 'left', color: colors.text, fontWeight: 700 }}>User</th>
                  <th style={{ padding: 12, textAlign: 'left', color: colors.text, fontWeight: 700 }}>Action</th>
                  <th style={{ padding: 12, textAlign: 'left', color: colors.text, fontWeight: 700 }}>Module</th>
                  <th style={{ padding: 12, textAlign: 'left', color: colors.text, fontWeight: 700 }}>IP Address</th>
                  <th style={{ padding: 12, textAlign: 'left', color: colors.text, fontWeight: 700 }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 12, color: colors.muted, fontSize: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FaClock style={{ fontSize: 12 }} />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>
                    <td style={{ padding: 12, color: colors.text }}>
                      {(() => {
                        // For client actions and payment actions, prioritize showing client name from details
                        const isClientAction = log.action && log.action.startsWith('client_');
                        const isPaymentAction = log.action && (log.action.startsWith('payment_') || log.action.includes('payment'));
                        
                        if ((isClientAction || isPaymentAction) && log.details && log.details.clientName) {
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FaUser style={{ color: colors.muted }} />
                              <span>
                                {log.details.clientName}
                                <span style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>
                                  (Client)
                                </span>
                              </span>
                            </div>
                          );
                        }
                        
                        // Also check for details.name (for client_created, etc.)
                        if ((isClientAction || isPaymentAction) && log.details && log.details.name) {
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FaUser style={{ color: colors.muted }} />
                              <span>
                                {log.details.name}
                                <span style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>
                                  (Client)
                                </span>
                              </span>
                            </div>
                          );
                        }
                        
                        // For other actions, show userId if available
                        if (log.userId) {
                          return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FaUser style={{ color: colors.muted }} />
                          <span>
                            {log.userId.First_Name} {log.userId.Last_Name}
                            {log.userId.Role && (
                              <span style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>
                                ({log.userId.Role})
                              </span>
                            )}
                          </span>
                        </div>
                          );
                        }
                        
                        // Fallback to details.name or details.clientName if available
                        if (log.details) {
                          const clientName = log.details.clientName || log.details.name;
                          if (clientName) {
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FaUser style={{ color: colors.muted }} />
                                <span>
                                  {clientName}
                                  <span style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>
                                    (Client)
                                  </span>
                                </span>
                              </div>
                            );
                          }
                        }
                        
                        // Default to Unknown
                        return <span style={{ color: colors.muted }}>Unknown</span>;
                      })()}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 12px',
                          borderRadius: 20,
                          background: getActionColor(log.action) + '20',
                          color: getActionColor(log.action),
                          fontWeight: 600,
                          fontSize: 12
                        }}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: 12, color: colors.text }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FaBox style={{ color: colors.muted, fontSize: 12 }} />
                        {log.module}
                      </div>
                    </td>
                    <td style={{ padding: 12, color: colors.text, fontFamily: 'monospace', fontSize: 13 }}>
                      {log.ipAddress || <span style={{ color: colors.muted }}>N/A</span>}
                    </td>
                    <td style={{ padding: 12, color: colors.text }}>{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <div style={{ color: colors.muted }}>
                Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, total)} of {total} logs
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '8px 16px',
                    background: page === 1 ? colors.accentLight : colors.accent,
                    color: page === 1 ? colors.muted : '#fff',
                    border: 'none',
                    borderRadius: 7,
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '8px 16px', color: colors.text, fontWeight: 600 }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '8px 16px',
                    background: page === totalPages ? colors.accentLight : colors.accent,
                    color: page === totalPages ? colors.muted : '#fff',
                    border: 'none',
                    borderRadius: 7,
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Clear Logs Modal */}
      {showClearModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: colors.cardBg,
            borderRadius: 10,
            padding: 24,
            minWidth: 400,
            maxWidth: 500,
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ color: colors.text, marginBottom: 16, fontWeight: 700 }}>Clear Activity Logs</h3>
            <p style={{ color: colors.muted, marginBottom: 20, lineHeight: 1.6 }}>
              This will permanently delete activity logs. This action cannot be undone.
            </p>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: colors.text, fontWeight: 600 }}>
                Clear logs older than (days) - Leave empty to clear all logs
              </label>
              <input
                type="number"
                value={clearDays}
                onChange={(e) => setClearDays(e.target.value)}
                placeholder="e.g., 30 (to clear logs older than 30 days)"
                min="1"
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 7,
                  border: `1px solid ${colors.border}`,
                  background: colors.accentLight,
                  color: colors.text
                }}
              />
              {clearDays && (
                <p style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
                  This will delete logs older than {clearDays} days
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowClearModal(false);
                  setClearDays('');
                }}
                disabled={clearing}
                style={{
                  padding: '10px 20px',
                  background: colors.accentLight,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearLogs}
                disabled={clearing}
                style={{
                  padding: '10px 20px',
                  background: '#e74c3c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  cursor: clearing ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: clearing ? 0.6 : 1
                }}
              >
                {clearing ? 'Clearing...' : 'Clear Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityLogsPage;

