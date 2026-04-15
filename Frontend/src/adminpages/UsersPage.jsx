import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme, getColors } from '../theme';
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaTimes, FaSearch, FaEllipsisV, FaShieldAlt, FaUnlock, FaQrcode, FaKey, FaCheckCircle, FaCopy, FaDownload } from 'react-icons/fa';

const UsersPage = ({ colors: colorsProp }) => {
  const colors = colorsProp || getColors();
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ First_Name: '', Last_Name: '', Email: '', Password: '', Confirm_Password: '', Role: 'Admin', workEmail: '', workEmailName: '', workPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  
  // 2FA Management States
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState('status'); // 'status', 'setup', 'backup-codes'
  const [targetUserFor2FA, setTargetUserFor2FA] = useState(null);
  const [twoFactorQRCode, setTwoFactorQRCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState([]);
  const [twoFactorPermanentCode, setTwoFactorPermanentCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');

  const API_URL = getApiBaseUrl();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/users`, { headers: getAuthHeaders() });
      setUsers(res.data || []);
    } catch {
      setError('Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

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

  const openAddModal = () => {
    setForm({ First_Name: '', Last_Name: '', Email: '', Password: '', Confirm_Password: '', Role: 'Admin', workEmail: '', workEmailName: '', workPassword: '' });
    setSelectedUser(null);
    setModalMode('add');
    setModalOpen(true);
    setError('');
  };

  const openEditModal = (user) => {
    setForm({
      First_Name: user.First_Name,
      Last_Name: user.Last_Name,
      Email: user.Email,
      Password: '',
      Confirm_Password: '',
      Role: user.Role,
      workEmail: user.workEmail || '',
      workEmailName: user.workEmailName || '',
      workPassword: '' // Don't populate password for security
    });
    setSelectedUser(user);
    setModalMode('edit');
    setModalOpen(true);
    setError('');
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setError('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!form.First_Name || !form.Last_Name || !form.Email) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (modalMode === 'add' && (!form.Password || !form.Confirm_Password)) {
      setError('Password fields are required for new users');
      setLoading(false);
      return;
    }

    if (form.Password && form.Password !== form.Confirm_Password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const payload = { ...form };
      if (modalMode === 'edit' && !payload.Password) {
        delete payload.Password;
        delete payload.Confirm_Password;
      }
      // Only send workPassword if it's provided (for edit mode, empty means don't update)
      if (modalMode === 'edit' && !payload.workPassword) {
        delete payload.workPassword;
      }

      if (modalMode === 'add') {
        await axios.post(`${API_URL}/api/users`, payload, { headers: getAuthHeaders() });
      } else {
        await axios.put(`${API_URL}/api/users/${selectedUser._id}`, payload, { headers: getAuthHeaders() });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error saving user';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen2FAManagement = (user) => {
    setTargetUserFor2FA(user);
    setTwoFactorStep('status');
    setTwoFactorError('');
    setTwoFactorSuccess('');
    setTwoFactorModalOpen(true);
  };

  const handleInitiate2FASetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      const res = await axios.post(`${API_URL}/api/admin-2fa/setup-user`, {
        targetUserId: targetUserFor2FA._id
      }, { headers: getAuthHeaders() });
      
      setTwoFactorQRCode(res.data.qrCode);
      setTwoFactorSecret(res.data.manualEntryKey);
      setTwoFactorStep('setup');
    } catch (err) {
      setTwoFactorError(err.response?.data?.error || 'Failed to initiate 2FA setup');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FASetup = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setTwoFactorError('Please enter a valid 6-digit code');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      const res = await axios.post(`${API_URL}/api/admin-2fa/verify-user-setup`, {
        targetUserId: targetUserFor2FA._id,
        code: twoFactorCode
      }, { headers: getAuthHeaders() });
      
      setTwoFactorBackupCodes(res.data.backupCodes || []);
      setTwoFactorPermanentCode(res.data.permanentBackupCode || '');
      setTwoFactorStep('backup-codes');
      setTwoFactorSuccess('2FA enabled successfully for user');
      fetchUsers(); // Refresh the user list to show updated 2FA status
    } catch (err) {
      setTwoFactorError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm(`Are you sure you want to disable 2FA for ${targetUserFor2FA.First_Name}?`)) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');
    try {
      await axios.post(`${API_URL}/api/admin-2fa/disable-user`, {
        targetUserId: targetUserFor2FA._id
      }, { headers: getAuthHeaders() });
      
      setTwoFactorSuccess('2FA disabled successfully');
      setTwoFactorModalOpen(false);
      fetchUsers();
    } catch (err) {
      setTwoFactorError(err.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    const originalSuccess = twoFactorSuccess;
    setTwoFactorSuccess('Copied to clipboard!');
    setTimeout(() => setTwoFactorSuccess(originalSuccess), 2000);
  };

  const downloadBackupCodes = () => {
    let content = `2FA Backup Codes for ${targetUserFor2FA.First_Name} ${targetUserFor2FA.Last_Name}\n\n`;
    content += `Email: ${targetUserFor2FA.Email}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    if (twoFactorPermanentCode) {
      content += `PERMANENT BACKUP CODE (Multiple-use):\n${twoFactorPermanentCode}\n\n`;
    }
    
    content += `ONE-TIME BACKUP CODES:\n${twoFactorBackupCodes.join('\n')}\n\n`;
    content += `Keep these codes secure. They will not be shown again.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2fa-backup-codes-${targetUserFor2FA.Email.split('@')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.First_Name} ${user.Last_Name}?`)) return;
    setLoading(true);
    setError('');
    try {
      await axios.delete(`${API_URL}/api/users/${user._id}`, { headers: getAuthHeaders() });
      fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error deleting user';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.First_Name?.toLowerCase().includes(search) ||
      user.Last_Name?.toLowerCase().includes(search) ||
      user.Email?.toLowerCase().includes(search) ||
      user.Role?.toLowerCase().includes(search)
    );
  });

  return (
    <div style={{ width: '100%', fontFamily: theme.typography.fontFamily }}>
      {/* Header */}
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
          <h2 style={{
            fontSize: theme.typography.fontSizes.lg,
            fontWeight: 'bold',
            color: colors.textPrimary,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            User Management Matrix
          </h2>
          <p style={{
            fontSize: '10px',
            color: colors.textTertiary,
            margin: 0,
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            Security Personnel & Administrative Access Control
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            padding: `8px 20px`,
            background: colors.sidebarBg,
            color: colors.white,
            border: 'none',
            borderRadius: theme.radius.md,
            fontWeight: 'bold',
            fontSize: '9px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: theme.shadows.sm,
          }}
        >
          <FaPlus />
          Provision Identity
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: theme.spacing.md,
          background: colors.errorLight,
          color: colors.error,
          borderRadius: theme.radius.md,
          marginBottom: theme.spacing.lg,
          borderLeft: `4px solid ${colors.error}`,
          fontSize: theme.typography.fontSizes.xs,
          fontWeight: theme.typography.fontWeights.bold
        }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div style={{
        position: 'relative',
        marginBottom: theme.spacing.xl,
        maxWidth: '400px',
      }}>
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
          placeholder="Search users..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: `${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.sm} ${theme.spacing.xl}`,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.xs,
            color: colors.textPrimary,
            background: colors.white,
            outline: 'none'
          }}
        />
      </div>

      {/* Table */}
      {loading && !users.length ? (
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
          Loading users...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{
          padding: theme.spacing['3xl'],
          textAlign: 'center',
          color: colors.textSecondary,
        }}>
          <p style={{ fontSize: theme.typography.fontSizes.lg, margin: 0 }}>
            {searchTerm ? 'No users match your search' : 'No users found'}
          </p>
        </div>
      ) : (
        <div style={{
          background: colors.white,
          borderRadius: theme.radius.lg,
          border: `1px solid ${colors.borderLight}`,
          overflow: 'hidden',
          boxShadow: theme.shadows.md,
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead style={{ background: colors.tableHeaderBg }}>
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Security'].map((header, idx) => (
                    <th key={header} style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                      textAlign: 'left',
                      fontWeight: 'bold',
                      fontSize: '9px',
                      color: colors.textPrimary,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: `2px solid ${colors.border}`,
                      borderRight: idx < 4 ? `1px solid ${colors.border}` : 'none'
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr
                    key={user._id}
                    style={{
                      borderBottom: `1px solid ${colors.borderLight}`,
                      transition: `background ${theme.transitions.fast}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{
                      padding: theme.spacing.md,
                      fontWeight: theme.typography.fontWeights.bold,
                      fontSize: theme.typography.fontSizes.sm,
                      color: colors.textPrimary,
                    }}>
                      {user.First_Name} {user.Last_Name}
                    </td>
                    <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary }}>
                      {user.Email}
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `2px 10px`,
                        borderRadius: theme.radius.full,
                        fontSize: theme.typography.fontSizes['2xs'],
                        fontWeight: theme.typography.fontWeights.bold,
                        background: user.Role === 'Admin' ? colors.sidebarBg :
                                   user.Role === 'Front' ? colors.primaryBg :
                                   user.Role === 'Upsell' ? colors.successBg :
                                   user.Role === 'Production' ? colors.warningBg : colors.hover,
                        color: user.Role === 'Admin' ? colors.sidebarTextActive : colors.textPrimary,
                        textTransform: 'uppercase'
                      }}>
                        {user.Role}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
                      {user.twoFactorEnabled ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.success, fontSize: theme.typography.fontSizes['2xs'], fontWeight: 'bold' }}>
                          <FaShieldAlt /> ENABLED
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textTertiary, fontSize: theme.typography.fontSizes['2xs'], fontWeight: 'bold' }}>
                          <FaUnlock /> DISABLED
                        </div>
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ position: 'relative', display: 'inline-block' }} data-menu-container>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === user._id ? null : user._id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: 0,
                            fontSize: '16px',
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
                        {openMenuId === user._id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              background: colors.white,
                              border: `2px solid ${colors.sidebarBg}`,
                              borderRadius: 0,
                              boxShadow: theme.shadows.md,
                              zIndex: 1000,
                              minWidth: '160px',
                              marginTop: '4px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(user);
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
                              <FaEdit style={{ fontSize: '14px' }} />
                               <span>Edit</span>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpen2FAManagement(user);
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
                              <FaShieldAlt style={{ fontSize: '14px', color: colors.primary }} />
                              <span>2FA Management</span>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(user);
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

      {/* User Modal */}
      {modalOpen && (
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
          if (e.target === e.currentTarget) closeModal();
        }}
        >
          <div style={{
            background: colors.white,
            borderRadius: theme.radius.xl,
            boxShadow: theme.shadows.xl,
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            zIndex: theme.zIndex.modal,
            border: `1px solid ${colors.border}`
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
                {modalMode === 'add' ? 'Add New User' : 'Edit User'}
              </h3>
              <button
                onClick={closeModal}
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

            <form onSubmit={handleSave} style={{ padding: theme.spacing.xl }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: colors.textPrimary,
                  }}>
                    First Name <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    name="First_Name"
                    value={form.First_Name}
                    onChange={handleFormChange}
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
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: colors.textPrimary,
                  }}>
                    Last Name <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    name="Last_Name"
                    value={form.Last_Name}
                    onChange={handleFormChange}
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
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
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
                  name="Email"
                  type="email"
                  value={form.Email}
                  onChange={handleFormChange}
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

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                }}>
                  Role <span style={{ color: colors.error }}>*</span>
                </label>
                <select
                  name="Role"
                  value={form.Role}
                  onChange={handleFormChange}
                  required
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    cursor: 'pointer',
                  }}
                >
                  <option value="Admin">Admin</option>
                  <option value="Front">Front</option>
                  <option value="Upsell">Upsell</option>
                  <option value="Production">Production</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>

              {/* Work Email Section */}
              <div style={{
                marginTop: theme.spacing.xl,
                paddingTop: theme.spacing.xl,
                borderTop: `2px solid ${colors.borderLight}`,
              }}>
                <h3 style={{
                  fontSize: theme.typography.fontSizes.lg,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: colors.textPrimary,
                  marginBottom: theme.spacing.md,
                }}>
                  Work Email Configuration
                </h3>
                <p style={{
                  fontSize: theme.typography.fontSizes.sm,
                  color: colors.textSecondary,
                  marginBottom: theme.spacing.lg,
                }}>
                  Configure work email credentials for sending emails to clients via Hostinger SMTP
                </p>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: colors.textPrimary,
                  }}>
                    Work Email
                  </label>
                  <input
                    name="workEmail"
                    type="email"
                    value={form.workEmail}
                    onChange={handleFormChange}
                    placeholder="user@yourdomain.com"
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: theme.typography.fontSizes.base,
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
                    Work Email Name
                  </label>
                  <input
                    name="workEmailName"
                    type="text"
                    value={form.workEmailName}
                    onChange={handleFormChange}
                    placeholder="Name to display in emails (e.g., John Smith)"
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: theme.typography.fontSizes.base,
                    }}
                  />
                  <p style={{
                    fontSize: theme.typography.fontSizes.xs,
                    color: colors.textSecondary,
                    marginTop: theme.spacing.xs,
                    marginBottom: 0,
                  }}>
                    This name will be used as the sender name when sending emails from this work email.
                  </p>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: colors.textPrimary,
                  }}>
                    Work Password
                  </label>
                  <input
                    name="workPassword"
                    type="password"
                    value={form.workPassword}
                    onChange={handleFormChange}
                    placeholder={modalMode === 'edit' ? 'Leave empty to keep current password' : 'Enter work email password'}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: theme.typography.fontSizes.base,
                    }}
                  />
                  {modalMode === 'edit' && (
                    <p style={{
                      fontSize: theme.typography.fontSizes.xs,
                      color: colors.textSecondary,
                      marginTop: theme.spacing.xs,
                      marginBottom: 0,
                    }}>
                      Leave empty to keep current password
                    </p>
                  )}
                </div>
              </div>

              {(modalMode === 'add' || form.Password) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: theme.spacing.xs,
                      fontSize: theme.typography.fontSizes.sm,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: colors.textPrimary,
                    }}>
                      Password {modalMode === 'add' && <span style={{ color: colors.error }}>*</span>}
                    </label>
                    <input
                      name="Password"
                      type="password"
                      value={form.Password}
                      onChange={handleFormChange}
                      required={modalMode === 'add'}
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        borderRadius: theme.radius.md,
                        border: `1px solid ${colors.border}`,
                        fontSize: theme.typography.fontSizes.base,
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
                      Confirm Password {modalMode === 'add' && <span style={{ color: colors.error }}>*</span>}
                    </label>
                    <input
                      name="Confirm_Password"
                      type="password"
                      value={form.Confirm_Password}
                      onChange={handleFormChange}
                      required={modalMode === 'add'}
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        borderRadius: theme.radius.md,
                        border: `1px solid ${colors.border}`,
                        fontSize: theme.typography.fontSizes.base,
                      }}
                    />
                  </div>
                </div>
              )}

              {modalMode === 'edit' && (
                <div style={{
                  padding: theme.spacing.md,
                  background: colors.infoLight,
                  borderRadius: theme.radius.md,
                  marginBottom: theme.spacing.lg,
                  fontSize: theme.typography.fontSizes.sm,
                  color: colors.info,
                }}>
                  Leave password fields empty to keep current password
                </div>
              )}

              {/* 2FA Information */}
              <div style={{
                padding: theme.spacing.md,
                background: colors.primaryBg,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
                border: `1px solid ${colors.primary}20`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: theme.spacing.sm,
                }}>
                  <div style={{
                    fontSize: '16px',
                    color: colors.primary,
                    marginTop: '2px',
                  }}>
                    🔐
                  </div>
                  <div>
                    <p style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes.sm,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: colors.textPrimary,
                      marginBottom: theme.spacing.xs,
                    }}>
                      Two-Factor Authentication (2FA)
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes.xs,
                      color: colors.textSecondary,
                      lineHeight: 1.5,
                    }}>
                      Users can enable Google Authenticator 2FA from their account settings after logging in. This adds an extra layer of security to their account.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: theme.spacing.md,
                  background: colors.errorLight,
                  color: colors.error,
                  borderRadius: theme.radius.md,
                  marginBottom: theme.spacing.lg,
                  fontSize: theme.typography.fontSizes.sm,
                }}>
                  {error}
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
                  onClick={closeModal}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading && <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />}
                  {modalMode === 'add' ? 'Add User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Management Modal */}
      {twoFactorModalOpen && (
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
          zIndex: theme.zIndex.modalBackdrop + 1,
          padding: theme.spacing.lg,
        }}>
          <div style={{
            background: colors.white,
            borderRadius: 0,
            boxShadow: theme.shadows.xl,
            width: '100%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: theme.spacing.xl,
            border: `1px solid ${colors.border}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.xl,
            }}>
              <h3 style={{ margin: 0, fontSize: theme.typography.fontSizes['2xl'], fontWeight: 'bold' }}>
                2FA Management: {targetUserFor2FA?.First_Name}
              </h3>
              <button 
                onClick={() => setTwoFactorModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary }}
              >
                <FaTimes size={20} />
              </button>
            </div>

            {twoFactorError && (
              <div style={{ 
                padding: theme.spacing.md, 
                background: colors.errorLight, 
                color: colors.error, 
                borderRadius: theme.radius.md, 
                marginBottom: theme.spacing.lg,
                border: `1px solid ${colors.error}`
              }}>
                {twoFactorError}
              </div>
            )}

            {twoFactorSuccess && (
              <div style={{ 
                padding: theme.spacing.md, 
                background: colors.successLight, 
                color: colors.success, 
                borderRadius: theme.radius.md, 
                marginBottom: theme.spacing.lg,
                border: `1px solid ${colors.success}`
              }}>
                {twoFactorSuccess}
              </div>
            )}

            {twoFactorStep === 'status' && (
              <div style={{ textAlign: 'center', padding: theme.spacing.lg }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', 
                  background: targetUserFor2FA?.twoFactorEnabled ? colors.successLight : colors.hover, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                }}>
                  <FaShieldAlt style={{ fontSize: '40px', color: targetUserFor2FA?.twoFactorEnabled ? colors.success : colors.textTertiary }} />
                </div>
                <h4 style={{ marginBottom: '10px' }}>
                  Two-Factor Authentication is <strong>{targetUserFor2FA?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</strong>
                </h4>
                <p style={{ color: colors.textSecondary, marginBottom: '30px' }}>
                  {targetUserFor2FA?.twoFactorEnabled 
                    ? 'This user is required to enter a code from their authenticator app to log in.' 
                    : 'Setting up 2FA adds an extra layer of security to the user\'s account.'}
                </p>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  {targetUserFor2FA?.twoFactorEnabled ? (
                    <button 
                      onClick={handleDisable2FA}
                      disabled={twoFactorLoading}
                      style={{
                        padding: '12px 24px', background: colors.error, color: 'white', 
                        border: 'none', borderRadius: theme.radius.md, cursor: 'pointer', fontWeight: 'bold'
                      }}
                    >
                      {twoFactorLoading ? <FaSpinner className="spin" /> : 'Disable 2FA'}
                    </button>
                  ) : (
                    <button 
                      onClick={handleInitiate2FASetup}
                      disabled={twoFactorLoading}
                      style={{
                        padding: '12px 24px', background: colors.primary, color: 'white', 
                        border: 'none', borderRadius: theme.radius.md, cursor: 'pointer', fontWeight: 'bold'
                      }}
                    >
                      {twoFactorLoading ? <FaSpinner className="spin" /> : 'Begin 2FA Setup'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {twoFactorStep === 'setup' && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '20px', color: colors.textSecondary }}>
                  Ask the user to scan this QR code with their Google Authenticator app, then enter the 6-digit code shown in their app below.
                </p>
                {twoFactorQRCode && (
                  <div style={{ background: 'white', padding: '15px', display: 'inline-block', borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
                    <img src={twoFactorQRCode} alt="QR Code" style={{ maxWidth: '200px' }} />
                  </div>
                )}
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '14px', marginBottom: '5px' }}>Manual Code: <code>{twoFactorSecret}</code></p>
                </div>
                <form onSubmit={handleVerify2FASetup}>
                  <input 
                    type="text" 
                    placeholder="Enter 6-digit code" 
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '8px', border: `2px solid ${colors.primary}`,
                      fontSize: '18px', textAlign: 'center', letterSpacing: '8px', marginBottom: '20px'
                    }}
                  />
                  <button 
                    type="submit"
                    disabled={twoFactorLoading || twoFactorCode.length !== 6}
                    style={{
                      width: '100%', padding: '14px', background: colors.primary, color: 'white',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    {twoFactorLoading ? <FaSpinner className="spin" /> : 'Verify and Enable'}
                  </button>
                </form>
              </div>
            )}

            {twoFactorStep === 'backup-codes' && (
              <div>
                <div style={{ 
                  background: colors.success + '10', border: `1px solid ${colors.success}`, 
                  padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center'
                }}>
                  <FaCheckCircle style={{ color: colors.success, fontSize: '30px', marginBottom: '10px' }} />
                  <h4 style={{ color: colors.success, margin: 0 }}>2FA Successfully Enabled!</h4>
                </div>
                <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '15px' }}>
                  Please give these backup codes to the user. They are needed if they lose access to their authenticator app.
                </p>
                
                {twoFactorPermanentCode && (
                  <div style={{ marginBottom: '15px', padding: '10px', background: colors.hover, borderRadius: '8px' }}>
                    <label style={{ fontSize: '12px', color: colors.textSecondary, display: 'block' }}>Permanent Code (Multiple Use):</label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <code style={{ fontSize: '18px', fontWeight: 'bold' }}>{twoFactorPermanentCode}</code>
                      <button onClick={() => copyToClipboard(twoFactorPermanentCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.primary }}><FaCopy /></button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {twoFactorBackupCodes.map((code, idx) => (
                    <div key={idx} style={{ padding: '8px', border: `1px solid ${colors.border}`, borderRadius: '6px', textAlign: 'center', fontSize: '13px', background: 'white' }}>
                      {code}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={downloadBackupCodes}
                    style={{ flex: 1, padding: '10px', background: colors.primaryBg, color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <FaDownload /> Download
                  </button>
                  <button 
                    onClick={() => setTwoFactorModalOpen(false)}
                    style={{ flex: 1, padding: '10px', background: colors.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default UsersPage;
