import type {
  EmojiFamily,
  EmojiStyle,
  EmojiTone,
  EmojiVariant,
  SkinTone,
} from '../data/catalog-types';

export type ToneSelection = 0 | SkinTone;

export interface ToneOption {
  value: ToneSelection;
  label: string;
}

const TONE_LABELS: Readonly<Record<ToneSelection, string>> = {
  0: 'Default',
  1: 'Light skin tone',
  2: 'Medium-light skin tone',
  3: 'Medium skin tone',
  4: 'Medium-dark skin tone',
  5: 'Dark skin tone',
};

export const TONE_OPTIONS: readonly ToneOption[] = ([0, 1, 2, 3, 4, 5] as const).map(
  (value) => ({ value, label: TONE_LABELS[value] }),
);

export function getToneLabel(tone: ToneSelection): string {
  return TONE_LABELS[tone];
}

export function isUniformTone(
  tone: EmojiTone | undefined,
  selectedTone: SkinTone,
): boolean {
  return (
    Array.isArray(tone) &&
    tone.length > 0 &&
    tone.every((value) => value === selectedTone)
  );
}

export function isMixedTone(tone: EmojiTone | undefined): boolean {
  return (
    Array.isArray(tone) &&
    tone.length > 1 &&
    tone.some((value) => value !== tone[0])
  );
}

export function getVariantToneLabel(tone: EmojiTone | undefined): string {
  if (tone === undefined) {
    return getToneLabel(0);
  }

  if (typeof tone === 'number') {
    return getToneLabel(tone);
  }

  if (tone.length === 0) {
    return getToneLabel(0);
  }

  if (!isMixedTone(tone)) {
    return getToneLabel(tone[0]!);
  }

  return tone.map(getToneLabel).join(' + ');
}

export function getFamilyVariants(family: EmojiFamily): EmojiVariant[] {
  return [family, ...family.variants].sort((left, right) => left.order - right.order);
}

export function selectToneVariant(
  family: EmojiFamily,
  selectedTone: ToneSelection,
): EmojiVariant {
  if (selectedTone === 0) {
    return family;
  }

  const uniform = family.variants.find(({ tone }) =>
    isUniformTone(tone, selectedTone),
  );
  const scalar = family.variants.find(({ tone }) => tone === selectedTone);

  return uniform ?? scalar ?? family;
}

export function getDisplayGlyph(emoji: EmojiVariant, style: EmojiStyle): string {
  return style === 'text' ? emoji.textGlyph ?? emoji.glyph : emoji.glyph;
}

export function getCopyGlyph(emoji: EmojiVariant): string {
  return emoji.glyph;
}
