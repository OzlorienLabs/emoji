# Implementation Plan: Emoji Compass

## Overview

Create a static, privacy-preserving React application backed by a pinned Emoji 17/CLDR 48 catalog. Build the riskiest foundations first—data completeness and meaning-first ranking—then deliver the catalog/composer vertical slice, persistence and details, responsive polish, and final quality gates.

## Architecture Decisions

- Generate a small, versioned public JSON artifact from exact-pinned `emojibase-data@17.0.0`; the browser never downloads the 50 MB multi-locale package or contacts a third-party CDN.
- Keep 1,923 family records nested with 2,030 valid variants. Flatten only the in-memory search index so all 3,953 ordered sequences remain discoverable.
- Use a reducer plus small hooks instead of a state library; use URL parameters only for shareable search/category state.
- Scan the catalog in memory with a pre-normalized index. At this scale, a worker/postings index is deferred unless measurement exceeds the 50 ms budget.
- Window at most 240 family tiles (no more than 480 tile controls) while retaining accessible reveal and previous/next actions.
- Use native Unicode rendering and a text-presentation preview; do not ship proprietary art or a large emoji font.

## Dependency Graph

```text
Pinned source data → generator/types → integrity tests
                         ↓
                  search + variants
                         ↓
             reducer/loading/preferences
                         ↓
       search/catalog UI → composer/copy UI
                         ↓
              details/favorites/recents
                         ↓
          responsive/a11y/performance QA
```

## Phases

### Phase 1: Reproducible foundation

- Scaffold Vite/React/TypeScript and quality commands.
- Generate the versioned catalog and enforce exact Unicode counts.
- Write failing ranking/normalization tests, then implement the search engine.

### Checkpoint: Foundation

- Data verification, focused tests, typecheck, lint, and build pass.
- Gold queries return the intended leading results.

### Phase 2: Core discovery and copy flow

- Load the catalog with explicit loading/error/retry states.
- Build header, search, category controls, result summary, progressive grid, and keyboard navigation.
- Build composer, exact clipboard copy/fallback, undo/clear, and quick-copy mode.
- Add size, style, and global tone controls using only dataset variants.

### Checkpoint: Core flow

- A user can search, choose a variant, compose text/emoji, and copy at desktop and mobile widths.
- Component integration tests cover all state combinations.

### Phase 3: Helpful enhancements and polish

- Add local favorites/recents, details/variant dialog, related items, theme, shortcuts, URL search state, and suggestion chips.
- Apply original responsive styling, safe-area handling, reduced motion, focus behavior, and empty/error states.
- Add Vercel headers, README, notices, and data-update documentation.

### Checkpoint: Complete

- Coverage is at least 96% on statements, branches, functions, and lines.
- Full verification/build pass, production assets meet budgets, browser console is clean, and responsive screenshots are reviewed.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| “All emoji” is ambiguous | Missing or duplicated sequences | Define it as ordered Emoji 17 RGI entries and test 3,953 unique records |
| Tone concatenation breaks complex sequences | Invalid output | Select only exact nested variants from source data |
| Search becomes noisy | Users lose trust | AND semantics, bounded fuzzy fallback, deterministic scoring, gold-query tests |
| Full catalog slows mobile | Poor INP/LCP | Separate cached JSON, pre-normalized index, deferred value, progressive grid, measured budget |
| Native device lacks a new glyph | Empty box | Keep searchable/copyable, show version metadata and compatibility note |
| Clipboard permissions fail | Dead-end flow | Fallback selection with actionable alert and unchanged composer content |
| Coverage rewards shallow tests | False confidence | Enforce branch coverage and exercise outcomes through component integration tests |

## Open Questions

- Localization, PWA/offline install, and cloud sync are intentionally deferred and can be added without changing the catalog contract.
