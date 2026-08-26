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

  return (
    <section className="composer-dock" aria-labelledby="composer-title">
      <div className="composer-heading">
        <div>
          <span className="section-kicker">Your message</span>
          <h2 id="composer-title">Compose, then copy</h2>
        </div>
        <span className="composer-count">{countLabel}</span>
      </div>

      <div
        ref={editorRef}
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        aria-multiline="true"
        aria-label="Emoji composer"
        className="composer-input"
        data-empty={!history.value ? 'true' : undefined}
        data-placeholder="Tap emoji or type a message…"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
      />

      <div className="composer-actions">
        <button
          type="button"
          className="button button-subtle"
          disabled={history.undoStack.length === 0}
          onClick={onUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="button button-subtle"
          disabled={!history.value}
          aria-label="Clear composer"
          onClick={onClear}
        >
          Clear
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={!history.value}
          aria-label="Copy composition"
          onClick={onCopy}
        >
          Copy
        </button>
      </div>
    </section>
  );
}
