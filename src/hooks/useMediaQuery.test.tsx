import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useMediaQuery,
  usePrefersDarkScheme,
  useReducedMotion,
} from './useMediaQuery';

afterEach(() => {
  vi.unstubAllGlobals();
});

function Probe({ query }: { query: string }) {
  return <span data-testid="probe">{String(useMediaQuery(query))}</span>;
}

function ThemeProbe() {
  return (
    <span data-testid="probe">
      {String(usePrefersDarkScheme())}:{String(useReducedMotion())}
    </span>
  );
}

/** A minimal MediaQueryList with a controllable `matches` and listener set. */
function stubMatchMedia(initial: boolean, { modern = true } = {}) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const list: Record<string, unknown> = { matches: initial };
  if (modern) {
    list.addEventListener = (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener);
    list.removeEventListener = (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => listeners.delete(listener);
  }

  vi.stubGlobal('matchMedia', vi.fn(() => list));

  return {
    listenerCount: () => listeners.size,
    emit(matches: boolean) {
      list.matches = matches;
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
  };
}

describe('useMediaQuery', () => {
  it('reports false when the platform has no matchMedia', () => {
    render(<Probe query="(prefers-reduced-motion: reduce)" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('false');
  });

  it('reports false when evaluating the query throws', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => {
      throw new Error('unsupported query');
    }));
    render(<Probe query="(width >= 40em)" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('false');
  });

  it('reads the initial value and follows later changes', () => {
    const media = stubMatchMedia(true);
    const { unmount } = render(<Probe query="(prefers-color-scheme: dark)" />);

    expect(screen.getByTestId('probe')).toHaveTextContent('true');
    expect(media.listenerCount()).toBe(1);

    act(() => media.emit(false));
    expect(screen.getByTestId('probe')).toHaveTextContent('false');

    unmount();
    expect(media.listenerCount()).toBe(0);
  });

  it('still reports the initial value when the list cannot be subscribed to', () => {
    stubMatchMedia(true, { modern: false });
    render(<Probe query="(prefers-color-scheme: dark)" />);
    expect(screen.getByTestId('probe')).toHaveTextContent('true');
  });

  it('exposes the two named queries the app relies on', () => {
    const queries: string[] = [];
    vi.stubGlobal('matchMedia', vi.fn((query: string) => {
      queries.push(query);
      return { matches: query.includes('dark'), addEventListener() {}, removeEventListener() {} };
    }));

    render(<ThemeProbe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('true:false');
    expect(queries).toContain('(prefers-color-scheme: dark)');
    expect(queries).toContain('(prefers-reduced-motion: reduce)');
  });
});
