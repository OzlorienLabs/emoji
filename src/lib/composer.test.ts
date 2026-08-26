import { describe, expect, it } from 'vitest';
import type { IconRecord } from '../data/catalog-types';
import {
  MAX_UNDO_ENTRIES,
  appendToComposer,
  clearComposer,
  commitComposerValue,
  countGraphemes,
  countSelectedContent,
  countSelectedEmojis,
  createComposerHistory,
  formatSelectedCount,
  insertAtSelection,
  parseComposerTokens,
  placeCaretAtEnd,
  undoComposer,
} from './composer';

const iconFixture: IconRecord = {
  id: 'fingerprint-pattern',
  name: 'fingerprint pattern',
  kebabName: 'fingerprint-pattern',
  pascalName: 'FingerprintPattern',
  category: 'interface',
  categoryLabel: 'Interface & Controls',
  tags: ['security', 'biometrics'],
  nodes: [['path', { d: 'M12 2v20' }]],
  order: 1,
};

const scanFaceFixture: IconRecord = {
  id: 'scan-face',
  name: 'scan face',
  kebabName: 'scan-face',
  pascalName: 'ScanFace',
  category: 'interface',
  categoryLabel: 'Interface & Controls',
  tags: ['camera', 'face'],
  nodes: [['path', { d: 'M4 8V4h4' }]],
  order: 2,
};

const adFixture: IconRecord = {
  id: 'ad',
  name: 'ad',
  kebabName: 'ad',
  pascalName: 'Ad',
  category: 'interface',
  categoryLabel: 'Interface & Controls',
  tags: ['marketing', 'commercial'],
  nodes: [['path', { d: 'M2 2h20v20H2z' }]],
  order: 3,
};

const testIconMap = new Map<string, IconRecord>([
  ['fingerprint-pattern', iconFixture],
  ['scan-face', scanFaceFixture],
  ['ad', adFixture],
]);

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

describe('token parsing and mixed content counting', () => {
  it('parses mixed strings of icons, emojis, and plain text', () => {
    const input = ':fingerprint-pattern::scan-face:😗😚😂:ad::ad:';
    const tokens = parseComposerTokens(input, testIconMap);

    expect(tokens).toHaveLength(5);
    expect(tokens[0]).toEqual({
      type: 'icon',
      value: ':fingerprint-pattern:',
      icon: iconFixture,
    });
    expect(tokens[1]).toEqual({
      type: 'icon',
      value: ':scan-face:',
      icon: scanFaceFixture,
    });
    expect(tokens[2]).toEqual({
      type: 'text',
      value: '😗😚😂',
    });
    expect(tokens[3]).toEqual({
      type: 'icon',
      value: ':ad:',
      icon: adFixture,
    });
    expect(tokens[4]).toEqual({
      type: 'icon',
      value: ':ad:',
      icon: adFixture,
    });
    expect(tokens[5]).toBeUndefined();
  });

  it('handles empty input, text-only, and unrecognized icon shortcodes', () => {
    expect(parseComposerTokens('')).toEqual([]);
    expect(parseComposerTokens('hello world')).toEqual([{ type: 'text', value: 'hello world' }]);
    expect(parseComposerTokens(':unknown-code:')).toEqual([{ type: 'text', value: ':unknown-code:' }]);
  });

  it('counts and formats selected counts accurately for emojis and icons', () => {
    const input = ':fingerprint-pattern::scan-face:😗😚😂:ad::ad:';
    const counts = countSelectedContent(input, testIconMap);

    expect(counts).toEqual({
      emojiCount: 3,
      iconCount: 4,
      totalCount: 7,
    });

    expect(formatSelectedCount(input, testIconMap)).toBe('3 emojis, 4 icons selected');
    expect(formatSelectedCount('😀:ad:', testIconMap)).toBe('1 emoji, 1 icon selected');
    expect(formatSelectedCount('😀😁:ad:', testIconMap)).toBe('2 emojis, 1 icon selected');
    expect(formatSelectedCount(':ad::ad:', testIconMap)).toBe('2 icons selected');
    expect(formatSelectedCount('😀', testIconMap)).toBe('1 emoji selected');
    expect(formatSelectedCount(':ad:', testIconMap)).toBe('1 icon selected');
    expect(formatSelectedCount('', testIconMap)).toBe('0 emojis selected');
  });

  it('places caret at the end of an element', () => {
    const div = document.createElement('div');
    div.textContent = 'hello world';
    document.body.appendChild(div);

    placeCaretAtEnd(div);
    const sel = window.getSelection();
    expect(sel?.rangeCount).toBeGreaterThan(0);

    const getSelectionSpy = vi.spyOn(window, 'getSelection').mockReturnValue(null);
    expect(() => placeCaretAtEnd(div)).not.toThrow();
    getSelectionSpy.mockRestore();

    div.remove();
  });
});
