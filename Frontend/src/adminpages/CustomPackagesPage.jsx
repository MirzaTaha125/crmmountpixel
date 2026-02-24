import React, { useEffect, useState } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaTrash, FaEdit } from 'react-icons/fa';

function CustomPackagesPage({ colors }) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      setEditError('Failed to update custom package');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: colors.text, fontWeight: 800, fontSize: 28 }}>Custom Packages</h2>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: colors.dangerDark }}>{error}</p>
      ) : (
        <table style={{ width: '100%', marginTop: 24, background: colors.cardBg, borderRadius: 10, boxShadow: colors.cardShadow }}>
          <thead>
            <tr>
              <th style={{ padding: 12, color: colors.text }}>Name</th>
              <th style={{ padding: 12, color: colors.text }}>Price</th>
              <th style={{ padding: 12, color: colors.text }}>Description</th>
              <th style={{ padding: 12, color: colors.text }}>Category</th>
              <th style={{ padding: 12, color: colors.text }}>Created At</th>
              <th style={{ padding: 12, color: colors.text }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customPackages.map(pkg => (
              <tr key={pkg._id}>
                <td style={{ padding: 12 }}>{pkg.name}</td>
                <td style={{ padding: 12 }}>${pkg.price}</td>
                <td style={{ padding: 12 }}>{pkg.description}</td>
                <td style={{ padding: 12 }}>{pkg.category}</td>
                <td style={{ padding: 12 }}>{new Date(pkg.createdAt).toLocaleString()}</td>
                <td style={{ padding: 12 }}>
                  <span onClick={() => handleEditOpen(pkg)} style={{ cursor: 'pointer', marginRight: 12, color: colors.accent }} title="Edit"><FaEdit /></span>
                  <span onClick={() => handleDelete(pkg._id)} style={{ cursor: 'pointer', color: colors.dangerDark }} title="Delete"><FaTrash /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Edit Modal */}
      {editModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.cardBg, borderRadius: 16, padding: 38, minWidth: 360, boxShadow: colors.cardShadow }}>
            <h2 style={{ marginBottom: 24, fontWeight: 800, color: colors.text }}>Edit Custom Package</h2>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Name</label>
                <input name="name" value={editForm.name} onChange={handleEditChange} style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Price</label>
                <input name="price" type="number" value={editForm.price} onChange={handleEditChange} style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Category</label>
                <input name="category" value={editForm.category} onChange={handleEditChange} style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Description</label>
                <textarea name="description" value={editForm.description} onChange={handleEditChange} style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight, minHeight: 60 }} />
              </div>
              {editError && <div style={{ color: colors.dangerDark, marginBottom: 14, fontWeight: 700 }}>{editError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setEditModalOpen(false)} style={{ padding: '10px 22px', background: colors.accentLight, color: colors.text, border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16, marginRight: 6 }}>Cancel</button>
                <button type="submit" disabled={editLoading} style={{ padding: '10px 22px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16 }}>{editLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomPackagesPage; 