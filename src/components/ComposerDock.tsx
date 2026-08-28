import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { getIconSvg } from '../data/catalog';
import type { IconRecord } from '../data/catalog-types';
import {
  countGraphemes,
  formatSelectedCount,
  parseComposerTokens,
  placeCaretAtEnd,
  type ComposerHistory,
  type ComposerToken,
} from '../lib/composer';

export interface ComposerDockProps {
  history: ComposerHistory;
  editorRef?: RefObject<HTMLDivElement | null>;
  /** The dock panel itself, so a selected tile can fly toward it. */
  dockRef?: RefObject<HTMLDivElement | null>;
  iconById?: ReadonlyMap<string, IconRecord>;
  onChange: (value: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onCopy: () => void;
  isAIAvailable?: boolean;
  isPolishing?: boolean;
  hasPolished?: boolean;
  onPolish?: () => void;
  onCancelPolish?: () => void;
}

function serializeEditorElement(element: HTMLElement): string {
  let result = '';
  function walk(node: Node) {
    if (node instanceof Text) {
      result += node.data;
    } else if (node instanceof HTMLElement) {
      if (node.dataset.iconId) {
        result += `:${node.dataset.iconId}:`;
      } else {
        for (const child of node.childNodes) {
          walk(child);
        }
      }
    }
  }
  for (const child of element.childNodes) {
    walk(child);
  }
  return result;
}

function renderTokensToDOM(
  container: HTMLDivElement,
  tokens: readonly ComposerToken[],
) {
  container.innerHTML = '';
  if (tokens.length === 0) {
    container.dataset.empty = 'true';
    return;
  }
  delete container.dataset.empty;

  for (const token of tokens) {
    if (token.type === 'icon' && token.icon) {
      const badge = document.createElement('span');
      badge.className = 'composer-icon-pill';
      badge.dataset.iconId = token.icon.id;
      badge.contentEditable = 'false';
      badge.title = `Icon: ${token.icon.name}`;
      badge.setAttribute('data-testid', 'composer-icon');

      const svgWrap = document.createElement('span');
      svgWrap.className = 'composer-icon-svg-wrap';
      svgWrap.innerHTML = getIconSvg(token.icon, { size: 20, strokeWidth: 1.7 });
      badge.appendChild(svgWrap);

      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = `:${token.icon.kebabName}:`;
      badge.appendChild(sr);

      container.appendChild(badge);
    } else {
      const textNode = document.createTextNode(token.value);
      container.appendChild(textNode);
    }
  }
}

export function ComposerDock({
  history,
  editorRef: externalRef,
  dockRef,
  iconById,
  onChange,
  onUndo,
  onClear,
  onCopy,
  isAIAvailable = false,
  isPolishing = false,
  hasPolished = false,
  onPolish,
  onCancelPolish,
}: ComposerDockProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const editorRef = externalRef ?? internalRef;
  const lastSerializedRef = useRef<string | null>(null);

  const countLabel = useMemo(
    () => formatSelectedCount(history.value, iconById),
    [history.value, iconById],
  );

  const charCount = useMemo(() => countGraphemes(history.value), [history.value]);

  const tokens = useMemo(
    () => parseComposerTokens(history.value, iconById),
    [history.value, iconById],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && history.value !== lastSerializedRef.current) {
      lastSerializedRef.current = history.value;
      renderTokensToDOM(editor, tokens);
      placeCaretAtEnd(editor);
    }
  }, [history.value, tokens, editorRef]);

  const handleInput = useCallback(
    (event: FormEvent<HTMLDivElement>) => {
      const serialized = serializeEditorElement(event.currentTarget);
      lastSerializedRef.current = serialized;
      if (serialized.length === 0) {
        event.currentTarget.dataset.empty = 'true';
      } else {
        delete event.currentTarget.dataset.empty;
      }
      onChange(serialized);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.preventDefault();
        onUndo();
      }
    },
    [onUndo],
  );

  const polishButtonLabel = isPolishing
    ? 'Polishing…'
    : hasPolished
      ? 'Regenerate'
      : 'Polish';

  const polishAriaLabel = isPolishing
    ? 'Polishing message with on-device AI'
    : hasPolished
      ? 'Regenerate polished message with AI'
      : 'Polish message with AI';

  return (
    <div
      className="composer-dock"
      ref={dockRef}
      data-empty={!history.value ? 'true' : undefined}
      aria-label="Message composer"
    >
      <h2 className="sr-only">Your message</h2>
      <div className="composer-row">
        <div className="composer-input-wrap">
          <div
            ref={editorRef}
            role="textbox"
            contentEditable={!isPolishing}
            suppressContentEditableWarning
            aria-multiline="true"
            aria-label="Emoji composer"
            aria-busy={isPolishing ? 'true' : undefined}
            className="composer-input"
            data-empty={!history.value ? 'true' : undefined}
            data-placeholder="Tap an emoji to build a message…"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
          />

          {isPolishing && (
            <div
              className="composer-polishing-overlay"
              role="status"
              aria-live="polite"
              aria-label="Polishing message with on-device AI"
            >
              <div className="composer-polishing-content">
                <span className="composer-polishing-sparkle" aria-hidden="true">✨</span>
                <span className="composer-polishing-text">Polishing with on-device AI…</span>
                <div className="composer-polishing-bar" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>

        <div className="composer-actions">
          <span className="composer-count" aria-hidden="true">
            {charCount} {charCount === 1 ? 'char' : 'chars'}
          </span>
          <span className="sr-only">{countLabel}</span>

          <button
            type="button"
            className="composer-button"
            aria-label="Undo"
            title="Undo"
            disabled={history.undoStack.length === 0 || isPolishing}
            onClick={onUndo}
          >
            <span aria-hidden="true">↺</span>
          </button>
          <button
            type="button"
            className="composer-button"
            aria-label="Clear composer"
            title="Clear"
            disabled={!history.value || isPolishing}
            onClick={onClear}
          >
            <span aria-hidden="true">🗑</span>
          </button>

          {isAIAvailable ? (
            <button
              type="button"
              className={`composer-ai${isPolishing ? ' is-polishing' : ''}`}
              aria-label={polishAriaLabel}
              title={polishAriaLabel}
              disabled={!history.value.trim() && !isPolishing}
              onClick={() => {
                if (isPolishing) {
                  onCancelPolish?.();
                } else {
                  onPolish?.();
                }
              }}
            >
              <span aria-hidden="true">{isPolishing ? '⏳' : '✨'}</span>
              <span className="composer-ai__label">{polishButtonLabel}</span>
            </button>
          ) : null}

          <button
            type="button"
            className="composer-copy"
            aria-label="Copy composition"
            disabled={!history.value || isPolishing}
            onClick={onCopy}
          >
            <span className="composer-copy__label">Copy</span>
            <span className="keycap" aria-hidden="true">⌘↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}
