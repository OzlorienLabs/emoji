import { vi } from 'vitest';

/**
 * jsdom implements neither the `<dialog>` modal API nor `IntersectionObserver`.
 * These helpers install narrow, restorable stand-ins so tests can exercise both
 * the supported and unsupported code paths deliberately.
 */

type DialogMethodStubs = Partial<
  Pick<HTMLDialogElement, 'showModal' | 'close'>
>;

/** Installs dialog method stubs and returns a function that restores the originals. */
export function stubDialogMethods(stubs: DialogMethodStubs): () => void {
  const prototype = HTMLDialogElement.prototype;
  const originals = Object.entries(stubs).map(([name]) => [
    name,
    Object.getOwnPropertyDescriptor(prototype, name),
  ] as const);

  for (const [name, value] of Object.entries(stubs)) {
    Object.defineProperty(prototype, name, { configurable: true, value });
  }

  return () => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(prototype, name, descriptor);
      else Reflect.deleteProperty(prototype, name);
    }
  };
}

export interface IntersectionObserverStub {
  /** Replays the most recently constructed observer's callback. */
  trigger: (isIntersecting: boolean) => void;
  /** Replays a specific observer's callback, so tests can fire a stale one. */
  triggerObserver: (index: number, isIntersecting: boolean) => void;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  /** Number of observers constructed so far. */
  count: () => number;
}

/**
 * Installs an `IntersectionObserver` stand-in via `vi.stubGlobal`. Callers are
 * responsible for `vi.unstubAllGlobals()` (usually in an `afterEach`).
 */
export function stubIntersectionObserver(): IntersectionObserverStub {
  const observe = vi.fn();
  const disconnect = vi.fn();
  const callbacks: IntersectionObserverCallback[] = [];

  vi.stubGlobal(
    'IntersectionObserver',
    class IntersectionObserverMock implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly scrollMargin = '';
      readonly thresholds: readonly number[] = [];

      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }

      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = () => [];
    },
  );

  const triggerObserver = (index: number, isIntersecting: boolean) => {
    callbacks[index]?.(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  };

  return {
    observe,
    disconnect,
    triggerObserver,
    count: () => callbacks.length,
    trigger: (isIntersecting: boolean) =>
      triggerObserver(callbacks.length - 1, isIntersecting),
  };
}
