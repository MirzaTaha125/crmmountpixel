import React from 'react';
import { theme, componentStyles } from '../theme';

export const Input = ({
  label,
  error,
  required = false,
  style = {},
  ...props
}) => {
  return (
    <div style={{ marginBottom: theme.spacing.lg, ...style }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: theme.spacing.xs,
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.semibold,
          color: theme.colors.textPrimary,
        }}>
          {label}
          {required && <span style={{ color: theme.colors.error, marginLeft: theme.spacing.xs }}>*</span>}
        </label>
      )}
      <input
        style={{
          ...componentStyles.input,
          borderColor: error ? theme.colors.error : theme.colors.border,
          ...(error && {
            boxShadow: `0 0 0 3px ${theme.colors.errorLight}`,
          }),
        }}
        {...props}
      />
      {error && (
        <p style={{
          margin: `${theme.spacing.xs} 0 0 0`,
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.error,
        }}>
          {error}
        </p>
      )}
    </div>
  );
};

