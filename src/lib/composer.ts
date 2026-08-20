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
