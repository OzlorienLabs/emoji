import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The spec targets WCAG 2.2 AA: 4.5:1 for normal text and 3:1 for the
 * boundaries of active UI components and focus indicators.
 *
 * The interface is built from translucent glass, so almost no text colour is a
 * flat value: it is `rgb(var(--ec-ink-rgb) / var(--ec-a-*))` painted over a
 * panel that is itself `rgb(var(--ec-surf-rgb) / n%)` over the page. These
 * ratios are therefore a property of the token table plus the compositing
 * rules, and are asserted by parsing the stylesheet and compositing the layers
 * rather than by eye.
 */

const stylesheet = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

type Rgb = readonly [number, number, number];

function channelLuminance(channel: number): number {
  const ratio = channel / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([red, green, blue]: Rgb): number {
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const [lighter, darker] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((left, right) => right - left) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Paints `foreground` at `alpha` over `background` and returns the result. */
export function composite(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  return [0, 1, 2].map(
    (index) => foreground[index]! * alpha + background[index]! * (1 - alpha),
  ) as unknown as Rgb;
}

function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) =>
    Number.parseInt(value.slice(index, index + 2), 16),
  ) as unknown as Rgb;
}

/** Reads the custom properties declared by the first rule matching `selector`. */
function readTokens(selector: string): Record<string, string> {
  const start = stylesheet.indexOf(selector);
  expect(start, `missing selector ${selector}`).toBeGreaterThan(-1);
  const open = stylesheet.indexOf('{', start);
  const block = stylesheet.slice(open, stylesheet.indexOf('}', open));
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[name!] = value!.trim();
  }
  return tokens;
}

interface Theme {
  readonly tokens: Record<string, string>;
}

function tokenRgb(theme: Theme, name: string): Rgb {
  const value = theme.tokens[name];
  expect(value, `--${name}`).toBeDefined();
  if (value!.startsWith('#')) return hexToRgb(value!);
  // Channel triplets are space separated so they compose with the modern
  // `rgb(R G B / A)` syntax; a comma triplet there is invalid and is dropped
  // by the browser, so the separator is part of the contract.
  expect(value, `--${name} must be space separated`).not.toContain(',');
  const parts = value!.split(/\s+/).map(Number);
  expect(parts, `--${name}`).toHaveLength(3);
  return parts as unknown as Rgb;
}

function tokenAlpha(theme: Theme, name: string): number {
  const value = Number(theme.tokens[name]);
  expect(Number.isFinite(value), `--${name}`).toBe(true);
  return value;
}

/** Parses `rgb(R G B / N%)` into its colour and alpha. */
function parseRgbFunction(value: string): { rgb: Rgb; alpha: number } {
  const match = /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)%\s*\)/.exec(value);
  expect(match, `unparseable colour: ${value}`).not.toBeNull();
  const [, red, green, blue, alpha] = match!;
  return {
    rgb: [Number(red), Number(green), Number(blue)] as unknown as Rgb,
    alpha: Number(alpha) / 100,
  };
}

function tokenOverlay(theme: Theme, name: string, background: Rgb): Rgb {
  const { rgb, alpha } = parseRgbFunction(theme.tokens[name]!);
  return composite(rgb, alpha, background);
}

const themes: Record<string, Theme> = {
  daylight: { tokens: readTokens(':root {') },
  night: { tokens: readTokens(':root[data-theme="dark"]') },
};

/** Every rung of the glass ladder, plus the bare page. */
const GLASS_TOKENS = ['ec-fill-1', 'ec-fill-2', 'ec-fill-3', 'ec-fill-mute'] as const;

describe.each(Object.entries(themes))('%s palette', (_name, theme) => {
  const page = tokenRgb(theme, 'ec-bg');
  const ink = tokenRgb(theme, 'ec-ink-rgb');

  it('keeps every ink alpha at or above the design floor of .58', () => {
    for (const step of ['ec-a-strong', 'ec-a-body', 'ec-a-mute']) {
      expect(tokenAlpha(theme, step), `--${step}`).toBeGreaterThanOrEqual(0.58);
    }
  });

  it.each(['ec-a-strong', 'ec-a-body', 'ec-a-mute'])(
    'renders text at --%s over every rung of the glass ladder at AA',
    (step) => {
      const alpha = tokenAlpha(theme, step);
      const panels: ReadonlyArray<readonly [string, Rgb]> = [
        ['the page', page],
        ...GLASS_TOKENS.map(
          (token) => [token, tokenOverlay(theme, token, page)] as const,
        ),
      ];

      for (const [name, panel] of panels) {
        const text = composite(ink, alpha, panel);
        const ratio = contrastRatio(text, panel);
        expect(
          ratio,
          `--${step} (${alpha}) over ${name} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it('renders the full-strength ink on the page at AA', () => {
    expect(contrastRatio(tokenRgb(theme, 'ec-ink'), page)).toBeGreaterThanOrEqual(4.5);
  });

  it('renders the accent chip label on its own fill at AA', () => {
    const chip = tokenOverlay(theme, 'ec-accent-fill', page);
    const ratio = contrastRatio(tokenRgb(theme, 'ec-accent-text'), chip);
    expect(ratio, `accent chip label is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it('renders the section kicker and links on the page at AA', () => {
    for (const token of ['ec-kicker', 'ec-link', 'ec-link-hover']) {
      const ratio = contrastRatio(tokenRgb(theme, token), page);
      expect(ratio, `--${token} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('renders both toast palettes at AA', () => {
    for (const kind of ['ok', 'err'] as const) {
      const background = tokenOverlay(theme, `ec-toast-${kind}-bg`, page);
      const ratio = contrastRatio(tokenRgb(theme, `ec-toast-${kind}-text`), background);
      expect(ratio, `${kind} toast is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('renders the favorite star on its active fill at AA', () => {
    const fill = tokenOverlay(theme, 'ec-gold-fill', page);
    const ratio = contrastRatio(tokenRgb(theme, 'ec-gold'), fill);
    expect(ratio, `favorite star is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it('separates a control surface from the page it sits on', () => {
    // Glass hairlines are decorative; what identifies a control is that its
    // fill reads as a different material from the page behind it.
    const control = contrastRatio(tokenOverlay(theme, 'ec-fill-2', page), page);
    expect(control, `--ec-fill-2 against the page is ${control.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(1.1);
  });

  it('renders the focus ring and active control boundary against the page at 3:1', () => {
    const focus = contrastRatio(tokenRgb(theme, 'ec-focus'), page);
    expect(focus, `focus ring is ${focus.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);

    const line = contrastRatio(tokenOverlay(theme, 'ec-accent-line', page), page);
    expect(line, `active chip border is ${line.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });

  it('renders icon strokes and the quick-copy switch against the page at 3:1', () => {
    const icon = contrastRatio(tokenRgb(theme, 'ec-icon'), page);
    expect(icon, `icon stroke is ${icon.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);

    const knob = contrastRatio(tokenRgb(theme, 'ec-switch-on'), page);
    expect(knob, `switch track is ${knob.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });
});

describe('accent surfaces shared by both themes', () => {
  const base = themes.daylight!;
  const onAccent = tokenRgb(base, 'ec-on-accent');

  // Every stop of the primary button gradient, so the label reads across the
  // sweep. The darker brand-mark gradient carries only the compass glyph.
  it.each(['#ff9d6e', '#ff6f4d', '#f2603c'])(
    'renders the button label on %s at AA',
    (stop) => {
      const ratio = contrastRatio(onAccent, hexToRgb(stop));
      expect(ratio, `label on ${stop} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('renders the preference track label on the solid accent at AA', () => {
    // `rgb(255 138 92 / 90%)` over both page colours.
    for (const [name, theme] of Object.entries(themes)) {
      const fill = composite([255, 138, 92], 0.9, tokenRgb(theme, 'ec-bg'));
      const ratio = contrastRatio(onAccent, fill);
      expect(ratio, `${name} preference track is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('theme wiring', () => {
  it('keeps the system dark block in sync with the explicit dark theme', () => {
    expect(readTokens(':root[data-theme="system"]')).toEqual(themes.night!.tokens);
  });

  it('declares a colour-scheme for each theme so form controls follow', () => {
    expect(stylesheet).toContain('color-scheme: light;');
    expect(stylesheet).toContain('color-scheme: dark;');
  });

  it('never colours text with a raw ink alpha, only with the audited ladder', () => {
    const inkColours = stylesheet.matchAll(/color:\s*rgb\(var\(--ec-ink-rgb\)[^;]*;/g);
    for (const [declaration] of inkColours) {
      expect(declaration, declaration).toMatch(
        /var\(--ec-a-(?:full|strong|body|mute)\)/,
      );
    }
  });

  it('defaults to daylight, with night reached only by an explicit data-theme', () => {
    const rootStart = stylesheet.indexOf(':root {');
    const darkStart = stylesheet.indexOf(':root[data-theme="dark"]');
    expect(rootStart).toBeGreaterThan(-1);
    expect(darkStart).toBeGreaterThan(rootStart);
    expect(themes.daylight!.tokens['ec-bg']).toBe('#f4efe5');
    expect(themes.night!.tokens['ec-bg']).toBe('#07060c');
  });
});
