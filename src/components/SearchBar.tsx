import {
  useId,
  type FormEvent,
  type MouseEvent,
  type RefObject,
} from 'react';

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
}

function resultCountMessage(resultCount: number | undefined): string {
  if (resultCount === undefined) return '';
  return `${resultCount} ${resultCount === 1 ? 'emoji' : 'emojis'} found`;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  label = 'Search emojis',
  placeholder = 'Search by feeling, object, or idea',
  resultCount,
  statusMessage,
  resultsId,
  inputRef,
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

  return (
    <form className="search-bar" role="search" onSubmit={handleSubmit}>
      <label className="search-bar__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="search-bar__field">
        <span className="search-bar__icon" aria-hidden="true">
          ⌕
        </span>
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
            Clear
          </button>
        ) : null}
      </div>
      <output
        id={statusId}
        className="search-bar__status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        htmlFor={inputId}
      >
        {statusMessage ?? resultCountMessage(resultCount)}
      </output>
    </form>
  );
}
