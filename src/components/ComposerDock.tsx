import type { RefObject } from 'react';
import { countSelectedEmojis, type ComposerHistory } from '../lib/composer';

interface ComposerDockProps {
  history: ComposerHistory;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onCopy: () => void;
}

export function ComposerDock({
  history,
  textareaRef,
  onChange,
  onUndo,
  onClear,
  onCopy,
}: ComposerDockProps) {
  const emojiCount = countSelectedEmojis(history.value);
  const countLabel = `${emojiCount} ${emojiCount === 1 ? 'emoji' : 'emojis'} selected`;

  return (
    <section className="composer-dock" aria-labelledby="composer-title">
      <div className="composer-heading">
        <div>
          <span className="section-kicker">Your message</span>
          <h2 id="composer-title">Compose, then copy</h2>
        </div>
        <span className="composer-count">{countLabel}</span>
      </div>
      <textarea
        ref={textareaRef}
        aria-label="Emoji composer"
        value={history.value}
        placeholder="Tap emoji or type a message…"
        maxLength={4096}
        rows={2}
        onChange={(event) => onChange(event.currentTarget.value)}
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
