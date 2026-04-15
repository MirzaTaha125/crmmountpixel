import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme } from '../theme';
import { FaBoxOpen } from 'react-icons/fa';

const API_URL = getApiBaseUrl();

// Helper component for Package Card with "Show More" functionality
const PackageCard = ({ pkg, colors }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      border: `1px solid ${colors.border}`,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      background: theme.colors.white,
      boxShadow: theme.shadows.sm,
      transition: `all ${theme.transitions.normal}`,
      display: 'flex',
      flexDirection: 'column',
      height: 'fit-content'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = theme.shadows.md;
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = theme.shadows.sm;
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      <h3 style={{ 
        fontSize: theme.typography.fontSizes.xl, 
        fontWeight: theme.typography.fontWeights.semibold, 
        color: colors.textPrimary, 
        margin: '0 0 8px 0' 
      }}>
        {pkg.name}
      </h3>
      
      <div style={{ 
        color: colors.textSecondary, 
        margin: '0 0 12px 0',
        fontSize: theme.typography.fontSizes.sm,
        maxHeight: expanded ? 'none' : '60px',
        overflow: 'hidden',
        position: 'relative',
        transition: 'max-height 0.3s ease'
      }}>
        {pkg.description}
        {!expanded && pkg.description && pkg.description.length > 100 && (
           <div style={{
             position: 'absolute',
             bottom: 0,
             left: 0,
             right: 0,
             height: '40px',
             background: 'linear-gradient(transparent, white)'
           }} />
        )}
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'none',
          border: 'none',
          color: colors.primary,
          cursor: 'pointer',
          padding: 0,
          fontSize: theme.typography.fontSizes.xs,
          fontWeight: theme.typography.fontWeights.semibold,
          marginBottom: '12px',
          alignSelf: 'flex-start'
        }}
      >
        {expanded ? 'Show Less' : 'Show More'}
      </button>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: 'auto'
      }}>
        <span style={{
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          color: colors.primary
        }}>
          ${pkg.price}
        </span>
        <span style={{
          background: colors.primary,
          color: 'white',
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          borderRadius: theme.radius.md,
          fontSize: theme.typography.fontSizes.xs,
          fontWeight: theme.typography.fontWeights.semibold
        }}>
          {pkg.category}
        </span>
      </div>
    </div>
  );
};

export default function UserPackagesPanel({ colors }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/packages`);
      setPackages(res.data);
    } catch {
      setError('Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  return (
    <>
      <h2 style={{ 
        fontSize: theme.typography.fontSizes['2xl'], 
        fontWeight: theme.typography.fontWeights.bold, 
        color: colors.textPrimary, 
        marginBottom: theme.spacing.xl,
        margin: 0
      }}>
        Packages ({packages.length})
      </h2>

      {/* Error Message */}
      {error && (
        <div style={{ 
          background: colors.errorLight,
          color: colors.error,
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          borderRadius: theme.radius.md,
          marginBottom: theme.spacing.lg,
          border: `1px solid ${colors.error}`
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: theme.spacing['2xl'] }}>
          <div style={{ color: colors.textSecondary }}>Loading packages...</div>
        </div>
      ) : packages.length === 0 ? (
        <div style={{ 
          textAlign: 'center',
          padding: theme.spacing['2xl'],
          color: colors.textSecondary 
        }}>
          <FaBoxOpen style={{ fontSize: '48px', marginBottom: theme.spacing.md, color: colors.primary }} />
          <p style={{ margin: 0, fontSize: theme.typography.fontSizes.base }}>
            No packages available.
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gap: theme.spacing.lg, 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' 
        }}>
          {packages.map((pkg) => (
            <PackageCard key={pkg._id} pkg={pkg} colors={colors} />
          ))}
        </div>
      )}
    </>
  );
}
