import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from './session.jsx';
import { useNavigate } from 'react-router-dom';
import getApiBaseUrl from './apiBase';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const colors = {
  sidebarGradient: 'linear-gradient(160deg, #232946 60%, #4f8cff 100%)',
  sidebarActive: '#2563eb',
  sidebarHover: '#3b4a7a',
  sidebarText: '#fff',
  sidebarInactive: '#b8c1ec',
  mainBg: '#f4f6fb',
  cardBg: '#fff',
  cardShadow: '0 2px 16px rgba(79,140,255,0.08)',
  accent: '#4f8cff',
  accentLight: '#e3f0ff',
  danger: '#ffadad',
  dangerDark: '#e74c3c',
  border: '#e0e6ed',
  text: '#232946',
  muted: '#555',
};

function InquiriesPanel() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    serviceWebsite: false,
    serviceLogo: false,
    serviceSmm: false,
    serviceOther: false,
    email: '',
    phone: '',
    message: '',
    source: 'Website',
    finalQuotation: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const API_URL = getApiBaseUrl();

  // Helper to get auth headers
  function getAuthHeaders() {
    const token = localStorage.getItem('token') || user?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Fetch inquiries
  const fetchInquiries = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/api/inquiries`, {
        headers: getAuthHeaders()
      });
      setInquiries(response.data.inquiries || []);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      setError('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  };

  // Load inquiries on component mount
  useEffect(() => {
    fetchInquiries();
  }, []);

  // Handle form submission (Add or Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (modalMode === 'add') {
        await axios.post(`${API_URL}/api/inquiries`, form, {
          headers: getAuthHeaders()
        });
      } else {
        await axios.put(`${API_URL}/api/inquiries/${selectedInquiry._id}`, form, {
          headers: getAuthHeaders()
        });
      }
      setModalOpen(false);
      resetForm();
      fetchInquiries();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to save inquiry');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      businessName: '',
      serviceWebsite: false,
      serviceLogo: false,
      serviceSmm: false,
      serviceOther: false,
      email: '',
      phone: '',
      message: '',
      source: 'Website',
      finalQuotation: ''
    });
    setSelectedInquiry(null);
  };

  const handleAddOpen = () => {
    resetForm();
    setModalMode('add');
    setModalOpen(true);
  };

  const handleEditOpen = (inquiry) => {
    setForm({
      name: inquiry.name || '',
      businessName: inquiry.businessName || '',
      serviceWebsite: !!inquiry.serviceWebsite,
      serviceLogo: !!inquiry.serviceLogo,
      serviceSmm: !!inquiry.serviceSmm,
      serviceOther: !!inquiry.serviceOther,
      email: inquiry.email || '',
      phone: inquiry.phone || '',
      message: inquiry.message || '',
      source: inquiry.source || 'Website',
      finalQuotation: inquiry.finalQuotation || ''
    });
    setSelectedInquiry(inquiry);
    setModalMode('edit');
    setModalOpen(true);
  };

  // Handle delete inquiry
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;

    try {
      await axios.delete(`${API_URL}/api/inquiries/${id}`, {
        headers: getAuthHeaders()
      });
      fetchInquiries();
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      alert('Failed to delete inquiry');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.mainBg, padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 32 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => navigate('/user')}
              style={{
                background: colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600
              }}
            >
              <FaArrowLeft />
              Back to Panel
            </button>
            <h1 style={{ 
              fontSize: 32, 
              fontWeight: 800, 
              color: colors.text, 
              margin: 0 
            }}>
              Inquiries
            </h1>
          </div>
          <button
            onClick={handleAddOpen}
            style={{
              background: colors.accent,
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FaPlus />
            Add Inquiry
          </button>
        </div>

        {/* Content */}
        <div style={{
          background: colors.cardBg,
          borderRadius: 18,
          boxShadow: colors.cardShadow,
          padding: 36,
          minHeight: 400
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: colors.muted }}>
              Loading inquiries...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, color: colors.dangerDark }}>
              {error}
            </div>
          ) : inquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: colors.muted }}>
              No inquiries found
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Business</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Services</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Quotation</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Email</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Phone</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Source</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Message</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Created By</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Role</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.text }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inquiry) => (
                    <tr 
                      key={inquiry._id} 
                      onClick={() => handleEditOpen(inquiry)}
                      style={{ 
                        borderBottom: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px' }}>{inquiry.name}</td>
                      <td style={{ padding: '12px 16px' }}>{inquiry.businessName || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {inquiry.serviceWebsite && <span style={{ fontSize: 10, background: '#eee', padding: '2px 4px', borderRadius: 4 }}>Web</span>}
                          {inquiry.serviceLogo && <span style={{ fontSize: 10, background: '#eee', padding: '2px 4px', borderRadius: 4 }}>Logo</span>}
                          {inquiry.serviceSmm && <span style={{ fontSize: 10, background: '#eee', padding: '2px 4px', borderRadius: 4 }}>SMM</span>}
                          {inquiry.serviceOther && <span style={{ fontSize: 10, background: '#eee', padding: '2px 4px', borderRadius: 4 }}>Other</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{inquiry.finalQuotation || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>{inquiry.email}</td>
                      <td style={{ padding: '12px 16px' }}>{inquiry.phone}</td>
                      <td style={{ padding: '12px 16px' }}>{inquiry.source}</td>
                      <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                        <div style={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}>
                          {inquiry.message}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{inquiry.createdByName || 'Unknown'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          background: inquiry.createdByRole === 'Employee' ? '#e3f2fd' : 
                                     inquiry.createdByRole === 'Front' ? '#f3e5f5' : 
                                     inquiry.createdByRole === 'Upsell' ? '#e8f5e8' : 
                                     inquiry.createdByRole === 'Production' ? '#fff3e0' : '#f5f5f5',
                          color: inquiry.createdByRole === 'Employee' ? '#1976d2' : 
                                 inquiry.createdByRole === 'Front' ? '#7b1fa2' : 
                                 inquiry.createdByRole === 'Upsell' ? '#388e3c' : 
                                 inquiry.createdByRole === 'Production' ? '#f57c00' : '#666'
                        }}>
                          {inquiry.createdByRole || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => handleDelete(inquiry._id)}
                          style={{
                            background: colors.dangerDark,
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
        >
          <div style={{
            background: colors.cardBg,
            padding: 32,
            borderRadius: 12,
            width: '90%',
            maxWidth: 500,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: colors.text, marginBottom: 24 }}>
              {modalMode === 'add' ? 'Add New Inquiry' : 'Edit Inquiry'}
            </h3>
            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>
                  Business Name
                </label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm({...form, businessName: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>
                  Services Requested
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    { id: 'serviceWebsite', label: 'Website' },
                    { id: 'serviceLogo', label: 'Logo' },
                    { id: 'serviceSmm', label: 'SMM' },
                    { id: 'serviceOther', label: 'Other' },
                  ].map((service) => (
                    <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form[service.id]}
                        onChange={(e) => setForm({...form, [service.id]: e.target.checked})}
                        style={{ cursor: 'pointer' }}
                      />
                      {service.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>
                  Final Quotation
                </label>
                <input
                  type="text"
                  value={form.finalQuotation}
                  onChange={(e) => setForm({...form, finalQuotation: e.target.value})}
                  placeholder="e.g. $500"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>
                  Source
                </label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({...form, source: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    fontSize: 14
                  }}
                >
                  <option value="Website">Website</option>
                  <option value="Phone">Phone</option>
                  <option value="Email">Email</option>
                  <option value="Referral">Referral</option>
                  <option value="Social Media">Social Media</option>
                </select>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, color: colors.text }}>
                  Message *
                </label>
                <textarea
                  required
                  value={form.message}
                  onChange={(e) => setForm({...form, message: e.target.value})}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    fontSize: 14,
                    resize: 'vertical'
                  }}
                />
              </div>
              {formError && (
                <div style={{ color: colors.dangerDark, marginBottom: 16, fontSize: 14 }}>
                  {formError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '12px 24px',
                    border: `1px solid ${colors.border}`,
                    background: colors.cardBg,
                    color: colors.text,
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    padding: '12px 24px',
                    background: colors.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                    opacity: formLoading ? 0.7 : 1
                  }}
                >
                  {formLoading ? 'Saving...' : modalMode === 'add' ? 'Add Inquiry' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InquiriesPanel;
