import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import { theme } from '../theme';

export const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: `linear-gradient(135deg, ${theme.colors.primaryBg} 0%, ${theme.colors.background} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: theme.typography.fontFamily,
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: theme.radius.xl,
          background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
          marginBottom: theme.spacing.xl,
          boxShadow: theme.shadows.xl,
        }}
      >
        <FaSpinner
          className="loading-spinner"
          style={{
            fontSize: '40px',
            color: theme.colors.white,
          }}
        />
      </div>
      <p
        style={{
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.medium,
          color: theme.colors.textPrimary,
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
};

