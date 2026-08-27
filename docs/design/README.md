# Handoff: Emoji Compass — meaning-first emoji & icon picker

## Overview

Emoji Compass is a single-page, privacy-first picker for **every Emoji 17.0 RGI sequence (3,953 entries across 1,923 families)** and **the full Lucide 1.34 icon set (1,777 icons)**. The user types an intent ("blue heart", "deadline", "download icon"), gets results ranked by meaning, taps tiles to build a message, and copies the exact string. Nothing is sent to a server; favorites, recents and preferences live in `localStorage`.

This bundle is the **visual + interaction redesign** of the existing app in `emoji/` (Vite + React 19 + TypeScript, plain CSS tokens). It replaces the light "Clay/Ivory" shell with a dual-theme (night-default / daylight) glass interface, adds pointer parallax, staggered grid entrance, a fly-to-dock selection animation, and a details sheet with variants, tags, related items and per-format copy actions.

## About the Design Files

The files in this bundle are **design references created in HTML** — a working prototype that shows the intended look, motion and behavior. They are **not production code to copy directly**.

The task is to **recreate these designs inside the existing `emoji/` codebase** — React 19 + TypeScript, Vite, plain CSS with semantic tokens, component-per-concern under `src/components/`, pure logic under `src/lib/`, Vitest coverage gate ≥96%. Reuse that project's established patterns (typed props, one app reducer, colocated tests) rather than porting the prototype's structure. The prototype keeps all logic in one class and all styling inline because of its authoring environment; the real implementation should split into components and a CSS token stylesheet.

Where the prototype and the shipped app disagree, **the shipped app's contracts win** (search contract, byte-exact glyph copying, variant handling, accessibility rules in `docs/spec.md`). The prototype is authoritative only for *appearance, layout, motion and copy*.

## Fidelity

**High-fidelity.** Colors, type, spacing, radii, shadows, easing curves and copy are final. Recreate pixel-accurately using the codebase's CSS token system — do not substitute an unrelated design system. Every value below is exact.

---

## Themes

Two themes ship. **Night is the default** and must be the value baked into CSS so first paint is dark; daylight is applied by overriding the same custom properties.

- Toggle: a 40×40 button in the header (`☀` in night → switches to day, `☾` in day → switches to night). `aria-label` = "Switch to daylight" / "Switch to night".
- Persisted under the preferences key (see State Management). Restored before first paint of the app shell.
- In the prototype, day mode sets the token overrides as inline custom properties on `document.documentElement`. In the real app prefer `<html data-theme="day">` + a `[data-theme="day"]` block in the token stylesheet.

### Token table

| Token | Night (default) | Daylight | Used for |
|---|---|---|---|
| `--ec-bg` | `#07060c` | `#f4efe5` | page background |
| `--ec-bg-rgb` | `7,6,12` | `244,239,229` | vignette + sticky filter bar fade |
| `--ec-ink` | `#f4f1ea` | `#241d17` | full-strength text, input text |
| `--ec-ink-rgb` | `244,241,234` | `12,9,7` | all muted text via alpha (see note) |
| `--ec-surf-rgb` | `255,255,255` | `12,9,7`* | glass fills, borders, inset highlights |
| `--ec-shadow-rgb` | `0,0,0` | `124,98,72` | drop shadows |
| `--ec-head-rgb` | `9,8,14` | `253,250,245` | header bar, tile info-button bg |
| `--ec-panel-rgb` | `14,12,20` | `255,253,249` | prefs popover, composer dock |
| `--ec-deep-rgb` | `4,3,8` | `12,9,7`* | modal scrim |
| `--ec-card-rgb` | `16,14,22` | `255,252,247` | details sheet |
| `--ec-icon` | `#cfe9ff` | `#2c4a63` | Lucide stroke color |
| `--ec-link` | `#ff8a5c` | `#b8471f` | links |
| `--ec-link-hover` | `#ffb694` | `#8f3413` | link hover |
| `--ec-aurora` | `1` | `.5` | opacity of the aurora layer |
| `--ec-g1 / g2 / g3` | `#ff9d6e` / `#ffd0a8` / `#9b8cff` | `#e05a20` / `#c1691f` / `#6151cf` | H1 gradient word |
| `color-scheme` | `dark` | `light` | native form/scrollbar rendering |

\* Day values for `--ec-surf-rgb` / `--ec-deep-rgb` are near-black (`12,9,7`) on purpose: the same `rgba(var(--token), .04–.16)` rules then read as soft warm-gray fills and hairlines on ivory instead of invisible white-on-white.

**Contrast rule:** any text colored `rgba(var(--ec-ink-rgb), α)` uses **α ≥ .58**. That floor is what keeps 10.5–12px labels above WCAG AA in both themes. Do not reintroduce `.3`–`.5` ink alphas for text; use them only for decorative glyphs.

### Fixed accent colors (theme-independent)

| Purpose | Value |
|---|---|
| Clay accent | `#ff8a5c` |
| Primary button gradient | `linear-gradient(140deg,#ff9d6e,#ff6f4d 60%,#f2603c)` |
| Text on accent | `#180e08` (buttons), `#150d09` (skip link) |
| Keycap chip on accent | `rgba(24,14,8,.2)` bg |
| Violet (aurora / keyword hover) | `#9b8cff`, hover text `#dcd6ff` |
| Mint (success, quick-copy on) | `#57e3c4` at `.1`–`.85`, toast bg `rgba(11,32,28,.85)`, toast text `#b7f5e6`, knob `#07201c` |
| Gold (favorite active) | border `rgba(255,199,92,.6)`, fill `rgba(255,199,92,.2)`, glyph `#ffc75c` |
| Error toast | border `rgba(255,138,92,.5)`, bg `rgba(40,16,10,.85)`, text `#ffd0b8` |
| Accent chip active | border `rgba(255,138,92,.55)`, fill `rgba(255,138,92,.16)`, text `#ffd0b8` |
| Focus ring | `2px solid #ff8a5c`, offset `3px` |
| Selection | bg `rgba(255,138,92,.32)`, text `#fff` |

---

## Typography

| Family | Weights | Used for |
|---|---|---|
| **Bricolage Grotesque** (`opsz 12..96`) | 400, 600, 700 | H1, H2, H3, stat numbers, tile info "i" |
| **Plus Jakarta Sans** | 400, 500, 600, 700 | all UI text, body, buttons |
| **JetBrains Mono** | 400, 500 | match count, char count, code points, keycaps |
| System emoji stack | — | `'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif` for every glyph |

The shipped app currently forbids remote fonts (`docs/spec.md`: "no remote font"). Either self-host these three families (woff2, `font-display: swap`) or get explicit sign-off to load them from Google Fonts. **Do not silently substitute Inter/system-ui — the display face is a core part of the identity.**

Type scale (exact):

- H1: `clamp(2.2rem, 5.8vw, 4.1rem)`, weight 600, `line-height: 1`, `letter-spacing: -.035em`, `max-width: 17ch`, `text-wrap: balance`
- Hero body: `clamp(14.5px, 1.5vw, 17.5px)`, `line-height: 1.55`, `text-wrap: pretty`, `max-width: 56ch`, color `rgba(var(--ec-ink-rgb),.64)`
- H2 (results title): `clamp(1.3rem, 2.6vw, 1.9rem)`, weight 600, `letter-spacing: -.025em`
- H3 (details / empty): `clamp(1.2rem, 3vw, 1.75rem)` / `clamp(1.1rem, 2.2vw, 1.5rem)`, weight 600, `letter-spacing: -.02em`
- Kicker / section eyebrow: `10.5px`, `letter-spacing: .16em`–`.18em`, uppercase
- Stat label: `11px`, `letter-spacing: .12em`, uppercase
- Stat value: `clamp(20px, 2.6vw, 28px)`, weight 600, `font-variant-numeric: tabular-nums`
- Search input: `clamp(15px, 1.7vw, 18px)`, weight 500
- Buttons: `13.5px` weight 600/700; chips `12.5px`; tile label `10.5px`, `line-height 1.2`
- Composer text: `17px`, `line-height 1.35`
- Footer / mono readouts: `12px` (mono `11.5px`)

---

## Screens / Views

There is **one screen** with four overlays (prefs popover, details sheet, toast, composer dock). Max content width is `min(100% - 32px, 1180px)`, centered.

### 1. Background layers (fixed, `z-index: 0`, `pointer-events: none`)

- **Aurora**: container `position: fixed; inset: -10%; opacity: var(--ec-aurora)`, `transition: transform .6s cubic-bezier(.2,.8,.2,1)`. Three radial blobs:
  - clay: `top:-6% left:-8%`, `62vw` square (max 900px), `radial-gradient(circle at 35% 35%, rgba(255,138,92,.42), transparent 66%)`, `blur(60px)`, `animation: ec-a1 26s ease-in-out infinite`
  - violet: `top:12% right:-14%`, `58vw` (max 860px), `rgba(155,140,255,.40)`, `blur(70px)`, `ec-a2 32s`
  - mint: `bottom:-18% left:22%`, `54vw` (max 820px), `rgba(87,227,196,.26)`, `blur(76px)`, `ec-a3 38s`
- **Vignette**: `radial-gradient(120% 90% at 50% -10%, rgba(var(--ec-bg-rgb),0) 30%, rgba(var(--ec-bg-rgb),.72) 100%)`
- **Parallax**: on `pointermove`, aurora gets `translate3d(x,y,0)` where `x = (clientX/innerWidth - .5) * 26`px, same for y. Skipped when reduced motion.

### 2. Header (fixed, `z-index: 40`, height `66px`)

`display:flex; align-items:center; gap:14px; padding: 0 clamp(14px,3vw,30px)`, bg `rgba(var(--ec-head-rgb),.55)`, `backdrop-filter: blur(22px) saturate(170%)`, bottom border `1px solid rgba(var(--ec-surf-rgb),.08)`.

- **Logo lockup** (`<a href="/">`): 36×36 tile, radius 12, `linear-gradient(150deg,#ff9d6e,#ff6f4d 55%,#c9552b)`, shadow `0 8px 22px -8px rgba(255,138,92,.9)` + `inset 0 1px 0 rgba(255,255,255,.45)`, glyph 🧭 19px. Beside it: "Emoji Compass" (Bricolage 16.5px/600, `-.02em`) over "MEANING-FIRST PICKER" (10px, `.14em`, uppercase, ink .58). Both truncate with ellipsis.
- **Spacer** `flex: 1 1 8px`.
- **Theme toggle**, **prefs `⚙`**: 40×40, radius 13, border `rgba(var(--ec-surf-rgb),.11)`, fill `rgba(var(--ec-surf-rgb),.05)`; hover fill `.11` + `translateY(-1px)`, 200ms.
- **Search CTA**: height 40, `padding: 0 16px`, radius 13, primary gradient, text `#180e08` 13.5px/700, shadow `0 10px 26px -12px rgba(255,138,92,.9)`; hover `translateY(-2px)` and shadow `0 16px 34px -12px rgba(255,138,92,1)`. Contains a `/` keycap chip (mono 11px, min-width 20, height 20, radius 6).
- **Skip link** before the header: visually hidden, on focus `left:12px; top:12px`, clay fill, text `#150d09`, targets `#ec-results`.

### 3. Hero section

`padding: clamp(26px,4.5vh,64px) 0 clamp(18px,3vh,30px)`; column, centered, `gap: clamp(14px,2.2vh,22px)`.

- **Floating decorative emoji** (absolute, `aria-hidden`): 🫡 `top:4% left:1%` `clamp(24px,3.4vw,44px)` opacity .45, `--r:-8deg`, `ec-float 9s`; 🪩 `top:44% left:4%` opacity .4 `--r:10deg` 11s/.8s delay; 🩷 `top:10% right:1%` opacity .5 `--r:12deg` 10s/.4s; 🫧 `top:52% right:6%` opacity .35 `--r:-14deg` 13s/1.2s. The two larger ones carry `drop-shadow(0 10px 20px rgba(0,0,0,.5))`.
- **Eyebrow pill**: "Say it without overthinking it", radius 999, border `.12`, fill `.05`, `blur(14px)`, 12px text at ink .72, leading 22×22 mint circle (`rgba(87,227,196,.16)`) with ✨.
- **H1**: `Find the ` + gradient span `exact` (`linear-gradient(100deg,var(--ec-g1),var(--ec-g2) 40%,var(--ec-g3))`, `background-clip: text`, transparent color) + ` emoji you mean`.
- **Sub copy** (exact): "Search a feeling, a phrase, an object or an icon name. Every Unicode 17 sequence and every Lucide vector, ranked by meaning — no account, no tracking, nothing leaves your device."
- **Search field** (`width: min(100%,720px)`): height 66, radius 22, `padding: 0 12px 0 20px`, border `rgba(var(--ec-surf-rgb),.14)`, fill `.06`, `backdrop-filter: blur(24px) saturate(170%)`, shadow `0 26px 60px -26px rgba(var(--ec-shadow-rgb),.9)` + `inset 0 1px 0 rgba(var(--ec-surf-rgb),.14)`. Children: 🔍 (18px, opacity .6), visually-hidden `<label for="ec-search">Search emojis and icons</label>`, `input[type=search]` (transparent, no outline) with placeholder `try “blue heart”, “deadline”, “download icon”…`, conditional 34×34 `✕` clear button, and a mono match-count chip (height 38, radius 12, `{n} matches` / `loading…`).
  - **Focus state** (applied to the wrapper, not the input): border `rgba(255,138,92,.6)`, fill `.09`, shadow gains `0 0 0 4px rgba(255,138,92,.18)`.
- **Idea chips** (below field, centered, `gap: 8px`, `margin-top: 14px`): `blue heart`, `happy dance`, `deadline`, `mindblown`, `work computer`, `download`, `celebration`, `pride`. Radius 999, `padding: 7px 13px`, 12.5px, ink .6; hover fill `rgba(255,138,92,.14)`, border `rgba(255,138,92,.42)`, text `#ffd0b8`, `translateY(-1px)`.
- **Stat cards** (3, centered, `gap: clamp(10px,2vw,18px)`): min-width 132, `padding: 14px 20px`, radius 18, border `.09`, fill `.04`, `blur(16px)`. Values count up on load (see Interactions): "3,953 / Emoji sequences", "1,777 / Vector icons", "0 / Bytes sent to a server".
- Entrance: hero children use `ec-in .7–.8s cubic-bezier(.2,.8,.2,1) both` with delays 0 / .06 / .12 / .18 / .24s.

### 4. Filter bar (sticky, `top: 66px`, `z-index: 30`)

`padding: 10px 0`, bg `rgba(var(--ec-bg-rgb),.62)`, `blur(20px) saturate(160%)`, hairlines top `.06` / bottom `.07`. Inner row: `display:flex; align-items:center; gap:12px; flex-wrap:wrap`.

- **Segmented control** (`All ✦` / `Emoji 😀` / `Icons ◆`): wrapper `padding:4px`, radius 15, border `.1`, fill `.05`, `position: relative`. A **sliding pill** (`aria-hidden` span) sits at `top:4px`, height 38, radius 11, primary gradient, shadow `0 12px 26px -14px rgba(255,138,92,.95)`, and animates `left`/`width` over `.34s cubic-bezier(.2,.8,.2,1)` to the active button's `offsetLeft`/`offsetWidth` (recomputed on mount, update, and window resize). Buttons are transparent, `z-index` above the pill, height 38, `padding: 0 15px`, 13px/600, active text `#180e08`, inactive ink .6.
- **Category chips** (horizontally scrollable, `flex: 1 1 320px`, scrollbar hidden, edge mask `linear-gradient(90deg,transparent,#000 14px,#000 calc(100% - 22px),transparent)`): `★ Favorites`, `↺ Recent`, then the 10 emoji groups (icons: 😀 smileys-emotion, 👋 people-body, 🏻 component, 🌿 animals-nature, 🍓 food-drink, 🚀 travel-places, ⚽ activities, 💡 objects, ❤️ symbols, 🏳️ flags), then the 15 Lucide categories (each with its own icon, fallback ⚡). Emoji groups are hidden when the Icons filter is active and vice-versa. Chip: height 34, `padding: 0 14px`, radius 999, 12.5px, inactive border `.09` / fill `.04` / ink .6; active border `rgba(255,138,92,.55)` / fill `rgba(255,138,92,.16)` / text `#ffd0b8` / weight 600 / shadow `0 10px 24px -14px rgba(255,138,92,.9)`.

### 5. Results section (`id="ec-results"`)

`padding: 26px 0 clamp(180px,22vh,240px)` (bottom clearance for the dock).

- **Header row**: left column = kicker (10.5px, `.18em`, uppercase, `rgba(255,138,92,.8)`; text is "Best semantic matches" when searching, "Filtered view" with a category, else "Browse the catalog") over H2 (`“{query}”` / category label / "Every emoji" / "Every icon" / "Everything, ranked by meaning"). Right = mono `showing {n} of {total}` at ink .64.
- **Loading state**: centered, `padding: 70px 0`. 220×5 track (radius 99, fill `.08`) with a 28%-wide bar `linear-gradient(90deg,#ff8a5c,#9b8cff)` animating `ec-bar 1.15s cubic-bezier(.6,.1,.3,.9) infinite`; caption "Loading 3,953 emoji sequences and 1,777 vector icons…" at 13.5px ink .58.
- **Grid**: `display:grid; gap:10px; grid-template-columns: repeat(auto-fill, minmax({min}px, 1fr))` where `min` comes from tile size — **S 62px / M 84px / L 112px** (glyph font-size **24 / 33 / 46px**). `role="grid"`, `aria-label` = results title.
- **Tile** (`<button>`): `width:100%; aspect-ratio:1`, column layout centered, `gap:6px`, `padding:8px 6px`, radius 18, border `.07`, fill `.035`, `blur(12px)`, `overflow:hidden`. Hover: `translateY(-5px)`, fill `.1`, border `rgba(255,138,92,.5)`, shadow `0 18px 34px -16px rgba(255,138,92,.65)`, 240ms `cubic-bezier(.2,.8,.2,1)`. Contents: glyph span (emoji font, or inline SVG for icons) + name label (10.5px, ink .68, single line, ellipsis). `aria-label`/`title` = `"{name} · {category label}"`.
- **Tile info button**: absolute `top:6px right:6px`, 26×26, radius 999, border `.14`, bg `rgba(var(--ec-head-rgb),.6)`, ink .7, Bricolage 12px "i", `opacity:.3` → hover `opacity:1`, bg `#ff8a5c`, color `#180e08`. `aria-label` = "Details for {name}". Must stop propagation so it doesn't select the tile.
- **Progressive loading**: 240 items per page. A 1px sentinel after the grid is observed with `IntersectionObserver` (`rootMargin: 600px`) and appends the next 240. A manual fallback button "Show more ({n})" (height ~46, radius 15, border `.14`, fill `.06`) is always rendered while more remain.
- **Empty state**: centered card, `padding: clamp(40px,8vh,80px) 22px`, radius 26, border `.09`, fill `.035`, `blur(18px)`. 🧭 at 44px (opacity .8), H3, body (13.5px, ink .58, `max-width:44ch`), then the idea chips again in clay style (border `rgba(255,138,92,.32)`, fill `rgba(255,138,92,.12)`, text `#ffd0b8`).
  - Copy — no query: "Nothing here yet" / "Use an emoji or icon once and it shows up in this list."
  - Favorites empty: "No favorites yet" / "Open any tile's details and star it to pin it here."
  - No match: "Nothing matched “{query}”" / "Every word has to match, so try one idea at a time — a feeling, an object, or a shorter phrase."
- **Footer**: `padding-bottom: clamp(150px,18vh,200px)`, `display:flex; flex-wrap:wrap; gap:10px 24px; justify-content:space-between`, 12px, ink .62. Left: "Emoji 17.0 · CLDR 48 · Lucide 1.34 — every sequence kept byte-exact". Right: "No ads. No tracking. No account. Installable & offline."

### 6. Composer dock (fixed bottom, `z-index: 35`)

Outer wrapper: `left:0; right:0; bottom:0`, column, centered, `gap:10px`, `padding: 0 12px calc(14px + env(safe-area-inset-bottom))`, `pointer-events:none` (children re-enable). Panel: `width: min(100%,880px)`, `padding:12px`, radius 24, border `.13`, bg `rgba(var(--ec-panel-rgb),.72)`, `blur(28px) saturate(180%)`, shadow `0 30px 70px -26px rgba(var(--ec-shadow-rgb),.95)` + `inset 0 1px 0 rgba(var(--ec-surf-rgb),.13)`.

Row (`gap:10px`, wraps):

- **Message field**: `contenteditable="true"`, `role="textbox"`, `aria-label="Your message"`, `min-height:46px; max-height:120px; overflow-y:auto`, `padding:12px 14px`, radius 16, border `.1`, fill `.05`, 17px, `word-break: break-word`. Focus: border `rgba(255,138,92,.5)`, fill `.08`. Placeholder is an absolutely positioned span at `left:15px; top:13px`, 16px, ink .58, shown only while empty.
- **Char count**: mono chip, height 38, radius 12, `{n} char/chars`.
- **Undo `↺`** and **Clear `🗑`**: 44×44, radius 13, border `.1`, fill `.05`, ink .8; hover fill `.12` + `translateY(-1px)`.
- **Copy**: height 44, `padding: 0 20px`, radius 13, primary gradient, `#180e08` 13.5px/700, shadow `0 14px 30px -14px rgba(255,138,92,.95)`; hover `translateY(-2px)`, shadow `0 20px 40px -14px rgba(255,138,92,1)`. Trailing `⌘↵` mono keycap.
- All hit targets are ≥44×44 as required by the spec.

### 7. Preferences popover

Anchored `position: fixed; top: 74px; right: clamp(10px,3vw,26px)`, `z-index: 45`, `width: min(320px, calc(100vw - 20px))`, `padding:18px`, radius 22, border `.12`, bg `rgba(var(--ec-panel-rgb),.78)`, `blur(26px) saturate(170%)`, shadow `0 30px 70px -24px rgba(var(--ec-shadow-rgb),.9)` + inset highlight, entrance `ec-panel .3s cubic-bezier(.2,.8,.2,1)`. Sections `gap:18px`, each with a 10.5px `.16em` uppercase label at ink .58:

- **Tile size** — 3-up grid inside a `padding:4px` radius-14 track; active button gets `rgba(255,138,92,.9)` fill and `#180e08` text; labels S / M / L (12.5px/700).
- **Default skin tone** — 6 swatch buttons 44×44, radius 12 (`✋` default then 🏻🏼🏽🏾🏿), active border `rgba(255,138,92,.65)` + fill `rgba(255,138,92,.18)`. `aria-label`s: "Default tone", "light skin tone", "medium-light skin tone", "medium skin tone", "medium-dark skin tone", "dark skin tone".
- **Quick copy** — full-width toggle row, `padding:13px 14px`, radius 16; on-state border `rgba(87,227,196,.4)` and fill `rgba(87,227,196,.1)`. Title "Quick copy" (13.5px/600) + hint at ink .58: on = "Tiles copy straight to the clipboard", off = "Tiles build a message you copy once". Switch: 46×26 track (radius 999; on `rgba(87,227,196,.85)`, off `rgba(var(--ec-surf-rgb),.14)`), 20×20 knob at `top:3px`, `left: 3px → 23px` over `.25s cubic-bezier(.2,.8,.2,1)`, knob color `var(--ec-ink)` → `#07201c` when on.
- **Footnote** (11.5px, ink .58): "Everything is kept on this device — favorites, recents and preferences never leave the browser."

### 8. Details sheet (modal)

Scrim: `position:fixed; inset:0; z-index:50`, `background: rgba(var(--ec-deep-rgb),.66)`, `blur(10px)`, `animation: ec-fade .22s ease`, aligns content to `flex-end` (bottom sheet on every breakpoint). Clicking the scrim closes; clicks inside stop propagation.

Sheet: `role="dialog" aria-modal="true"`, `width: min(100%,720px)`, `max-height: min(88vh,880px)`, `overflow-y:auto`, `padding: clamp(20px,3vw,30px)`, radius `28px 28px 0 0`, no bottom border, bg `rgba(var(--ec-card-rgb),.86)`, `blur(30px) saturate(180%)`, shadow `0 -30px 80px -24px rgba(var(--ec-shadow-rgb),.95)`, entrance `ec-panel .32s cubic-bezier(.2,.8,.2,1)`.

- **Head row** (`gap:18px`): 86×86 glyph tile (radius 22, border `.1`, fill `.05`, 46px glyph) · column with category eyebrow (clay .85), H3 (`text-transform: capitalize`), and mono meta line at ink .58 · action pair (favorite ★ 40×40 with gold active state, close ✕ 40×40).
  - Emoji meta: `U+1F600 · Emoji 1 · :grinning:` (code points space-separated, each prefixed `U+`).
  - Icon meta: `a-arrow-down · Lucide 1.34 · 5 tags`.
- **All {n} variants** (when the family has skins): wrap of 54×54 buttons, radius 15, 26px glyph; hover `translateY(-3px) scale(1.06)`, fill `rgba(255,138,92,.16)`, border `rgba(255,138,92,.45)`. Capped at 40 in the prototype — the real app must expose every variant per the spec.
- **Also known as**: keyword pills (`padding:7px 12px`, radius 999, 12px, ink .66); hover fill `rgba(155,140,255,.18)`, text `#dcd6ff`. Tapping one runs it as a search.
- **Actions row** (`gap:9px`, height 46, `padding: 0 20px`, radius 14; primary = gradient + `#180e08`, secondary = fill `.05` + ink):
  - emoji: **Add to message** (primary), **Copy emoji**, **Copy shortcode**
  - icon: **Add to message** (primary), **Copy SVG**, **Copy JSX**, **Copy name**
- **Related** (same category, up to 12): section divider `1px solid rgba(var(--ec-surf-rgb),.08)` above, 52×52 tiles (radius 15, 24px glyph), hover `translateY(-3px)` + fill `.1`. Selecting one swaps the sheet's subject.

### 9. Toast

Sits directly above the dock, `pointer-events:auto`, `padding:11px 18px`, radius 999, `blur(20px) saturate(170%)`, 13px/600, shadow `0 20px 44px -22px rgba(var(--ec-shadow-rgb),.9)`, entrance `ec-toast .28s cubic-bezier(.2,.8,.2,1)`. `role="status"`. Success = mint palette with `✓`; error = clay/ember palette with `⚠`. Auto-dismiss after **2600ms** (timer resets on each new toast).

Messages: `{name} added`, `{name} copied`, `{name} SVG copied`, `Variant added`, `Variant copied`, `Message copied`, `SVG copied`, `JSX copied`, `Name copied`, `Shortcode copied`, `Nothing to undo`, `Add something to your message first`, `Copy blocked — press ⌘C to copy the selection`, `Copy blocked by the browser`, `Catalog failed to load — check your connection`.

---

## Interactions & Behavior

### Selecting
- Tile click → record in recents → if **quick copy** is on, copy immediately (emoji glyph, or the icon's SVG text) and toast; otherwise run the **fly** animation, append to the message, toast `{name} added`.
- Icons append `:{kebab-name}:` to the message (not the SVG).
- Emoji append the **tone-resolved glyph**: if a default tone is set and the family has that skin variant, that variant's exact glyph is used — never a modifier concatenated onto the base.

### Fly-to-dock animation
Clone the tile, fix it over its current rect, strip its background/shadow and give it a `1px solid rgba(255,138,92,.35)` border, append to `<body>` at `z-index: 60`. Animate to the dock in 3 keyframes over **560ms `cubic-bezier(.32,.86,.28,1)`**: `scale(1)` opacity 1 → at 60% `translate(dx*.6, dy-90)` `scale(.8)` opacity .95 → `translate(dx, dy)` `scale(.3)` opacity 0, then remove. `dx = (dockLeft + min(dockWidth*.28, 220)) - tileLeft`, `dy = (dockTop + 40) - tileTop`. Skipped entirely under reduced motion or when `Element.animate` is unavailable.

### Grid entrance
On mount and whenever `query | filter | category | size | tone` changes, animate the first **48** cells: `opacity 0, translateY(12px) scale(.94)` → none, **340ms**, `delay: min(index * 11, 420)ms`, `cubic-bezier(.2,.8,.2,1)`, `fill: backwards`.

### Counter roll
After the catalog loads, the two stat numbers ease from 0 to their totals over **900ms** with `1 - (1-t)³`. Reduced motion sets the final values immediately.

### Search
- Input is debounced **90ms** and capped at **120 characters**; every query resets the page limit to 240.
- Query normalization: NFKD, strip diacritics, lowercase, `_ - :` → space, drop everything that isn't a letter/number/`+`, collapse whitespace.
- Words are **unordered AND** constraints — a result must satisfy every token or it is dropped.
- Per-token score (lower is better), taken from the first matching rule: exact whole name `0` · name starts with token `2` · token is a whole word in the name `4` · substring of name `9` · whole word in the term blob `13` · substring of term blob `22`. The term blob is name + category label + keywords + shortcodes (icons: name + kebab + category + tags).
- Direct **glyph** paste or **`U+XXXX`** / raw code point match short-circuits to score `-10`.
- Ties break on catalog order, then emoji before icons.
- **Note:** the prototype's ranking is a simplified stand-in. The shipped `src/lib/search.ts` (intent aliases, bounded typo tolerance, alias-sharpening, gold-query tests) is the contract — keep it and only adopt the prototype's UI.

### Filtering
- Type filter switches the pool and **clears the active category**.
- Category chips toggle (tapping the active chip clears it). `fav` and `recent` pull from the stored id lists in stored order.

### Composer
- Undo keeps a **40-entry** history of message snapshots; empty history → error toast "Nothing to undo".
- Clear pushes the current value onto history first, so clear is undoable.
- Copy uses `navigator.clipboard.writeText`, falls back to a hidden `<textarea>` + `execCommand('copy')`, and on total failure toasts an actionable message with the content still selected. The message is **never auto-cleared** after copying.
- Char count uses `Array.from(msg).length` so multi-code-point sequences count as one.

### Keyboard
- `/` focuses and selects the search field (ignored while typing in an input/textarea/contenteditable); also scrolls to top.
- `Escape` closes, in priority order: details sheet → prefs popover → clears the query.
- `⌘/Ctrl + Enter` copies the message.
- Focus is visible everywhere via `:focus-visible` (2px clay ring, 3px offset). The sheet must trap focus and restore it to the invoking tile on close.

### Reduced motion
`prefers-reduced-motion: reduce` (or the `motion: "subtle"` prop) collapses all animations/transitions to `.01ms` via a global rule, disables parallax, the fly animation, the grid stagger, the counter roll, and switches smooth scrolling to instant.

### Responsive
- Single fluid column throughout; every measurement above is already `clamp()`-based. Verified at **320 / 390 / 768 / 1440 px**.
- The grid reflows purely on `auto-fill` — no breakpoints needed.
- Header truncates the wordmark before it wraps; filter row wraps the segmented control above the chip scroller on narrow screens; chips scroll horizontally with a masked edge.
- The dock is full-width minus 12px gutters and respects `env(safe-area-inset-bottom)`.
- The details sheet is a bottom sheet at every width, capped at 720px.

---

## State Management

Prototype state (map onto the existing app reducer):

| Key | Type | Notes |
|---|---|---|
| `loading` | boolean | true until both catalogs resolve |
| `q` | string | debounced query, ≤120 chars |
| `filter` | `'all' \| 'emoji' \| 'icon'` | resets `category` |
| `category` | `string \| null` | `'fav'`, `'recent'`, `'e{groupId}'`, `'i{categoryId}'` |
| `size` | `'small' \| 'medium' \| 'large'` | persisted |
| `tone` | `0–5` | 0 = default; persisted |
| `quick` | boolean | persisted |
| `theme` | `'night' \| 'day'` | persisted |
| `limit` | number | 240, +240 per page |
| `msgEmpty` / `msgLen` | boolean / number | mirror of the uncontrolled contenteditable |
| `prefsOpen` | boolean | |
| `details` | item id `\| null` | |
| `toast` / `toastKind` | string / `'ok' \| 'err'` | |
| `favs` / `recents` | string[] | persisted; recents capped at 48, newest first |
| `counts` / `shown` | `{emoji, icon}` | totals vs animated display values |

Non-render refs: the message string, the 40-entry undo history, `byId` lookup map, and the pill/aurora/sentinel DOM refs.

**Persistence** — single JSON blob under `localStorage["ec.compass.v1"]` holding `{ size, tone, quick, theme, favs, recents }`. Reads and writes are wrapped in try/catch and fall back to defaults, so corrupt or unavailable storage never breaks the app. **Never persist** the composer text or search history.

**Data fetching** — two parallel `fetch` calls at mount:
- `./data/emoji-en-17.0.json` — `{ source, emojiVersion, cldrVersion, locale, familyCount, variantCount, totalCount, groups[], subgroups[], emojis[], checksum }`; each family `{ id (code point), glyph, name, order, version, shortcodes[], group, subgroup, keywords[], variants[] }`.
- `./data/icons-1.34.json` — `{ source, version, totalCount, categories[], icons[], checksum }`; each icon `{ id, name, kebabName, pascalName, category, categoryLabel, tags[], nodes[] }` where `nodes` is `[tagName, attrs]` pairs.
Any failure → `loading: false` + error toast (the existing app's dedicated error screen should be kept).

Icons render as `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">` colored `var(--ec-icon)`. Copied SVG uses `width/height 24` and `stroke-width 2`.

---

## Design Tokens (quick reference)

- **Spacing scale used**: 2, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30px (+ fluid `clamp()` for section padding).
- **Radii**: 6 (keycap) · 10–11 (segment inner) · 12–13 (icon buttons, chips) · 14–16 (actions, message field) · 18 (tiles, stat cards) · 22 (search field, prefs, glyph tile) · 24 (dock) · 26 (empty card) · `28 28 0 0` (details sheet) · 999 (pills, toast, switch).
- **Glass recipe**: `background: rgba(var(--ec-surf-rgb), .035–.06)` + `border: 1px solid rgba(var(--ec-surf-rgb), .07–.14)` + `backdrop-filter: blur(12–30px) saturate(170–180%)` + `inset 0 1px 0 rgba(var(--ec-surf-rgb),.13–.14)`. Always pair with `-webkit-backdrop-filter`. For browsers without `backdrop-filter`, raise the fill alpha to a solid-translucent equivalent rather than dropping the effect.
- **Shadows**: `0 8px 22px -8px` (logo) · `0 10px 26px -12px` / `0 14px 30px -14px` / `0 20px 40px -14px` (accent buttons) · `0 18px 34px -16px` (tile hover) · `0 26px 60px -26px` (search) · `0 30px 70px -26px` (dock) · `0 -30px 80px -24px` (sheet) · `0 20px 44px -22px` (toast).
- **Easing**: `cubic-bezier(.2,.8,.2,1)` for UI motion, `cubic-bezier(.32,.86,.28,1)` for the fly, `cubic-bezier(.6,.1,.3,.9)` for the loading bar, `ease-in-out` for aurora drift.
- **Durations**: 200ms hovers · 240ms tiles · 250ms switch · 280–320ms overlays · 340ms grid cells · 340ms pill · 560ms fly · 600ms parallax · 900ms counters · 9–13s float · 26–38s aurora.
- **Keyframes**: `ec-a1/a2/a3` (aurora drift), `ec-float` (decor bob, `translateY(-16px)` + counter-rotate via `--r`), `ec-in` (18px rise + fade), `ec-fade`, `ec-panel` (24px rise + `scale(.96)`), `ec-toast` (14px rise + `scale(.96)`), `ec-bar` (loading sweep), `ec-sheen`, `ec-spin`.
- **Scrollbars**: 10px, thumb `rgba(255,255,255,.14)` radius 99, transparent track; chip rails hide theirs (`scrollbar-width: none`).

## Assets

- **No image assets.** All product marks are native emoji glyphs (🧭 wordmark, decorative 🫡 🪩 🩷 🫧) and Lucide path data from the catalog JSON.
- **Fonts**: Bricolage Grotesque, Plus Jakarta Sans, JetBrains Mono (Google Fonts in the prototype — self-host for production, see Typography).
- **Data**: both catalog JSONs are generated by the repo's own `scripts/generate-emoji-data.mjs` and `scripts/generate-icon-data.mjs`. Regenerate rather than hand-copying, and keep the checksum test.
- Emoji artwork is whatever the OS provides; no third-party emoji artwork is bundled (per `THIRD_PARTY_NOTICES.md`).

## Known discrepancies to resolve

1. **Icon count copy.** The design says "1,777 vector icons" — confirm against the generated catalog before shipping (earlier copy said 1,873).
2. **Variant cap.** The prototype caps the variant wall at 40 and related items at 12; the spec requires *every* valid variant to be reachable.
3. **Remote fonts** conflict with the spec's no-remote-font rule — self-host.
4. **Render style toggle** (native vs. text presentation) exists in the shipped app but is *not* in this design. Add it to the preferences popover using the same section pattern as Tile size.
5. **URL state.** The shipped app keeps query/category in the URL; the prototype does not. Keep the URL behavior.

## Files

| File | What it is |
|---|---|
| `Emoji Compass.dc.html` | The full high-fidelity prototype — every value in this README is in here. Open it in a browser with `support.js` and `data/` beside it. |
| `support.js` | Runtime needed only to open the prototype locally. Not part of the implementation. |
| `data/emoji-en-17.0.json` | Generated Emoji 17.0 catalog (1,923 families / 3,953 entries). |
| `data/icons-1.34.json` | Generated Lucide 1.34 catalog (1,777 icons / 15 categories). |

Target codebase for implementation: `emoji/` — see `docs/spec.md` (product contracts), `tasks/plan.md`, and `src/styles.css` (existing token layer to extend with the table above).
