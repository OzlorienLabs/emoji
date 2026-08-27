// @vitest-environment node
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
};
const indexHtml = read('index.html');
const serviceWorker = read('public/sw.js');

describe('web app manifest', () => {
  it('declares the fields an installable app requires', () => {
    expect(manifest.name).toBeTruthy();
    // Home screens truncate around 15 characters, so short_name stays under it.
    expect(manifest.short_name.length).toBeLessThanOrEqual(15);
    expect(manifest.short_name.length).toBeLessThan(manifest.name.length);
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('matches the daylight theme tokens used by the shell', () => {
    // The install splash must not flash a colour the app never renders.
    expect(manifest.background_color).toBe('#f4efe5');
    expect(manifest.theme_color).toBe('#f4efe5');
    expect(indexHtml).toContain('content="#f4efe5" media="(prefers-color-scheme: light)"');
    expect(indexHtml).toContain('content="#07060c" media="(prefers-color-scheme: dark)"');
    // Daylight is the default, so the document is stamped before any script runs.
    expect(indexHtml).toContain('<html lang="en" data-theme="light">');
  });

  it('ships both a maskable and a standard icon at 192 and 512', () => {
    for (const purpose of ['any', 'maskable']) {
      for (const size of ['192x192', '512x512']) {
        expect(
          manifest.icons.some((icon) => icon.purpose === purpose && icon.sizes === size),
          `${purpose} ${size}`,
        ).toBe(true);
      }
    }
  });

  it('points every icon at a real PNG file', () => {
    for (const icon of manifest.icons) {
      const path = resolve(process.cwd(), 'public', icon.src.replace(/^\//, ''));
      expect(statSync(path).size, icon.src).toBeGreaterThan(0);
      // PNG signature, so a truncated or mislabelled file fails here.
      expect([...readFileSync(path).subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
      expect(icon.type).toBe('image/png');
    }
  });
});

describe('self-hosted typography', () => {
  const fontStylesheet = read('src/fonts.css');

  it('declares every face against a committed woff2 file', () => {
    const sources = [...fontStylesheet.matchAll(/url\('([^']+)'\)/g)].map(
      ([, url]) => url!,
    );
    expect(sources.length).toBeGreaterThanOrEqual(6);

    for (const source of sources) {
      const path = resolve(process.cwd(), 'public', source.replace(/^\//, ''));
      expect(statSync(path).size, source).toBeGreaterThan(0);
      // woff2 signature, so a truncated or mislabelled file fails here.
      expect(String(readFileSync(path).subarray(0, 4)), source).toBe('wOF2');
    }
  });

  it('never reaches a third-party font host', () => {
    expect(fontStylesheet).not.toContain('fonts.googleapis.com');
    expect(fontStylesheet).not.toContain('fonts.gstatic.com');
    expect(indexHtml).not.toContain('fonts.googleapis.com');
    expect(fontStylesheet).toContain('font-display: swap;');
  });
});

describe('service worker', () => {
  it('is linked from the document alongside the manifest', () => {
    expect(indexHtml).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(indexHtml).toContain('rel="apple-touch-icon" href="/icons/icon-180.png"');
  });

  it('precaches the shell and versions its caches', () => {
    expect(serviceWorker).toContain("const SHELL_URLS = ['/', '/manifest.webmanifest'];");
    expect(serviceWorker).toMatch(/const VERSION = '[^']+';/);
  });

  it('only handles same-origin GET requests', () => {
    expect(serviceWorker).toContain("if (request.method !== 'GET') return;");
    expect(serviceWorker).toContain('if (url.origin !== self.location.origin) return;');
  });

  it('serves navigations network-first so a deployment is picked up', () => {
    expect(serviceWorker).toContain("event.respondWith(networkFirst(request, '/'));");
  });

  it('drops caches from previous versions on activate', () => {
    expect(serviceWorker).toContain('caches.delete(key)');
  });

  it('serves the self-hosted fonts cache-first so the shell works offline', () => {
    expect(serviceWorker).toContain("'/fonts/'");
  });
});

describe('hosting configuration', () => {
  const vercel = JSON.parse(read('vercel.json')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const headerFor = (source: string, key: string) =>
    vercel.headers.find((rule) => rule.source === source)
      ?.headers.find((header) => header.key === key)?.value;

  it('never lets the worker or manifest be served stale', () => {
    expect(headerFor('/sw.js', 'Cache-Control')).toContain('max-age=0');
    expect(headerFor('/manifest.webmanifest', 'Cache-Control')).toContain('max-age=0');
  });

  it('keeps hashed assets, catalog data, and self-hosted fonts immutable', () => {
    expect(headerFor('/assets/(.*)', 'Cache-Control')).toContain('immutable');
    expect(headerFor('/data/(.*)', 'Cache-Control')).toContain('immutable');
    expect(headerFor('/fonts/(.*)', 'Cache-Control')).toContain('immutable');
  });

  it('allows the worker and manifest under the content security policy', () => {
    const csp = headerFor('/(.*)', 'Content-Security-Policy') ?? '';
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("manifest-src 'self'");
    // Offline support must not have loosened the third-party restriction.
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain('https://www.googletagmanager.com');
    expect(csp).toContain('https://www.google-analytics.com');
  });
});
