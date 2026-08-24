# Emoji Compass Tasks

## Task 1: Scaffold the application and quality gates

- [x] Create the Vite React TypeScript shell and scripts.
- [x] Configure strict TypeScript, ESLint, Vitest/jsdom, and ≥96% coverage thresholds.
- [x] Add deterministic Vercel/static hosting configuration.
- Verify: `npm run typecheck && npm run lint && npm run build`.
- Dependencies: none.
- Likely files: `package.json`, TypeScript/Vite/ESLint configs, `index.html`, `vercel.json`.

## Task 2: Generate and validate the complete catalog

- [x] Write the pinned data generator and compact runtime contract.
- [x] Produce 1,923 families + 2,030 nested variants = 3,953 ordered unique entries.
- [x] Add integrity tests for metadata, labels, search terms, groups, and copied glyphs.
- Verify: `npm run generate:data && npm run test -- catalog`.
- Dependencies: Task 1.
- Likely files: `scripts/generate-emoji-data.mjs`, `src/data/catalog.ts`, generated JSON, catalog tests.

## Task 3: Implement meaning-first search test-first

- [x] Add failing tests for normalization, multi-word AND, phrase/prefix/typo/alias ranking, glyph, shortcode, and code point.
- [x] Implement the smallest deterministic ranking engine that passes the gold queries.
- [x] Benchmark full-index searches against the 50 ms budget.
- Verify: `npm run test -- search` and benchmark test.
- Dependencies: Task 2.
- Likely files: `src/lib/search.ts`, `src/data/intent-aliases.ts`, tests.

## Task 4: Deliver catalog browsing and discovery UI

- [x] Test loading/error/retry, search/category composition, count, no-results, and progressive rendering.
- [x] Implement catalog loader, search header, category navigation, grid, accessible tiles, and shortcuts.
- [x] Keep live emoji buttons within the budget and preserve logical keyboard focus.
- Verify: focused component integration tests plus browser desktop/mobile check.
- Dependencies: Tasks 2–3.
- Likely files: app reducer/hook and 3–5 focused components/tests.

## Task 5: Deliver composition and copying

- [x] Test selection, text editing, caret insertion, duplicates, undo, clear, exact copy, quick copy, and clipboard failure.
- [x] Implement the sticky composer and live announcements.
- Verify: focused unit/component tests and real clipboard browser check.
- Dependencies: Task 4.
- Likely files: composer logic/component and clipboard utility/tests.

## Task 6: Deliver tone, size, style, details, and variants

- [x] Test global tone lookup, text/native display without copy mutation, and all mixed-tone variants.
- [x] Implement labeled controls and an accessible details/variant dialog.
- [x] Expose code points, version, keywords, and related emoji.
- Verify: variant integrity and component integration tests.
- Dependencies: Tasks 2 and 4.
- Likely files: variants utility, preferences component, details dialog, tests.

## Task 7: Add local helpfulness features

- [x] Test schema-safe preferences, favorites, recents, theme, and corrupt-storage recovery.
- [x] Implement local-only persistence, favorite/recent views, suggestions, and URL query/category state.
- Verify: storage/unit tests and refresh/deep-link integration tests.
- Dependencies: Tasks 4–6.
- Likely files: storage/preferences hook, UI integration, tests.

## Task 8: Polish, document, and prove production readiness

- [x] Finish responsive/original styling and all loading/empty/error/focus states.
- [x] Add README, third-party notices, update workflow, and Vercel cache headers.
- [x] Reach ≥96% coverage on all metrics; run lint, typecheck, tests, build, bundle checks, and real-browser QA at 320/390/768/1440 px.
- [x] Perform final multi-axis code review and resolve all actionable findings.
- Verify: `npm run verify`, `npm run build`, production preview, clean console, screenshots, performance measurements.
- Dependencies: Tasks 1–7.
- Likely files: styles, documentation, hosting config, final tests.
