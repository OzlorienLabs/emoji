import type { IconRecord } from '../data/catalog-types';

export const MAX_UNDO_ENTRIES = 30;

export interface ComposerEdit {
  readonly value: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

export interface ComposerHistory {
  readonly value: string;
  readonly undoStack: readonly string[];
}

const COMBINING_MARK = /\p{Mark}/u;
const EMOJI_MODIFIER = /\p{Emoji_Modifier}/u;
const EMOJI_TAG = /[\u{e0020}-\u{e007f}]/u;
const EXTENDED_PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const REGIONAL_INDICATOR = /\p{Regional_Indicator}/u;

function isSelectionOffset(value: string, offset: number | null | undefined): offset is number {
  return (
    typeof offset === 'number' &&
    Number.isInteger(offset) &&
    offset >= 0 &&
    offset <= value.length
  );
}

export function insertAtSelection(
  value: string,
  insertion: string,
  selectionStart?: number | null,
  selectionEnd?: number | null,
): ComposerEdit {
  if (
    !isSelectionOffset(value, selectionStart) ||
    !isSelectionOffset(value, selectionEnd)
  ) {
    return appendToComposer(value, insertion);
  }

  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const nextValue = value.slice(0, start) + insertion + value.slice(end);
  const nextCaret = start + insertion.length;

  return {
    value: nextValue,
    selectionStart: nextCaret,
    selectionEnd: nextCaret,
  };
}

export function appendToComposer(value: string, insertion: string): ComposerEdit {
  const nextValue = value + insertion;
  const nextCaret = nextValue.length;

  return {
    value: nextValue,
    selectionStart: nextCaret,
    selectionEnd: nextCaret,
  };
}

export function createComposerHistory(value = ''): ComposerHistory {
  return { value, undoStack: [] };
}

export function commitComposerValue(
  history: ComposerHistory,
  nextValue: string,
): ComposerHistory {
  if (nextValue === history.value) {
    return history;
  }

  return {
    value: nextValue,
    undoStack: [...history.undoStack, history.value].slice(-MAX_UNDO_ENTRIES),
  };
}

export function undoComposer(history: ComposerHistory): ComposerHistory {
  const previousValue = history.undoStack.at(-1);
  if (previousValue === undefined) {
    return history;
  }

  return {
    value: previousValue,
    undoStack: history.undoStack.slice(0, -1),
  };
}

export function clearComposer(history: ComposerHistory): ComposerHistory {
  return commitComposerValue(history, '');
}

function extendsPreviousGrapheme(character: string): boolean {
  return (
    COMBINING_MARK.test(character) ||
    EMOJI_MODIFIER.test(character) ||
    EMOJI_TAG.test(character)
  );
}

function splitGraphemesFallback(value: string): string[] {
  const graphemes: string[] = [];
  let current = '';
  let regionalIndicatorCount = 0;
  let joinsNext = false;

  for (const character of value) {
    const isRegionalIndicator = REGIONAL_INDICATOR.test(character);
    const shouldJoin =
      current.length > 0 &&
      (joinsNext ||
        character === '\u200d' ||
        extendsPreviousGrapheme(character) ||
        (isRegionalIndicator && regionalIndicatorCount === 1) ||
        (current === '\r' && character === '\n'));

    if (shouldJoin) {
      current += character;
    } else {
      if (current) {
        graphemes.push(current);
      }
      current = character;
      regionalIndicatorCount = 0;
    }

    if (isRegionalIndicator) {
      regionalIndicatorCount += 1;
    }
    joinsNext = character === '\u200d';
  }

  if (current) {
    graphemes.push(current);
  }

  return graphemes;
}

export function splitGraphemes(value: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value), ({ segment }) => segment);
  }

  return splitGraphemesFallback(value);
}

export function countGraphemes(value: string): number {
  return splitGraphemes(value).length;
}

function isEmojiGrapheme(grapheme: string): boolean {
  return (
    EXTENDED_PICTOGRAPHIC.test(grapheme) ||
    REGIONAL_INDICATOR.test(grapheme) ||
    grapheme.includes('\u20e3')
  );
}

export function countSelectedEmojis(value: string): number {
  return splitGraphemes(value).filter(isEmojiGrapheme).length;
}

export interface ComposerToken {
  type: 'text' | 'icon';
  value: string;
  icon?: IconRecord;
}

export function parseComposerTokens(
  value: string,
  iconById?: ReadonlyMap<string, IconRecord>,
): readonly ComposerToken[] {
  if (!value) return [];
  const tokens: ComposerToken[] = [];
  const regex = /:([a-z0-9-]+):/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: value.slice(lastIndex, match.index),
      });
    }
    const iconName = match[1]!;
    const icon = iconById?.get(iconName);
    if (icon) {
      tokens.push({
        type: 'icon',
        value: match[0],
        icon,
      });
    } else {
      tokens.push({
        type: 'text',
        value: match[0],
      });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < value.length) {
    tokens.push({
      type: 'text',
      value: value.slice(lastIndex),
    });
  }

  return tokens;
}

export function countSelectedContent(
  value: string,
  iconById?: ReadonlyMap<string, IconRecord>,
): { emojiCount: number; iconCount: number; totalCount: number } {
  if (!value) {
    return { emojiCount: 0, iconCount: 0, totalCount: 0 };
  }

  const tokens = parseComposerTokens(value, iconById);
  let iconCount = 0;
  let textAccumulator = '';

  for (const token of tokens) {
    if (token.type === 'icon' && token.icon) {
      iconCount += 1;
    } else {
      textAccumulator += token.value;
    }
  }

  const emojiCount = countSelectedEmojis(textAccumulator);
  return {
    emojiCount,
    iconCount,
    totalCount: emojiCount + iconCount,
  };
}

export function formatSelectedCount(
  value: string,
  iconById?: ReadonlyMap<string, IconRecord>,
): string {
  const { emojiCount, iconCount } = countSelectedContent(value, iconById);

  if (emojiCount > 0 && iconCount > 0) {
    const emojiStr = `${emojiCount} ${emojiCount === 1 ? 'emoji' : 'emojis'}`;
    const iconStr = `${iconCount} ${iconCount === 1 ? 'icon' : 'icons'}`;
    return `${emojiStr}, ${iconStr} selected`;
  }

  if (iconCount > 0) {
    return `${iconCount} ${iconCount === 1 ? 'icon' : 'icons'} selected`;
  }

  return `${emojiCount} ${emojiCount === 1 ? 'emoji' : 'emojis'} selected`;
}

export function placeCaretAtEnd(element: HTMLElement) {
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
