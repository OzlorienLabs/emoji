// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { flattenCatalog } from '../data/catalog';
import type { EmojiCatalog } from '../data/catalog-types';
import {
  createSearchIndex,
  normalizeSearchText,
  searchEmojis,
  type EmojiSearchIndex,
} from './search';

let index: EmojiSearchIndex;

beforeAll(() => {
  const catalog = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data/emoji-en-17.0.json'), 'utf8'),
  ) as EmojiCatalog;
  index = createSearchIndex(flattenCatalog(catalog));
});

function glyphs(query: string, limit = 12): string[] {
  return searchEmojis(index, query, { limit }).map(({ emoji }) => emoji.glyph);
}

describe('normalizeSearchText', () => {
  it('folds case, accents, separators, punctuation, and whitespace', () => {
    expect(normalizeSearchText('  Côte_d’Ivoire: FLAG  ')).toBe('cote d ivoire flag');
  });

  it('preserves code point plus signs', () => {
    expect(normalizeSearchText('U+1F600')).toBe('u+1f600');
  });
});

describe('searchEmojis', () => {
  it('boosts exact multi-word names', () => {
    expect(glyphs('blue heart')[0]).toBe('💙');
    expect(glyphs('hot dog')[0]).toBe('🌭');
    expect(glyphs('flag japan')[0]).toBe('🇯🇵');
  });

  it('uses unordered AND semantics for multiple ideas', () => {
    const results = searchEmojis(index, 'love cat', { limit: 8 });

    expect(results[0]?.emoji.glyph).toBe('😻');
    expect(results.every(({ matchedTerms }) => matchedTerms.length === 2)).toBe(true);
    expect(glyphs('heart blue')[0]).toBe('💙');
  });

  it('expands conversational intent without weakening AND semantics', () => {
    const results = searchEmojis(index, 'happy dance', { limit: 10 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(({ emoji }) => /danc/.test(emoji.name))).toBe(true);
    expect(results.every(({ matchedTerms }) => matchedTerms.length === 2)).toBe(true);
  });

  it('uses bounded typo matching as a fallback', () => {
    expect(glyphs('celebrtion')).toEqual(expect.arrayContaining(['🥳', '🎉']));
  });

  it('finds exact glyphs, shortcodes, and code points', () => {
    expect(glyphs('😀')[0]).toBe('😀');
    expect(glyphs(':woman_dancing:')[0]).toBe('💃');
    expect(glyphs('U+1F600')[0]).toBe('😀');
  });

  it('surfaces an explicit requested skin-tone variant', () => {
    const results = searchEmojis(index, 'doctor dark skin', { limit: 20 });

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        ({ emoji }) => emoji.tone === 5 && /health worker/.test(emoji.name),
      ),
    ).toBe(true);
  });

  it('collapses unrequested tone variants into one family result', () => {
    const results = searchEmojis(index, 'waving hand', { limit: 20 });
    const waves = results.filter(({ emoji }) => emoji.familyId === '1F44B');

    expect(waves).toHaveLength(1);
    expect(waves[0]?.emoji.glyph).toBe('👋');
  });

  it('filters by group while preserving ranking', () => {
    const all = searchEmojis(index, 'blue', { limit: 50 });
    const symbols = searchEmojis(index, 'blue', { group: 8, limit: 50 });

    expect(all.length).toBeGreaterThan(symbols.length);
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols.every(({ emoji }) => emoji.group === 8)).toBe(true);
  });

  it('returns no irrelevant records when every token cannot match', () => {
    expect(searchEmojis(index, 'volcano spreadsheet apology')).toEqual([]);
  });

  it('is deterministic for repeated queries', () => {
    const first = searchEmojis(index, 'celebrate', { limit: 25 });
    const second = searchEmojis(index, 'celebrate', { limit: 25 });

    expect(second).toEqual(first);
  });

  it('keeps repeated full-catalog intent searches within the response budget', () => {
    const startedAt = performance.now();

    for (let iteration = 0; iteration < 20; iteration += 1) {
      searchEmojis(index, 'happy dance', { limit: 40 });
    }

    expect(performance.now() - startedAt).toBeLessThan(1_000);
  });
});
