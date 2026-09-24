import { useWindowDimensions } from 'react-native';

// Above this width a phone-sized single column starts to look lost on the page,
// so the recipient screens switch to wider cards and multi-column rows.
const WIDE_PX = 900;

export function useIsWide(breakpoint: number = WIDE_PX): boolean {
  const { width } = useWindowDimensions();
  return width >= breakpoint;
}
