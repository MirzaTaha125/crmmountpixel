import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaEdit, FaTrash, FaTimes, FaTag, FaDollarSign, FaListAlt, FaAlignLeft } from 'react-icons/fa';

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
    } catch (err) {
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
    } catch (err) {
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
    <div className="main-container" style={{ border: `1px solid ${colors.border}`, borderRadius: 18, background: colors.cardBg, boxShadow: colors.cardShadow, padding: 36, width: '95%', height: '100%', maxWidth: 'none', margin: 0, minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: colors.text, letterSpacing: 1 }}>Packages</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={openPackageAddModal} style={{ padding: '12px 28px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 18, boxShadow: colors.cardShadow, cursor: 'pointer', transition: 'background 0.2s' }}>+ Add Package</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          style={{ padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight, minWidth: 180 }}
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{ padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight, minWidth: 180 }}
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="responsive-table" style={{ borderRadius: 12, background: colors.accentLight, boxShadow: colors.cardShadow }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: colors.cardBg }}>
          <thead style={{ background: colors.accentLight }}>
            <tr>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Name</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Price</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Description</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Category</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...packages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(pkg => (
              <tr key={pkg._id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: 16 }}>{pkg.name}</td>
                <td style={{ padding: 16 }}>${pkg.price}</td>
                <td style={{ padding: 16, maxWidth: 300, wordBreak: 'break-word' }}>{renderDescription(pkg)}</td>
                <td style={{ padding: 16 }}>{pkg.category}</td>
                <td style={{ padding: 16 }}>
                  <span onClick={() => openPackageEditModal(pkg)} style={{ cursor: 'pointer', background: 'none', fontSize: 18, borderRadius: 6, marginRight: 10, color: colors.accent, verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center' }} role="button" aria-label="Edit" title="Edit">
                    <FaEdit />
                  </span>
                  <span onClick={() => handlePackageDelete(pkg)} style={{ cursor: 'pointer', background: 'none', fontSize: 18, borderRadius: 6, color: colors.dangerDark, verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center' }} role="button" aria-label="Delete" title="Delete">
                    <FaTrash />
                  </span>
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
              background: colors.cardBg, 
              borderRadius: 20, 
              padding: 0,
              width: '100%',
              maxWidth: '550px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}dd 100%)`,
              padding: '24px 32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `2px solid ${colors.border}`
            }}>
              <h2 style={{ 
                margin: 0, 
                fontWeight: 800, 
                fontSize: 24,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <FaTag style={{ fontSize: 20 }} />
                {selectedPackage ? 'Edit Package' : 'Create New Package'}
              </h2>
              <button
                onClick={closePackageModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 18,
                  transition: 'all 0.2s',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.transform = 'rotate(90deg)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'rotate(0deg)';
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
            <form onSubmit={handlePackageSave}>
                {/* Name Field */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 700, 
                    marginBottom: 10, 
                    color: colors.text,
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    <FaTag style={{ fontSize: 14, color: colors.accent }} />
                    Package Name
                  </label>
                  <input 
                    name="name" 
                    value={packageForm.name} 
                    onChange={handlePackageFormChange} 
                    placeholder="Enter package name..."
                    style={{ 
                      width: '100%', 
                      padding: '14px 16px', 
                      borderRadius: 12, 
                      border: `2px solid ${colors.border}`, 
                      fontSize: 16, 
                      background: colors.accentLight,
                      transition: 'all 0.2s',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.accent;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.accent}22`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = colors.border;
                      e.target.style.boxShadow = 'none';
                    }}
                    required 
                  />
              </div>

                {/* Price and Category Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  {/* Price Field */}
                  <div>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 700, 
                      marginBottom: 10, 
                      color: colors.text,
                      fontSize: 14,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}>
                      <FaDollarSign style={{ fontSize: 14, color: colors.accent }} />
                      Price
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
                        padding: '14px 16px', 
                        borderRadius: 12, 
                        border: `2px solid ${colors.border}`, 
                        fontSize: 16, 
                        background: colors.accentLight,
                        transition: 'all 0.2s',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = colors.accent;
                        e.target.style.boxShadow = `0 0 0 3px ${colors.accent}22`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = colors.border;
                        e.target.style.boxShadow = 'none';
                      }}
                      required 
                    />
              </div>

                  {/* Category Field */}
                  <div>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 700, 
                      marginBottom: 10, 
                      color: colors.text,
                      fontSize: 14,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}>
                      <FaListAlt style={{ fontSize: 14, color: colors.accent }} />
                      Category
                    </label>
                    <select 
                      name="category" 
                      value={packageForm.category} 
                      onChange={handlePackageFormChange} 
                      style={{ 
                        width: '100%', 
                        padding: '14px 16px', 
                        borderRadius: 12, 
                        border: `2px solid ${colors.border}`, 
                        fontSize: 16, 
                        background: colors.accentLight,
                        transition: 'all 0.2s',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                        paddingRight: '40px'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = colors.accent;
                        e.target.style.boxShadow = `0 0 0 3px ${colors.accent}22`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = colors.border;
                        e.target.style.boxShadow = 'none';
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
                <div style={{ marginBottom: 28 }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 700, 
                    marginBottom: 10, 
                    color: colors.text,
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    <FaAlignLeft style={{ fontSize: 14, color: colors.accent }} />
                    Description
                  </label>
                  <textarea 
                    name="description" 
                    value={packageForm.description} 
                    onChange={handlePackageFormChange} 
                    placeholder="Enter package description (optional)..."
                    rows="6"
                    style={{ 
                      width: '100%', 
                      padding: '14px 16px', 
                      borderRadius: 12, 
                      border: `2px solid ${colors.border}`, 
                      fontSize: 16, 
                      background: colors.accentLight,
                      minHeight: 150,
                      resize: 'vertical',
                      transition: 'all 0.2s',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.accent;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.accent}22`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = colors.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Error Message */}
                {packageError && (
                  <div style={{ 
                    background: `${colors.dangerDark}15`,
                    border: `2px solid ${colors.dangerDark}`,
                    color: colors.dangerDark, 
                    marginBottom: 20, 
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontWeight: 600, 
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <FaTimes style={{ fontSize: 14 }} />
                    {packageError}
              </div>
                )}

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: 12,
                  paddingTop: 8,
                  borderTop: `1px solid ${colors.border}`
                }}>
                  <button 
                    type="button" 
                    onClick={closePackageModal} 
                    style={{ 
                      padding: '12px 28px', 
                      background: colors.accentLight, 
                      color: colors.text, 
                      border: `2px solid ${colors.border}`,
                      borderRadius: 12, 
                      fontWeight: 700, 
                      fontSize: 16,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = colors.border;
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = colors.accentLight;
                      e.target.style.transform = 'translateY(0)';
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={{ 
                      padding: '12px 28px', 
                      background: colors.accent, 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 12, 
                      fontWeight: 700, 
                      fontSize: 16,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: loading ? 0.7 : 1,
                      boxShadow: `0 4px 12px ${colors.accent}40`
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = `0 6px 16px ${colors.accent}60`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = `0 4px 12px ${colors.accent}40`;
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (selectedPackage ? 'Save Changes' : 'Create Package')}
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