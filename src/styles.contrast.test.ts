import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The spec targets WCAG 2.2 AA: 4.5:1 for normal text and 3:1 for the
 * boundaries of active UI components and focus indicators. These ratios are a
 * property of the palette, so they are asserted against the stylesheet itself
 * rather than a rendered tree.
 */

const stylesheet = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

function channelLuminance(channel: number): number {
  const ratio = channel / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const [red, green, blue] = [0, 2, 4].map((index) =>
    Number.parseInt(value.slice(index, index + 2), 16),
  ) as [number, number, number];
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((left, right) => right - left) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Reads the custom properties declared by the first rule matching `selector`. */
function readTokens(selector: string): Record<string, string> {
  const start = stylesheet.indexOf(selector);
  expect(start, `missing selector ${selector}`).toBeGreaterThan(-1);
  const block = stylesheet.slice(start, stylesheet.indexOf('}', start));
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[name!] = value!.trim();
  }
  return tokens;
}

const themes = {
  light: readTokens('.app-shell {'),
  dark: readTokens('.app-shell[data-theme="dark"] {'),
};

/** Normal-size text pairs, which must clear 4.5:1. */
const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['ink', 'page'],
  ['ink', 'surface'],
  ['ink', 'surface-strong'],
  ['ink', 'surface-muted'],
  ['ink-soft', 'page'],
  ['ink-soft', 'surface'],
  ['ink-soft', 'surface-muted'],
  ['ink-faint', 'page'],
  ['ink-faint', 'surface'],
  ['ink-faint', 'surface-muted'],
  ['accent-ink', 'accent'],
  ['accent-ink', 'accent-strong'],
  ['danger', 'page'],
  ['danger', 'surface-strong'],
  ['success', 'surface-strong'],
  ['ink', 'sky'],
];

/**
 * Non-text pairs: focus rings and control boundaries must clear 3:1. `--accent`
 * is only ever a fill drawn on a surface and always carries its own explicit
 * border, so its adjacency requirement is against that surface rather than the
 * page behind it.
 */
const UI_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['focus', 'page'],
  ['focus', 'surface'],
  ['line-strong', 'page'],
  ['line-strong', 'surface'],
  ['line-strong', 'surface-strong'],
  ['line-strong', 'surface-muted'],
  ['accent', 'surface-strong'],
];

describe.each(Object.entries(themes))('%s theme palette', (_name, tokens) => {
  it('declares every token as a usable colour', () => {
    for (const [token, value] of Object.entries(tokens)) {
      if (token === 'veil' || token === 'max-width') continue;
      expect(value, `--${token}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it.each(TEXT_PAIRS)('renders --%s on --%s at AA for normal text', (fg, bg) => {
    const ratio = contrastRatio(tokens[fg]!, tokens[bg]!);
    expect(
      ratio,
      `--${fg} (${tokens[fg]}) on --${bg} (${tokens[bg]}) is ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('renders --%s against --%s at AA for controls', (fg, bg) => {
    const ratio = contrastRatio(tokens[fg]!, tokens[bg]!);
    expect(
      ratio,
      `--${fg} (${tokens[fg]}) on --${bg} (${tokens[bg]}) is ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('theme wiring', () => {
  it('keeps the system dark block in sync with the explicit dark theme', () => {
    const systemDark = readTokens('.app-shell[data-theme="system"] {');
    expect(systemDark).toEqual(themes.dark);
  });

  it('declares a colour-scheme for each theme so form controls follow', () => {
    expect(stylesheet).toContain('color-scheme: light;');
    expect(stylesheet).toContain('color-scheme: dark;');
  });
});
