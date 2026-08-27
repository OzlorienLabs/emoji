import type { ReactNode } from 'react';

export interface SiteHeaderProps {
  /** Resolved theme, so the toggle offers the opposite of what is on screen. */
  isDark: boolean;
  prefsOpen: boolean;
  onToggleTheme: () => void;
  onTogglePrefs: () => void;
  onFocusSearch: () => void;
  /** The preferences popover, rendered as a child so it anchors to the header. */
  children?: ReactNode;
}

export function SiteHeader({
  isDark,
  prefsOpen,
  onToggleTheme,
  onTogglePrefs,
  onFocusSearch,
  children,
}: SiteHeaderProps) {
  const themeLabel = isDark ? 'Switch to daylight' : 'Switch to night';

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Emoji Compass home">
        <span className="brand-mark" aria-hidden="true">🧭</span>
        <span className="brand__text">
          <span className="brand__name">Emoji Compass</span>
          <span className="brand__tag">Meaning-first picker</span>
        </span>
      </a>

      <div className="header-spacer" />

      <button
        type="button"
        className="icon-button"
        aria-label={themeLabel}
        title={themeLabel}
        onClick={onToggleTheme}
      >
        <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
      </button>

      <button
        type="button"
        className="icon-button icon-button--prefs"
        aria-label="Open preferences"
        aria-expanded={prefsOpen}
        title="Preferences"
        data-active={prefsOpen || undefined}
        onClick={onTogglePrefs}
      >
        <span aria-hidden="true">⚙</span>
      </button>

      <button type="button" className="header-cta" onClick={onFocusSearch}>
        <span className="header-cta__text">Search</span>
        <span className="keycap" aria-hidden="true">/</span>
      </button>

      {children}
    </header>
  );
}
