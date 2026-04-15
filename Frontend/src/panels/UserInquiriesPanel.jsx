import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme } from '../theme';
import { usePermissions } from '../contexts/PermissionContext';
import { FaUserTie, FaSpinner, FaUserPlus, FaCheck, FaTrash, FaPlus, FaPhone } from 'react-icons/fa';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

const API_URL = getApiBaseUrl();

export default function UserInquiriesPanel({ colors, user }) {
  const { canDo } = usePermissions();
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiriesError, setInquiriesError] = useState('');
  const [inquirySearchTerm, setInquirySearchTerm] = useState('');

  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', reason: '', message: '' });
  const [inquiryFormError, setInquiryFormError] = useState('');
  const [inquiryFormLoading, setInquiryFormLoading] = useState(false);

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertInquiry, setConvertInquiry] = useState(null);
  const [convertLoading, setConvertLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchInquiries = async () => {
    if (!canDo('view_inquiries') && user?.Role !== 'Admin') return;
    setInquiriesLoading(true);
    setInquiriesError('');
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/inquiries`, { headers });
      setInquiries(res.data);
    } catch {
      setInquiriesError('Failed to fetch inquiries');
    } finally {
      setInquiriesLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  // Inquiry modal handlers
  const openInquiryModal = () => {
    setInquiryForm({ name: '', email: '', phone: '', reason: '', message: '' });
    setInquiryFormError('');
    setShowInquiryModal(true);
  };

  const closeInquiryModal = () => {
    setShowInquiryModal(false);
    setInquiryForm({ name: '', email: '', phone: '', reason: '', message: '' });
    setInquiryFormError('');
  };

  const handleInquiryFormChange = (e) => {
    const { name, value } = e.target;
    setInquiryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    
    if (!canDo('add_inquiries')) {
      setInquiryFormError('You do not have permission to add inquiries');
      return;
    }

    // Validate form
    if (!inquiryForm.name || !inquiryForm.email || !inquiryForm.phone || (!inquiryForm.reason && !inquiryForm.message)) {
      setInquiryFormError('Please fill in all required fields (Name, Email, Phone, Reason/Message)');
      return;
    }

    setInquiryFormLoading(true);
    setInquiryFormError('');

    try {
      const headers = getAuthHeaders();
      const payload = {
        name: inquiryForm.name,
        email: inquiryForm.email,
        phone: inquiryForm.phone,
        reason: inquiryForm.reason || inquiryForm.message,
        message: inquiryForm.message || inquiryForm.reason
      };
      await axios.post(`${API_URL}/api/inquiries`, payload, { headers });
      closeInquiryModal();
      fetchInquiries(); // Refresh the list
    } catch (err) {
      let errorMsg = 'Failed to add inquiry. Please try again.';
      if (err.response?.data) {
        errorMsg = err.response.data.error || err.response.data.message || errorMsg;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setInquiryFormError(errorMsg);
    } finally {
      setInquiryFormLoading(false);
    }
  };

  const handleDeleteInquiry = async (inquiryId) => {
    if (!canDo('delete_inquiries')) {
      alert('You do not have permission to delete inquiries');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this inquiry?')) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      await axios.delete(`${API_URL}/api/inquiries/${inquiryId}`, { headers });
      fetchInquiries(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to delete inquiry. Please try again.');
    }
  };

  const handleConvertOpen = (inquiry) => {
    if (!canDo('convert_inquiries')) {
      alert('You do not have permission to convert inquiries');
      return;
    }
    setConvertInquiry(inquiry);
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
      fetchInquiries(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to convert inquiry. Please try again.');
    } finally {
      setConvertLoading(false);
    }
  };

  const filteredInquiries = (inquiries || []).filter(inquiry => {
    if (!inquirySearchTerm) return true;
    const searchLower = inquirySearchTerm.toLowerCase();
    return (
      inquiry.name?.toLowerCase().includes(searchLower) ||
      inquiry.email?.toLowerCase().includes(searchLower) ||
      inquiry.phone?.toLowerCase().includes(searchLower) ||
      inquiry.message?.toLowerCase().includes(searchLower)
    );
  });

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
            Inquiries ({filteredInquiries.length})
          </h2>
          {canDo('add_inquiries') && (
            <button
              onClick={openInquiryModal}
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
              Add Inquiry
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <Input
            placeholder="Search inquiries..."
            value={inquirySearchTerm}
            onChange={(e) => setInquirySearchTerm(e.target.value)}
          />
        </div>

        {/* Error Message */}
        {inquiriesError && (
          <div style={{
            background: colors.danger,
            color: colors.dangerDark,
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 24
          }}>
            {inquiriesError}
          </div>
        )}

        {/* Loading */}
        {inquiriesLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div>Loading inquiries...</div>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 40,
            color: colors.muted 
          }}>
            <FaUserTie style={{ fontSize: 48, marginBottom: 16, color: colors.accent }} />
            <br />
            {inquirySearchTerm ? 'No inquiries found matching your search.' : 'No inquiries found.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Phone</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Source</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Message</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inquiry) => (
                  <tr key={inquiry._id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px 16px' }}>{inquiry.name || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>{inquiry.email || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>{inquiry.phone || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>{inquiry.source || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                      <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {inquiry.message || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {!inquiry.isConverted && canDo('convert_inquiries') && (
                          <button
                            onClick={() => handleConvertOpen(inquiry)}
                            disabled={convertLoading}
                            style={{
                              background: colors.success,
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: 4,
                              cursor: convertLoading ? 'not-allowed' : 'pointer',
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              opacity: convertLoading ? 0.6 : 1
                            }}
                            title="Convert to Client"
                          >
                            {convertLoading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaUserPlus />} Convert
                          </button>
                        )}
                        {inquiry.isConverted && (
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: 4,
                            background: colors.successLight,
                            color: colors.success,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <FaCheck /> Converted
                          </span>
                        )}
                        {canDo('delete_inquiries') && (
                          <button
                            onClick={() => handleDeleteInquiry(inquiry._id)}
                            style={{
                              background: colors.dangerDark,
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                            title="Delete Inquiry"
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

      {/* Inquiry Modal */}
      <Modal
        open={showInquiryModal}
        onClose={closeInquiryModal}
        title="Add Inquiry"
        maxWidth="500px"
      >
        <form onSubmit={handleInquirySubmit}>
          <Input
            label="Name"
            name="name"
            value={inquiryForm.name}
            onChange={handleInquiryFormChange}
            required
            placeholder="Enter inquiry name"
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={inquiryForm.email}
            onChange={handleInquiryFormChange}
            required
            placeholder="Enter inquiry email"
          />
          <Input
            label="Phone"
            name="phone"
            value={inquiryForm.phone}
            onChange={handleInquiryFormChange}
            required
            placeholder="Enter inquiry phone"
          />
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.textPrimary,
            }}>
              Reason / Message <span style={{ color: theme.colors.error }}>*</span>
            </label>
            <textarea
              name="reason"
              value={inquiryForm.reason || inquiryForm.message || ''}
              onChange={(e) => {
                const value = e.target.value;
                setInquiryForm(prev => ({ ...prev, reason: value, message: value }));
              }}
              required
              placeholder="Enter reason or message"
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                background: theme.colors.white,
                color: theme.colors.textPrimary,
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: theme.typography.fontFamily,
                transition: `all ${theme.transitions.normal}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.primaryBg}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          {inquiryFormError && (
            <div style={{ 
              background: colors.errorLight,
              color: colors.error,
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderRadius: theme.radius.md,
              marginBottom: theme.spacing.lg,
              fontSize: theme.typography.fontSizes.sm,
              border: `1px solid ${colors.error}`
            }}>
              {inquiryFormError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
            <Button
              type="button"
              variant="secondary"
              onClick={closeInquiryModal}
              disabled={inquiryFormLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={inquiryFormLoading}
            >
              {inquiryFormLoading ? 'Adding...' : 'Add Inquiry'}
            </Button>
          </div>
        </form>
      </Modal>

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
          zIndex: 9999,
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
            borderRadius: theme.radius.xl,
            boxShadow: theme.shadows.xl,
            width: '100%',
            maxWidth: '500px',
            zIndex: 10000,
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: theme.spacing.xl,
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: theme.typography.fontSizes['2xl'],
                fontWeight: theme.typography.fontWeights.bold,
                color: colors.warning,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}>
                 Warning
              </h3>
            </div>
            {/* Modal Body */}
            <div style={{ padding: theme.spacing.xl }}>
              <p style={{ margin: 0, color: colors.textSecondary, lineHeight: 1.6 }}>
                Are you sure you want to convert this inquiry to a client?
                <br /><br />
                This will create a new client account with the details from this inquiry.
              </p>
            </div>
             {/* Modal Footer */}
             <div style={{
              padding: theme.spacing.xl,
              background: colors.background,
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: theme.spacing.md,
              borderBottomLeftRadius: theme.radius.xl,
              borderBottomRightRadius: theme.radius.xl,
            }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setConvertModalOpen(false);
                  setConvertInquiry(null);
                }}
                disabled={convertLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConvertSubmit}
                disabled={convertLoading}
                style={{
                    background: colors.success
                }}
              >
                {convertLoading ? 'Converting...' : 'Confirm Conversion'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
