/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    surface: '#ffffff',
    border: '#E0E0E0',
    surfaceSoft: '#F5F5F5',
    warning: '#FF9500',
    warningSoft: '#FFF3E0',
    primary: '#007AFF',
    textOnPrimary: '#ffffff',
    error: '#FF3B30',
    inputBackground: '#F5F5F5',
    inputText: '#000000',
    inputPlaceholder: '#999999',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    surface: '#1C1C1E',
    border: '#3A3A3C',
    surfaceSoft: '#2C2C2E',
    warning: '#FF9500',
    warningSoft: '#3D2E1F',
    primary: '#0A84FF',
    textOnPrimary: '#ffffff',
    error: '#FF453A',
    inputBackground: '#2C2C2E',
    inputText: '#ffffff',
    inputPlaceholder: '#666666',
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

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

export const Typography = {
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  labelStrong: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  input: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
} as const;

export const ComponentSizes = {
  inputHeight: 48,
  buttonHeight: 48,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
