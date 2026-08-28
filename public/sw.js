/**
 * Offline support for Emoji Compass.
 *
 * The build emits content-hashed asset names, so there is no build-time
 * precache manifest: the shell is cached on install and hashed assets are
 * cached as they are first requested. Only same-origin GET requests are
 * handled; analytics beacons are left to the network untouched.
 */

const VERSION = 'v1';
const SHELL_CACHE = `emoji-compass-shell-${VERSION}`;
const ASSET_CACHE = `emoji-compass-assets-${VERSION}`;
const CURRENT_CACHES = new Set([SHELL_CACHE, ASSET_CACHE]);

/** Paths whose contents are immutable for a given URL, so cache-first is safe. */
const IMMUTABLE_PREFIXES = ['/assets/', '/icons/', '/data/', '/fonts/'];

/** Vercel Web Analytics is same-origin but must never be served from a cache. */
const BYPASS_PREFIXES = ['/_vercel/'];

const SHELL_URLS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('emoji-compass-') && !CURRENT_CACHES.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Serves from cache when present, otherwise fetches once and stores the copy. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

/** Prefers the network so a new deployment is picked up, falling back offline. */
async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(fallbackUrl ?? request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(fallbackUrl ?? request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/'));
    return;
  }

  if (IMMUTABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
