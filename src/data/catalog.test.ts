// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EmojiCatalog, IconCatalog } from './catalog-types';
import {
  flattenCatalog,
  flattenIconCatalog,
  getCodePointLabel,
  getIconHtml,
  getIconJsx,
  getIconSvg,
  validateCatalog,
  validateIconCatalog,
} from './catalog';

function readGeneratedCatalog(): EmojiCatalog {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data/emoji-en-17.0.json'), 'utf8'),
  ) as EmojiCatalog;
}

function readGeneratedIconCatalog(): IconCatalog {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data/icons-1.34.json'), 'utf8'),
  ) as IconCatalog;
}

describe('generated Emoji 17 catalog', () => {
  it('contains every ordered RGI entry exactly once', () => {
    const catalog = readGeneratedCatalog();
    const records = flattenCatalog(catalog);

    expect(catalog.source).toBe('emojibase-data@17.0.0');
    expect(catalog.emojiVersion).toBe('17.0');
    expect(catalog.cldrVersion).toBe('48');
    expect(catalog.familyCount).toBe(1_923);
    expect(catalog.variantCount).toBe(2_030);
    expect(catalog.totalCount).toBe(3_953);
    expect(records).toHaveLength(3_953);
    expect(new Set(records.map(({ id }) => id)).size).toBe(3_953);
    expect(new Set(records.map(({ glyph }) => glyph)).size).toBe(3_953);
  });

  it('keeps all ten groups in Unicode order', () => {
    const catalog = readGeneratedCatalog();
    const records = flattenCatalog(catalog);
    const totals = catalog.groups.map(
      ({ id }) => records.filter(({ group }) => group === id).length,
    );

    expect(catalog.groups.map(({ label }) => label)).toEqual([
      'Smileys & emotion',
      'People & body',
      'Components',
      'Animals & nature',
      'Food & drink',
      'Travel & places',
      'Activities',
      'Objects',
      'Symbols',
      'Flags',
    ]);
    expect(totals).toEqual([171, 2_418, 9, 160, 131, 219, 85, 266, 224, 270]);
  });

  it('inherits family metadata for variants and creates rich search terms', () => {
    const catalog = readGeneratedCatalog();
    const records = flattenCatalog(catalog);
    const darkWave = records.find(({ glyph }) => glyph === '👋🏿');

    expect(darkWave).toMatchObject({
      familyId: '1F44B',
      name: 'waving hand: dark skin tone',
      groupLabel: 'People & body',
      subgroupLabel: 'Fingers open',
      tone: 5,
    });
    expect(darkWave?.searchTerms).toEqual(
      expect.arrayContaining(['bye', 'hello', 'wave', 'dark skin tone', 'people body']),
    );
    expect(records.every(({ searchTerms }) => searchTerms.length >= 3)).toBe(true);
  });

  it('validates generated metadata without issues', () => {
    expect(validateCatalog(readGeneratedCatalog())).toEqual([]);
  });

  it('formats a searchable Unicode code point label', () => {
    expect(getCodePointLabel('1F468-200D-1F4BB')).toBe('U+1F468 U+200D U+1F4BB');
  });

  it('uses readable fallback labels for unknown generated groups', () => {
    const catalog = readGeneratedCatalog();
    const first = catalog.emojis[0]!;
    const isolated: EmojiCatalog = {
      ...catalog,
      familyCount: 1,
      variantCount: 0,
      totalCount: 1,
      groups: [],
      subgroups: [],
      emojis: [{ ...first, group: 999, subgroup: 999, variants: [] }],
    };

    expect(flattenCatalog(isolated)[0]).toMatchObject({
      groupLabel: 'Other',
      subgroupLabel: 'Other',
    });
  });
});

describe('generated Lucide icon catalog', () => {
  it('contains every ordered icon entry with nodes and tags', () => {
    const iconCatalog = readGeneratedIconCatalog();
    const records = flattenIconCatalog(iconCatalog);

    expect(iconCatalog.source).toBe('lucide-static@1.34.0');
    expect(iconCatalog.totalCount).toBe(1_777);
    expect(records).toHaveLength(1_777);
    expect(new Set(records.map(({ id }) => id)).size).toBe(1_777);
    expect(iconCatalog.categories.length).toBeGreaterThan(5);
  });

  it('generates rich search terms for icons including name, tags, and category', () => {
    const iconCatalog = readGeneratedIconCatalog();
    const records = flattenIconCatalog(iconCatalog);
    const arrow = records.find(({ id }) => id === 'arrow-right');

    expect(arrow).toBeDefined();
    expect(arrow?.kind).toBe('icon');
    expect(arrow?.searchTerms).toEqual(
      expect.arrayContaining(['arrow right', 'arrow', 'right', 'arrowright', 'forward', 'next', 'direction']),
    );
  });

  it('validates generated icon metadata without issues', () => {
    expect(validateIconCatalog(readGeneratedIconCatalog())).toEqual([]);
  });

  it('formats SVG, JSX, and HTML tags accurately', () => {
    const iconCatalog = readGeneratedIconCatalog();
    const arrow = iconCatalog.icons.find(({ id }) => id === 'arrow-right')!;

    const svg = getIconSvg(arrow, { size: 32, strokeWidth: 1.5 });
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"');
    expect(svg).toContain('stroke-width="1.5"');
    expect(svg).toContain('<path');
    expect(getIconSvg(arrow)).toContain('width="24"');

    const jsx = getIconJsx(arrow, { size: 24, strokeWidth: 2 });
    expect(jsx).toBe('<ArrowRight size={24} strokeWidth={2} />');
    expect(getIconJsx(arrow)).toBe('<ArrowRight />');

    const html = getIconHtml(arrow);
    expect(html).toBe('<i data-lucide="arrow-right"></i>');
  });
});

describe('catalog validation', () => {
  it('reports inconsistent counts, duplicates, and missing labels', () => {
    const catalog = readGeneratedCatalog();
    const first = catalog.emojis[0];
    expect(first).toBeDefined();

    const invalid: EmojiCatalog = {
      ...catalog,
      familyCount: 99,
      totalCount: 99,
      emojis: [
        { ...first!, name: '', keywords: [], shortcodes: [], variants: [] },
        first!,
      ],
    };

    expect(validateCatalog(invalid)).toEqual(
      expect.arrayContaining([
        'Family count does not match catalog metadata.',
        'Total count does not match catalog metadata.',
        'Emoji IDs must be unique.',
        'Every emoji needs a name.',
      ]),
    );
  });

  it('reports invalid icon catalogs', () => {
    const iconCatalog = readGeneratedIconCatalog();
    const first = iconCatalog.icons[0]!;

    const invalid: IconCatalog = {
      ...iconCatalog,
      totalCount: 99,
      icons: [
        { ...first, name: '', nodes: [] },
        first,
      ],
    };

    expect(validateIconCatalog(invalid)).toEqual(
      expect.arrayContaining([
        'Total count does not match icons list length.',
        'Icon IDs must be unique.',
        'Every icon needs a name.',
        'Every icon needs at least one SVG node.',
      ]),
    );
  });
});
