// frontend/src/styles/kaveesha-theme.ts
// Shared design tokens for the ResQMeal donor-facing screens.
// Owner: Kaveesha

export const colors = {
  primary: '#1B5E3F',
  primaryDark: '#123D29',
  primaryLight: '#3E8E5C',
  accent: '#A8D5BA',
  accentSoft: '#E8F3EA',
  background: '#F7F6F1',
  surface: '#FFFFFF',
  urgent: '#C0392B',
  urgentSoft: '#FBE7E4',
  medium: '#D98E04',
  mediumSoft: '#FDF1DC',
  info: '#0E7C86',
  infoSoft: '#E1F1F2',
  textPrimary: '#1B1B1B',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#ECEAE2',
  white: '#FFFFFF',
};

// Requires: npx expo install expo-font @expo-google-fonts/poppins @expo-google-fonts/playfair-display
// See kaveesha-README.md for the App.tsx font-loading snippet.
export const fonts = {
  heading: 'PlayfairDisplay_700Bold',
  headingItalic: 'PlayfairDisplay_600SemiBold_Italic',
  body: 'Poppins_400Regular',
  bodyMedium: 'Poppins_500Medium',
  bodySemiBold: 'Poppins_600SemiBold',
  bodyBold: 'Poppins_700Bold',
};

// Named typography styles — spread these directly into a <Text style={...}>
// instead of hand-picking fontFamily/fontSize each time, so hierarchy stays
// consistent across every screen.
export const typography = {
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  h1: { fontFamily: fonts.heading, fontSize: 28, letterSpacing: 0.2 },
  h2: { fontFamily: fonts.heading, fontSize: 20, letterSpacing: 0.2 },
  h3: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: 0.2 },
  bodyLg: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  bodySmall: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12.5 },
  cardTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 15, letterSpacing: 0.2 },
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
};