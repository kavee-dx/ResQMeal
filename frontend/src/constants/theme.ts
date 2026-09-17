export const Colors = {
  light: {
    // --------------------------------------------------------
    // Brand
    // --------------------------------------------------------
    primary: '#023047',
    primaryDark: '#011C2E',
    primaryLight: '#D6E4EA',

    secondary: '#FB8500',
    secondaryDark: '#D97200',
    secondaryLight: '#FFE8D1',

    // --------------------------------------------------------
    // Backgrounds
    // --------------------------------------------------------
    background: '#F6F8FA',
    formBackground: '#FFFFFF',

    surface: '#FFFFFF',
    surfaceSoft: '#F1F5F7',

    backgroundElement: '#E9EEF1',
    backgroundSelected: '#D6E4EA',

    // --------------------------------------------------------
    // Text
    // --------------------------------------------------------
    text: '#023047',
    textSecondary: '#4D6470',
    textMuted: '#8A9AA3',

    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#023047',

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------
    success: '#3FA34D',
    successSoft: '#E2F2E5',

    warning: '#FFB703',
    warningSoft: '#FFF3D6',

    error: '#D64545',
    errorSoft: '#F9E3E3',

    // Teal (#126782) now lives here as the info accent, used
    // sparingly — navy (#023047) is the main brand color.
    info: '#126782',
    infoSoft: '#E1EEF2',

    // --------------------------------------------------------
    // Borders
    // --------------------------------------------------------
    border: '#D7E3E7',
    borderLight: '#E6EEF1',
    borderFocus: '#023047',

    // --------------------------------------------------------
    // Form
    // --------------------------------------------------------
    inputBackground: '#F1F5F7',
    inputPlaceholder: '#8A9AA3',
    inputText: '#023047',

    // --------------------------------------------------------
    // Soft colors
    // --------------------------------------------------------
    primarySoft: '#D6E4EA',
    secondarySoft: '#FFE8D1',
  },

  dark: {
    // --------------------------------------------------------
    // Brand
    // --------------------------------------------------------
    // Slightly lightened from #023047 so it stays visible
    // against dark backgrounds; primaryDark keeps the true navy.
    primary: '#0F5C82',
    primaryDark: '#023047',
    primaryLight: '#0B2530',

    secondary: '#FFB703',
    secondaryDark: '#FB8500',
    secondaryLight: '#3A2B14',

    // --------------------------------------------------------
    // Backgrounds
    // --------------------------------------------------------
    background: '#01131F',
    formBackground: '#062338',

    surface: '#0A2C3F',
    surfaceSoft: '#082537',

    backgroundElement: '#0D3145',
    backgroundSelected: '#123E54',

    // --------------------------------------------------------
    // Text
    // --------------------------------------------------------
    text: '#F2F7F9',
    textSecondary: '#B8C7CD',
    textMuted: '#7E939C',

    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#1A1206',

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------
    success: '#55B866',
    successSoft: '#1D3423',

    warning: '#FFB703',
    warningSoft: '#3A2B14',

    error: '#E45B5B',
    errorSoft: '#3A2020',

    info: '#3E9CBF',
    infoSoft: '#0F2A34',

    // --------------------------------------------------------
    // Borders
    // --------------------------------------------------------
    border: '#123E54',
    borderLight: '#0D3145',
    borderFocus: '#0F5C82',

    // --------------------------------------------------------
    // Form
    // --------------------------------------------------------
    inputBackground: '#082537',
    inputPlaceholder: '#7E939C',
    inputText: '#F2F7F9',

    // --------------------------------------------------------
    // Soft colors
    // --------------------------------------------------------
    primarySoft: '#0B2530',
    secondarySoft: '#3A2B14',
  },
} as const;

export type ThemeColor =
  keyof typeof Colors.light &
  keyof typeof Colors.dark;


/**
 * ============================================================
 * Fonts
 * ============================================================
 *
 * Same font family for Web, Android and iOS.
 *
 * "System" avoids Web font fallback problems when a custom
 * Nunito Sans font has not been loaded.
 */

export const Fonts = {
  sans: 'System',
  sansMedium: 'System',
  sansSemiBold: 'System',
  sansBold: 'System',

  serif: 'serif',
  rounded: 'System',
  mono: 'monospace',
} as const;


/**
 * ============================================================
 * Spacing
 * ============================================================
 */

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;


/**
 * ============================================================
 * Border Radius
 * ============================================================
 */

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;


/**
 * ============================================================
 * Typography
 * ============================================================
 */

export const Typography = {
  // ----------------------------------------------------------
  // Headings
  // ----------------------------------------------------------

  h1: {
    fontFamily: Fonts.sansBold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },

  h2: {
    fontFamily: Fonts.sansBold,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700' as const,
  },

  h3: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },

  // ----------------------------------------------------------
  // Body
  // ----------------------------------------------------------

  body: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400' as const,
  },

  bodyMedium: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500' as const,
  },

  bodySmall: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400' as const,
  },

  // ----------------------------------------------------------
  // Labels
  // ----------------------------------------------------------

  label: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
  },

  labelStrong: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700' as const,
  },

  caption: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  // ----------------------------------------------------------
  // Buttons
  // ----------------------------------------------------------

  button: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700' as const,
  },

  buttonSmall: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700' as const,
  },

  // ----------------------------------------------------------
  // Inputs
  // ----------------------------------------------------------

  input: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
  },

  inputMedium: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
};


/**
 * ============================================================
 * Component Sizes
 * ============================================================
 */

export const ComponentSizes = {
  inputHeight: 52,
  buttonHeight: 52,
  smallButtonHeight: 42,
  iconButton: 44,
  checkbox: 20,
  avatarSmall: 36,
  avatarMedium: 48,
  avatarLarge: 72,
} as const;


/**
 * ============================================================
 * Shadows
 * ============================================================
 */

export const Shadows = {
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
};


/**
 * ============================================================
 * Layout
 * ============================================================
 */

export const BottomTabInset = 50;

export const MaxContentWidth = 800;


/**
 * ============================================================
 * Form Theme
 * ============================================================
 */

export const FormTheme = {
  screenBackground: Colors.light.background,

  cardBackground: Colors.light.formBackground,

  inputBackground: Colors.light.inputBackground,

  inputBorder: Colors.light.border,

  inputFocusBorder: Colors.light.borderFocus,

  labelColor: Colors.light.text,

  placeholderColor: Colors.light.inputPlaceholder,

  helperTextColor: Colors.light.textSecondary,

  primaryButton: Colors.light.primary,

  primaryButtonText: Colors.light.textOnPrimary,

  secondaryButton: Colors.light.secondary,

  secondaryButtonText: Colors.light.textOnSecondary,

  borderRadius: Radius.md,

  inputHeight: ComponentSizes.inputHeight,

  buttonHeight: ComponentSizes.buttonHeight,
} as const;