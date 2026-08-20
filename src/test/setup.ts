import '@testing-library/jest-dom/vitest';

afterEach(() => {
  globalThis.localStorage?.clear();
  globalThis.sessionStorage?.clear();
});
