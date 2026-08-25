import { useMemo } from 'react';

import { Typography } from '@/constants/theme';

type TypographyKey = keyof typeof Typography;

function poppinsFamilyForWeight(weight: string): string {
  switch (weight) {
    case '400':
      return 'Poppins_400Regular';
    case '500':
      return 'Poppins_500Medium';
    case '600':
      return 'Poppins_600SemiBold';
    case '700':
    case '800':
      return 'Poppins_700Bold';
    default:
      return 'Poppins_400Regular';
  }
}

export function useAppTypography(): typeof Typography {
  return useMemo(() => {
    const entries = Object.entries(Typography) as [
      TypographyKey,
      (typeof Typography)[TypographyKey],
    ][];

    const overridden = entries.reduce(
      (acc, [key, value]) => {
        (acc as Record<string, unknown>)[key] = {
          ...value,
          fontFamily: poppinsFamilyForWeight(
            String(value.fontWeight),
          ),
        };
        return acc;
      },
      {} as typeof Typography,
    );

    return overridden;
  }, []);
}

export default useAppTypography;