import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from './session';
import { useNavigate } from 'react-router-dom';
import getApiBaseUrl from './apiBase';
import notificationService from './services/notificationService';
import { FaArrowLeft, FaCalendarPlus, FaEdit, FaTrash, FaClock, FaUser, FaPhone, FaCalendarAlt, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

const colors = {
  mainBg: '#f8fafc',
  cardBg: '#ffffff',
  cardShadow: '0 8px 24px rgba(0,0,0,0.08)',
  accent: '#3b82f6',
  accentLight: '#eff6ff',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  dangerDark: '#dc2626',
  success: '#16a34a',
  warning: '#f59e0b'
};

function ScheduleCallPanel() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [form, setForm] = useState({
    clientId: '',
    scheduledDate: '',
    scheduledTime: '',
    reason: '',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const API_URL = getApiBaseUrl();

  useEffect(() => {
    fetchSchedules();
    fetchAssignedClients();
  }, []);

  // Initialize notification service
  useEffect(() => {
    notificationService.init();
    return () => {
      notificationService.destroy();
    };
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/call-schedules/my-schedules`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setSchedules(res.data);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to fetch call schedules: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedClients = async () => {
    setClientsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/call-schedules/assigned-clients`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setClients(res.data);
    } catch (err) {
      console.error('Error fetching assigned clients:', err);
    } finally {
      setClientsLoading(false);
    }
  };

  const handleBack = () => {
    // Navigate back to the appropriate panel based on user role
    if (user.Role === 'Employee') {
      navigate('/employee');
    } else if (user.Role === 'Front') {
      navigate('/front');
    } else if (user.Role === 'Upsell') {
      navigate('/upsell');
    } else if (user.Role === 'Production') {
      navigate('/production');
    } else {
      navigate('/signin');
    }
  };

  const handleAddOpen = () => {
    setForm({
      clientId: '',
      scheduledDate: '',
      scheduledTime: '',
      reason: '',
      notes: ''
    });
    setFormError('');
    setModalMode('add');
    setModalOpen(true);
  };

  const handleEditOpen = (schedule) => {
    // Use local date to avoid timezone shifting
    const date = new Date(schedule.scheduledDate);
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    setForm({
      id: schedule._id,
      clientId: schedule.clientId._id,
      scheduledDate: localDate,
      scheduledTime: schedule.scheduledTime,
      reason: schedule.reason,
      notes: schedule.notes || ''
    });
    setFormError('');
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    
    try {
      if (modalMode === 'add') {
        await axios.post(`${API_URL}/api/call-schedules`, form, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      } else {
        await axios.put(`${API_URL}/api/call-schedules/${form.id}`, form, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      }
      setModalOpen(false);
      fetchSchedules();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setFormError('Failed to save schedule: ' + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scheduled call?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/call-schedules/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchSchedules();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Failed to delete schedule: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/call-schedules/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchSchedules();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  const formatDate = (dateString) => {
    // Use local date components to avoid timezone shifting
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    const [y, m, d] = localDateString.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    return localDate.toLocaleDateString('en-US', {
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
      case 'completed': return colors.success;
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

  return (
    <div style={{ minHeight: '100vh', background: colors.mainBg, padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          background: colors.cardBg, 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '20px',
          boxShadow: colors.cardShadow,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={handleBack}
              style={{
                background: colors.accentLight,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '10px',
                cursor: 'pointer',
                color: colors.accent,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FaArrowLeft /> Back
            </button>
            <h1 style={{ color: colors.text, fontWeight: 'bold', fontSize: '28px', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaPhone style={{ fontSize: '28px', color: colors.accent }} />
              Schedule Calls
            </h1>
          </div>
          
          <button 
            onClick={handleAddOpen} 
            style={{ 
              padding: '12px 24px', 
              background: colors.accent, 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaCalendarPlus /> Schedule Call
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ 
            background: '#fee2e2', 
            border: '1px solid #fca5a5', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '20px',
            color: colors.dangerDark,
            fontWeight: 'bold'
          }}>
            {error}
          </div>
        )}

        {/* Content */}
        <div style={{ 
          background: colors.cardBg, 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: colors.cardShadow 
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.muted }}>
              Loading scheduled calls...
            </div>
          ) : schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FaClock size={48} color={colors.muted} style={{ marginBottom: '16px' }} />
              <h3 style={{ color: colors.muted, marginBottom: '8px' }}>No Scheduled Calls</h3>
              <p style={{ color: colors.muted }}>Click "Schedule Call" to add your first call.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {schedules.map(schedule => (
                <div
                  key={schedule._id}
                  style={{
                    background: colors.accentLight,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{getStatusIcon(schedule.status)}</span>
                      <h3 style={{ color: colors.text, margin: 0, fontSize: '18px' }}>
                        {schedule.clientId?.name || schedule.clientName}
                      </h3>
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
                    
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.muted }}>
                        <FaCalendarPlus size={14} />
                        <span>{formatDate(schedule.scheduledDate)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.muted }}>
                        <FaClock size={14} />
                        <span>{formatTime(schedule.scheduledTime)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.muted }}>
                        <FaPhone size={14} />
                        <span>{schedule.clientId?.phone || schedule.clientPhone}</span>
                      </div>
                    </div>
                    
                    <p style={{ color: colors.text, margin: '8px 0 0 0', fontSize: '14px' }}>
                      <strong>Reason:</strong> {schedule.reason}
                    </p>
                    
                    {schedule.notes && (
                      <p style={{ color: colors.muted, margin: '4px 0 0 0', fontSize: '14px' }}>
                        <strong>Notes:</strong> {schedule.notes}
                      </p>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {schedule.status === 'scheduled' && (
                      <>
                        <select
                          value={schedule.status}
                          onChange={(e) => handleStatusUpdate(schedule._id, e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${colors.border}`,
                            background: colors.cardBg,
                            color: colors.text,
                            fontSize: '12px'
                          }}
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="missed">Missed</option>
                        </select>
                        
                        <button
                          onClick={() => handleEditOpen(schedule)}
                          style={{
                            background: colors.accent,
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Edit"
                        >
                          <FaEdit size={12} />
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleDelete(schedule._id)}
                      style={{
                        background: colors.dangerDark,
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        color: '#fff',
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

        {/* Modal */}
        {modalOpen && (
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
              borderRadius: '12px', 
              padding: '32px', 
              minWidth: '500px', 
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: colors.cardShadow 
            }}>
              <h2 style={{ marginBottom: '24px', fontWeight: 'bold', color: colors.text, fontSize: '24px' }}>
                {modalMode === 'add' ? 'Schedule New Call' : 'Edit Scheduled Call'}
              </h2>
              
              <form onSubmit={handleFormSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
                    Client *
                  </label>
                  <select
                    name="clientId"
                    value={form.clientId}
                    onChange={handleFormChange}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: `1px solid ${colors.border}`, 
                      fontSize: '16px', 
                      background: colors.accentLight 
                    }}
                    required
                    disabled={clientsLoading}
                  >
                    <option value="">
                      {clientsLoading ? 'Loading clients...' : 'Select a client'}
                    </option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>
                        {client.name} - {client.phone}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
                      Date *
                    </label>
                    <input 
                      name="scheduledDate" 
                      type="date"
                      value={form.scheduledDate} 
                      onChange={handleFormChange} 
                      min={new Date().toISOString().split('T')[0]} // Prevent past dates
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        border: `1px solid ${colors.border}`, 
                        fontSize: '16px', 
                        background: colors.accentLight 
                      }} 
                      required 
                    />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
                      Time *
                    </label>
                    <input 
                      name="scheduledTime" 
                      type="time"
                      value={form.scheduledTime} 
                      onChange={handleFormChange} 
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        border: `1px solid ${colors.border}`, 
                        fontSize: '16px', 
                        background: colors.accentLight 
                      }} 
                      required 
                    />
                  </div>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
                    Reason *
                  </label>
                  <input 
                    name="reason" 
                    value={form.reason} 
                    onChange={handleFormChange} 
                    placeholder="e.g., Follow-up call, Project discussion, Support"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: `1px solid ${colors.border}`, 
                      fontSize: '16px', 
                      background: colors.accentLight 
                    }} 
                    required 
                  />
                </div>
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>
                    Notes (optional)
                  </label>
                  <textarea 
                    name="notes" 
                    value={form.notes} 
                    onChange={handleFormChange} 
                    rows={3}
                    placeholder="Additional notes about the call..."
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: `1px solid ${colors.border}`, 
                      fontSize: '16px', 
                      background: colors.accentLight,
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }} 
                  />
                </div>
                
                {formError && (
                  <div style={{ 
                    color: colors.dangerDark, 
                    marginBottom: '20px', 
                    fontWeight: 'bold',
                    background: '#fee2e2',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5'
                  }}>
                    {formError}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setModalOpen(false)} 
                    style={{ 
                      padding: '12px 24px', 
                      background: colors.accentLight, 
                      color: colors.text, 
                      border: `1px solid ${colors.border}`, 
                      borderRadius: '8px', 
                      fontWeight: 'bold', 
                      fontSize: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={formLoading || clientsLoading} 
                    style={{ 
                      padding: '12px 24px', 
                      background: colors.accent, 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontWeight: 'bold', 
                      fontSize: '16px',
                      cursor: (formLoading || clientsLoading) ? 'not-allowed' : 'pointer',
                      opacity: (formLoading || clientsLoading) ? 0.7 : 1
                    }}
                  >
                    {formLoading ? 'Saving...' : (modalMode === 'add' ? 'Schedule Call' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduleCallPanel;
