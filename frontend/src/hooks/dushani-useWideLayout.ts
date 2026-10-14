import { useWindowDimensions } from 'react-native';

// Breakpoints for responsive design
const BREAKPOINTS = {
  MOBILE: 0,       // 0 - 767px
  TABLET: 768,     // 768px - 1023px
  DESKTOP: 1024,  // 1024px and above
  WIDE: 900,       // Legacy breakpoint for backward compatibility
};

export function useIsWide(breakpoint: number = BREAKPOINTS.WIDE): boolean {
  const { width } = useWindowDimensions();
  return width >= breakpoint;
}

export function useBreakpoints() {
  const { width } = useWindowDimensions();
  return {
    isMobile: width < BREAKPOINTS.TABLET,
    isTablet: width >= BREAKPOINTS.TABLET && width < BREAKPOINTS.DESKTOP,
    isDesktop: width >= BREAKPOINTS.DESKTOP,
    isWide: width >= BREAKPOINTS.WIDE,
    width,
  };
}
