import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { theme, getColors } from '../theme';
import getApiBaseUrl from '../apiBase';
import { FaPlus, FaTrash, FaKey, FaFingerprint, FaTimes, FaSearch, FaHistory, FaEllipsisV, FaEdit, FaEye, FaEyeSlash, FaCopy } from 'react-icons/fa';

const API_URL = getApiBaseUrl();

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const AdminAssetsPage = ({ colors: colorsProp }) => {
  const colors = colorsProp || getColors();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    assetId: '',
    asstpassword: '',
    hasCooldown: false,
    cooldownEnd: '',
  });

  // Real-time countdown ticker
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin-assets`, { headers: getAuthHeaders() });
      setAssets(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    if (!form.name || !form.assetId || !form.asstpassword) return;
    if (form.hasCooldown && !form.cooldownEnd) return;
    
    setLoading(true);
    try {
      if (selectedAsset) {
        await axios.put(`${API_URL}/api/admin-assets/${selectedAsset._id}`, form, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_URL}/api/admin-assets`, form, { headers: getAuthHeaders() });
      }
      closeModal();
      fetchAssets();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const openModal = (asset = null) => {
    if (asset) {
      setSelectedAsset(asset);
      setForm({
        name: asset.name,
        assetId: asset.assetId,
        asstpassword: asset.asstpassword,
        hasCooldown: asset.hasCooldown,
        cooldownEnd: asset.cooldownEnd ? new Date(asset.cooldownEnd).toISOString().slice(0, 10) : '',
      });
    } else {
      setSelectedAsset(null);
      setForm({ name: '', assetId: '', asstpassword: '', hasCooldown: false, cooldownEnd: '' });
    }
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAsset(null);
    setForm({ name: '', assetId: '', asstpassword: '', hasCooldown: false, cooldownEnd: '' });
  };

  const deleteAsset = async (id) => {
    if (!window.confirm('Purge this asset from the high-security vault?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin-assets/${id}`, { headers: getAuthHeaders() });
      setAssets(prev => prev.filter(a => a._id !== id));
      setOpenMenuId(null);
    } catch {
      // ignore
    }
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Credential copied to secure clipboard');
  };

  const getCooldownStatus = (cooldownEnd) => {
    if (!cooldownEnd) return null;
    const diff = new Date(cooldownEnd).getTime() - now;
    if (diff <= 0) return { label: 'Expired', expired: true };

    const years  = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    const days   = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
    const hours  = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins   = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const secs   = Math.floor((diff % (60 * 1000)) / 1000);

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (days  > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins  > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);

    return { label: parts.slice(0, 3).join(' '), expired: false };
  };

  const filteredAssets = assets.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.assetId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // min date for the date picker = today
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ width: '100%', fontFamily: theme.typography.fontFamily }}>

      {/* HEADER */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: theme.spacing.lg,
        background: colors.white,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm,
      }}>
        <div>
          <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: theme.typography.fontWeights.bold, color: colors.textPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Vault Management
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            High-Security Admin Asset Repository & Identity Identification
          </p>
        </div>
        <button
          onClick={() => openModal()}
          style={{
            display: 'flex', alignItems: 'center', gap: theme.spacing.sm,
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            background: colors.sidebarBg,
            color: colors.white, border: 'none', borderRadius: theme.radius.md,
            fontWeight: theme.typography.fontWeights.bold,
            fontSize: '9px',
            textTransform: 'uppercase', cursor: 'pointer',
            boxShadow: theme.shadows.sm,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = colors.sidebarActive}
          onMouseLeave={e => e.currentTarget.style.background = colors.sidebarBg}
        >
          <FaPlus /> Register New Asset
        </button>
      </div>

      {/* SEARCH */}
      <div style={{ marginBottom: theme.spacing.lg, position: 'relative', maxWidth: 400 }}>
        <FaSearch style={{ position: 'absolute', left: theme.spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }} />
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: `${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.sm} ${theme.spacing.xl}`,
            border: `1px solid ${colors.border}`, borderRadius: theme.radius.md,
            fontSize: theme.typography.fontSizes.sm,
            background: colors.white, color: colors.textPrimary, outline: 'none',
            boxShadow: theme.shadows.sm
          }}
        />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: 500, boxShadow: theme.shadows.xl, border: `1px solid ${colors.borderLight}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `20px 24px`, color: colors.textPrimary, fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${colors.border}` }}>
              {selectedAsset ? 'Modify Security Credentials' : 'Register New Security Asset'}
            </div>
            
            <form onSubmit={handleSaveAsset} style={{ padding: theme.spacing.xl }}>
               <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Entity Identifier (Name)</label>
                <input
                  type="text" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g., Remote Production DB"
                  style={{ width: '100%', padding: theme.spacing.sm, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: theme.typography.fontSizes.xs, outline: 'none', background: colors.white }}
                />
              </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Asset id</label>
                  <input
                    type="text" value={form.assetId}
                    onChange={e => setForm({ ...form, assetId: e.target.value })}
                    required
                    placeholder="UID-XXXX"
                    style={{ width: '100%', padding: theme.spacing.sm, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: theme.typography.fontSizes.xs, outline: 'none', background: colors.white }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Asset password</label>
                  <input
                    type="text" value={form.asstpassword}
                    onChange={e => setForm({ ...form, asstpassword: e.target.value })}
                    required
                    placeholder="Credential hash..."
                    style={{ width: '100%', padding: theme.spacing.sm, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: theme.typography.fontSizes.xs, outline: 'none', background: colors.white }}
                  />
                </div>
              </div>

              <div style={{ background: colors.primaryBg, padding: theme.spacing.md, borderRadius: theme.radius.md, marginBottom: theme.spacing.xl, border: `1px solid ${colors.borderLight}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: form.hasCooldown ? theme.spacing.md : 0 }}>
                  <input
                    type="checkbox" id="cooldown-check"
                    checked={form.hasCooldown}
                    onChange={e => setForm({ ...form, hasCooldown: e.target.checked, cooldownEnd: '' })}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="cooldown-check" style={{ fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', color: colors.textPrimary }}>
                    Implement Cooldown / Expiry Protocol
                  </label>
                </div>

                {form.hasCooldown && (
                  <div>
                    <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase', color: colors.textSecondary }}>
                      Protocol Termination Date
                    </label>
                    <input
                      type="date"
                      value={form.cooldownEnd}
                      min={todayISO}
                      onChange={e => setForm({ ...form, cooldownEnd: e.target.value })}
                      required
                      style={{ width: '100%', padding: theme.spacing.sm, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontSize: theme.typography.fontSizes.xs, outline: 'none', background: colors.white }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeModal} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>Disconnect</button>
                <button type="submit" style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.sm }}>
                  {selectedAsset ? 'Update Vault Entry' : 'Finalize Encryption'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div style={{ 
        background: colors.white,
        borderRadius: theme.radius.lg,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.md,
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.tableHeaderBg }}>
                {['Asset Entity', 'Asset id', 'Asset password', 'Cooldown / Policy', ''].map((h, idx) => (
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
                <tr><td colSpan="5" style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textSecondary, fontSize: theme.typography.fontSizes.xs }}>Streaming assets...</td></tr>
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No assets matching parameters.</td></tr>
              ) : filteredAssets.map(asset => {
                const status = asset.hasCooldown ? getCooldownStatus(asset.cooldownEnd) : null;
                return (
                  <tr key={asset._id} style={{ borderBottom: `1px solid ${colors.borderLight}`, background: colors.white }}>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontWeight: 'bold', fontSize: '11px', color: colors.textPrimary, textTransform: 'uppercase' }}>
                      {asset.name}
                    </td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontFamily: 'monospace', fontSize: '10px', color: colors.textSecondary }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaFingerprint style={{ opacity: 0.5 }} />{asset.assetId}
                      </div>
                    </td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontFamily: 'monospace', fontSize: '10px', color: colors.textSecondary }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaKey style={{ opacity: 0.5 }} />
                        <span style={{ minWidth: '80px' }}>
                          {showPasswords[asset._id] ? asset.asstpassword : '••••••••••••'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => togglePasswordVisibility(asset._id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textTertiary, padding: '4px', fontSize: '12px' }}
                            title={showPasswords[asset._id] ? 'Hide Key' : 'Show Key'}
                          >
                            {showPasswords[asset._id] ? <FaEyeSlash /> : <FaEye />}
                          </button>
                          <button 
                            onClick={() => copyToClipboard(asset.asstpassword)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textTertiary, padding: '4px', fontSize: '12px' }}
                            title="Copy to Clipboard"
                          >
                            <FaCopy />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}` }}>
                      {status ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontSize: '9px',
                            fontWeight: 'bold',
                            color: status.expired ? colors.success : colors.warningDark,
                            background: status.expired ? colors.successBg : colors.warningBg,
                            padding: '4px 10px', borderRadius: theme.radius.full, width: 'fit-content',
                            border: `1px solid ${status.expired ? colors.success : colors.warningDark}33`
                          }}>
                            <FaHistory />
                            {status.label}
                          </div>
                          <span style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 'bold' }}>
                            EXP: {new Date(asset.cooldownEnd).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          color: colors.textTertiary, 
                          textTransform: 'uppercase',
                          background: colors.tableHeaderBg,
                          padding: '4px 10px',
                          borderRadius: theme.radius.full,
                          border: `1px solid ${colors.border}`
                        }}>Permanent Asset</span>
                      )}
                    </td>
                    <td style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'right' }}>
                      <div style={{ position: 'relative' }} data-menu>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === asset._id ? null : asset._id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: colors.textSecondary, fontSize: '16px' }}
                        >
                          <FaEllipsisV />
                        </button>
                        {openMenuId === asset._id && (
                          <div style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            right: 0, 
                            background: colors.white, 
                            border: `1px solid ${colors.borderLight}`, 
                            boxShadow: theme.shadows.lg, 
                            zIndex: 100, 
                            minWidth: '160px',
                            borderRadius: theme.radius.md,
                            marginTop: '4px',
                            overflow: 'hidden'
                          }}>
                            <div
                              onClick={() => openModal(asset)}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: theme.spacing.sm, padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                cursor: 'pointer', color: colors.textPrimary, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: `1px solid ${colors.borderLight}`
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryBg}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <FaEdit /> Modify Entry
                            </div>
                            <div
                              onClick={() => deleteAsset(asset._id)}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: theme.spacing.sm, padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                cursor: 'pointer', color: colors.error, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.errorBg}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <FaTrash /> Purge Entry
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAssetsPage;
