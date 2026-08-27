# Emoji Compass

Emoji Compass is a fast, meaning-first emoji and icon finder. Search for an idea such as `blue heart`, `happy dance`, or `work computer`, choose the exact emoji or skin-tone variant, build a message, and copy the original Unicode string. The app is a static React site with no account, ads, runtime API, or database — the only optional network integration is Google Analytics, and it stays inert unless you configure a measurement ID.

# Web App - [🧭 Emoji Compas](https://emoji.ozlorienlabs.com)

### Release Version

Release 1.3.2

## What it includes

### Finding things

- Multi-word search across English CLDR names and keywords, shortcodes, categories, code points, tone descriptions, and reviewed conversational aliases
- Deterministic relevance ranking, bounded typo matching, and direct glyph, shortcode, hex, and `U+…` lookup
- All 3,953 ordered entries in the bundled Emoji 17.0 catalog: 1,923 browsable families plus 2,030 exact variants
- All 1,777 Lucide 1.34 vector icons, grouped into 15 categories, searchable by name, kebab name, category, and tag
- 119 reviewed conversational aliases (331 terms) so everyday intents such as `deadline`, `mindblown`, or `workout` reach a fitting emoji
- A segmented **All / Emoji / Icons** filter with a sliding indicator, plus a scrolling chip rail for favorites, recents, the 10 Unicode groups, and the 15 icon categories — tapping the active chip clears it
- Eight one-tap idea chips (`blue heart`, `happy dance`, `deadline`, `mindblown`, `work computer`, `download`, `celebration`, `pride`) under the search field and again in the empty state
- Keyword and tag pills inside every details sheet run straight back into search
- Query, content type, and category live in the URL, so any view is shareable

### Using what you find

- An editable emoji-and-text composer with undo, clear, copy, a live character count, and an optional quick-copy mode that writes straight to the clipboard instead
- Icons render as inline pills inside the composer and serialize to `:kebab-name:` tokens
- Exact variant selection from the details sheet, including supported mixed-tone sequences, without synthesizing Unicode sequences
- Per-format icon copying: SVG, React/JSX, HTML (`<i data-lucide="…">`), bare name, or a downloaded `.svg` file — with adjustable stroke width and preview size
- A configurable quick-copy format for icons, so a tile tap copies whichever of those formats you work in
- Favorites and recents (48 most recent), both stored locally and browsable as categories

### On-device AI polish

When the browser exposes Chrome's built-in **Prompt API** (`window.LanguageModel` or `window.ai.languageModel`) *and* the device meets its hardware requirements, a **Polish** button appears beside Copy in the composer dock. It rewrites your draft into one cleaner sentence entirely on the device — no text is sent anywhere.

- **Availability is detected, never assumed.** On startup the app calls `availability()` (falling back to the older `capabilities()` shape), and treats `readily`, `available`, and `after-download` as usable. If the API is missing, the model is unavailable, the hardware does not qualify, or the check throws, the button is simply never rendered — nothing else about the app changes.
- **Your symbols survive the rewrite.** Every emoji grapheme and every `:icon-name:` token in the original draft is extracted first and re-appended if the model drops it, so polishing can reword your sentence but never lose a glyph you chose.
- **Model chatter is stripped.** Preambles such as "Here is a polished version…" are removed before the result reaches the composer.
- **It is interruptible and undoable.** Polishing shows an in-place progress overlay, the same button cancels the run via `AbortController`, and the result lands as one undo entry — press Undo to get your original draft back. Once a draft is polished the button becomes **Regenerate** for a fresh rewording.
- **Failures are non-fatal.** A model error surfaces as a toast and leaves the draft untouched.

### The interface

- A dual-theme "aurora glass" shell: warm **daylight** by default, a deep **night** theme, or **auto** to follow the operating system — switchable from the header or the preferences popover, and persisted locally
- Three drifting colour fields behind a vignette, with a subtle pointer parallax
- Self-hosted Bricolage Grotesque, Plus Jakarta Sans, and JetBrains Mono; no third-party font request at runtime
- Live catalog counters that roll up on load, a sliding filter indicator, a staggered grid entrance, and a fly-to-dock animation when a tile joins your message
- A preferences popover covering tile size (S/M/L), default skin tone, native vs. text presentation, theme, quick copy, and icon copy format
- Details opens as a bottom sheet at every width, with the glyph, category, code points, every variant, keywords, per-format actions, and up to 12 related items
- Toasts confirm each action above the composer dock; success clears after 2.6 s and actionable errors after 5 s

### Platform

- Keyboard: `/` focuses search, `Escape` unwinds one layer at a time (details sheet → preferences → query), `⌘/Ctrl + Enter` copies the message, and arrow, Home, and End keys move within the grid
- Progressive rendering and paging capped at 240 live tiles (at most 480 tile controls) to keep the full catalog responsive
- Every animation, the parallax, the counter roll, and the fly-to-dock effect switch off under `prefers-reduced-motion`
- Accessible labels, live status messages, visible focus, 44 × 44 px minimum targets, and responsive layouts down to 320 px
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
| `npm run generate:data` | Rebuild and validate the self-hosted Emoji 17 and Lucide catalogs |
| `npm run generate:icons` | Redraw the PWA icon set (output is committed) |
| `npm run generate:fonts` | Re-download the three self-hosted woff2 families (output is committed) |
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
scripts/generate-icon-data.mjs   pinned Lucide set -> categorized JSON
scripts/generate-icons.mjs       draws the PWA icon set, no image dependencies
scripts/generate-fonts.mjs       downloads the three woff2 families once
public/data/                     versioned catalogs served from the same origin
public/fonts/                    self-hosted variable woff2 subsets
public/sw.js                     offline caching for the shell, assets, and catalog
src/data/                        catalog contracts and search aliases
src/lib/                         search, variants, composer, clipboard, storage, motion, AI
src/hooks/                       catalog loading, local preferences, media queries, on-device AI
src/components/                  accessible, focused React components
src/styles.css                   the whole token layer and every component rule
```

At build time, the generators transform the exact-pinned `emojibase-data@17.0.0` English dataset and `lucide-static@1.34.0`, and fail unless they find 1,923 families, 2,030 variants, 3,953 total ordered emoji records, and 1,777 icons. They also write Emoji/CLDR version metadata and a deterministic SHA-256 checksum. At runtime, the browser fetches that versioned JSON from the same deployment, constructs the search index locally, and progressively renders results. This keeps browsing private and removes server latency and mutable third-party runtime dependencies.

Preferences, favorites, and recent items are stored in browser local storage. Composer text and search history are not persisted. Clipboard access stays in the browser and includes a manual-copy fallback when direct clipboard access is unavailable.

## Design tokens and theming

`src/styles.css` declares one token layer on `:root`, overridden by `:root[data-theme="dark"]` and — for the `system` setting — by a `prefers-color-scheme` block. The document element carries the choice, so the page background matches the shell at every scroll position and native form controls follow via `color-scheme`.

Two ideas make the same rules work in both themes:

- **An ink alpha ladder.** All text is `rgb(var(--ec-ink-rgb) / var(--ec-a-*))`. The three rungs (`--ec-a-strong`, `--ec-a-body`, `--ec-a-mute`) carry different alphas per theme, because the same alpha over ivory and over near-black does not carry the same contrast.
- **A glass ladder.** All surfaces are `var(--ec-fill-1 … 3)` with `var(--ec-line-1 … 3)` hairlines. Daylight paints translucent paper over ivory; night paints white at a few percent over near-black. No rule reaches for a raw alpha.

`src/styles.contrast.test.ts` parses those blocks, composites every layer the way a browser would, and asserts 4.5:1 for text on each rung of the glass ladder and 3:1 for focus rings, active control boundaries, and icon strokes — in both themes. A palette change that regresses contrast fails the suite.

## Refreshing emoji data

The source package is exact-pinned so Vercel builds remain reproducible. To refresh the checked-in asset after intentionally updating the dependency:

```bash
npm install --save-dev --save-exact emojibase-data@<version>
npm run generate:data
npm run verify
```

Review and update the expected Emoji/CLDR versions and integrity counts in the generator, catalog tests, specification, and this README as part of that change. Never construct skin-tone or ZWJ variants manually; copy the exact strings supplied by the dataset. Third-party attribution is recorded in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Refreshing the typography

The three display families are downloaded once and committed under `public/fonts/`, so the running app never issues a third-party font request:

```bash
npm run generate:fonts
```

The script fetches only the `latin` and `latin-ext` subsets of each variable face, writes them beside each other, and regenerates `src/fonts.css` with the matching `@font-face` rules and `unicode-range` values. Emoji glyphs always come from the operating system; no emoji artwork is bundled.

## Deploying to Vercel

This repository is ready for static Vercel hosting; deployment is intentionally left to the repository owner.

1. Import the repository into a Vercel project.
2. Choose the **Vite** framework preset.
3. Use `npm run build` as the build command and `dist` as the output directory.
4. Set the `VITE_GA_MEASUREMENT_ID` environment variable (optional, e.g. `G-XXXXXXXXXX`) for Google Analytics 4.
5. Deploy from the desired branch.

`vercel.json` applies long-lived immutable caching to fingerprinted application assets, the versioned emoji catalog, and the self-hosted fonts; a bounded lifetime to icons; and `max-age=0, must-revalidate` to the service worker and manifest.

## Google Analytics (GA4) Configuration

Google Analytics 4 tracking is supported out-of-the-box using the standard Google Tag (`gtag.js`):

1. Set `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` in your local `.env.local` or Vercel Environment Variables.
2. The app automatically initializes GA4 and instruments:
   - Page views and route navigation
   - Search queries, result counts, and content type
   - Quick-copy and dialog copy actions (emojis, icons, and compositions)
   - On-device AI polish interactions
   - Category and content filter selections
   - Preference modifications
3. If `VITE_GA_MEASUREMENT_ID` is omitted or empty, all analytics scripts and network calls remain inactive.

## Offline and installing

Emoji Compass registers a service worker in production builds only, so the dev server always serves fresh modules. The worker handles same-origin `GET` requests and nothing else:

- Navigations are network-first, so a new deployment is picked up as soon as the browser is online, falling back to the cached shell when it is not.
- Content-hashed assets, icons, fonts, and the versioned catalog are cache-first, since those URLs never change contents.
- Caches are namespaced by a version constant and older ones are dropped on activation.

There is no build-time precache manifest: the shell is cached on install and hashed assets are cached as they are first requested. `sw.js` and the manifest are served with `max-age=0, must-revalidate` so a deployment can never pin clients to an old shell. Offline support adds no third-party request and does not loosen the content security policy.

To install, use the browser's install or *Add to Home Screen* action. Uninstalling, or clearing site data, removes the cache.

## Accessibility, privacy, and performance

The interface targets WCAG 2.2 AA with semantic landmarks and controls, minimum 44×44 px mobile targets, polite announcements, reduced-motion support, strong focus indication, and keyboard access. Press `/` to focus search, `Escape` to unwind the topmost layer, `⌘/Ctrl + Enter` to copy your message, and use arrow, Home, and End keys within the grid. Toasts are mirrored into a live region rather than announced twice.

Contrast is enforced by tests that parse the stylesheet's token blocks and composite every glass and text layer — see [Design tokens and theming](#design-tokens-and-theming).

Performance budgets are 120 KB gzip for initial JavaScript, 25 KB gzip for CSS, and 150 KB compressed for the catalog. The product targets LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1, and search-to-paint p95 ≤50 ms on the full index. It uses no remote fonts, advertisements, or runtime third-party requests beyond the optional analytics tag.

## Compatibility and current limitations

- **On-device AI polish requires Chrome's built-in Prompt API and qualifying hardware.** Where the API, the model download, or the device requirements are not met, the Polish button is not shown and every other feature works unchanged. Nothing about polishing leaves the device, and there is no server fallback.
- Emoji appearance and Emoji 17 coverage depend on the operating system, browser, and installed native font. A newly standardized emoji may appear as a missing-glyph box on an older platform even though Emoji Compass preserves and copies its correct Unicode sequence.
- Text presentation is available only when the source dataset provides a text-style sequence; otherwise the native emoji glyph is shown. Copying always preserves the original fully qualified sequence.
- Direct clipboard writing generally requires HTTPS or localhost and browser permission. The fallback keeps content available for manual copying.
- `backdrop-filter` drives the glass surfaces. Browsers without it fall back to the same fills at full opacity, so the layout and contrast hold even though the blur is lost.
- Search metadata is English-only. Preferences are local to the current browser profile, with no account sync or cross-device history.
- Regional Indicator code-point components that are not ordered palette entries are excluded; fully qualified flag sequences are included.

## License

Emoji Compass source code is available under the [MIT License](./LICENSE). Emoji and annotation data have separate notices in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
