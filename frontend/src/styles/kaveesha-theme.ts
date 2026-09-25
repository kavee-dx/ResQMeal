export const colors = {
  // --------------------------------------------------
  // Primary - Navy
  // --------------------------------------------------
  primary: '#023047',
  primaryDark: '#011C2E',
  primaryLight: '#D6E4EA',

  // --------------------------------------------------
  // Secondary / Accent - Orange
  // --------------------------------------------------
  accent: '#FB8500',
  accentSoft: '#FFE8D1',

  // --------------------------------------------------
  // Main surfaces
  // --------------------------------------------------
  background: '#F6F8FA',
  surface: '#FFFFFF',

  // --------------------------------------------------
  // Status colors
  // --------------------------------------------------
  success: '#3FA34D',
  successSoft: '#E2F2E5',

  urgent: '#D64545',
  urgentSoft: '#F9E3E3',

  medium: '#FFB703',
  mediumSoft: '#FFF3D6',

  info: '#126782',
  infoSoft: '#E1EEF2',

  // --------------------------------------------------
  // Text
  // --------------------------------------------------
  textPrimary: '#023047',
  textSecondary: '#4D6470',
  textMuted: '#8A9AA3',

  // --------------------------------------------------
  // Borders
  // --------------------------------------------------
  border: '#D7E3E7',
  borderLight: '#E6EEF1',

  // --------------------------------------------------
  // Common
  // --------------------------------------------------
  white: '#FFFFFF',
} as const;

// --------------------------------------------------
// Typography
// --------------------------------------------------

export const fonts = {
  heading: 'System',
  headingItalic: 'System',

  body: 'System',
  bodyMedium: 'System',
  bodySemiBold: 'System',
  bodyBold: 'System',
} as const;

export const typography = {
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
  },

  h1: {
    fontFamily: fonts.bodyBold,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700' as const,
  },

  h2: {
    fontFamily: fonts.bodyBold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
  },

  h3: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '600' as const,
  },

  bodyLg: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },

  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400' as const,
  },

  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400' as const,
  },

  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
  },

  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },

  button: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700' as const,
  },
} as const;

// --------------------------------------------------
// Border Radius
// --------------------------------------------------

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// --------------------------------------------------
// Spacing
// --------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// --------------------------------------------------
// Shadows
// --------------------------------------------------

export const shadow = {
  card: {
    shadowColor: '#023047',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  soft: {
    shadowColor: '#023047',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  button: {
    shadowColor: '#FB8500',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;