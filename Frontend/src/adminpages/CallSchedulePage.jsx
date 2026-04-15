import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../session';
import getApiBaseUrl from '../apiBase';
import notificationService from '../services/notificationService';
import { FaCalendarAlt, FaClock, FaUser, FaPhone, FaEdit, FaTrash, FaFilter, FaList, FaChevronLeft, FaChevronRight, FaBell, FaBellSlash, FaCheck, FaTimes, FaExclamationTriangle, FaPlus, FaBox } from 'react-icons/fa';
import { theme, getColors } from '../theme';

function CallSchedulePage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const { user } = useSession();
  const [calendarData, setCalendarData] = useState({});
  const [allSchedules, setAllSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); 
  const [filterStatus, setFilterStatus] = useState('all');
  const [notificationsEnabled, setNotificationsEnabled] = useState(notificationService.isNotificationEnabled());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    clientId: '',
    userId: user?.Role === 'Admin' ? '' : user?._id || '',
    scheduledDate: '',
    scheduledTime: '',
    reason: '',
    notes: '',
    status: 'scheduled'
  });
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const isAdmin = user?.Role === 'Admin';
  const API_URL = getApiBaseUrl();

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  useEffect(() => {
    if (viewMode === 'calendar') fetchCalendarData();
    else fetchAllSchedules();
  }, [currentDate, viewMode, filterStatus]);

  useEffect(() => {
    if (showScheduleModal) {
      fetchUsers();
      fetchClients();
    }
  }, [showScheduleModal]);

  const handleNotificationToggle = () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    notificationService.setEnabled(newState);
  };

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const res = await axios.get(`${API_URL}/api/call-schedules/calendar`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params: { month, year }
      });
      setCalendarData(res.data);
    } catch {
      setError('Failed to sync calendar matrix');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSchedules = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const params = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
      if (filterStatus !== 'all') params.status = filterStatus;
      const res = await axios.get(`${API_URL}/api/call-schedules/all`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params
      });
      setAllSchedules(res.data);
    } catch {
      setError('Failed to fetch schedule records');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return colors.sidebarBg;
      case 'completed': return '#10b981';
      case 'cancelled': return colors.error;
      case 'missed': return '#f59e0b';
      default: return colors.textTertiary;
    }
  };

  const getDateKey = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${month}-${d}`;
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/call-schedules/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (viewMode === 'calendar') fetchCalendarData();
      else fetchAllSchedules();
    } catch {
      setError('Status update rejected');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Erase schedule record?')) return;
    try {
      await axios.delete(`${API_URL}/api/call-schedules/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (viewMode === 'calendar') fetchCalendarData();
      else fetchAllSchedules();
    } catch {
      setError('Deletion failed');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users`, { headers: { Authorization: `Bearer ${user.token}` } });
      setUsers(res.data || []);
    } catch {}
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/call-schedules/assigned-clients`, { headers: { Authorization: `Bearer ${user.token}` } });
      setClients(res.data || []);
    } catch {}
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...scheduleForm };
      if (isAdmin && scheduleForm.userId) payload.userId = scheduleForm.userId;
      await axios.post(`${API_URL}/api/call-schedules`, payload, { headers: { Authorization: `Bearer ${user.token}` } });
      setShowScheduleModal(false);
      setScheduleForm({ clientId: '', userId: isAdmin ? '' : user?._id || '', scheduledDate: '', scheduledTime: '', reason: '', notes: '', status: 'scheduled' });
      if (viewMode === 'calendar') fetchCalendarData();
      else fetchAllSchedules();
    } catch {
      setFormError('Failed to commit schedule');
    } finally {
      setFormLoading(false);
    }
  };

  const days = getDaysInMonth(currentDate);

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
            Communications Scheduler
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            Client Consultation & Internal Briefing Timeline
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <button onClick={handleNotificationToggle} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: notificationsEnabled ? '#10b981' : colors.textTertiary, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}>
            {notificationsEnabled ? <FaBell /> : <FaBellSlash />} Notifications {notificationsEnabled ? 'Active' : 'Disabled'}
          </button>
          <button onClick={() => setShowScheduleModal(true)} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}>
            <FaPlus /> Schedule Call
          </button>
        </div>
      </div>

      {/* CONTROL GRID */}
      <div style={{ 
        background: colors.white, 
        padding: theme.spacing.md, 
        marginBottom: theme.spacing.lg,
        borderRadius: theme.radius.md,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center' }}>
            <button onClick={() => navigateMonth(-1)} style={{ background: colors.sidebarBg, color: colors.white, border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: theme.radius.sm }}><FaChevronLeft /></button>
            <div style={{ fontSize: '12px', fontWeight: '800', width: '150px', textAlign: 'center', color: colors.textPrimary }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
            <button onClick={() => navigateMonth(1)} style={{ background: colors.sidebarBg, color: colors.white, border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: theme.radius.sm }}><FaChevronRight /></button>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setViewMode('calendar')} style={{ padding: '8px 20px', background: viewMode === 'calendar' ? colors.sidebarBg : colors.white, color: viewMode === 'calendar' ? colors.white : colors.textPrimary, border: `1px solid ${colors.border}`, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: theme.radius.sm }}>Calendar View</button>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px 20px', background: viewMode === 'list' ? colors.sidebarBg : colors.white, color: viewMode === 'list' ? colors.white : colors.textPrimary, border: `1px solid ${colors.border}`, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: theme.radius.sm }}>List Matrix</button>
          </div>
          {viewMode === 'list' && (
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px', border: `1px solid ${colors.border}`, fontSize: '11px', background: colors.white, fontWeight: 'bold', borderRadius: theme.radius.sm, outline: 'none' }}>
              <option value="all">ALL STATUS</option><option value="scheduled">SCHEDULED</option><option value="completed">COMPLETED</option><option value="cancelled">CANCELLED</option><option value="missed">MISSED</option>
            </select>
          )}
        </div>
      </div>

      {/* ERROR DISPLAY */}
      {error && <div style={{ background: colors.error, color: colors.white, padding: '10px', fontSize: '10px', fontWeight: 'bold', marginBottom: theme.spacing.lg, textTransform: 'uppercase' }}>{error}</div>}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div style={{ background: colors.white, borderRadius: theme.radius.lg, border: `1px solid ${colors.borderLight}`, overflow: 'hidden', boxShadow: theme.shadows.md }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: colors.tableHeaderBg }}>
            {daysOfWeek.map(d => <div key={d} style={{ padding: '10px', textAlign: 'center', color: colors.textPrimary, fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)' }}>
            {days.map((day, idx) => {
              const dateKey = day ? getDateKey(day) : null;
              const daySchedules = dateKey ? calendarData[dateKey] || [] : [];
              const isSelected = dateKey === selectedDate;
              return (
                <div key={idx} onClick={() => day && setSelectedDate(selectedDate === dateKey ? null : dateKey)} style={{ padding: '10px', borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, background: isSelected ? colors.primaryBg : (day ? colors.white : colors.primaryBg), cursor: day ? 'pointer' : 'default', minHeight: '120px', transition: 'background 0.2s' }}>
                  {day && (
                    <>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textTertiary, marginBottom: '8px' }}>{day}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {daySchedules.slice(0, 4).map((s, si) => (
                          <div key={si} style={{ background: getStatusColor(s.status), color: colors.white, padding: '2px 6px', fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderRadius: theme.radius['2xs'] || '2px' }}>
                            {s.scheduledTime} - {s.clientName}
                          </div>
                        ))}
                      </div>
                      {daySchedules.length > 4 && <div style={{ fontSize: '8px', fontWeight: 'bold', color: colors.textTertiary, marginTop: '4px' }}>+ {daySchedules.length - 4} MORE</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* DAY DETAILS */}
          {selectedDate && calendarData[selectedDate] && (
            <div style={{ padding: theme.spacing.lg, background: colors.tableHeaderBg, borderTop: `2px solid ${colors.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: colors.textPrimary, textTransform: 'uppercase', marginBottom: theme.spacing.md }}>Log for {selectedDate}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {calendarData[selectedDate].map(s => (
                  <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.white, padding: '10px', borderRadius: theme.radius.md, border: `1px solid ${colors.borderLight}`, marginBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ width: '60px', fontSize: '11px', fontWeight: 'bold' }}>{s.scheduledTime}</div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>{s.clientName} <span style={{ color: colors.textTertiary }}>({s.userName})</span></div>
                        <div style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold' }}>REASON: {s.reason.toUpperCase()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select value={s.status} onChange={(e) => handleStatusUpdate(s._id, e.target.value)} style={{ padding: '4px', fontSize: '9px', fontWeight: 'bold', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, outline: 'none' }}>
                        <option value="scheduled">SCHEDULED</option><option value="completed">COMPLETED</option><option value="cancelled">CANCELLED</option><option value="missed">MISSED</option>
                      </select>
                      <button onClick={() => handleDelete(s._id)} style={{ background: 'none', border: 'none', color: colors.error, cursor: 'pointer' }}><FaTrash /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div style={{ background: colors.white, borderRadius: theme.radius.lg, border: `1px solid ${colors.borderLight}`, overflow: 'hidden', boxShadow: theme.shadows.md }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.tableHeaderBg }}>
                  {['Timestamp', 'Client Entity', 'Representative', 'Agenda / Reason', 'Status', 'Actions'].map((h, idx) => (
                    <th key={idx} style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'left', fontSize: '9px', fontWeight: 'bold', color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRight: idx < 5 ? `1px solid ${colors.border}` : 'none' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>Scanning communication logs...</td></tr>
                ) : allSchedules.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No consultations indexed for current selection.</td></tr>
                ) : allSchedules.map((s, idx) => (
                  <tr key={s._id} style={{ borderBottom: `1px solid ${colors.borderLight}`, background: idx % 2 === 0 ? colors.white : colors.primaryBg }}>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{new Date(s.scheduledDate).toLocaleDateString()}</div>
                      <div style={{ fontSize: '10px', color: colors.textTertiary, fontWeight: 'bold' }}>{s.scheduledTime}</div>
                    </td>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}`, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{s.clientName}</td>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{s.userName}</div>
                      <div style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold' }}>{s.userRole.toUpperCase()}</div>
                    </td>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}`, fontSize: '10px', color: colors.textSecondary }}>{s.reason}</td>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                      <span style={{ display: 'inline-block', padding: '4px 8px', background: getStatusColor(s.status) + '11', color: getStatusColor(s.status), fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', border: `1px solid ${getStatusColor(s.status)}33` }}>{s.status}</span>
                    </td>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                      <div style={{ display: 'flex', gap: theme.spacing.md }}>
                        <button onClick={() => handleDelete(s._id)} style={{ background: 'none', border: 'none', color: colors.error, cursor: 'pointer' }}><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: 500, boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 20px`, color: colors.textPrimary, fontWeight: theme.typography.fontWeights.bold, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0` }}>
              COMMUNICATIONS: INITIALIZE CONSULTATION BLOCK
            </div>
            <form onSubmit={handleScheduleSubmit} style={{ padding: theme.spacing.xl }}>
              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>CLIENT ENTITY</label>
                <select value={scheduleForm.clientId} onChange={(e) => setScheduleForm({...scheduleForm, clientId: e.target.value})} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }}>
                  <option value="">SELECT ASSIGNED CLIENT</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div style={{ marginBottom: theme.spacing.md }}>
                  <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>REPRESENTATIVE</label>
                  <select value={scheduleForm.userId} onChange={(e) => setScheduleForm({...scheduleForm, userId: e.target.value})} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }}>
                    <option value="">SELECT TEAM MEMBER</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.Name} ({u.Role})</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>DATE</label><input type="date" value={scheduleForm.scheduledDate} onChange={(e) => setScheduleForm({...scheduleForm, scheduledDate: e.target.value})} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }} /></div>
                <div><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>TIME</label><input type="time" value={scheduleForm.scheduledTime} onChange={(e) => setScheduleForm({...scheduleForm, scheduledTime: e.target.value})} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }} /></div>
              </div>
              <div style={{ marginBottom: theme.spacing.md }}><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>AGENDA</label><input value={scheduleForm.reason} onChange={(e) => setScheduleForm({...scheduleForm, reason: e.target.value})} required style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', outline: 'none' }} /></div>
              <div style={{ marginBottom: theme.spacing.lg }}><label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px' }}>INTERNAL NOTES</label><textarea value={scheduleForm.notes} onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})} rows={2} style={{ width: '100%', padding: '8px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '12px', resize: 'none', outline: 'none' }} /></div>
              {formError && <div style={{ color: colors.error, fontSize: '10px', fontWeight: 'bold', marginBottom: '10px' }}>{formError}</div>}
              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} style={{ padding: '8px 16px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={formLoading} style={{ padding: '8px 16px', background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' }}>{formLoading ? 'Syncing...' : 'Commit Block'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CallSchedulePage;
