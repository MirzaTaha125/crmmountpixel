import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme } from '../theme';
import { usePermissions } from '../contexts/PermissionContext';
import { FaPhone, FaPlus, FaEdit, FaTrash, FaTimes, FaSpinner } from 'react-icons/fa';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

const API_URL = getApiBaseUrl();

export default function UserSchedulesPanel({ colors, user }) {
  const { canDo } = usePermissions();
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState('');
  const [assignedClients, setAssignedClients] = useState([]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    clientId: '',
    scheduledDate: '',
    scheduledTime: '',
    reason: '',
    notes: '',
    status: 'scheduled'
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchSchedules = async () => {
    if (!canDo('view_schedule_calls') && user?.Role !== 'Admin') return;
    
    setSchedulesLoading(true);
    setSchedulesError('');
    try {
      const res = await axios.get(`${API_URL}/api/call-schedules/my-schedules`, { headers: getAuthHeaders() });
      setSchedules(res.data || []);
    } catch (err) {
      setSchedulesError('Failed to fetch schedules');
    } finally {
      setSchedulesLoading(false);
    }
  };

  const fetchAssignedClients = async () => {
    if (!canDo('add_schedule_calls') && !canDo('edit_schedule_calls')) return;
    
    try {
      const res = await axios.get(`${API_URL}/api/call-schedules/assigned-clients`, { headers: getAuthHeaders() });
      setAssignedClients(res.data || []);
    } catch (err) {
      console.error('Failed to fetch assigned clients', err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchAssignedClients();
  }, []);

  const openScheduleModal = () => {
    setEditingSchedule(null);
    setScheduleForm({
      clientId: '',
      scheduledDate: '',
      scheduledTime: '',
      reason: '',
      notes: '',
      status: 'scheduled'
    });
    setScheduleError('');
    setShowScheduleModal(true);
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    const date = new Date(schedule.scheduledDate);
    const dateStr = date.toISOString().split('T')[0];
    
    setScheduleForm({
      clientId: schedule.client?._id || schedule.clientId,
      scheduledDate: dateStr,
      scheduledTime: schedule.scheduledTime,
      reason: schedule.reason,
      notes: schedule.notes || '',
      status: schedule.status
    });
    setScheduleError('');
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setEditingSchedule(null);
    setScheduleForm({
      clientId: '',
      scheduledDate: '',
      scheduledTime: '',
      reason: '',
      notes: '',
      status: 'scheduled'
    });
    setScheduleError('');
  };

  const handleDeleteSchedule = async (id) => {
    if (!canDo('delete_schedule_calls')) {
      alert('You do not have permission to delete schedules');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/call-schedules/${id}`, { headers: getAuthHeaders() });
      fetchSchedules();
    } catch (err) {
      alert('Failed to delete schedule');
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduleLoading(true);
    setScheduleError('');

    try {
      const payload = {
        ...scheduleForm
      };

      if (editingSchedule) {
        await axios.put(`${API_URL}/api/call-schedules/${editingSchedule._id}`, payload, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_URL}/api/call-schedules`, payload, { headers: getAuthHeaders() });
      }

      closeScheduleModal();
      fetchSchedules();
    } catch (err) {
      setScheduleError(err.response?.data?.error || 'Failed to save schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  return (
    <>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        height: '100%'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24 
        }}>
          <h2 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            color: colors.text, 
            margin: 0 
          }}>
            Schedule Calls ({schedules.length})
          </h2>
          {canDo('add_schedule_calls') && (
            <button
              onClick={openScheduleModal}
              style={{
                background: colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 16,
                fontWeight: 600
              }}
            >
              <FaPlus />
              Schedule Call
            </button>
          )}
        </div>

        {/* Error Message */}
        {schedulesError && (
          <div style={{
            background: colors.danger,
            color: colors.dangerDark,
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 24
          }}>
            {schedulesError}
          </div>
        )}

        {/* Loading */}
        {schedulesLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div>Loading schedules...</div>
          </div>
        ) : schedules.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 40,
            color: colors.muted 
          }}>
            <FaPhone style={{ fontSize: 48, marginBottom: 16, color: colors.accent }} />
            <br />
            No scheduled calls found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Reason</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule._id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: colors.text }}>{schedule.clientName}</div>
                        <div style={{ fontSize: 12, color: colors.muted }}>{schedule.clientEmail}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{schedule.scheduledTime || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>{schedule.reason || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: schedule.status === 'completed' ? colors.success : 
                                   schedule.status === 'cancelled' ? colors.dangerDark : 
                                   schedule.status === 'missed' ? colors.warning : colors.accent,
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        textTransform: 'capitalize'
                      }}>
                        {schedule.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {canDo('edit_schedule_calls') && (
                          <button
                            onClick={() => handleEditSchedule(schedule)}
                            style={{
                              background: colors.accent,
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Edit Schedule"
                          >
                            <FaEdit />
                          </button>
                        )}
                        {canDo('delete_schedule_calls') && (
                          <button
                            onClick={() => handleDeleteSchedule(schedule._id)}
                            style={{
                              background: colors.dangerDark,
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Delete Schedule"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Call Modal */}
      <Modal
        open={showScheduleModal}
        onClose={closeScheduleModal}
        title={editingSchedule ? 'Edit Schedule Call' : 'Schedule New Call'}
        maxWidth="500px"
      >
        <form onSubmit={handleScheduleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>Client</label>
            <select
              value={scheduleForm.clientId}
              onChange={(e) => setScheduleForm({...scheduleForm, clientId: e.target.value})}
              required
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 7,
                border: `1px solid ${colors.border}`,
                fontSize: 16,
                background: colors.accentLight,
                color: colors.text,
              }}
            >
              <option value="">Select a client</option>
              {assignedClients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name} - {client.email}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>Date</label>
            <input
              type="date"
              value={scheduleForm.scheduledDate}
              onChange={(e) => setScheduleForm({...scheduleForm, scheduledDate: e.target.value})}
              required
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 7,
                border: `1px solid ${colors.border}`,
                fontSize: 16,
                background: colors.accentLight,
                color: colors.text,
              }}
            />
          </div>
          
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>Time</label>
            <input
              type="time"
              value={scheduleForm.scheduledTime}
              onChange={(e) => setScheduleForm({...scheduleForm, scheduledTime: e.target.value})}
              required
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 7,
                border: `1px solid ${colors.border}`,
                fontSize: 16,
                background: colors.accentLight,
                color: colors.text,
              }}
            />
          </div>
          
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>Reason</label>
            <input
              type="text"
              value={scheduleForm.reason}
              onChange={(e) => setScheduleForm({...scheduleForm, reason: e.target.value})}
              required
              placeholder="Reason for the call"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 7,
                border: `1px solid ${colors.border}`,
                fontSize: 16,
                background: colors.accentLight,
                color: colors.text,
              }}
            />
          </div>
          
          {editingSchedule && (
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>Status</label>
              <select
                value={scheduleForm.status}
                onChange={(e) => setScheduleForm({...scheduleForm, status: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 7,
                  border: `1px solid ${colors.border}`,
                  fontSize: 16,
                  background: colors.accentLight,
                  color: colors.text,
                }}
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="missed">Missed</option>
              </select>
            </div>
          )}
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>Notes (Optional)</label>
            <textarea
              value={scheduleForm.notes}
              onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
              rows="3"
              placeholder="Additional notes"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 7,
                border: `1px solid ${colors.border}`,
                fontSize: 16,
                background: colors.accentLight,
                color: colors.text,
                resize: 'vertical',
              }}
            />
          </div>
          
          {scheduleError && (
            <div style={{ color: colors.dangerDark, marginBottom: 15 }}>{scheduleError}</div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={closeScheduleModal}
              disabled={scheduleLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={scheduleLoading}
            >
              {scheduleLoading ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Schedule'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
