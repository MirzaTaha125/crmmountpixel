import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../session';
import getApiBaseUrl from '../apiBase';
import notificationService from '../services/notificationService';
import { FaCalendarAlt, FaClock, FaUser, FaPhone, FaEdit, FaTrash, FaFilter, FaList, FaChevronLeft, FaChevronRight, FaBell, FaBellSlash, FaCheck, FaTimes, FaExclamationTriangle, FaPlus } from 'react-icons/fa';

function CallSchedulePage({ colors }) {
  const { user } = useSession();
  const [calendarData, setCalendarData] = useState({});
  const [allSchedules, setAllSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
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

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarData();
    } else {
      fetchAllSchedules();
    }
  }, [currentDate, viewMode, filterStatus]);

  useEffect(() => {
    if (showScheduleModal) {
      fetchUsers();
      fetchClients();
    }
  }, [showScheduleModal]);

  // Note: Notification service is initialized in AdminPanel.jsx
  // No need to initialize here to avoid conflicts

  // Handle notification toggle
  const handleNotificationToggle = () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    notificationService.setEnabled(newState);
  };

  const fetchCalendarData = async () => {
    setLoading(true);
    setError('');
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const res = await axios.get(`${API_URL}/api/call-schedules/calendar`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params: { month, year }
      });
      setCalendarData(res.data);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError('Failed to fetch calendar data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      const res = await axios.get(`${API_URL}/api/call-schedules/all`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params
      });
      setAllSchedules(res.data);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to fetch schedules: ' + (err.response?.data?.message || err.message));
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
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const formatDate = (dateString) => {
    // Parse date string and use local components to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return colors.accent;
      case 'completed': return '#16a34a';
      case 'cancelled': return colors.muted;
      case 'missed': return colors.dangerDark;
      default: return colors.muted;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <FaCalendarAlt style={{ fontSize: '16px' }} />;
      case 'completed': return <FaCheck style={{ fontSize: '16px', color: colors.success }} />;
      case 'cancelled': return <FaTimes style={{ fontSize: '16px', color: colors.dangerDark }} />;
      case 'missed': return <FaExclamationTriangle style={{ fontSize: '16px', color: colors.warning }} />;
      default: return <FaCalendarAlt style={{ fontSize: '16px' }} />;
    }
  };

  const getDateKey = (day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, day);
    // Use local date string to avoid timezone issues
    const localYear = date.getFullYear();
    const localMonth = String(date.getMonth() + 1).padStart(2, '0');
    const localDay = String(date.getDate()).padStart(2, '0');
    return `${localYear}-${localMonth}-${localDay}`;
  };

  const handleDateClick = (day) => {
    if (day) {
      const dateKey = getDateKey(day);
      setSelectedDate(selectedDate === dateKey ? null : dateKey);
    }
  };

  const handleStatusUpdate = async (scheduleId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/call-schedules/${scheduleId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      if (viewMode === 'calendar') {
        fetchCalendarData();
      } else {
        fetchAllSchedules();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled call?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/call-schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      if (viewMode === 'calendar') {
        fetchCalendarData();
      } else {
        fetchAllSchedules();
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Failed to delete schedule: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/call-schedules/assigned-clients`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setClients(res.data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    
    try {
      const payload = {
        clientId: scheduleForm.clientId,
        scheduledDate: scheduleForm.scheduledDate,
        scheduledTime: scheduleForm.scheduledTime,
        reason: scheduleForm.reason,
        notes: scheduleForm.notes
      };

      // Add userId for admins if selected
      if (isAdmin && scheduleForm.userId) {
        payload.userId = scheduleForm.userId;
      }

      await axios.post(`${API_URL}/api/call-schedules`, payload, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setShowScheduleModal(false);
      setScheduleForm({
        clientId: '',
        userId: isAdmin ? '' : user?._id || '',
        scheduledDate: '',
        scheduledTime: '',
        reason: '',
        notes: '',
        status: 'scheduled'
      });
      
      if (viewMode === 'calendar') {
        fetchCalendarData();
      } else {
        fetchAllSchedules();
      }
    } catch (err) {
      console.error('Error creating schedule:', err);
      setFormError(err.response?.data?.message || 'Failed to create schedule');
    } finally {
      setFormLoading(false);
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <h2 style={{ color: colors.text, fontWeight: 800, fontSize: 28, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaPhone style={{ fontSize: '28px', color: colors.accent }} />
          Call Schedule
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Create Schedule Button */}
          <button
            onClick={() => setShowScheduleModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: colors.accent,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = colors.accentDark || colors.accent}
            onMouseLeave={(e) => e.target.style.background = colors.accent}
          >
            <FaPlus />
            Schedule Call
          </button>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'calendar' ? colors.accent : colors.accentLight,
                color: viewMode === 'calendar' ? '#fff' : colors.text,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'list' ? colors.accent : colors.accentLight,
                color: viewMode === 'list' ? '#fff' : colors.text,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              List
            </button>
          </div>

          {/* Notification Toggle */}
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={handleNotificationToggle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: notificationsEnabled ? '#10b981' : '#6b7280',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'background-color 0.2s'
              }}
              title={notificationsEnabled ? 'Disable call notifications' : 'Enable call notifications'}
            >
              {notificationsEnabled ? <FaBell /> : <FaBellSlash />}
              {notificationsEnabled ? 'Notifications ON' : 'Notifications OFF'}
            </button>
          </div>

          {/* Status Filter for List View */}
          {viewMode === 'list' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                background: colors.accentLight,
                color: colors.text
              }}
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="missed">Missed</option>
            </select>
          )}
        </div>
      </div>

      {/* Month Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 24,
        gap: '20px'
      }}>
        <button
          onClick={() => navigateMonth(-1)}
          style={{
            background: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <FaChevronLeft />
        </button>
        
        <h3 style={{ 
          color: colors.text, 
          fontSize: 24, 
          fontWeight: 'bold',
          margin: 0,
          minWidth: '200px',
          textAlign: 'center'
        }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        
        <button
          onClick={() => navigateMonth(1)}
          style={{
            background: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <FaChevronRight />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          background: '#fee2e2', 
          border: '1px solid #fca5a5', 
          borderRadius: '8px', 
          padding: '12px', 
          marginBottom: '20px',
          color: colors.dangerDark,
          fontWeight: 'bold'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.muted }}>
          Loading...
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div style={{ 
          background: colors.cardBg, 
          borderRadius: 10, 
          boxShadow: colors.cardShadow,
          overflow: 'hidden'
        }}>
          {/* Calendar Header */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: colors.accent
          }}>
            {daysOfWeek.map(day => (
              <div
                key={day}
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Body */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridAutoRows: 'minmax(100px, auto)'
          }}>
            {days.map((day, index) => {
              const dateKey = day ? getDateKey(day) : null;
              const daySchedules = dateKey ? calendarData[dateKey] || [] : [];
              const isSelected = dateKey === selectedDate;
              
              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(day)}
                  style={{
                    padding: '8px',
                    border: `1px solid ${colors.border}`,
                    cursor: day ? 'pointer' : 'default',
                    background: isSelected ? colors.accentLight : (day ? colors.cardBg : colors.border),
                    minHeight: '100px',
                    position: 'relative'
                  }}
                >
                  {day && (
                    <>
                      <div style={{ 
                        fontWeight: 'bold', 
                        marginBottom: '4px',
                        color: colors.text,
                        fontSize: '14px'
                      }}>
                        {day}
                      </div>
                      
                      {daySchedules.length > 0 && (
                        <div style={{ fontSize: '11px' }}>
                          {daySchedules.slice(0, 3).map((schedule, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: getStatusColor(schedule.status),
                          color: '#fff',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          marginBottom: '2px',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {formatTime(schedule.scheduledTime)} - {schedule.clientName.substring(0, 8)}
                        <br />
                        <FaUser style={{ fontSize: '12px', marginRight: '4px' }} /> {(schedule.userName || 'Unknown User').substring(0, 10)}
                      </div>
                          ))}
                          {daySchedules.length > 3 && (
                            <div style={{ 
                              color: colors.muted, 
                              fontSize: '10px',
                              fontWeight: 'bold'
                            }}>
                              +{daySchedules.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Date Details */}
          {selectedDate && calendarData[selectedDate] && (
            <div style={{
              background: colors.accentLight,
              padding: '16px',
              borderTop: `2px solid ${colors.accent}`
            }}>
              <h4 style={{ 
                color: colors.text, 
                marginBottom: '12px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                Calls on {formatDate(selectedDate)}
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {calendarData[selectedDate].map(schedule => (
                  <div
                    key={schedule._id}
                    style={{
                      background: colors.cardBg,
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span>{getStatusIcon(schedule.status)}</span>
                        <strong style={{ color: colors.text }}>{schedule.clientName}</strong>
                        <span
                          style={{
                            background: '#6b7280',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}
                        >
                          <FaUser style={{ fontSize: '14px', marginRight: '6px' }} /> {schedule.userName || 'Unknown User'}
                        </span>
                        <span
                          style={{
                            background: getStatusColor(schedule.status),
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}
                        >
                          {schedule.status}
                        </span>
                      </div>
                      <div style={{ color: colors.muted, fontSize: '12px' }}>
                        <FaClock size={10} style={{ marginRight: '4px' }} />
                        {formatTime(schedule.scheduledTime)} | 
                        <span style={{ fontWeight: 'bold', color: colors.text }}>
                          {schedule.userRole}
                        </span> | 
                        <span style={{ marginLeft: '4px' }}>{schedule.reason}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <select
                        value={schedule.status}
                        onChange={(e) => handleStatusUpdate(schedule._id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${colors.border}`,
                          background: colors.cardBg,
                          fontSize: '10px'
                        }}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="missed">Missed</option>
                      </select>
                      
                      <button
                        onClick={() => handleDelete(schedule._id)}
                        style={{
                          background: colors.dangerDark,
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div style={{ 
          background: colors.cardBg, 
          borderRadius: 10, 
          boxShadow: colors.cardShadow,
          padding: '20px'
        }}>
          {allSchedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.muted }}>
              <FaCalendarAlt size={48} style={{ marginBottom: '16px' }} />
              <h3 style={{ marginBottom: '8px' }}>No Scheduled Calls</h3>
              <p>No calls found for the selected month and filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {allSchedules.map(schedule => (
                <div
                  key={schedule._id}
                  style={{
                    background: colors.accentLight,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{getStatusIcon(schedule.status)}</span>
                      <h4 style={{ color: colors.text, margin: 0 }}>{schedule.clientName}</h4>
                      <span
                        style={{
                          background: '#6b7280',
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                        >
                        <FaUser style={{ fontSize: '14px', marginRight: '6px' }} /> {schedule.userName || 'Unknown User'}
                      </span>
                      <span
                        style={{
                          background: getStatusColor(schedule.status),
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}
                      >
                        {schedule.status}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '8px', color: colors.muted, fontSize: '14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaCalendarAlt style={{ fontSize: '14px' }} />
                        {formatDate(schedule.scheduledDate)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaClock style={{ fontSize: '14px' }} />
                        {formatTime(schedule.scheduledTime)}
                      </span>
                      <span style={{ fontWeight: 'bold', color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaUser style={{ fontSize: '14px' }} />
                        {schedule.userRole}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaPhone style={{ fontSize: '14px' }} />
                        {schedule.clientPhone}
                      </span>
                    </div>
                    
                    <p style={{ margin: 0, color: colors.text, fontSize: '14px' }}>
                      <strong>Reason:</strong> {schedule.reason}
                    </p>
                    
                    {schedule.notes && (
                      <p style={{ margin: '4px 0 0 0', color: colors.muted, fontSize: '12px' }}>
                        <strong>Notes:</strong> {schedule.notes}
                      </p>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={schedule.status}
                      onChange={(e) => handleStatusUpdate(schedule._id, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        background: colors.cardBg,
                        fontSize: '12px'
                      }}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="missed">Missed</option>
                    </select>
                    
                    <button
                      onClick={() => handleDelete(schedule._id)}
                      style={{
                        background: colors.dangerDark,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Delete"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Schedule Modal */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !formLoading) {
            setShowScheduleModal(false);
          }
        }}
        >
          <div style={{
            background: colors.cardBg,
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: colors.text, margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                Schedule New Call
              </h3>
              <button
                onClick={() => {
                  if (!formLoading) {
                    setShowScheduleModal(false);
                    setScheduleForm({
                      clientId: '',
                      userId: isAdmin ? '' : user?._id || '',
                      scheduledDate: '',
                      scheduledTime: '',
                      reason: '',
                      notes: '',
                      status: 'scheduled'
                    });
                    setFormError('');
                  }
                }}
                disabled={formLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.text,
                  cursor: formLoading ? 'not-allowed' : 'pointer',
                  fontSize: '20px',
                  padding: '4px',
                  opacity: formLoading ? 0.5 : 1
                }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit}>
              {isAdmin && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontWeight: 'bold' }}>
                    User <span style={{ color: colors.dangerDark }}>*</span>
                  </label>
                  <select
                    value={scheduleForm.userId}
                    onChange={(e) => setScheduleForm({...scheduleForm, userId: e.target.value})}
                    required
                    disabled={formLoading}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      fontSize: '16px',
                      background: colors.accentLight,
                      color: colors.text
                    }}
                  >
                    <option value="">Select a user</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.First_Name} {u.Last_Name} ({u.Role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontWeight: 'bold' }}>
                  Client <span style={{ color: colors.dangerDark }}>*</span>
                </label>
                <select
                  value={scheduleForm.clientId}
                  onChange={(e) => setScheduleForm({...scheduleForm, clientId: e.target.value})}
                  required
                  disabled={formLoading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '16px',
                    background: colors.accentLight,
                    color: colors.text
                  }}
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name} - {client.email}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontWeight: 'bold' }}>
                  Date <span style={{ color: colors.dangerDark }}>*</span>
                </label>
                <input
                  type="date"
                  value={scheduleForm.scheduledDate}
                  onChange={(e) => setScheduleForm({...scheduleForm, scheduledDate: e.target.value})}
                  required
                  disabled={formLoading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '16px',
                    background: colors.accentLight,
                    color: colors.text
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontWeight: 'bold' }}>
                  Time <span style={{ color: colors.dangerDark }}>*</span>
                </label>
                <input
                  type="time"
                  value={scheduleForm.scheduledTime}
                  onChange={(e) => setScheduleForm({...scheduleForm, scheduledTime: e.target.value})}
                  required
                  disabled={formLoading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '16px',
                    background: colors.accentLight,
                    color: colors.text
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontWeight: 'bold' }}>
                  Reason <span style={{ color: colors.dangerDark }}>*</span>
                </label>
                <input
                  type="text"
                  value={scheduleForm.reason}
                  onChange={(e) => setScheduleForm({...scheduleForm, reason: e.target.value})}
                  required
                  disabled={formLoading}
                  placeholder="e.g., Follow-up call, Project discussion"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '16px',
                    background: colors.accentLight,
                    color: colors.text
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontWeight: 'bold' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                  disabled={formLoading}
                  placeholder="Additional notes about this call..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '16px',
                    background: colors.accentLight,
                    color: colors.text,
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {formError && (
                <div style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: colors.dangerDark,
                  fontSize: '14px'
                }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!formLoading) {
                      setShowScheduleModal(false);
                      setScheduleForm({
                        clientId: '',
                        userId: isAdmin ? '' : user?._id || '',
                        scheduledDate: '',
                        scheduledTime: '',
                        reason: '',
                        notes: '',
                        status: 'scheduled'
                      });
                      setFormError('');
                    }
                  }}
                  disabled={formLoading}
                  style={{
                    padding: '10px 20px',
                    background: colors.accentLight,
                    color: colors.text,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    opacity: formLoading ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    padding: '10px 20px',
                    background: colors.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    opacity: formLoading ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {formLoading ? 'Creating...' : (
                    <>
                      <FaPlus />
                      Create Schedule
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CallSchedulePage;
