/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '../../global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',

    // ---- ResQMeal Design System (Sprint 0) — added by Dushani ----
    // Additive only: existing keys above are untouched so screens already
    // built against the neutral theme keep working. These are the brand
    // colors for Epic 01 (registration/verification) and available to
    // anyone else who wants them via useTheme().
    primary: '#2F7D4F',
    secondary: '#F4A340',
    surface: '#FFFFFF',
    success: '#3FA34D',
    warning: '#E0A526',
    error: '#D64545',
    border: '#DDE3D9',
    primarySoft: '#E4F1E9',
    secondarySoft: '#FDECD6',
    errorSoft: '#FBE7E7',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',

    // ---- ResQMeal Design System — dark-mode equivalents ----
    // The Sprint 0 reference only specifies a light palette; these are
    // reasonable dark adaptations (brand hues kept, surfaces/tints darkened).
    // Worth a design pass once a dark-mode mock exists.
    primary: '#2F7D4F',
    secondary: '#F4A340',
    surface: '#1B241D',
    success: '#3FA34D',
    warning: '#E0A526',
    error: '#D64545',
    border: '#2A332C',
    primarySoft: '#1E3328',
    secondarySoft: '#3A2E18',
    errorSoft: '#3A2020',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// ---- ResQMeal border radius scale — added by Dushani ----
// Not present in the existing token set; small/medium/large radii used by
// buttons, inputs, and chips in the design system.
export const Radius = { sm: 8, md: 10, lg: 20 } as const;

// ---- ResQMeal typography scale — added by Dushani ----
// From the Sprint 0 design system: Poppins, 7 roles. Not tied to light/dark
// (typography doesn't change with theme), so it's a flat export like Fonts.
// Requires Poppins-Regular/Medium/SemiBold/Bold to be loaded once at app
// startup via expo-font / useFonts in App.tsx — falls back to the system
// font until that's wired in, so nothing breaks if it isn't loaded yet.
export const Typography = {
  h1: { fontFamily: 'Poppins-Bold', fontSize: 32 },
  h2: { fontFamily: 'Poppins-Bold', fontSize: 24 },
  h3: { fontFamily: 'Poppins-SemiBold', fontSize: 18 },
  body: { fontFamily: 'Poppins-Regular', fontSize: 15 },
  bodySmall: { fontFamily: 'Poppins-Regular', fontSize: 13 },
  caption: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  button: { fontFamily: 'Poppins-SemiBold', fontSize: 14 },
  label: { fontFamily: 'Poppins-Medium', fontSize: 13 },
} as const;
