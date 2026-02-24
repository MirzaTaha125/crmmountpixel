import React from 'react';
import { theme } from '../theme';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  onClick,
  style = {},
  ...props 
}) => {
  const baseStyle = {
    border: 'none',
    borderRadius: theme.radius.md,
    fontWeight: theme.typography.fontWeights.semibold,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `all ${theme.transitions.normal}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily,
    ...style,
  };

  const sizeStyles = {
    sm: { padding: `${theme.spacing.xs} ${theme.spacing.md}`, fontSize: theme.typography.fontSizes.sm },
    md: { padding: `${theme.spacing.sm} ${theme.spacing.lg}`, fontSize: theme.typography.fontSizes.base },
    lg: { padding: `${theme.spacing.md} ${theme.spacing.xl}`, fontSize: theme.typography.fontSizes.lg },
  };

  const variantStyles = {
    primary: {
      background: theme.colors.primary,
      color: theme.colors.white,
      '&:hover': { background: theme.colors.primaryDark, transform: 'translateY(-1px)', boxShadow: theme.shadows.md },
      '&:active': { transform: 'translateY(0)' },
    },
    secondary: {
      background: theme.colors.white,
      color: theme.colors.textPrimary,
      border: `1px solid ${theme.colors.border}`,
      '&:hover': { background: theme.colors.hover },
    },
    danger: {
      background: theme.colors.error,
      color: theme.colors.white,
      '&:hover': { background: '#dc2626', transform: 'translateY(-1px)', boxShadow: theme.shadows.md },
    },
  };

  const combinedStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={combinedStyle}
      {...props}
    >
      {children}
    </button>
  );
};

