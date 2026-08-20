import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  copyText,
  type ClipboardDocument,
  type ClipboardResult,
} from './clipboard';

function copyDocument(execCommand?: (command: string) => boolean): ClipboardDocument {
  return {
    body: document.body,
    createElement: () => document.createElement('textarea'),
    execCommand,
  };
}

function expectManualResult(result: ClipboardResult) {
  expect(result.status).toBe('manual');
  if (result.status !== 'manual') {
    throw new Error('Expected a manual clipboard result');
  }
  return result;
}

afterEach(() => {
  document.querySelectorAll('[data-emoji-copy-fallback]').forEach((element) => {
    element.remove();
  });
});

describe('copyText', () => {
  it('uses the browser globals by default', async () => {
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    try {
      await expect(copyText('default 🙂')).resolves.toEqual({
        status: 'copied',
        method: 'clipboard-api',
      });
      expect(writeText).toHaveBeenCalledWith('default 🙂');
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  });

  it('copies the exact string with the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const execCommand = vi.fn(() => true);
    const exactText = '🏳️‍🌈👩🏽‍💻';

    const result = await copyText(exactText, {
      clipboard: { writeText },
      document: copyDocument(execCommand),
    });

    expect(writeText).toHaveBeenCalledWith(exactText);
    expect(execCommand).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'copied', method: 'clipboard-api' });
  });

  it('falls back to execCommand after Clipboard API permission failure', async () => {
    const target = document.createElement('textarea');
    target.value = 'Keep 👨‍👩‍👧‍👦 exact';
    document.body.append(target);
    const execCommand = vi.fn(() => {
      expect(document.activeElement).toBe(target);
      expect(target.selectionStart).toBe(0);
      expect(target.selectionEnd).toBe(target.value.length);
      return true;
    });

    const result = await copyText(target.value, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new DOMException('Denied')) },
      document: copyDocument(execCommand),
      selectionTarget: target,
    });

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(result).toEqual({ status: 'copied', method: 'exec-command' });
    target.remove();
  });

  it('uses and removes a temporary exact-value target after legacy copy succeeds', async () => {
    const composer = document.createElement('textarea');
    composer.value = 'different composer content';
    document.body.append(composer);
    const execCommand = vi.fn(() => {
      const selected = document.activeElement as HTMLTextAreaElement;
      expect(selected.value).toBe('🎉');
      expect(selected.selectionEnd).toBe('🎉'.length);
      return true;
    });

    const result = await copyText('🎉', {
      clipboard: null,
      document: copyDocument(execCommand),
      selectionTarget: composer,
    });

    expect(result).toEqual({ status: 'copied', method: 'exec-command' });
    expect(document.querySelector('[data-emoji-copy-fallback]')).toBeNull();
    expect(composer.value).toBe('different composer content');
    composer.remove();
  });

  it('leaves caller-owned text selected with an actionable result when copy is blocked', async () => {
    const target = document.createElement('textarea');
    target.value = 'Select me 🙂';
    document.body.append(target);

    const result = expectManualResult(await copyText(target.value, {
      clipboard: null,
      document: copyDocument(() => false),
      selectionTarget: target,
    }));

    expect(result.message).toMatch(/(?:Ctrl|Command|⌘).*[+]C/i);
    expect(result.selection?.target).toBe(target);
    expect(result.selection?.selectionStart).toBe(0);
    expect(result.selection?.selectionEnd).toBe(target.value.length);
    expect(document.activeElement).toBe(target);
    result.selection?.cleanup();
    expect(target.isConnected).toBe(true);
    target.remove();
  });

  it('keeps a temporary manual-copy field selected until the caller cleans it up', async () => {
    const result = expectManualResult(await copyText('manual 🫶🏿', {
      clipboard: null,
      document: copyDocument(() => {
        throw new Error('Legacy copy blocked');
      }),
    }));
    const selection = result.selection;

    expect(selection?.target.value).toBe('manual 🫶🏿');
    expect(selection?.target.readOnly).toBe(true);
    expect(selection?.target.dataset.emojiCopyFallback).toBe('true');
    expect(selection?.target.selectionStart).toBe(0);
    expect(selection?.target.selectionEnd).toBe('manual 🫶🏿'.length);
    expect(selection?.target.isConnected).toBe(true);

    selection?.cleanup();
    expect(selection?.target.isConnected).toBe(false);
  });

  it('returns a selected manual-copy field when execCommand is unavailable', async () => {
    const result = expectManualResult(await copyText('legacy unavailable', {
      clipboard: null,
      document: copyDocument(),
    }));

    expect(result.selection?.target.value).toBe('legacy unavailable');
    result.selection?.cleanup();
  });

  it('reports manual copy without a selection when no DOM is available', async () => {
    const result = expectManualResult(await copyText('offline', {
      clipboard: null,
      document: null,
    }));

    expect(result.selection).toBeNull();
    expect(result.message).toContain('Copy this text manually');
  });

  it('handles server-side defaults where navigator and document do not exist', async () => {
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: undefined });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: undefined });

    try {
      const result = expectManualResult(await copyText('server rendered'));
      expect(result.selection).toBeNull();
    } finally {
      if (navigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
      }
      if (documentDescriptor) {
        Object.defineProperty(globalThis, 'document', documentDescriptor);
      }
    }
  });
});
