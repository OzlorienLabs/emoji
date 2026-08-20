// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type {
  EmojiFamily,
  EmojiTone,
  EmojiVariant,
  SkinTone,
} from '../data/catalog-types';
import {
  TONE_OPTIONS,
  getCopyGlyph,
  getDisplayGlyph,
  getFamilyVariants,
  getToneLabel,
  getVariantToneLabel,
  isMixedTone,
  isUniformTone,
  selectToneVariant,
} from './variants';

function variant(
  id: string,
  glyph: string,
  order: number,
  tone?: EmojiTone,
  textGlyph?: string,
): EmojiVariant {
  return {
    id,
    glyph,
    ...(textGlyph === undefined ? {} : { textGlyph }),
    name: id,
    order,
    version: 1,
    ...(tone === undefined ? {} : { tone }),
    shortcodes: [],
  };
}

function family(
  variants: readonly EmojiVariant[],
  overrides: Partial<EmojiFamily> = {},
): EmojiFamily {
  return {
    ...variant('base', '🖐️', 10),
    group: 1,
    subgroup: 1,
    keywords: [],
    variants,
    ...overrides,
  };
}

describe('selectToneVariant', () => {
  it('returns the family record for the default tone', () => {
    const emojiFamily = family([variant('tone-1', '🖐🏻', 11, 1)]);

    expect(selectToneVariant(emojiFamily, 0)).toBe(emojiFamily);
  });

  it('returns the exact nested scalar-tone record', () => {
    const medium = variant('tone-3', '🖐🏽', 13, 3);
    const emojiFamily = family([
      variant('tone-1', '🖐🏻', 11, 1),
      medium,
      variant('tone-5', '🖐🏿', 15, 5),
    ]);

    expect(selectToneVariant(emojiFamily, 3)).toBe(medium);
  });

  it('returns the base instead of constructing an unavailable tone', () => {
    const emojiFamily = family([variant('tone-1', '🖐🏻', 11, 1)]);

    expect(selectToneVariant(emojiFamily, 5)).toBe(emojiFamily);
    expect(selectToneVariant(emojiFamily, 5).glyph).toBe('🖐️');
  });

  it('prefers an exact uniform array for a multi-tone family', () => {
    const scalar = variant('scalar-3', 'scalar', 11, 3);
    const uniform = variant('uniform-3', 'uniform', 12, [3, 3]);
    const emojiFamily = family([
      scalar,
      variant('mixed-3-4', 'mixed', 13, [3, 4]),
      uniform,
    ]);

    expect(selectToneVariant(emojiFamily, 3)).toBe(uniform);
  });

  it('returns the base when a multi-tone family has no uniform match', () => {
    const emojiFamily = family([
      variant('mixed-1-2', 'mixed', 11, [1, 2]),
      variant('mixed-2-1', 'mixed-reversed', 12, [2, 1]),
    ]);

    expect(selectToneVariant(emojiFamily, 1)).toBe(emojiFamily);
  });
});

describe('getFamilyVariants', () => {
  it('returns the base and every nested record in Unicode catalog order', () => {
    const late = variant('late', 'c', 30);
    const early = variant('early', 'a', 10);
    const emojiFamily = family([late, early], { id: 'middle', glyph: 'b', order: 20 });

    expect(getFamilyVariants(emojiFamily)).toEqual([early, emojiFamily, late]);
  });

  it('does not mutate the catalog variant array while sorting', () => {
    const late = variant('late', 'c', 30);
    const early = variant('early', 'a', 10);
    const nested = [late, early];
    const emojiFamily = family(nested, { order: 20 });

    getFamilyVariants(emojiFamily);

    expect(emojiFamily.variants).toEqual([late, early]);
  });
});

describe('display and copy glyphs', () => {
  it('uses a supplied text presentation only for text display', () => {
    const emoji = variant('heart', '❤️', 1, undefined, '❤︎');

    expect(getDisplayGlyph(emoji, 'native')).toBe('❤️');
    expect(getDisplayGlyph(emoji, 'text')).toBe('❤︎');
    expect(getCopyGlyph(emoji)).toBe('❤️');
  });

  it('falls back to the native glyph when no text presentation exists', () => {
    const emoji = variant('wave', '👋', 1);

    expect(getDisplayGlyph(emoji, 'text')).toBe('👋');
    expect(getCopyGlyph(emoji)).toBe('👋');
  });
});

describe('tone metadata', () => {
  it('provides ordered labels for the global tone control', () => {
    expect(TONE_OPTIONS).toEqual([
      { value: 0, label: 'Default' },
      { value: 1, label: 'Light skin tone' },
      { value: 2, label: 'Medium-light skin tone' },
      { value: 3, label: 'Medium skin tone' },
      { value: 4, label: 'Medium-dark skin tone' },
      { value: 5, label: 'Dark skin tone' },
    ]);
  });

  it.each<[0 | SkinTone, string]>([
    [0, 'Default'],
    [1, 'Light skin tone'],
    [2, 'Medium-light skin tone'],
    [3, 'Medium skin tone'],
    [4, 'Medium-dark skin tone'],
    [5, 'Dark skin tone'],
  ])('labels tone %s as %s', (tone, label) => {
    expect(getToneLabel(tone)).toBe(label);
  });

  it('distinguishes mixed arrays from scalar and uniform tones', () => {
    expect(isMixedTone([1, 5])).toBe(true);
    expect(isMixedTone([3, 3])).toBe(false);
    expect(isMixedTone(3)).toBe(false);
    expect(isMixedTone(undefined)).toBe(false);
    expect(isUniformTone([3, 3], 3)).toBe(true);
    expect(isUniformTone([3, 4], 3)).toBe(false);
    expect(isUniformTone(3, 3)).toBe(false);
  });

  it('creates accessible labels for scalar, uniform, and mixed tone records', () => {
    expect(getVariantToneLabel(undefined)).toBe('Default');
    expect(getVariantToneLabel([])).toBe('Default');
    expect(getVariantToneLabel(2)).toBe('Medium-light skin tone');
    expect(getVariantToneLabel([4, 4])).toBe('Medium-dark skin tone');
    expect(getVariantToneLabel([1, 5])).toBe(
      'Light skin tone + Dark skin tone',
    );
  });
});
