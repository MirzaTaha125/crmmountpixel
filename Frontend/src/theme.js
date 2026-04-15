// Modern Minimalist Design System
export const theme = {
  // Color Palette - Professional & Clean
  colors: {
    // Primary
    primary: '#6366f1', // Indigo
    primaryLight: '#818cf8',
    primaryDark: '#4f46e5',
    primaryBg: '#eef2ff',

    // Neutral
    white: '#ffffff',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',

    // Text
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',

    // Border & Divider
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    divider: '#e2e8f0',

    // Status Colors
    success: '#10b981',
    successLight: '#d1fae5',
    successBg: '#d1fae5',
    successDark: '#059669',
    error: '#ef4444',
    errorLight: '#fee2e2',
    errorBg: '#fee2e2',
    errorDark: '#dc2626',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    warningBg: '#fef3c7',
    warningDark: '#d97706',
    info: '#3b82f6',
    infoLight: '#dbeafe',
    infoBg: '#dbeafe',
    infoDark: '#2563eb',

    // Interactive States
    hover: '#f1f5f9',
    active: '#e2e8f0',
    focus: '#6366f1',
    disabled: '#cbd5e1',

    // Sidebar - Sharp & Professional
    sidebarBg: '#111827', // Deep Grey-Blue
    sidebarHover: '#1f2937',
    sidebarActive: '#6366f1',
    sidebarText: '#9ca3af',
    sidebarTextActive: '#ffffff',

    // Table Refinements
    tableHeaderBg: '#f1f5f9', // Sophisticated Light Grey Header
    tableRowHover: '#f8fafc',
    premiumGlow: '0 8px 15px rgba(15, 23, 42, 0.05)',
  },

  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    fontSizes: {
      '2xs': '0.625rem', // 10px
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },

  // Border Radius
  radius: {
    none: '0',
    xs: '4px',
    sm: '8px', 
    md: '12px',     // Standard for buttons/inputs
    lg: '16px',     // Standard for cards/tables
    xl: '24px',     // Standard for modals
    '2xl': '32px',
    full: '9999px',
  },

  // Shadows (Soft & Premium)
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    sm: '0 2px 4px 0 rgba(15, 23, 42, 0.05)',
    md: '0 8px 30px rgba(15, 23, 42, 0.08), 0 0 1px rgba(15, 23, 42, 0.12)',
    lg: '0 12px 40px rgba(15, 23, 42, 0.1), 0 0 1px rgba(15, 23, 42, 0.15)',
    xl: '0 24px 60px rgba(15, 23, 42, 0.14), 0 0 1px rgba(15, 23, 42, 0.18)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },

  // Z-Index
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
  
  // Breakpoints
  breakpoints: {
    xs: '375px',
    sm: '480px',
    md: '768px',
    lg: '900px',
    xl: '1200px',
  },

  // Media Queries Helpers
  media: {
    mobile: '@media (max-width: 480px)',
    tablet: '@media (max-width: 900px)',
    desktop: '@media (min-width: 901px)',
    sm: (style) => `@media (max-width: 480px) { ${style} }`,
    md: (style) => `@media (max-width: 768px) { ${style} }`,
    lg: (style) => `@media (max-width: 900px) { ${style} }`,
  },
};

// Helper function to get theme colors (for backward compatibility)
export const getColors = () => ({
  ...theme.colors,
  // Legacy color mappings
  mainBg: theme.colors.background,
  cardBg: theme.colors.surface,
  cardShadow: theme.shadows.md,
  accent: theme.colors.primary,
  accentLight: theme.colors.primaryBg,
  border: theme.colors.border,
  text: theme.colors.textPrimary,
  muted: theme.colors.textSecondary,
  sidebarGradient: theme.colors.sidebarBg, // Solid background, no gradient for professional look
  danger: theme.colors.errorLight,
  dangerDark: theme.colors.error,
});

// Component Styles
export const componentStyles = {
  // Card
  card: {
    background: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.md,
    border: `1px solid ${theme.colors.borderLight}`,
    overflow: 'hidden',
  },

  // Button Primary
  buttonPrimary: {
    background: theme.colors.primary,
    color: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    border: 'none',
    fontWeight: theme.typography.fontWeights.semibold,
    fontSize: theme.typography.fontSizes.base,
    cursor: 'pointer',
    transition: `all ${theme.transitions.normal}`,
    '&:hover': {
      background: theme.colors.primaryDark,
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows.md,
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',
    },
  },

  // Button Secondary
  buttonSecondary: {
    background: theme.colors.white,
    color: theme.colors.textPrimary,
    borderRadius: theme.radius.md,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    border: `1px solid ${theme.colors.border}`,
    fontWeight: theme.typography.fontWeights.medium,
    fontSize: theme.typography.fontSizes.base,
    cursor: 'pointer',
    transition: `all ${theme.transitions.normal}`,
    '&:hover': {
      background: theme.colors.hover,
      borderColor: theme.colors.border,
    },
  },

  // Button Danger
  buttonDanger: {
    background: theme.colors.error,
    color: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    border: 'none',
    fontWeight: theme.typography.fontWeights.semibold,
    fontSize: theme.typography.fontSizes.base,
    cursor: 'pointer',
    transition: `all ${theme.transitions.normal}`,
    '&:hover': {
      background: '#dc2626',
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows.md,
    },
  },

  // Input
  input: {
    width: '100%',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.textPrimary,
    background: theme.colors.white,
    transition: `all ${theme.transitions.normal}`,
    '&:focus': {
      outline: 'none',
      borderColor: theme.colors.primary,
      boxShadow: `0 0 0 3px ${theme.colors.primaryBg}`,
    },
    '&:disabled': {
      background: theme.colors.disabled,
      cursor: 'not-allowed',
    },
  },

  // Table
  tableContainer: {
    width: '100%',
    background: theme.colors.white,
    borderRadius: theme.radius.lg,
    boxShadow: theme.shadows.md,
    border: `1px solid ${theme.colors.borderLight}`,
    overflowX: 'auto', // Crucial for responsive tables
    position: 'relative',
    WebkitOverflowScrolling: 'touch', // Smooth scroll on iOS
  },

  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    background: theme.colors.white,
  },

  tableHeader: {
    background: theme.colors.tableHeaderBg,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    textAlign: 'left',
    fontWeight: theme.typography.fontWeights.bold,
    fontSize: '9px',
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: `2px solid ${theme.colors.border}`,
  },

  tableCell: {
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.borderLight}`,
    fontSize: theme.typography.fontSizes.base,
    color: theme.colors.textPrimary,
  },

  // Modal
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: theme.zIndex.modalBackdrop,
    padding: theme.spacing.lg,
  },

  modal: {
    background: theme.colors.white,
    borderRadius: theme.radius['2xl'],
    boxShadow: theme.shadows.xl,
    width: '95%', // Make it take almost full width on small screens
    maxWidth: '600px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: theme.zIndex.modal,
  },

  modalHeader: {
    padding: theme.spacing.xl,
    borderBottom: `1px solid ${theme.colors.borderLight}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },

  modalBody: {
    padding: theme.spacing.xl,
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    minHeight: 0,
  },

  modalFooter: {
    padding: theme.spacing.xl,
    borderTop: `1px solid ${theme.colors.borderLight}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    flexShrink: 0,
  },
};

