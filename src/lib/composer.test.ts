import { describe, expect, it } from 'vitest';
import {
  MAX_UNDO_ENTRIES,
  appendToComposer,
  clearComposer,
  commitComposerValue,
  countGraphemes,
  countSelectedEmojis,
  createComposerHistory,
  insertAtSelection,
  undoComposer,
} from './composer';

describe('insertAtSelection', () => {
  it('replaces a UTF-16 textarea selection and returns the collapsed next caret', () => {
    const family = '👨‍👩‍👧‍👦';

    const result = insertAtSelection('A🙂B', family, 1, 3);

    expect(result).toEqual({
      value: `A${family}B`,
      selectionStart: 1 + family.length,
      selectionEnd: 1 + family.length,
    });
  });

  it('inserts text at a caret without normalizing variation selectors or ZWJ sequences', () => {
    const exactSequence = '🏳️‍🌈';

    const result = insertAtSelection('hello world', exactSequence, 6, 6);

    expect(result.value).toBe(`hello ${exactSequence}world`);
    expect(result.value.slice(6, result.selectionStart)).toBe(exactSequence);
  });

  it('normalizes reversed but otherwise valid selection offsets', () => {
    expect(insertAtSelection('abcd', '🙂', 3, 1)).toEqual({
      value: 'a🙂d',
      selectionStart: 3,
      selectionEnd: 3,
    });
  });

  it('appends when textarea selection offsets are unavailable or invalid', () => {
    expect(insertAtSelection('ready ', '👍🏽')).toEqual({
      value: 'ready 👍🏽',
      selectionStart: 'ready 👍🏽'.length,
      selectionEnd: 'ready 👍🏽'.length,
    });
    expect(insertAtSelection('ready ', '✅', -1, 100).value).toBe('ready ✅');
    expect(insertAtSelection('abc', 'x', 1.5, 2).value).toBe('abcx');
    expect(insertAtSelection('abc', 'x', 0, 4).value).toBe('abcx');
  });
});

describe('appendToComposer', () => {
  it('appends duplicates exactly as selected', () => {
    expect(appendToComposer('🎉', '🎉')).toEqual({
      value: '🎉🎉',
      selectionStart: '🎉🎉'.length,
      selectionEnd: '🎉🎉'.length,
    });
  });
});

describe('composer history', () => {
  it('records edits and undoes them in order', () => {
    const initial = createComposerHistory('🙂');
    const edited = commitComposerValue(initial, '🙂 hello');
    const editedAgain = commitComposerValue(edited, '🙂 hello 🎉');

    expect(undoComposer(editedAgain)).toEqual(edited);
  });

  it('does not record an unchanged value', () => {
    const history = createComposerHistory('same');

    expect(commitComposerValue(history, 'same')).toBe(history);
    expect(undoComposer(history)).toBe(history);
  });

  it('keeps only the newest thirty undo entries', () => {
    let history = createComposerHistory();

    for (let index = 1; index <= MAX_UNDO_ENTRIES + 2; index += 1) {
      history = commitComposerValue(history, String(index));
    }

    expect(history.undoStack).toHaveLength(MAX_UNDO_ENTRIES);
    expect(history.undoStack[0]).toBe('2');
    expect(history.undoStack.at(-1)).toBe(String(MAX_UNDO_ENTRIES + 1));
  });

  it('clears content as an undoable edit and leaves empty content unchanged', () => {
    const populated = createComposerHistory('👩🏽‍💻 notes');
    const cleared = clearComposer(populated);

    expect(cleared.value).toBe('');
    expect(undoComposer(cleared).value).toBe('👩🏽‍💻 notes');
    expect(clearComposer(createComposerHistory())).toEqual(createComposerHistory());
  });
});

describe('grapheme-safe counts', () => {
  it('counts ZWJ, skin-tone, flag, and combining sequences as single graphemes', () => {
    expect(countGraphemes('👨‍👩‍👧‍👦👍🏽🇺🇳e\u0301')).toBe(4);
  });

  it('counts only emoji graphemes in mixed composer text', () => {
    expect(countSelectedEmojis('Hi 👨‍👩‍👧‍👦, 👍🏽 🇺🇳! 2026')).toBe(3);
    expect(countSelectedEmojis('Press 1️⃣ for help')).toBe(1);
    expect(countSelectedEmojis('plain text 2026')).toBe(0);
  });

  it('uses a grapheme-safe fallback when Intl.Segmenter is unavailable', () => {
    const segmenterDescriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
    Object.defineProperty(Intl, 'Segmenter', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(countGraphemes('👩🏽‍💻🇯🇵a\u0301')).toBe(3);
      expect(countSelectedEmojis('👩🏽‍💻🇯🇵a\u0301')).toBe(2);
      expect(countGraphemes('')).toBe(0);
      expect(countGraphemes('\r\n')).toBe(1);
      expect(countGraphemes('1️⃣')).toBe(1);
      expect(countGraphemes('🏴󠁧󠁢󠁳󠁣󠁴󠁿')).toBe(1);
    } finally {
      if (segmenterDescriptor) {
        Object.defineProperty(Intl, 'Segmenter', segmenterDescriptor);
      }
    }
  });
});
