import { useCallback, useSyncExternalStore } from 'react';

function readMatch(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/**
 * Subscribes to a media query so a change to the operating system's appearance
 * or motion setting takes effect without a reload. Environments without
 * `matchMedia` report `false` and never subscribe, which is the correct default
 * for both queries used here.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {};
      }
      try {
        const list = window.matchMedia(query);
        if (typeof list.addEventListener !== 'function') return () => {};
        list.addEventListener('change', onStoreChange);
        return () => list.removeEventListener('change', onStoreChange);
      } catch {
        // An unsupported query throws in some engines; treat it as never matching.
        return () => {};
      }
    },
    [query],
  );

  const getSnapshot = useCallback(() => readMatch(query), [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function usePrefersDarkScheme(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}
