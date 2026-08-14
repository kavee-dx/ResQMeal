import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { Typography } from '@/constants/theme';


const DESKTOP_BREAKPOINT = 1024;
const DESKTOP_FONT_FAMILY = 'Poppins';

let desktopFontInjected = false;

function ensureDesktopFontLoaded() {
  if (Platform.OS !== 'web') return;
  if (typeof document === 'undefined') return;
  if (desktopFontInjected) return;

  desktopFontInjected = true;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
}

export function useResponsiveTypography(): typeof Typography {
  const { width } = useWindowDimensions();

  const isDesktopWeb =
    Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  if (isDesktopWeb) {
    ensureDesktopFontLoaded();
  }

  return useMemo(() => {
    if (!isDesktopWeb) {
      return Typography;
    }

    const entries = Object.entries(Typography) as [
      keyof typeof Typography,
      (typeof Typography)[keyof typeof Typography],
    ][];

    const overridden = entries.reduce(
      (acc, [key, value]) => {
        (acc as Record<string, unknown>)[key] = {
          ...value,
          fontFamily: DESKTOP_FONT_FAMILY,
        };
        return acc;
      },
      {} as typeof Typography,
    );
    
    return overridden;
  }, [isDesktopWeb]);
}

export default useResponsiveTypography;