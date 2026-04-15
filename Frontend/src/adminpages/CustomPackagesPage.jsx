import React, { useEffect, useState } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaTrash, FaEdit, FaBoxOpen } from 'react-icons/fa';
import { getColors, theme } from '../theme';

function CustomPackagesPage({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const [customPackages, setCustomPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ _id: '', name: '', price: '', description: '', category: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const API_URL = getApiBaseUrl();

  useEffect(() => {
    fetchCustomPackages();
  }, []);

  const fetchCustomPackages = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/custom-packages`);
      setCustomPackages(res.data);
    } catch {
      setError('Failed to fetch custom packages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom package?')) return;
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/custom-packages/${id}`);
      fetchCustomPackages();
    } catch {
      setError('Failed to delete custom package');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = (pkg) => {
    setEditForm({ ...pkg });
    setEditError('');
    setEditModalOpen(true);
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await axios.put(`${API_URL}/api/custom-packages/${editForm._id}`, editForm);
      setEditModalOpen(false);
      fetchCustomPackages();
    } catch {
      setEditError('Failed to update custom package');
    } finally {
      setEditLoading(false);
    }
  };

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
            Custom Package Registry
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            Bespoke Client Solutions
          </p>
        </div>
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div style={{ background: colors.errorBg, color: colors.error, padding: theme.spacing.md, marginBottom: theme.spacing.md, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {error}
        </div>
      )}

      {/* DATA GRID */}
      <div style={{ 
        background: colors.white, 
        borderRadius: theme.radius.lg, 
        border: `1px solid ${colors.borderLight}`,
        overflow: 'hidden',
        boxShadow: theme.shadows.md,
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: colors.tableHeaderBg }}>
              <tr>
                {['Package Name', 'Category', 'Unit Price', 'Description', 'Registration Date', 'Control'].map((h, idx) => (
                  <th key={idx} style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    textAlign: 'left',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: colors.textPrimary,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    borderBottom: `2px solid ${colors.border}`,
                    borderRight: idx < 5 ? `1px solid ${colors.border}` : 'none'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>Loading registry data...</td></tr>
              ) : customPackages.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: theme.spacing['2xl'], textAlign: 'center', color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No custom packages indexed.</td></tr>
              ) : customPackages.map((pkg, idx) => (
                <tr key={pkg._id} style={{ 
                  borderBottom: `1px solid ${colors.borderLight}`,
                  background: idx % 2 === 0 ? colors.white : colors.primaryBg,
                  transition: 'background 0.2s'
                }}>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.textPrimary, textTransform: 'uppercase' }}>{pkg.name}</div>
                  </td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' }}>{pkg.category || 'GENERAL'}</div>
                  </td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <div style={{ fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, color: colors.successDark }}>${parseFloat(pkg.price).toFixed(2)}</div>
                  </td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}`, maxWidth: '300px' }}>
                    <div style={{ fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.description || 'No description provided.'}</div>
                  </td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary }}>{new Date(pkg.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}` }}>
                    <div style={{ display: 'flex', gap: theme.spacing.md }}>
                      <button onClick={() => handleEditOpen(pkg)} style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: '14px' }} title="Edit Registry"><FaEdit /></button>
                      <button onClick={() => handleDelete(pkg._id)} style={{ background: 'none', border: 'none', color: colors.error, cursor: 'pointer', fontSize: '14px' }} title="Delete Registry"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: 500, boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 20px`, color: colors.textPrimary, fontWeight: theme.typography.fontWeights.bold, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0` }}>
              Bespoke Registry: {editForm.name}
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ padding: theme.spacing.xl }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Package Identity</label>
                  <input name="name" value={editForm.name} onChange={handleEditChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Standard Rate ($)</label>
                  <input name="price" type="number" value={editForm.price} onChange={handleEditChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
                </div>
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Classification</label>
                <input name="category" value={editForm.category} onChange={handleEditChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>

              <div style={{ marginBottom: theme.spacing.xl }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Full Description</label>
                <textarea name="description" value={editForm.description} onChange={handleEditChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none', minHeight: 80, resize: 'vertical' }} />
              </div>

              {editError && <div style={{ color: colors.error, fontSize: '10px', fontWeight: 'bold', marginBottom: theme.spacing.md, textTransform: 'uppercase' }}>{editError}</div>}

              <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditModalOpen(false)} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={editLoading} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: editLoading ? 'not-allowed' : 'pointer' }}>{editLoading ? 'Updating...' : 'Authorize Edit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomPackagesPage;