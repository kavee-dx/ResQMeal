import { useEffect, useState } from 'react';

import { getFullName } from '../utils/kaveesha-authStorage';

/**
 * First name of the logged-in user, used as the eyebrow above each recipient
 * page title. Falls back to `fallback` until the stored session is read.
 */
export function useDisplayName(fallback = 'Recipient'): string {
  const [name, setName] = useState(fallback);

  useEffect(() => {
    let active = true;

    getFullName()
      .then((fullName) => {
        const first = fullName?.trim().split(/\s+/)[0];
        if (active && first) setName(first);
      })
      .catch(() => {
        // No stored name — keep the fallback rather than blocking the page.
      });

    return () => {
      active = false;
    };
  }, []);

  return name;
}
