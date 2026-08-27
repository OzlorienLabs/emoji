# Spec: Emoji Compass

## Objective

Build a meaning-first emoji discovery and composition app for people who know what they want to communicate but not which emoji expresses it. The product must match the useful capabilities of EmojiCopy—complete browsing, category navigation, search, selection/composition, copying, size controls, render style, and skin tone—while improving multi-word search, accessibility, privacy, mobile usability, and visual clarity.

The app uses original branding and native Unicode glyphs. It does not copy JoyPixels artwork, branding, or proprietary assets.

### Primary user stories

- As a user, I can type one or more ideas (for example, `blue heart`, `happy dance`, or `work computer`) and receive well-ranked emoji whose names, keywords, or conversational aliases express those ideas.
- As a user, I can browse every Emoji 17.0 RGI entry through a compact family grid and a complete variant picker.
- As a user, I can select multiple emoji, combine them with text, and copy the exact composed string.
- As a user, I can choose visual size, native/text presentation, a default skin tone, a category, favorites, and recent emoji.
- As a keyboard, screen-reader, or mobile user, I can complete the same core flows without inaccessible controls or clipped content.

## Tech Stack

- Node.js 24 for local/build tooling (minimum supported runtime: Node 20.19)
- React 19.2 with TypeScript 6.0 (the newest release in the current `typescript-eslint` support range)
- Vite 8 for development and production bundling
- `emojibase-data` 17.0.0 as an exact-pinned build-time adapter for Unicode Emoji 17.0 and CLDR 48
- Vitest 4, Testing Library, `user-event`, and V8 coverage for unit/component integration tests
- Plain CSS with semantic design tokens; no runtime UI framework, icon font, or ads
- Display typography is self-hosted as committed woff2 subsets, so the running app makes no remote font request
- Chrome's built-in Prompt API is used opportunistically for on-device message polish; the feature is absent, never degraded, when the API or the hardware is unavailable
- Static Vercel deployment; no runtime API or database

## Data Contract

- Build from `emojibase-data/en/data.json` and `emojibase-data/en/messages.json` into a self-hosted, versioned JSON asset.
- Exclude unordered Regional Indicator internals from the palette.
- Preserve each ordered top-level record and every nested `skins` record. Never reconstruct, normalize, or mutate a copied emoji string.
- Integrity must prove 1,923 ordered top-level records, 2,030 nested variants, and 3,953 unique ordered Emoji 17.0 entries.
- The default grid collapses variants into their family tile. Every valid tone or mixed-tone sequence remains searchable and copyable through search and the variant dialog.
- Every searchable record combines CLDR annotation, CLDR tags, shortcodes, group/subgroup labels, tone words, emoji version, code point, and reviewed conversational aliases.
- The generated artifact includes source version metadata and a deterministic content checksum.

## Commands

```bash
npm run dev
npm run generate:data
npm run generate:icons
npm run generate:fonts
npm run test
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm run verify
npm run preview
```

## Project Structure

```text
public/data/             Generated, self-hosted Emoji 17 and Lucide catalogs
public/fonts/            Generated, self-hosted variable woff2 subsets
public/icons/            Generated PWA icon set
public/sw.js             Offline caching for the shell, assets, and catalog
scripts/                 Reproducible data generation, icon drawing, integrity checks
src/components/          Focused React UI components and colocated tests
src/data/                Catalog contracts and reviewed intent aliases
src/hooks/               Catalog loading, persistent preferences, media queries, on-device AI
src/lib/                 Pure search, variants, composer, clipboard, storage, motion, and AI logic
src/test/                Test setup and stable fixtures
tasks/                   Implementation plan and progress checklist
docs/                    Product specification and source/architecture notes
```

## Code Style

- Strict TypeScript, named exports, immutable inputs, and small pure functions.
- React components use semantic HTML and receive explicit typed props.
- State stays local or in one app reducer; no global state library.
- Tests describe user-visible outcomes and prefer real implementations over mocks.

```ts
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[_\-:]+/g, ' ')
    .replace(/[^\p{Letter}\p{Number}+]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
```

## Search Contract

1. Normalize case, diacritics, punctuation, underscores, hyphens, and whitespace without changing emoji glyph values.
2. Treat query words as unordered AND constraints. Each additional word narrows results.
3. Expand reviewed intent aliases into alternatives without silently changing AND into broad OR matching.
   - A multi-word alias matches only an emoji carrying every one of its words, and scores as its weakest word, so `thumbs up` is never satisfied by `up arrow`.
   - A direct alias match switches typo matching off for that word, so a curated alias sharpens results as well as broadening them.
   - Every alias value must resolve against the real catalog; a dead alias is a test failure, not a silently degraded search.
4. Rank exact emoji/name/phrase matches, exact name tokens, exact keywords/aliases, prefixes, substrings, then bounded typo matches.
5. Use deterministic Unicode/CLDR order to break equal scores; favorite/recent status never outranks a stronger semantic match.
6. If strict results are empty, show an explicit no-results state with suggested intent searches rather than irrelevant matches.
7. Direct glyph, shortcode, hexcode, and `U+1F600` lookup must work.

Gold queries include `blue heart`, `happy dance`, `love cat`, `doctor dark skin`, `flag japan`, `celebrtion`, `hot dog`, direct emoji/code-point lookup, and the intent set `birthday`, `deadline`, `mindblown`, `workout`, `wifi`, `pride`, `yoga`, `spicy`, `launch`, and `welcome`.

## Interaction Contract

- Search is labeled, clearable, URL-shareable, and focusable with `/`. `Escape` unwinds exactly one layer per press, in priority order: details sheet, then preferences popover, then the query.
- `Cmd/Ctrl + Enter` copies the composed message from anywhere outside a text field.
- Category navigation uses labeled chips and keeps the active category visible; pressing the active chip clears it.
- A content-type filter switches the pool between all, emoji, and icons, and clears any active category.
- Emoji tiles are real buttons with names. Selecting appends the exact glyph to the composer; quick-copy mode copies a single glyph instead.
- The composer accepts emoji and text, supports undo and clear, reports both a character count and a selected-content summary, and copies its exact content without auto-clearing. Copying an empty message is refused with an actionable message rather than writing nothing.
- Icons append a `:kebab-name:` token to the composer and render there as an inline pill; quick-copy mode instead copies the icon in the configured format (SVG, JSX, HTML, or bare name).
- Clipboard failure leaves the content selected and provides an actionable message.
- Skin tone uses explicit dataset variants, never modifier concatenation. Mixed-tone families are exposed in the variant dialog.
- Size controls offer small, medium, and large. Render style offers native emoji and text presentation where the Unicode sequence supports it; copying always preserves the original fully-qualified glyph.
- Favorites, recent items (48 most recent), size, style, tone, theme, quick-copy, and icon copy format are stored locally. Arbitrary composer text and search history are not persisted.
- Details expose annotation, keywords, code points, group/subgroup, version, favorite action, up to 12 related items, and every valid variant. Keyword and tag pills re-run as searches.
- On-device polish is offered only when the browser's built-in language model reports itself available. It preserves every emoji and icon token from the draft, is cancellable, and lands as a single undo entry.

## Visual and Responsive Contract

- Original “Emoji Compass” identity: an aurora-glass shell over a warm clay accent, with two complete themes — daylight (default) and night — plus a `system` setting that follows the operating system. The choice is stamped on the document element so the page, scrollbars, and native controls all follow it.
- All text is `rgb(var(--ec-ink-rgb) / var(--ec-a-*))` and all surfaces are `var(--ec-fill-1…3)` over `var(--ec-line-1…3)` hairlines. Both ladders carry different values per theme, because the same alpha over ivory and over near-black does not carry the same contrast. No rule reaches for a raw alpha.
- Contrast is asserted by compositing every layer the way a browser would — text over each rung of the glass ladder, labels over accent fills, toast palettes, focus rings, and icon strokes — against the stylesheet's parsed token blocks rather than reviewed by eye.
- Glass surfaces pair `backdrop-filter` with `-webkit-backdrop-filter`, and an `@supports` fallback makes every text-carrying surface solid where the property is unavailable.
- The loading and error screens render outside the app shell and inherit the same token layer.
- Mobile-first layout with a compact header, sticky search/category controls, minimum 44×44 px targets, and a composer dock above the safe-area inset.
- Desktop uses the same information hierarchy with inline preferences and a wider grid.
- No horizontal body overflow at 320 px, 768 px, 1024 px, or 1440 px.
- Respect reduced-motion and system color-scheme preferences. Under reduced motion the aurora parallax, grid stagger, counter roll, fly-to-dock animation, and smooth scrolling are all switched off, not merely shortened.

## Offline and Installability

- The app is installable: a manifest with `standalone` display, matching theme/background colors, and 192/512 icons in both `any` and `maskable` purposes.
- Icons are drawn by a committed script with no image dependency and no third-party artwork.
- A service worker is registered in production builds only, so the dev server is never served stale modules.
- The worker handles same-origin `GET` only: navigations network-first with a cached-shell fallback, content-hashed assets/icons/catalog cache-first, caches namespaced by version and pruned on activate.
- Registration degrades silently: an unsupported browser or a rejected registration must leave the app fully usable.
- Offline support adds no third-party request and does not loosen the content security policy.
- `sw.js` and the manifest are served `max-age=0, must-revalidate`.

## Accessibility

- Target WCAG 2.2 AA with valid heading hierarchy, landmarks, visible focus, textual control labels, and 4.5:1 normal-text contrast.
- Search/filter counts and copy success use polite live status; errors use an alert. The visible toast is `aria-hidden`, so each message is announced exactly once.
- Tone, style, size, theme, and copy-mode choices never rely on color alone.
- Dialogs use the native dialog model, restore focus, and remain keyboard operable.
- The results grid supports logical arrow-key movement while normal Tab navigation skips thousands of tiles after the first grid item.
- Core states must produce no serious accessibility violations during browser review.

## Performance Budgets

- Initial application JavaScript: at most 120 KB gzip; CSS: at most 25 KB gzip.
- Self-hosted catalog: at most 150 KB compressed; no runtime third-party requests.
- Live emoji buttons: at most 500 through progressive rendering, with an accessible “Show more” action and automatic expansion near the end.
- Search-to-paint p95: at most 50 ms on the full flattened index.
- Core Web Vitals targets: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1.
- Lighthouse targets: mobile Performance ≥95 and Accessibility ≥98 where the local environment supports measurement.

## Testing Strategy

- Test-first development for search, data transformation, variants, storage, composer, clipboard, and state transitions.
- Data integrity tests assert source versions, counts, uniqueness, ordering, required labels, and at least three normalized search terms per record.
- Component integration tests cover loading/error/retry, search/filter composition, tone/style/size, favorites/recents persistence, variant selection, composer edit/undo/clear/copy, quick copy, no-results, URL state, shortcuts, and accessible announcements.
- Real-browser checks cover desktop and 320/390 px mobile flows, console cleanliness, clipboard behavior, responsive layout, focus, and performance.
- Enforce at least 96% (above the requested 95%) for statements, branches, functions, and lines across hand-authored source. Generated data, declarations, test helpers, and the trivial entry bootstrap are excluded.

## Boundaries

- Always: preserve exact Unicode strings; self-host data; validate generated data; use semantic controls; run lint, typecheck, tests, coverage, build, and browser verification.
- Ask first: add authentication, cloud sync, analytics, server/database features, proprietary emoji artwork, or deploy/publish externally.
- Never: commit secrets; copy JoyPixels assets/branding; fetch mutable `latest` data during a Vercel build; synthesize tone/ZWJ sequences; hide failing tests; persist composer text or search history without consent.

## Success Criteria

- All 3,953 ordered Emoji 17.0 entries are reachable, searchable, and copyable; all 1,923 families appear in the catalog.
- Multi-word, alias, typo, shortcode, glyph, and code-point search fixtures pass with deterministic ranking.
- Search, category, tone, style, size, favorites, recents, details/variants, composition, copy, undo, and quick-copy flows work at mobile and desktop sizes.
- No runtime server or third-party network dependency is required.
- Coverage thresholds exceed 95% on all four enforced metrics.
- `npm run verify` and `npm run build` pass; the production preview has no console errors or warnings.
- The repository contains deployment instructions and a Vercel configuration with correct cache headers.

## Open Questions

No blocking questions. Installable PWA and offline support are delivered. Future optional scope: localization and account-based sync.
