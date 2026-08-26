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
  formatSelectedCount,
  parseComposerTokens,
  placeCaretAtEnd,
  type ComposerHistory,
  type ComposerToken,
} from '../lib/composer';

export interface ComposerDockProps {
  history: ComposerHistory;
  editorRef?: RefObject<HTMLDivElement | null>;
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
      svgWrap.innerHTML = getIconSvg(token.icon, { size: 22, strokeWidth: 2 });
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
    <section className="composer-dock" aria-labelledby="composer-title">
      <div className="composer-heading">
        <div>
          <span className="section-kicker">Your message</span>
          <h2 id="composer-title">Compose, then copy</h2>
        </div>
        <span className="composer-count">{countLabel}</span>
      </div>

      <div className="composer-input-wrap">
        <div
          ref={editorRef}
          role="textbox"
          contentEditable={!isPolishing}
          suppressContentEditableWarning
          aria-multiline="true"
          aria-label="Emoji composer"
          aria-busy={isPolishing ? 'true' : undefined}
          className={`composer-input ${isPolishing ? 'composer-input--polishing' : ''}`}
          data-empty={!history.value ? 'true' : undefined}
          data-placeholder="Tap emoji or type a message…"
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
        <button
          type="button"
          className="button button-subtle"
          disabled={history.undoStack.length === 0 || isPolishing}
          onClick={onUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="button button-subtle"
          disabled={!history.value || isPolishing}
          aria-label="Clear composer"
          onClick={onClear}
        >
          Clear
        </button>

        {isAIAvailable ? (
          <button
            type="button"
            className={`button button-subtle composer-ai-button ${isPolishing ? 'is-polishing' : ''}`}
            aria-label={polishAriaLabel}
            disabled={!history.value.trim() && !isPolishing}
            onClick={() => {
              if (isPolishing) {
                onCancelPolish?.();
              } else {
                onPolish?.();
              }
            }}
          >
            <span className="composer-ai-icon" aria-hidden="true">
              {isPolishing ? '⏳' : '✨'}
            </span>
            <span>{polishButtonLabel}</span>
          </button>
        ) : null}

        <button
          type="button"
          className="button button-primary"
          disabled={!history.value || isPolishing}
          aria-label="Copy composition"
          onClick={onCopy}
        >
          Copy
        </button>
      </div>
    </section>
  );
}
