import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { theme, componentStyles } from '../theme';

export const Modal = ({ 
  open, 
  onClose, 
  title, 
  children, 
  footer,
  maxWidth = '600px',
  showCloseButton = true,
}) => {
  if (!open) return null;

  return (
    <div
      style={componentStyles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...componentStyles.modal,
          maxWidth,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div style={componentStyles.modalHeader}>
            {title && (
              <h2 style={{
                margin: 0,
                fontSize: theme.typography.fontSizes['2xl'],
                fontWeight: theme.typography.fontWeights.bold,
                color: theme.colors.textPrimary,
              }}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  padding: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.radius.md,
                  transition: `all ${theme.transitions.normal}`,
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = theme.colors.hover;
                  e.target.style.color = theme.colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = theme.colors.textSecondary;
                }}
              >
                <FaTimes />
              </button>
            )}
          </div>
        )}
        <div style={componentStyles.modalBody}>
          {children}
        </div>
        {footer && (
          <div style={componentStyles.modalFooter}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

