# Emoji Compass Tasks

## Task 1: Scaffold the application and quality gates

- [ ] Create the Vite React TypeScript shell and scripts.
- [ ] Configure strict TypeScript, ESLint, Vitest/jsdom, and ≥96% coverage thresholds.
- [ ] Add deterministic Vercel/static hosting configuration.
- Verify: `npm run typecheck && npm run lint && npm run build`.
- Dependencies: none.
- Likely files: `package.json`, TypeScript/Vite/ESLint configs, `index.html`, `vercel.json`.

## Task 2: Generate and validate the complete catalog

- [ ] Write the pinned data generator and compact runtime contract.
- [ ] Produce 1,923 families + 2,030 nested variants = 3,953 ordered unique entries.
- [ ] Add integrity tests for metadata, labels, search terms, groups, and copied glyphs.
- Verify: `npm run generate:data && npm run test -- catalog`.
- Dependencies: Task 1.
- Likely files: `scripts/generate-emoji-data.mjs`, `src/data/catalog.ts`, generated JSON, catalog tests.

## Task 3: Implement meaning-first search test-first

- [ ] Add failing tests for normalization, multi-word AND, phrase/prefix/typo/alias ranking, glyph, shortcode, and code point.
- [ ] Implement the smallest deterministic ranking engine that passes the gold queries.
- [ ] Benchmark full-index searches against the 50 ms budget.
- Verify: `npm run test -- search` and benchmark test.
- Dependencies: Task 2.
- Likely files: `src/lib/search.ts`, `src/data/intent-aliases.ts`, tests.

## Task 4: Deliver catalog browsing and discovery UI

- [ ] Test loading/error/retry, search/category composition, count, no-results, and progressive rendering.
- [ ] Implement catalog loader, search header, category navigation, grid, accessible tiles, and shortcuts.
- [ ] Keep live emoji buttons within the budget and preserve logical keyboard focus.
- Verify: focused component integration tests plus browser desktop/mobile check.
- Dependencies: Tasks 2–3.
- Likely files: app reducer/hook and 3–5 focused components/tests.

## Task 5: Deliver composition and copying

- [ ] Test selection, text editing, caret insertion, duplicates, undo, clear, exact copy, quick copy, and clipboard failure.
- [ ] Implement the sticky composer and live announcements.
- Verify: focused unit/component tests and real clipboard browser check.
- Dependencies: Task 4.
- Likely files: composer logic/component and clipboard utility/tests.

## Task 6: Deliver tone, size, style, details, and variants

- [ ] Test global tone lookup, text/native display without copy mutation, and all mixed-tone variants.
- [ ] Implement labeled controls and an accessible details/variant dialog.
- [ ] Expose code points, version, keywords, and related emoji.
- Verify: variant integrity and component integration tests.
- Dependencies: Tasks 2 and 4.
- Likely files: variants utility, preferences component, details dialog, tests.

## Task 7: Add local helpfulness features

- [ ] Test schema-safe preferences, favorites, recents, theme, and corrupt-storage recovery.
- [ ] Implement local-only persistence, favorite/recent views, suggestions, and URL query/category state.
- Verify: storage/unit tests and refresh/deep-link integration tests.
- Dependencies: Tasks 4–6.
- Likely files: storage/preferences hook, UI integration, tests.

## Task 8: Polish, document, and prove production readiness

- [ ] Finish responsive/original styling and all loading/empty/error/focus states.
- [ ] Add README, third-party notices, update workflow, and Vercel cache headers.
- [ ] Reach ≥96% coverage on all metrics; run lint, typecheck, tests, build, bundle checks, and real-browser QA at 320/390/768/1440 px.
- [ ] Perform final multi-axis code review and resolve all actionable findings.
- Verify: `npm run verify`, `npm run build`, production preview, clean console, screenshots, performance measurements.
- Dependencies: Tasks 1–7.
- Likely files: styles, documentation, hosting config, final tests.
