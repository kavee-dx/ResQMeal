/**
 * ============================================================
 * ResQMeal Theme
 * ============================================================
 *
 * Shared theme for Android, iOS and Web.
 *
 * IMPORTANT:
 * No platform-specific fonts are used here.
 * The same fontFamily value is used everywhere.
 */

export const Colors = {
  light: {
    // --------------------------------------------------------
    // Brand
    // --------------------------------------------------------
    primary: '#2F7D4F',
    primaryDark: '#25663F',
    primaryLight: '#DCEFE3',

    secondary: '#F4A340',
    secondaryDark: '#D88925',
    secondaryLight: '#FDECD6',

    // --------------------------------------------------------
    // Backgrounds
    // --------------------------------------------------------
    background: '#E4EFE7',
    formBackground: '#DCE9DF',

    surface: '#F1F7F2',
    surfaceSoft: '#E8F2EB',

    backgroundElement: '#D7E6DB',
    backgroundSelected: '#D0E4D5',

    // --------------------------------------------------------
    // Text
    // --------------------------------------------------------
    text: '#173321',
    textSecondary: '#5F7166',
    textMuted: '#87958C',

    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#3A2A13',

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------
    success: '#3FA34D',
    successSoft: '#E2F2E5',

    warning: '#E0A526',
    warningSoft: '#FAEFD5',

    error: '#D64545',
    errorSoft: '#F9E3E3',

    info: '#4B83C4',
    infoSoft: '#E5EFF8',

    // --------------------------------------------------------
    // Borders
    // --------------------------------------------------------
    border: '#C8D9CD',
    borderLight: '#D8E5DC',
    borderFocus: '#2F7D4F',

    // --------------------------------------------------------
    // Form
    // --------------------------------------------------------
    inputBackground: '#E7F1EA',
    inputPlaceholder: '#8B9991',
    inputText: '#243B2D',

    // --------------------------------------------------------
    // Soft colors
    // --------------------------------------------------------
    primarySoft: '#E4F1E9',
    secondarySoft: '#FDECD6',
  },

  dark: {
    // --------------------------------------------------------
    // Brand
    // --------------------------------------------------------
    primary: '#4FAF70',
    primaryDark: '#3D915B',
    primaryLight: '#203B29',

    secondary: '#F4A340',
    secondaryDark: '#D88925',
    secondaryLight: '#3A2E18',

    // --------------------------------------------------------
    // Backgrounds
    // --------------------------------------------------------
    background: '#101812',
    formBackground: '#162119',

    surface: '#1D2921',
    surfaceSoft: '#19241D',

    backgroundElement: '#243128',
    backgroundSelected: '#304034',

    // --------------------------------------------------------
    // Text
    // --------------------------------------------------------
    text: '#F4F8F5',
    textSecondary: '#B8C5BC',
    textMuted: '#87958B',

    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#211A0F',

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------
    success: '#55B866',
    successSoft: '#1D3423',

    warning: '#E0A526',
    warningSoft: '#382F18',

    error: '#E45B5B',
    errorSoft: '#3A2020',

    info: '#5C91CA',
    infoSoft: '#1E2D3D',

    // --------------------------------------------------------
    // Borders
    // --------------------------------------------------------
    border: '#304037',
    borderLight: '#27332B',
    borderFocus: '#4FAF70',

    // --------------------------------------------------------
    // Form
    // --------------------------------------------------------
    inputBackground: '#202D25',
    inputPlaceholder: '#7F8E84',
    inputText: '#F4F8F5',

    // --------------------------------------------------------
    // Soft colors
    // --------------------------------------------------------
    primarySoft: '#1E3327',
    secondarySoft: '#3A2E18',
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
    shadowColor: '#173321',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  button: {
    shadowColor: '#2F7D4F',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.16,
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