import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaEdit, FaSave, FaTimes, FaUser, FaShieldAlt, FaCheck, FaSearch, FaSpinner } from 'react-icons/fa';
import { theme, getColors } from '../theme';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { usePermissions } from '../contexts/PermissionContext';

const API_URL = getApiBaseUrl();

function PermissionsPage({ colors: propColors }) {
  const colors = propColors || getColors();
  const { refreshPermissions } = usePermissions();
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search and filter states
  const [userSearch, setUserSearch] = useState('');

  // User permissions state - stores permissions for each user
  const [userPermissions, setUserPermissions] = useState({});
  
  // Permission editing states
  const [editingUser, setEditingUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState({}); 

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch all permissions
      const permissionsRes = await axios.get(`${API_URL}/api/permissions`, { headers }).catch(err => {
        console.error('Error fetching permissions:', err);
        return { data: { permissions: [] } };
      });
      const allPermissions = permissionsRes.data?.permissions || [];
      setPermissions(allPermissions);

      // Fetch users
      const usersRes = await axios.get(`${API_URL}/api/users`, { headers }).catch(err => {
        console.error('Error fetching users:', err);
        return { data: [] };
      });
      const usersList = usersRes.data || [];
      setUsers(usersList);

      // Fetch permissions for each user (excluding Admins)
      const userPermsPromises = usersList
        .filter(user => user.Role !== 'Admin')
        .map(async (user) => {
          try {
            const res = await axios.get(`${API_URL}/api/permissions/user/${user._id}`, { headers });
            return { userId: user._id, permissions: res.data?.permissions || [] };
          } catch (err) {
            console.error(`Error fetching permissions for user ${user._id}:`, err);
            return { userId: user._id, permissions: [] };
          }
        });
      
      const userPermsResults = await Promise.all(userPermsPromises);
      const userPermsMap = {};
      userPermsResults.forEach(({ userId, permissions: perms }) => {
        userPermsMap[userId] = {};
        perms.forEach(perm => {
          userPermsMap[userId][perm.name] = perm.granted || false;
        });
      });
      setUserPermissions(userPermsMap);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (user) => {
    setEditingUser(user);
    // Initialize selected permissions with current user permissions
    const currentPerms = userPermissions[user._id] || {};
    const permsMap = {};
    permissions.forEach(perm => {
      permsMap[perm.name] = currentPerms[perm.name] || false;
    });
    setSelectedPermissions(permsMap);
    setError('');
    setSuccess('');
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    
    try {
      setOperationLoading(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Convert selectedPermissions to array format
      const permissionsArray = Object.entries(selectedPermissions).map(([permissionName, granted]) => ({
        permissionName,
        granted
      }));

      await axios.put(`${API_URL}/api/permissions/user/${editingUser._id}`, {
        permissions: permissionsArray
      }, { headers });
      
      setSuccess(`Permissions for ${editingUser.First_Name} ${editingUser.Last_Name} updated successfully.`);
      setEditingUser(null);
      await fetchData();
      
      // Refresh permissions for the current user if they're viewing their own permissions
      try {
        await refreshPermissions();
      } catch (refreshError) {
        console.error('Error refreshing permissions:', refreshError);
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save permissions. Please try again.';
      setError(errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  const togglePermission = (permissionName) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [permissionName]: !prev[permissionName]
    }));
  };

  const formatPermissionName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {});

  // Filter users based on search (exclude Admins from permission management)
  const filteredUsers = users
    .filter(user => user.Role !== 'Admin')
    .filter(user =>
      user.First_Name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.Last_Name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.Email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.Role?.toLowerCase().includes(userSearch.toLowerCase())
    );

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: theme.spacing.md,
        fontFamily: theme.typography.fontFamily
      }}>
        <FaSpinner style={{ fontSize: '32px', color: colors.primary, animation: 'spin 1s linear infinite' }} />
        <div style={{ color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>Loading permissions...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', fontFamily: theme.typography.fontFamily }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Header */}
      <div style={{
        marginBottom: theme.spacing.xl,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme.spacing.md
      }}>
        <div>
          <h2 style={{
            fontSize: theme.typography.fontSizes['3xl'],
            fontWeight: theme.typography.fontWeights.bold,
            color: colors.textPrimary,
            margin: 0,
            marginBottom: theme.spacing.xs,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md
          }}>
            <FaShieldAlt style={{ color: colors.primary }} />
            User Permission Management
          </h2>
          <p style={{
            fontSize: theme.typography.fontSizes.base,
            color: colors.textSecondary,
            margin: 0
          }}>
            Manage individual permissions for each user. Admins have all permissions by default.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          background: colors.errorLight,
          color: colors.error,
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          borderRadius: theme.radius.md,
          marginBottom: theme.spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
          border: `1px solid ${colors.error}`
        }}>
          <FaTimes />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              color: colors.error,
              cursor: 'pointer',
              padding: theme.spacing.xs,
              borderRadius: theme.radius.md,
              fontSize: theme.typography.fontSizes.base,
              display: 'flex',
              alignItems: 'center',
              transition: `background ${theme.transitions.normal}`
            }}
            onMouseEnter={(e) => e.target.style.background = colors.hover}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            aria-label="Close error message"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {success && (
        <div style={{
          background: colors.successLight,
          color: colors.success,
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          borderRadius: theme.radius.md,
          marginBottom: theme.spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
          border: `1px solid ${colors.success}`
        }}>
          <FaCheck />
          <span style={{ flex: 1 }}>{success}</span>
          <button
            onClick={() => setSuccess('')}
            style={{
              background: 'none',
              border: 'none',
              color: colors.success,
              cursor: 'pointer',
              padding: theme.spacing.xs,
              borderRadius: theme.radius.md,
              fontSize: theme.typography.fontSizes.base,
              display: 'flex',
              alignItems: 'center',
              transition: `background ${theme.transitions.normal}`
            }}
            onMouseEnter={(e) => e.target.style.background = colors.hover}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            aria-label="Close success message"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* Users Section */}
      <div style={{
        background: colors.cardBg,
        borderRadius: theme.radius['2xl'],
        boxShadow: theme.shadows.sm,
        border: `1px solid ${colors.border}`,
        padding: theme.spacing['2xl'],
        marginBottom: theme.spacing.xl
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.xl,
          flexWrap: 'wrap',
          gap: theme.spacing.md
        }}>
          <h2 style={{ 
            fontSize: theme.typography.fontSizes['2xl'], 
            fontWeight: theme.typography.fontWeights.bold, 
            color: colors.textPrimary,
            margin: 0
          }}>
            Users ({filteredUsers.length})
          </h2>
          
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '250px' }}>
            <FaSearch style={{
              position: 'absolute',
              left: theme.spacing.md,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textSecondary,
              fontSize: theme.typography.fontSizes.sm
            }} />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.sm} ${theme.spacing['2xl']}`,
                border: `1px solid ${colors.border}`,
                borderRadius: theme.radius.md,
                fontSize: theme.typography.fontSizes.base,
                fontFamily: theme.typography.fontFamily,
                background: colors.white,
                color: colors.textPrimary,
                outline: 'none',
                transition: `all ${theme.transitions.normal}`
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
        </div>
        
        {filteredUsers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: theme.spacing['2xl'],
            color: colors.textSecondary
          }}>
            <FaUser style={{ fontSize: '48px', marginBottom: theme.spacing.md, opacity: 0.3 }} />
            <p style={{ fontSize: theme.typography.fontSizes.base, margin: 0 }}>
              {userSearch ? 'No users found matching your search.' : 'No users found. Admins are excluded from permission management.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: theme.spacing.md }}>
            {filteredUsers.map(user => {
              const userPerms = userPermissions[user._id] || {};
              const grantedPermissions = Object.entries(userPerms)
                .filter(([_, granted]) => granted)
                .map(([name]) => name);
              
              return (
                <div key={user._id} style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: theme.radius.lg,
                  padding: theme.spacing.xl,
                  background: colors.white,
                  boxShadow: theme.shadows.sm,
                  transition: `all ${theme.transitions.normal}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = theme.shadows.md;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = theme.shadows.sm;
                }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: theme.spacing.md,
                    flexWrap: 'wrap',
                    gap: theme.spacing.md
                  }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <h3 style={{ 
                        fontSize: theme.typography.fontSizes.xl, 
                        fontWeight: theme.typography.fontWeights.semibold, 
                        color: colors.textPrimary, 
                        margin: '0 0 4px 0' 
                      }}>
                        {user.First_Name} {user.Last_Name}
                      </h3>
                      <p style={{ 
                        color: colors.textSecondary, 
                        margin: '4px 0',
                        fontSize: theme.typography.fontSizes.sm,
                        lineHeight: theme.typography.lineHeights.relaxed
                      }}>
                        {user.Email}
                      </p>
                      {user.Role && (
                        <span style={{
                          background: colors.primaryBg,
                          color: colors.primary,
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.fontSizes.xs,
                          fontWeight: theme.typography.fontWeights.semibold,
                          display: 'inline-block',
                          marginTop: theme.spacing.xs
                        }}>
                          {user.Role}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                      <Button
                        onClick={() => handleEditPermissions(user)}
                        disabled={operationLoading}
                        variant="primary"
                        style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}
                      >
                        <FaEdit />
                        Edit Permissions
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ 
                      fontSize: theme.typography.fontSizes.sm, 
                      fontWeight: theme.typography.fontWeights.semibold, 
                      color: colors.textPrimary, 
                      margin: '0 0 8px 0' 
                    }}>
                      Permissions ({grantedPermissions.length} granted)
                    </h4>
                    {grantedPermissions.length > 0 ? (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: theme.spacing.xs 
                      }}>
                        {grantedPermissions.slice(0, 10).map(permission => (
                          <span key={permission} style={{
                            background: colors.primary,
                            color: 'white',
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            borderRadius: theme.radius.md,
                            fontSize: theme.typography.fontSizes.xs,
                            fontWeight: theme.typography.fontWeights.medium
                          }}>
                            {formatPermissionName(permission)}
                          </span>
                        ))}
                        {grantedPermissions.length > 10 && (
                          <span style={{
                            background: colors.border,
                            color: colors.textSecondary,
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            borderRadius: theme.radius.md,
                            fontSize: theme.typography.fontSizes.xs,
                            fontWeight: theme.typography.fontWeights.medium
                          }}>
                            +{grantedPermissions.length - 10} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: colors.textSecondary, fontSize: theme.typography.fontSizes.sm, margin: 0 }}>
                        No permissions granted yet
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions Editing Modal */}
      <Modal
        open={!!editingUser}
        onClose={() => !operationLoading && setEditingUser(null)}
        title={editingUser ? `Edit Permissions for ${editingUser.First_Name} ${editingUser.Last_Name}` : 'Edit Permissions'}
        maxWidth="800px"
        footer={
          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              onClick={() => !operationLoading && setEditingUser(null)}
              disabled={operationLoading}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={operationLoading}
              variant="primary"
            >
              {operationLoading ? (
                <>
                  <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave />
                  Save Permissions
                </>
              )}
            </Button>
          </div>
        }
      >
        {editingUser && (
          <div style={{
            background: colors.primaryBg,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            marginBottom: theme.spacing.xl
          }}>
            <p style={{ 
              margin: 0, 
              fontSize: theme.typography.fontSizes.sm, 
              color: colors.textPrimary, 
              fontWeight: theme.typography.fontWeights.semibold 
            }}>
              User: {editingUser.First_Name} {editingUser.Last_Name}
            </p>
            <p style={{ 
              margin: `${theme.spacing.xs} 0 0 0`, 
              fontSize: theme.typography.fontSizes.xs, 
              color: colors.textSecondary 
            }}>
              {editingUser.Email} {editingUser.Role && `• ${editingUser.Role}`}
            </p>
          </div>
        )}
        
        <div style={{ marginBottom: theme.spacing.xl }}>
          <label style={{ 
            display: 'block', 
            marginBottom: theme.spacing.md, 
            color: colors.textPrimary, 
            fontWeight: theme.typography.fontWeights.semibold,
            fontSize: theme.typography.fontSizes.base
          }}>
            Permissions ({Object.values(selectedPermissions).filter(g => g).length} granted)
          </label>
          {Object.keys(groupedPermissions).length === 0 ? (
            <p style={{ 
              color: colors.textSecondary, 
              fontSize: theme.typography.fontSizes.sm, 
              padding: theme.spacing.xl, 
              textAlign: 'center' 
            }}>
              No permissions available. Please ensure permissions are seeded in the database.
            </p>
          ) : (
            Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
              <div key={category} style={{ marginBottom: theme.spacing.xl }}>
                <h4 style={{ 
                  fontSize: theme.typography.fontSizes.base, 
                  fontWeight: theme.typography.fontWeights.semibold, 
                  color: colors.textPrimary, 
                  marginBottom: theme.spacing.md,
                  textTransform: 'capitalize'
                }}>
                  {category.replace(/_/g, ' ')}
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: theme.spacing.sm 
                }}>
                  {categoryPermissions.map(permission => (
                    <label key={permission._id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      padding: theme.spacing.md,
                      borderRadius: theme.radius.md,
                      cursor: 'pointer',
                      background: selectedPermissions[permission.name] ? colors.primaryBg : 'transparent',
                      border: `1px solid ${selectedPermissions[permission.name] ? colors.primary : colors.border}`,
                      transition: `all ${theme.transitions.normal}`
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedPermissions[permission.name] || false}
                        onChange={() => togglePermission(permission.name)}
                        style={{ margin: 0, cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ 
                          fontSize: theme.typography.fontSizes.sm, 
                          color: colors.textPrimary, 
                          fontWeight: theme.typography.fontWeights.medium 
                        }}>
                          {formatPermissionName(permission.name)}
                        </span>
                        {permission.description && (
                          <p style={{ 
                            fontSize: theme.typography.fontSizes.xs, 
                            color: colors.textSecondary, 
                            margin: `${theme.spacing.xs} 0 0 0` 
                          }}>
                            {permission.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

export default PermissionsPage;
