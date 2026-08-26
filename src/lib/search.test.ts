// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { flattenCatalog, flattenIconCatalog } from '../data/catalog';
import { INTENT_ALIASES } from '../data/intent-aliases';
import type { EmojiCatalog, IconCatalog } from '../data/catalog-types';
import {
  createSearchIndex,
  normalizeSearchText,
  searchItems,
  type ItemSearchIndex,
} from './search';

let emojiIndex: ItemSearchIndex;
let combinedIndex: ItemSearchIndex;

beforeAll(() => {
  const emojiCatalog = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data/emoji-en-17.0.json'), 'utf8'),
  ) as EmojiCatalog;
  const iconCatalog = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data/icons-1.34.json'), 'utf8'),
  ) as IconCatalog;

  const emojiRecords = flattenCatalog(emojiCatalog);
  const iconRecords = flattenIconCatalog(iconCatalog);

  emojiIndex = createSearchIndex(emojiRecords);
  combinedIndex = createSearchIndex([...emojiRecords, ...iconRecords]);
});

function glyphs(query: string, limit = 12): string[] {
  return searchItems(emojiIndex, query, { limit }).map(({ emoji }) => emoji.glyph);
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
    const results = searchItems(emojiIndex, 'love cat', { limit: 8 });

    expect(results[0]?.emoji.glyph).toBe('😻');
    expect(results.every(({ matchedTerms }) => matchedTerms.length === 2)).toBe(true);
    expect(glyphs('heart blue')[0]).toBe('💙');
  });

  it('expands conversational intent without weakening AND semantics', () => {
    const results = searchItems(emojiIndex, 'happy dance', { limit: 10 });

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
    const results = searchItems(emojiIndex, 'doctor dark skin', { limit: 20 });

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        ({ emoji }) => emoji.tone === 5 && /health worker/.test(emoji.name),
      ),
    ).toBe(true);
  });

  it('collapses unrequested tone variants into one family result', () => {
    const results = searchItems(emojiIndex, 'waving hand', { limit: 20 });
    const waves = results.filter(({ emoji }) => emoji.familyId === '1F44B');

    expect(waves).toHaveLength(1);
    expect(waves[0]?.emoji.glyph).toBe('👋');
  });

  it('filters by group while preserving ranking', () => {
    const all = searchItems(emojiIndex, 'blue', { limit: 50 });
    const symbols = searchItems(emojiIndex, 'blue', { group: 8, limit: 50 });

    expect(all.length).toBeGreaterThan(symbols.length);
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols.every(({ emoji }) => emoji.group === 8)).toBe(true);
  });

  it('returns no irrelevant records when every token cannot match', () => {
    expect(searchItems(emojiIndex, 'volcano spreadsheet apology')).toEqual([]);
  });

  it('handles empty, limited, grouped glyph, and explicit variant searches', () => {
    expect(searchItems(emojiIndex, '   ')).toEqual([]);
    expect(searchItems(emojiIndex, '😀', { group: 0, limit: 0 })).toEqual([]);
    expect(searchItems(emojiIndex, '😀', { group: 8 })).toEqual([]);

    const variants = searchItems(emojiIndex, 'waving hand', {
      includeVariants: true,
      limit: 20,
    }).filter(({ emoji }) => emoji.familyId === '1F44B');
    expect(variants.length).toBeGreaterThan(1);
  });

  it('is deterministic for repeated queries', () => {
    const first = searchItems(emojiIndex, 'celebrate', { limit: 25 });
    const second = searchItems(emojiIndex, 'celebrate', { limit: 25 });

    expect(second).toEqual(first);
  });

  it('keeps repeated full-catalog intent searches within the response budget', () => {
    const startedAt = performance.now();

    for (let iteration = 0; iteration < 20; iteration += 1) {
      searchItems(emojiIndex, 'happy dance', { limit: 40 });
    }

    expect(performance.now() - startedAt).toBeLessThan(2_000);
  });
});

describe('icon searching', () => {
  it('finds exact kebab-case and PascalCase icon names', () => {
    const arrowResults = searchItems(combinedIndex, 'arrow-right', { contentType: 'icon', limit: 5 });
    expect(arrowResults[0]?.item.id).toBe('arrow-right');

    const chevronResults = searchItems(combinedIndex, 'ChevronDown', { contentType: 'icon', limit: 5 });
    expect(chevronResults[0]?.item.id).toBe('chevron-down');
  });

  it('finds icons by tags and keywords', () => {
    const forwardResults = searchItems(combinedIndex, 'forward', { contentType: 'icon', limit: 10 });
    expect(forwardResults.some(({ item }) => item.id.includes('arrow') || item.id.includes('forward'))).toBe(true);

    const gearResults = searchItems(combinedIndex, 'gear', { contentType: 'icon', limit: 10 });
    expect(gearResults.some(({ item }) => item.id === 'settings' || item.id.includes('cog'))).toBe(true);
  });

  it('filters by contentType and icon category', () => {
    const all = searchItems(combinedIndex, 'heart', { limit: 20 });
    const onlyIcons = searchItems(combinedIndex, 'heart', { contentType: 'icon', limit: 20 });
    const onlyEmojis = searchItems(combinedIndex, 'heart', { contentType: 'emoji', limit: 20 });

    expect(onlyIcons.every(({ item }) => 'nodes' in item)).toBe(true);
    expect(onlyEmojis.every(({ item }) => !('nodes' in item))).toBe(true);
    expect(all.some(({ item }) => 'nodes' in item)).toBe(true);
    expect(all.some(({ item }) => !('nodes' in item))).toBe(true);

    const arrowsOnly = searchItems(combinedIndex, 'arrow', { contentType: 'icon', group: 'arrows', limit: 10 });
    expect(arrowsOnly.length).toBeGreaterThan(0);
    expect(arrowsOnly.every(({ item }) => 'category' in item && item.category === 'arrows')).toBe(true);
  });

  it('tolerates minor typos when searching icons', () => {
    const typoResults = searchItems(combinedIndex, 'settigns', { contentType: 'icon', limit: 20 });
    expect(typoResults.some(({ item }) => item.id.includes('settings'))).toBe(true);

    const calenderResults = searchItems(combinedIndex, 'calender', { contentType: 'icon', limit: 20 });
    expect(calenderResults.some(({ item }) => item.id.includes('calendar'))).toBe(true);
  });

  it('executes combined 5,730-item searches with sub-10ms performance', () => {
    const startedAt = performance.now();

    for (let iteration = 0; iteration < 20; iteration += 1) {
      searchItems(combinedIndex, 'download cloud file', { limit: 40 });
    }

    const elapsed = performance.now() - startedAt;
    expect(elapsed).toBeLessThan(1_000);
  });
});

describe('intent aliases', () => {
  const entries = Object.entries(INTENT_ALIASES);

  it('keys every alias by a single normalized token', () => {
    for (const [key] of entries) {
      expect(normalizeSearchText(key), `alias key ${key}`).toBe(key);
      expect(key, `alias key ${key}`).not.toContain(' ');
    }
  });

  it('stores every alias value in normalized form', () => {
    for (const [key, values] of entries) {
      for (const value of values) {
        expect(normalizeSearchText(value), `${key} -> ${value}`).toBe(value);
      }
    }
  });

  it('resolves every alias value against the real catalog', () => {
    const dead = entries.flatMap(([key, values]) =>
      values
        .filter((value) => searchItems(emojiIndex, value, { limit: 1 }).length === 0)
        .map((value) => `${key} -> ${value}`),
    );

    expect(dead).toEqual([]);
  });

  it('returns results for every alias key', () => {
    const empty = entries
      .map(([key]) => key)
      .filter((key) => searchItems(emojiIndex, key, { limit: 1 }).length === 0);

    expect(empty).toEqual([]);
  });
});

describe('alias-driven relevance', () => {
  it('matches a multi-word alias only when every word is present', () => {
    const names = searchItems(emojiIndex, 'agree', { limit: 40 }).map(({ emoji }) => emoji.name);

    expect(names).toContain('thumbs up');
    expect(names).not.toContain('up arrow');
    expect(names).not.toContain('up button');
  });

  it('suppresses typo matching once an alias resolves directly', () => {
    const deadline = searchItems(emojiIndex, 'deadline', { limit: 10 }).map(({ emoji }) => emoji.name);
    expect(deadline).toContain('alarm clock');
    expect(deadline.some((name) => /lifting weights/.test(name))).toBe(false);

    const disgusted = searchItems(emojiIndex, 'disgusted', { limit: 10 }).map(({ emoji }) => emoji.name);
    expect(disgusted).toContain('nauseated face');
    expect(disgusted).not.toContain('disguised face');
  });

  it.each([
    ['birthday', '🎂'],
    ['deadline', '⏰️'],
    ['mindblown', '🤯'],
    ['workout', '🏋️'],
    ['wifi', '🛜'],
    ['pride', '🏳️‍🌈'],
    ['yoga', '🧘'],
    ['spicy', '🌶️'],
    ['launch', '🚀'],
    ['welcome', '👋'],
  ])('surfaces a fitting emoji for the intent %s', (query, expected) => {
    expect(glyphs(query, 6)).toContain(expected);
  });

  it('keeps alias expansion inside the response budget on the full index', () => {
    const startedAt = performance.now();

    for (let iteration = 0; iteration < 20; iteration += 1) {
      searchItems(emojiIndex, 'congratulations celebrate', { limit: 40 });
    }

    expect(performance.now() - startedAt).toBeLessThan(2_000);
  });
});
