// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EmojiCatalog } from './catalog-types';
import { flattenCatalog, getCodePointLabel, validateCatalog } from './catalog';

function readGeneratedCatalog(): EmojiCatalog {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data/emoji-en-17.0.json'), 'utf8'),
  ) as EmojiCatalog;
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
});
