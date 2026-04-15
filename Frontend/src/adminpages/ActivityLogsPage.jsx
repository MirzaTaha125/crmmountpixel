import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaFilter, FaSearch, FaClock, FaUser, FaBox, FaTrash } from 'react-icons/fa';
import { getColors, theme } from '../theme';

const API_URL = getApiBaseUrl();

function ActivityLogsPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
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
        ...Object.fromEntries(Object.entries(filters).filter(([_k, v]) => v !== ''))
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
    } catch (err) {
      console.error('Error clearing logs:', err);
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
      }} className="audit-header">
        <style>{`
          @media (max-width: 600px) {
            .audit-header {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .audit-header > div:last-child {
              width: 100% !important;
              flex-direction: column !important;
              gap: ${theme.spacing.sm} !important;
            }
            .audit-header button {
              width: 100% !important;
              justify-content: center !important;
            }
            .audit-filters-grid {
              grid-template-columns: 1fr !important;
            }
            .audit-pagination {
              flex-direction: column !important;
              gap: ${theme.spacing.md} !important;
              align-items: center !important;
              text-align: center !important;
            }
          }
        `}</style>
        <div>
          <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            System Audit Logs
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            Transaction & Security History
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              background: colors.white,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
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
            <FaFilter /> {showFilters ? 'Hide Filters' : 'Apply Filters'}
          </button>
          <button
            onClick={() => setShowClearModal(true)}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              background: colors.error,
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
            <FaTrash /> Purge Logs
          </button>
        </div>
      </div>

      {/* QUICK STATS ROW */}
      {stats && (
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
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Total Events</div>
            <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary }}>{stats.total?.toLocaleString() || 0}</div>
          </div>
          <div style={{ padding: theme.spacing.md, background: colors.white }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Active Module</div>
            <div style={{ fontSize: theme.typography.fontSizes.xs, fontWeight: 'bold', color: colors.textPrimary, textTransform: 'uppercase' }}>
              {stats.byModule && stats.byModule.length > 0 ? stats.byModule[0]._id : 'N/A'}
            </div>
          </div>
          <div style={{ padding: theme.spacing.md, background: colors.white }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Critical Errors</div>
            <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.error }}>
              {stats.byAction?.find(a => a._id?.includes('failed'))?.count || 0}
            </div>
          </div>
        </div>
      )}

      {/* FILTERS PANEL */}
      {showFilters && (
        <div style={{ 
          background: colors.white, 
          padding: theme.spacing.lg, 
          marginBottom: theme.spacing.lg,
          borderRadius: theme.radius.md,
          border: `1px solid ${colors.borderLight}`,
          boxShadow: theme.shadows.sm
        }}>
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: theme.spacing.md }} className="audit-filters-grid">
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Search Description</label>
              <div style={{ position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: colors.textTertiary }} />
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Keyword lookup..."
                  style={{ width: '100%', padding: '8px 10px 8px 30px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Event Action</label>
              <select
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
              >
                <option value="">All History</option>
                <option value="user_login">User Authentication</option>
                <option value="user_created">User Creation</option>
                <option value="payment_completed">Payment Settlement</option>
                <option value="client_created">Client Onboarding</option>
                <option value="user_login_failed">Login Failures</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Target Module</label>
              <select
                name="module"
                value={filters.module}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
              >
                <option value="">Full System</option>
                <option value="Users">Management</option>
                <option value="Clients">CRM</option>
                <option value="Payments">Finance</option>
                <option value="Authentication">Security</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Start</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>End</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                style={{ width: '100%', padding: '7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: theme.spacing.md }}>
            <button
              onClick={clearFilters}
              style={{ padding: '6px 12px', background: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* ERROR DISPLAY */}
      {error && (
        <div style={{ background: colors.errorBg, color: colors.error, padding: theme.spacing.md, marginBottom: theme.spacing.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {error}
        </div>
      )}

      {/* LOGS TABLE */}
      <div style={{ 
        background: colors.white, 
        borderRadius: theme.radius.lg, 
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.md,
        overflow: 'hidden'
      }}>
        <div style={{ 
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead style={{ background: colors.tableHeaderBg }}>
              <tr>
                {['Timestamp', 'Subject', 'Action / Event', 'Module', 'Log Description'].map((h, idx) => (
                  <th key={idx} style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    textAlign: 'left',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: colors.textPrimary,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    borderBottom: `2px solid ${colors.border}`,
                    borderRight: idx < 4 ? `1px solid ${colors.border}` : 'none'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>Streaming server logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No activity recorded in index.</td></tr>
              ) : logs.map((log, idx) => (
                <tr key={log._id} style={{ 
                  borderBottom: `1px solid ${colors.borderLight}`,
                  background: colors.white, // Uniform white background
                  transition: 'background 0.2s'
                }}>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: '10px', fontWeight: 'bold' }}>
                      <FaClock /> {formatDate(log.createdAt)}
                    </div>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    {(() => {
                      const isClientAction = log.action && log.action.startsWith('client_');
                      const isPaymentAction = log.action && (log.action.startsWith('payment_') || log.action.includes('payment'));
                      let displaySubject = 'UNKNOWN';
                      let subjectType = '';

                      if ((isClientAction || isPaymentAction) && log.details && (log.details.clientName || log.details.name)) {
                        displaySubject = log.details.clientName || log.details.name;
                        subjectType = 'CLIENT';
                      } else if (log.userId) {
                        displaySubject = `${log.userId.First_Name} ${log.userId.Last_Name}`;
                        subjectType = log.userId.Role || 'USER';
                      }

                      return (
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary, textTransform: 'uppercase' }}>{displaySubject}</div>
                          {subjectType && <div style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold' }}>TYPE: {subjectType} {log.ipAddress ? `[${log.ipAddress}]` : ''}</div>}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: getActionColor(log.action) + '22',
                      color: getActionColor(log.action),
                      fontWeight: 'bold',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      borderRadius: theme.radius.full, // Standardized full radius
                      border: `1px solid ${getActionColor(log.action)}33`
                    }}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' }}>
                      <FaBox style={{ opacity: 0.5 }} /> {log.module}
                    </div>
                  </td>
                  <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary }}>
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION ROW */}
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: theme.spacing.md, 
          background: colors.white, 
          borderRadius: theme.radius.md,
          border: `1px solid ${colors.borderLight}`,
          boxShadow: theme.shadows.sm,
          marginTop: theme.spacing.md,
          flexWrap: 'wrap'
        }} className="audit-pagination">
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase' }}>
            Displaying {((page - 1) * 50) + 1} - {Math.min(page * 50, total)} of {total} Records
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '6px 12px',
                background: page === 1 ? colors.white : colors.sidebarBg,
                color: page === 1 ? colors.textTertiary : colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: `${theme.radius.sm} 0 0 ${theme.radius.sm}`,
                fontWeight: 'bold',
                fontSize: '10px',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase'
              }}
            >
              Prev
            </button>
            <div style={{ padding: '6px 12px', border: `1px solid ${colors.border}`, fontSize: '10px', fontWeight: 'bold', color: colors.textPrimary }}>
              PAGE {page} / {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '6px 12px',
                background: page === totalPages ? colors.white : colors.sidebarBg,
                color: page === totalPages ? colors.textTertiary : colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: `0 ${theme.radius.sm} ${theme.radius.sm} 0`,
                fontWeight: 'bold',
                fontSize: '10px',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* PURGE MODAL */}
      {showClearModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: theme.spacing.md }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: '95%', maxWidth: 450, boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 20px`, color: colors.textPrimary, fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0` }}>
              Purge System History
            </div>
            
            <div style={{ padding: theme.spacing.xl }}>
              <p style={{ fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary, marginBottom: theme.spacing.lg, lineHeight: 1.5 }}>
                Select retention policy. Records deleted via this manual trigger are permanently removed from the primary index.
              </p>
              
              <div style={{ marginBottom: theme.spacing.xl }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Older Than (Days)</label>
                <input
                  type="number"
                  value={clearDays}
                  onChange={(e) => setClearDays(e.target.value)}
                  placeholder="Leave empty for full purge..."
                  min="1"
                  style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}
                />
                {clearDays && <p style={{ color: colors.warningDark, fontSize: '9px', fontWeight: 'bold', marginTop: '6px', textTransform: 'uppercase' }}>POLICY: DELETING LOGS STORED BEFORE {(parseInt(clearDays) || 0)} DAYS AGO</p>}
              </div>

              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowClearModal(false); setClearDays(''); }}
                  disabled={clearing}
                  style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearLogs}
                  disabled={clearing}
                  style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.error, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: clearing ? 'not-allowed' : 'pointer', boxShadow: theme.shadows.sm }}
                >
                  {clearing ? 'Executing Purge...' : 'Authorize Purge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityLogsPage;
