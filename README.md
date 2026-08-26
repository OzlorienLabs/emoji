# Emoji Compass

Emoji Compass is a fast, meaning-first emoji finder and composer. Search for an idea such as `blue heart`, `happy dance`, or `work computer`, choose the exact emoji or skin-tone variant, build a message, and copy the original Unicode string. The app is a static React site with no account, ads, analytics, runtime API, or database.

### Release Version

Release 1.0.2

## What it includes

- Multi-word search across English CLDR names and keywords, shortcodes, categories, code points, tone descriptions, and reviewed conversational aliases
- Deterministic relevance ranking, bounded typo matching, and direct glyph, shortcode, hex, and `U+…` lookup
- All 3,953 ordered entries in the bundled Emoji 17.0 catalog: 1,923 browsable families plus 2,030 exact variants
- Category browsing, favorites, recent emoji, default skin tone, native/text presentation, three display sizes, and light/dark/system themes
- Exact variant selection, including supported mixed-tone sequences, without synthesizing Unicode sequences
- An editable emoji-and-text composer with undo, clear, copy, and an optional quick-copy mode
- Keyboard navigation, live status messages, accessible labels, visible focus, and responsive layouts down to 320 px
- Progressive rendering and paging capped at 240 live emoji tiles (at most 480 tile controls) to keep the full catalog responsive
- 119 reviewed conversational aliases (331 terms) so everyday intents such as `deadline`, `mindblown`, or `workout` reach a fitting emoji
- Installable as an app, and fully usable offline once the catalog has been cached

The family grid keeps browsing compact. Every nested variant remains reachable from details and through search.

## Quick start

Requirements: Node.js 20.19 or newer and npm.

```bash
npm ci
npm run dev
```

Vite prints the local development URL. No environment variables or external services are required.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run generate:data` | Rebuild and validate the self-hosted Emoji 17 catalog |
| `npm run generate:icons` | Redraw the PWA icon set (output is committed) |
| `npm run test` | Run the Vitest unit and component integration suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage and enforce 96% thresholds |
| `npm run lint` | Run ESLint with zero warnings allowed |
| `npm run typecheck` | Type-check the application and tooling configs |
| `npm run build` | Regenerate data, type-check, and create `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run verify` | Run lint, types, coverage, and a production build |

Before submitting a change, run:

```bash
npm run verify
```

Coverage is enforced at 96% for statements, branches, functions, and lines across hand-authored source. Generated catalog data, type-only declarations, test helpers, and the entry bootstrap are excluded.

## Architecture

Emoji Compass intentionally uses a small static architecture:

```text
scripts/generate-emoji-data.mjs  pinned source data -> validated JSON
scripts/generate-icons.mjs       draws the PWA icon set, no image dependencies
public/data/                     versioned catalog served from the same origin
public/sw.js                     offline caching for the shell, assets, and catalog
src/data/                        catalog contracts and search aliases
src/lib/                         search, variants, composer, clipboard, storage
src/hooks/                       catalog loading and local preferences
src/components/                  accessible, focused React components
```

At build time, the generator transforms the exact-pinned `emojibase-data@17.0.0` English dataset and fails unless it finds 1,923 families, 2,030 variants, and 3,953 total ordered records. It also writes Emoji/CLDR version metadata and a deterministic SHA-256 checksum. At runtime, the browser fetches that versioned JSON from the same deployment, constructs the search index locally, and progressively renders results. This keeps browsing private and removes server latency and mutable third-party runtime dependencies.

Preferences, favorites, and recent emoji are stored in browser local storage. Composer text and search history are not persisted. Clipboard access stays in the browser and includes a manual-copy fallback when direct clipboard access is unavailable.

## Refreshing emoji data

The source package is exact-pinned so Vercel builds remain reproducible. To refresh the checked-in asset after intentionally updating the dependency:

```bash
npm install --save-dev --save-exact emojibase-data@<version>
npm run generate:data
npm run verify
```

Review and update the expected Emoji/CLDR versions and integrity counts in the generator, catalog tests, specification, and this README as part of that change. Never construct skin-tone or ZWJ variants manually; copy the exact strings supplied by the dataset. Third-party attribution is recorded in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Deploying to Vercel

This repository is ready for static Vercel hosting; deployment is intentionally left to the repository owner.

1. Import the repository into a Vercel project.
2. Choose the **Vite** framework preset.
3. Use `npm run build` as the build command and `dist` as the output directory.
4. Leave environment variables empty and deploy from the desired branch.

`vercel.json` applies long-lived immutable caching to fingerprinted application assets and the versioned emoji catalog, a bounded lifetime to icons, and `max-age=0, must-revalidate` to the service worker and manifest. There is no server function, database, secret, or post-deploy migration.

## Offline and installing

Emoji Compass registers a service worker in production builds only, so the dev server always serves fresh modules. The worker handles same-origin `GET` requests and nothing else:

- Navigations are network-first, so a new deployment is picked up as soon as the browser is online, falling back to the cached shell when it is not.
- Content-hashed assets, icons, and the versioned catalog are cache-first, since those URLs never change contents.
- Caches are namespaced by a version constant and older ones are dropped on activation.

There is no build-time precache manifest: the shell is cached on install and hashed assets are cached as they are first requested. `sw.js` and the manifest are served with `max-age=0, must-revalidate` so a deployment can never pin clients to an old shell. Offline support adds no third-party request and does not loosen the content security policy.

To install, use the browser's install or *Add to Home Screen* action. Uninstalling, or clearing site data, removes the cache.

## Accessibility, privacy, and performance

The interface targets WCAG 2.2 AA with semantic landmarks and controls, minimum 44×44 px mobile targets, polite announcements, reduced-motion support, strong focus indication, and keyboard access. Press `/` to focus search, `Escape` to clear it, and use arrow, Home, and End keys within the emoji grid.

Both themes use the warm Clay/Ivory palette. Contrast is enforced by tests that parse the stylesheet's token blocks and assert 4.5:1 for every text pair and 3:1 for focus rings and control boundaries, so a palette change that regresses contrast fails the suite.

Performance budgets are 120 KB gzip for initial JavaScript, 25 KB gzip for CSS, and 150 KB compressed for the catalog. The product targets LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1, and search-to-paint p95 ≤50 ms on the full index. It uses no remote fonts, advertisements, analytics, or runtime third-party requests.

## Compatibility and current limitations

- Emoji appearance and Emoji 17 coverage depend on the operating system, browser, and installed native font. A newly standardized emoji may appear as a missing-glyph box on an older platform even though Emoji Compass preserves and copies its correct Unicode sequence.
- Text presentation is available only when the source dataset provides a text-style sequence; otherwise the native emoji glyph is shown. Copying always preserves the original fully qualified sequence.
- Direct clipboard writing generally requires HTTPS or localhost and browser permission. The fallback keeps content available for manual copying.
- Search metadata is English-only. Preferences are local to the current browser profile, with no account sync or cross-device history.
- Regional Indicator code-point components that are not ordered palette entries are excluded; fully qualified flag sequences are included.

## License

Emoji Compass source code is available under the [MIT License](./LICENSE). Emoji and annotation data have separate notices in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
