import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaEdit, FaSave, FaTimes, FaUser, FaShieldAlt, FaCheck, FaSearch, FaSpinner, FaLock, FaUserShield } from 'react-icons/fa';
import { theme, getColors } from '../theme';
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
  const [userSearch, setUserSearch] = useState('');
  const [userPermissions, setUserPermissions] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState({}); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const permissionsRes = await axios.get(`${API_URL}/api/permissions`, { headers });
      const allPermissions = permissionsRes.data?.permissions || [];
      setPermissions(allPermissions);
      const usersRes = await axios.get(`${API_URL}/api/users`, { headers });
      const usersList = usersRes.data || [];
      setUsers(usersList);
      const userPermsPromises = usersList.filter(u => u.Role !== 'Admin').map(async (u) => {
        try {
          const res = await axios.get(`${API_URL}/api/permissions/user/${u._id}`, { headers });
          return { userId: u._id, permissions: res.data?.permissions || [] };
        } catch { return { userId: u._id, permissions: [] }; }
      });
      const userPermsResults = await Promise.all(userPermsPromises);
      const userPermsMap = {};
      userPermsResults.forEach(({ userId, permissions: perms }) => {
        userPermsMap[userId] = {};
        perms.forEach(p => { userPermsMap[userId][p.name] = p.granted || false; });
      });
      setUserPermissions(userPermsMap);
    } catch {
      setError('Communication with security layer failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (user) => {
    setEditingUser(user);
    const currentPerms = userPermissions[user._id] || {};
    const permsMap = {};
    permissions.forEach(perm => { permsMap[perm.name] = currentPerms[perm.name] || false; });
    setSelectedPermissions(permsMap);
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('token');
      const permissionsArray = Object.entries(selectedPermissions).map(([name, granted]) => ({ permissionName: name, granted }));
      await axios.put(`${API_URL}/api/permissions/user/${editingUser._id}`, { permissions: permissionsArray }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`Permissions synchronized for ${editingUser.First_Name}`);
      setEditingUser(null);
      await fetchData();
      await refreshPermissions();
    } catch {
      setError('Sync operation aborted by server');
    } finally {
      setOperationLoading(false);
    }
  };

  const togglePermission = (name) => {
    setSelectedPermissions(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const formatName = (n) => n.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const grouped = permissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const filteredUsers = users.filter(u => u.Role !== 'Admin').filter(u => 
    (u.First_Name + ' ' + u.Last_Name).toLowerCase().includes(userSearch.toLowerCase()) || u.Role?.toLowerCase().includes(userSearch.toLowerCase())
  );

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
      }} className="permissions-header">
        <style>{`
          @media (max-width: 600px) {
            .permissions-header {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .permissions-header > div:last-child {
              width: 100% !important;
            }
            .permissions-header .override-badge {
              width: 100% !important;
              text-align: center !important;
            }
            .permissions-controls {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
        <div>
          <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Access Control Registry
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            System-wide Permission Matrix & User Role Authority
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', border: `1px solid ${colors.sidebarBg}`, borderRadius: theme.radius.sm, padding: '4px 8px', color: colors.sidebarBg }} className="override-badge">
            ADMINISTRATIVE OVERRIDE ACTIVE
          </div>
        </div>
      </div>

      {/* QUICK STATS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1px',
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        boxShadow: theme.shadows.sm,
        background: colors.border
      }}>
        <div style={{ padding: theme.spacing.md, background: colors.tableHeaderBg }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Managed Identities</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary }}>{users.filter(u => u.Role !== 'Admin').length} SUBJECTS</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Permission Vectors</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.sidebarBg }}>{permissions.length} OBJECTS</div>
        </div>
        <div style={{ padding: theme.spacing.md, background: colors.white }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: '4px' }}>Security State</div>
          <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: '#10b981' }}>PROTECTED</div>
        </div>
      </div>

      {/* CONTROL GRID */}
      <div style={{ 
        background: colors.white, 
        padding: theme.spacing.lg, 
        marginBottom: theme.spacing.lg,
        borderRadius: theme.radius.md,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm,
      }} className="permissions-controls">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: theme.spacing.md }}>
          <div style={{ position: 'relative' }}>
            <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: colors.textTertiary }} />
            <input type="text" placeholder="Lookup subject identity..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ width: '100%', padding: '8px 10px 8px 30px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '11px', background: colors.white, outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* ALERTS */}
      {error && <div style={{ background: colors.error, color: colors.white, padding: '10px', fontSize: '9px', fontWeight: 'bold', marginBottom: '10px' }}>ERROR: {error.toUpperCase()}</div>}
      {success && <div style={{ background: '#10b981', color: colors.white, padding: '10px', fontSize: '9px', fontWeight: 'bold', marginBottom: '10px' }}>SUCCESS: {success.toUpperCase()}</div>}

      {/* DATA GRID */}
      <div style={{ 
        background: colors.white, 
        borderRadius: theme.radius.lg, 
        border: `1px solid ${colors.borderLight}`,
        overflow: 'hidden',
        boxShadow: theme.shadows.md,
      }}>
        <div style={{ 
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead style={{ background: colors.tableHeaderBg }}>
              <tr>
                {['Subject Identity', 'Department / Role', 'Access Level Summary', 'Security Control'].map((h, idx) => (
                  <th key={idx} style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    textAlign: 'left',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: colors.textPrimary,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    borderBottom: `2px solid ${colors.border}`,
                    borderRight: idx < 3 ? `1px solid ${colors.border}` : 'none'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: '10px' }}>SCANNING SECURITY CLEARANCE RECORDS...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: '10px' }}>NO SUBJECTS FOUND FOR CURRENT AUDIT.</td></tr>
              ) : filteredUsers.map((u, idx) => {
                const granted = Object.entries(userPermissions[u._id] || {}).filter(([_k,v])=>v).length;
                return (
                  <tr key={u._id} style={{ borderBottom: `1px solid ${colors.borderLight}`, background: idx % 2 === 0 ? colors.white : colors.primaryBg }}>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', color: colors.textPrimary, textTransform: 'uppercase' }}>{u.First_Name} {u.Last_Name}</div>
                      <div style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold' }}>{u.Email.toUpperCase()}</div>
                    </td>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                      <span style={{ padding: '3px 7px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.full, fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: colors.sidebarBg }}>{u.Role}</span>
                    </td>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textPrimary }}>{granted} PRIVILEGES AUTHORIZED</div>
                      <div style={{ fontSize: '8px', color: colors.textTertiary }}>ACCESS LEVEL: {granted > 10 ? 'HIGH' : granted > 5 ? 'MEDIUM' : 'LIMITED'}</div>
                    </td>
                    <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                      <button onClick={() => handleEditPermissions(u)} style={{ background: colors.sidebarBg, color: colors.white, border: 'none', padding: '6px 12px', borderRadius: theme.radius.md, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: theme.shadows.sm }}>
                        <FaLock fontSize="10" /> Modify Access
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACCESS MODIFCATION MODAL */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: theme.spacing.md }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: '95%', maxWidth: 900, height: '90vh', boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 25px`, color: colors.textPrimary, fontWeight: theme.typography.fontWeights.bold, fontSize: '11px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${colors.border}`, borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0` }}>
              <span>Subject Authority Matrix: {editingUser.First_Name} {editingUser.Last_Name}</span>
              <FaUserShield fontSize="16" />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.xl }}>
              <div style={{ background: colors.primaryBg, padding: theme.spacing.lg, marginBottom: theme.spacing.xl, borderRadius: theme.radius.md, border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, marginBottom: '4px' }}>CURRENT SECURITY CLEARANCE</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: colors.sidebarBg }}>{Object.values(selectedPermissions).filter(g=>g).length} ACTIVE VECTORS</div>
              </div>
              {Object.entries(grouped).map(([cat, ps]) => (
                <div key={cat} style={{ marginBottom: theme.spacing.xl }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', background: colors.tableHeaderBg, color: colors.textPrimary, padding: '10px 15px', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px', borderLeft: `4px solid ${colors.sidebarBg}`, borderBottom: `1px solid ${colors.border}` }}>{cat.replace(/_/g, ' ')} LAYER</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1px', background: colors.border, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, overflow: 'hidden' }}>
                    {ps.map(p => (
                      <div key={p.name} onClick={() => togglePermission(p.name)} style={{ background: selectedPermissions[p.name] ? colors.primaryBg : colors.white, padding: '12px', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '14px', height: '14px', border: `2px solid ${colors.sidebarBg}`, borderRadius: '3px', background: selectedPermissions[p.name] ? colors.sidebarBg : 'none', marginTop: '2px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selectedPermissions[p.name] && <FaCheck fontSize="8" color="#fff" />}
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textPrimary, textTransform: 'uppercase' }}>{formatName(p.name)}</div>
                          <div style={{ fontSize: '8px', color: colors.textTertiary, marginTop: '2px' }}>{p.description || 'No system descriptor provided.'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: theme.spacing.lg, background: colors.primaryBg, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.md, flexWrap: 'wrap' }}>
              <button onClick={() => setEditingUser(null)} style={{ padding: '10px 24px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', flex: '1', minWidth: '150px' }}>Discard Changes</button>
              <button onClick={handleSavePermissions} disabled={operationLoading} style={{ padding: '10px 24px', background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.sm, flex: '1', minWidth: '150px' }}>
                {operationLoading ? 'Syncing Layers...' : 'Commit Authority Matrix'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PermissionsPage;
