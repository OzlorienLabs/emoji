import { useId, type FormEvent, type MouseEvent, type RefObject } from 'react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  label?: string;
  placeholder?: string;
  resultCount?: number;
  statusMessage?: string;
  resultsId?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Suppresses the count chip while the catalog is still resolving. */
  loading?: boolean;
}

function formatMatchCount(resultCount: number | undefined): string {
  if (resultCount === undefined) return '';
  return `${resultCount.toLocaleString('en-US')} ${
    resultCount === 1 ? 'match' : 'matches'
  }`;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  label = 'Search emojis and icons',
  placeholder = 'try “blue heart”, “deadline”, “download icon”…',
  resultCount,
  statusMessage,
  resultsId,
  inputRef,
  loading = false,
}: SearchBarProps) {
  const generatedId = useId();
  const inputId = `emoji-search-${generatedId}`;
  const statusId = `emoji-search-status-${generatedId}`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };

  const handleClear = (event: MouseEvent<HTMLButtonElement>) => {
    onChange('');
    const formInput = event.currentTarget.form?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    (inputRef?.current ?? formInput)?.focus();
  };

  const countText = loading ? 'loading…' : formatMatchCount(resultCount);

  return (
    <form className="search-bar" role="search" onSubmit={handleSubmit}>
      <label className="search-bar__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="search-bar__field">
        <span className="search-bar__icon" aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          id={inputId}
          className="search-bar__input"
          type="search"
          value={value}
          maxLength={120}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          aria-controls={resultsId}
          aria-describedby={statusId}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        {value ? (
          <button
            className="search-bar__clear"
            type="button"
            aria-label="Clear search"
            onClick={handleClear}
          >
            <span aria-hidden="true">✕</span>
          </button>
        ) : null}
        {countText ? (
          <span className="search-bar__count" aria-hidden="true">{countText}</span>
        ) : null}
      </div>
      <output
        id={statusId}
        className="copy-feedback"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        htmlFor={inputId}
      >
        {statusMessage ?? countText}
      </output>
    </form>
  );
}
