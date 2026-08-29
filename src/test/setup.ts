import '@testing-library/jest-dom/vitest';

afterEach(() => {
  globalThis.localStorage?.clear();
  globalThis.sessionStorage?.clear();
});

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(public callback?: ResizeObserverCallback) {}
}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

