import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme } from '../theme';
import { FaEdit, FaTrash, FaTimes, FaTag, FaDollarSign, FaListAlt, FaAlignLeft, FaPlus } from 'react-icons/fa';

function PackagesPage({ colors }) {
  const [packages, setPackages] = useState([]);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageForm, setPackageForm] = useState({ name: '', price: '', description: '', category: 'Website Development' });
  const [packageError, setPackageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());

  const CATEGORY_OPTIONS = [
    'Website Development',
    'E-commerce',
    'Logo Design',
    'Branding',
    'SEO',
    'Animation',
    'Print',
    'Web Portal',
    'Copy Writing',
    'Digital Marketing',
    'App Development',
    'Illustration'
  ];

  const API_URL = getApiBaseUrl();

  // Fetch packages
  const fetchPackages = async () => {
    try {
      let url = `${API_URL}/api/packages?`;
      if (filterName) url += `name=${encodeURIComponent(filterName)}&`;
      if (filterCategory) url += `category=${encodeURIComponent(filterCategory)}&`;
      const res = await axios.get(url);
      setPackages(res.data);
    } catch {
      setPackageError('Failed to fetch packages');
    }
  };
  useEffect(() => { fetchPackages(); }, [filterName, filterCategory]);

  // Open add modal
  const openPackageAddModal = () => {
    setPackageForm({ name: '', price: '', description: '', category: 'Website Development' });
    setSelectedPackage(null);
    setPackageModalOpen(true);
    setPackageError('');
  };
  // Open edit modal
  const openPackageEditModal = (pkg) => {
    setPackageForm({
      name: pkg.name,
      price: pkg.price,
      description: pkg.description,
      category: pkg.category || 'Website Development'
    });
    setSelectedPackage(pkg);
    setPackageModalOpen(true);
    setPackageError('');
  };
  // Close modal
  const closePackageModal = () => {
    setPackageModalOpen(false);
    setSelectedPackage(null);
    setPackageError('');
  };
  // Handle form change
  const handlePackageFormChange = (e) => {
    const { name, value } = e.target;
    setPackageForm(f => ({ ...f, [name]: value }));
  };
  // Save (add/edit)
  const handlePackageSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPackageError('');
    try {
      if (selectedPackage) {
        await axios.put(`${API_URL}/api/packages/${selectedPackage._id}`, packageForm);
      } else {
        await axios.post(`${API_URL}/api/packages`, packageForm);
      }
      setPackageModalOpen(false);
      fetchPackages();
    } catch (err) {
      setPackageError(err.response?.data?.message || 'Error saving package');
    } finally {
      setLoading(false);
    }
  };
  // Delete
  const handlePackageDelete = async (pkg) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    setLoading(true);
    setPackageError('');
    try {
      await axios.delete(`${API_URL}/api/packages/${pkg._id}`);
      fetchPackages();
    } catch {
      setPackageError('Error deleting package');
    } finally {
      setLoading(false);
    }
  };

  // Toggle description expansion
  const toggleDescription = (pkgId) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pkgId)) {
        newSet.delete(pkgId);
      } else {
        newSet.add(pkgId);
      }
      return newSet;
    });
  };

  // Render description with show more/less
  const renderDescription = (pkg) => {
    const description = pkg.description || '';
    const maxLength = 100; // Character limit before truncation
    const isExpanded = expandedDescriptions.has(pkg._id);
    const shouldTruncate = description.length > maxLength;

    if (!shouldTruncate) {
      return <span>{description || '-'}</span>;
    }

    return (
      <div>
        <span>{isExpanded ? description : `${description.substring(0, maxLength)}...`}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDescription(pkg._id);
          }}
          style={{
            marginLeft: 8,
            background: 'transparent',
            border: 'none',
            color: colors.accent,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', fontFamily: 'inherit' }}>
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
            fontSize: theme.typography.fontSizes.xl,
            fontWeight: theme.typography.fontWeights.bold,
            color: colors.textPrimary,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Package Catalog
          </h2>
          <p style={{
            fontSize: theme.typography.fontSizes.xs,
            color: colors.textSecondary,
            margin: 0,
          }}>
            {packages.length} service offer definitions
          </p>
        </div>
        <button
          onClick={openPackageAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            background: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: theme.radius.md,
            fontWeight: theme.typography.fontWeights.bold,
            fontSize: theme.typography.fontSizes.xs,
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: `all ${theme.transitions.fast}`,
            boxShadow: theme.shadows.sm,
          }}
        >
          <FaPlus />
          Add New Package
        </button>
      </div>
      <div style={{ display: 'flex', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.xs,
            background: colors.white,
            color: colors.textPrimary,
            minWidth: 200,
            outline: 'none'
          }}
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.xs,
            background: colors.white,
            color: colors.textPrimary,
            minWidth: 200,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div style={{
        background: colors.white,
        borderRadius: theme.radius.lg,
        border: `1px solid ${colors.borderLight}`,
        overflow: 'hidden',
        boxShadow: theme.shadows.md,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: colors.tableHeaderBg }}>
            <tr>
              <th style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'left', color: colors.textPrimary, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>Name</th>
              <th style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'left', color: colors.textPrimary, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>Price</th>
              <th style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'left', color: colors.textPrimary, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>Description</th>
              <th style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'left', color: colors.textPrimary, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>Category</th>
              <th style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg}`, textAlign: 'left', color: colors.textPrimary, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}` }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...packages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(pkg => (
              <tr key={pkg._id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.sm, fontWeight: 'bold', color: colors.textPrimary }}>{pkg.name}</td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.sm, color: colors.success, fontWeight: 'bold' }}>${pkg.price}</td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary, maxWidth: 400 }}>{renderDescription(pkg)}</td>
                <td style={{ padding: theme.spacing.md }}>
                  <span style={{
                    padding: '2px 8px',
                    background: colors.primaryBg,
                    color: colors.primary,
                    borderRadius: theme.radius.full,
                    fontSize: theme.typography.fontSizes['2xs'],
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>{pkg.category}</span>
                </td>
                <td style={{ padding: theme.spacing.md }}>
                  <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                    <span onClick={() => openPackageEditModal(pkg)} style={{ cursor: 'pointer', fontSize: '16px', color: colors.primary }} role="button" aria-label="Edit" title="Edit">
                      <FaEdit />
                    </span>
                    <span onClick={() => handlePackageDelete(pkg)} style={{ cursor: 'pointer', fontSize: '16px', color: colors.error }} role="button" aria-label="Delete" title="Delete">
                      <FaTrash />
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Package Modal */}
      {packageModalOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0, 0, 0, 0.5)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePackageModal();
          }}
        >
          <div
            style={{
              background: colors.white,
              borderRadius: theme.radius.xl,
              padding: 0,
              width: '100%',
              maxWidth: '600px',
              boxShadow: theme.shadows.xl,
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${colors.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: colors.tableHeaderBg,
              padding: `15px 20px`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `2px solid ${colors.border}`
            }}>
              <h2 style={{
                margin: 0,
                fontWeight: 'bold',
                fontSize: '11px',
                color: colors.textPrimary,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {selectedPackage ? 'Service Catalog: Update Definition' : 'Service Catalog: Create New Entry'}
              </h2>
              <button
                onClick={closePackageModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: colors.textTertiary,
                  fontSize: 18,
                  padding: 0
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: theme.spacing.xl, overflowY: 'auto', flex: 1 }}>
            <form onSubmit={handlePackageSave}>
                {/* Name Field */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{
                    display: 'block',
                    fontWeight: 'bold',
                    marginBottom: theme.spacing.xs,
                    color: colors.textSecondary,
                    fontSize: theme.typography.fontSizes['2xs'],
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Package Name
                  </label>
                  <input
                    name="name"
                    value={packageForm.name}
                    onChange={handlePackageFormChange}
                    placeholder="Enter package name..."
                    style={{
                      width: '100%',
                      padding: theme.spacing.sm,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${colors.border}`,
                      fontSize: theme.typography.fontSizes.xs,
                      background: colors.white,
                      outline: 'none',
                    }}
                    required
                  />
              </div>

                {/* Price and Category Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
                  {/* Price Field */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontWeight: 'bold',
                      marginBottom: theme.spacing.xs,
                      color: colors.textSecondary,
                      fontSize: theme.typography.fontSizes['2xs'],
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Price ($)
                    </label>
                    <input
                      name="price"
                      type="number"
                      value={packageForm.price}
                      onChange={handlePackageFormChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: theme.spacing.sm,
                        borderRadius: 0,
                        border: `1px solid ${colors.border}`,
                        fontSize: theme.typography.fontSizes.xs,
                        background: colors.white,
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  {/* Category Field */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontWeight: 'bold',
                      marginBottom: theme.spacing.xs,
                      color: colors.textSecondary,
                      fontSize: theme.typography.fontSizes['2xs'],
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Category
                    </label>
                    <select
                      name="category"
                      value={packageForm.category}
                      onChange={handlePackageFormChange}
                      style={{
                        width: '100%',
                        padding: theme.spacing.sm,
                        borderRadius: 0,
                        border: `1px solid ${colors.border}`,
                        fontSize: theme.typography.fontSizes.xs,
                        background: colors.white,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                      required
                    >
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description Field */}
                <div style={{ marginBottom: theme.spacing.xl }}>
                  <label style={{
                    display: 'block',
                    fontWeight: 'bold',
                    marginBottom: theme.spacing.xs,
                    color: colors.textSecondary,
                    fontSize: theme.typography.fontSizes['2xs'],
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={packageForm.description}
                    onChange={handlePackageFormChange}
                    placeholder="Enter package description..."
                    rows="4"
                    style={{
                      width: '100%',
                      padding: theme.spacing.sm,
                      borderRadius: 0,
                      border: `1px solid ${colors.border}`,
                      fontSize: theme.typography.fontSizes.xs,
                      background: colors.white,
                      outline: 'none',
                      resize: 'none',
                      minHeight: 100
                    }}
                  />
                </div>

                {/* Error Message */}
                {packageError && (
                  <div style={{
                    padding: theme.spacing.sm,
                    background: colors.errorLight,
                    color: colors.error,
                    borderLeft: `3px solid ${colors.error}`,
                    fontSize: theme.typography.fontSizes['2xs'],
                    fontWeight: 'bold',
                    marginBottom: theme.spacing.md
                  }}>
                    {packageError}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.md }}>
                  <button
                    type="button"
                    onClick={closePackageModal}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                      background: colors.white,
                      color: colors.textSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 0,
                      fontWeight: 'bold',
                      fontSize: theme.typography.fontSizes['2xs'],
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                      background: colors.sidebarBg,
                      color: colors.white,
                      border: 'none',
                      borderRadius: 0,
                      fontWeight: 'bold',
                      fontSize: theme.typography.fontSizes['2xs'],
                      textTransform: 'uppercase',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Processing...' : (selectedPackage ? 'Update Package' : 'Publish Package')}
                  </button>
                </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PackagesPage