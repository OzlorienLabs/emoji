export interface ClipboardDocument {
  readonly body: HTMLElement;
  createElement(tagName: 'textarea'): HTMLTextAreaElement;
  execCommand?: (command: string) => boolean;
}

export interface CopyTextOptions {
  readonly clipboard?: Pick<Clipboard, 'writeText'> | null;
  readonly document?: ClipboardDocument | null;
  readonly selectionTarget?: HTMLInputElement | HTMLTextAreaElement | null;
}

export interface ManualClipboardSelection {
  readonly target: HTMLInputElement | HTMLTextAreaElement;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  cleanup(): void;
}

export type ClipboardResult =
  | {
      readonly status: 'copied';
      readonly method: 'clipboard-api' | 'exec-command';
    }
  | {
      readonly status: 'manual';
      readonly message: string;
      readonly selection: ManualClipboardSelection | null;
    };

function browserClipboard(): Pick<Clipboard, 'writeText'> | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.clipboard;
}

function browserDocument(): ClipboardDocument | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  return document;
}

function createManualSelection(
  text: string,
  copyDocument: ClipboardDocument | undefined,
  preferredTarget: HTMLInputElement | HTMLTextAreaElement | null | undefined,
): ManualClipboardSelection | null {
  let target: HTMLInputElement | HTMLTextAreaElement;
  let isTemporary = false;

  if (preferredTarget?.value === text) {
    target = preferredTarget;
  } else if (copyDocument) {
    target = copyDocument.createElement('textarea');
    target.value = text;
    target.readOnly = true;
    target.spellcheck = false;
    target.dataset.emojiCopyFallback = 'true';
    target.setAttribute('aria-label', 'Text ready to copy manually');
    target.style.position = 'fixed';
    target.style.right = '1rem';
    target.style.bottom = '1rem';
    target.style.left = '1rem';
    target.style.zIndex = '2147483647';
    target.style.fontSize = '16px';
    copyDocument.body.append(target);
    isTemporary = true;
  } else {
    return null;
  }

  target.focus();
  target.setSelectionRange(0, text.length);

  return {
    target,
    selectionStart: 0,
    selectionEnd: text.length,
    cleanup() {
      if (isTemporary) {
        target.remove();
      }
    },
  };
}

export async function copyText(
  text: string,
  options: CopyTextOptions = {},
): Promise<ClipboardResult> {
  const clipboard = options.clipboard === undefined
    ? browserClipboard()
    : options.clipboard ?? undefined;
  const copyDocument = options.document === undefined
    ? browserDocument()
    : options.document ?? undefined;

  if (clipboard) {
    try {
      await clipboard.writeText(text);
      return { status: 'copied', method: 'clipboard-api' };
    } catch {
      // Clipboard permission can be denied even in a secure browser context.
    }
  }

  const selection = createManualSelection(
    text,
    copyDocument,
    options.selectionTarget,
  );

  if (selection && copyDocument?.execCommand) {
    try {
      if (copyDocument.execCommand('copy')) {
        selection.cleanup();
        return { status: 'copied', method: 'exec-command' };
      }
    } catch {
      // Keep the prepared selection active for the manual-copy result below.
    }
  }

  return selection
    ? {
        status: 'manual',
        message: 'Copy was blocked. Press Ctrl+C or Command+C (⌘+C) to copy the selected text.',
        selection,
      }
    : {
        status: 'manual',
        message: 'Copy this text manually; automatic clipboard access is unavailable.',
        selection: null,
      };
}
