import type { ReactNode } from 'react';

export interface SiteHeaderProps {
  /** Resolved theme, so the toggle offers the opposite of what is on screen. */
  isDark: boolean;
  prefsOpen: boolean;
  quickCopy: boolean;
  onToggleTheme: () => void;
  onTogglePrefs: () => void;
  onToggleQuickCopy: () => void;
  /** The preferences popover, rendered as a child so it anchors to the header. */
  children?: ReactNode;
}

export function SiteHeader({
  isDark,
  prefsOpen,
  quickCopy,
  onToggleTheme,
  onTogglePrefs,
  onToggleQuickCopy,
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

      <button
        type="button"
        className="header-quick-copy"
        aria-label="Quick copy: copy a single emoji or icon on tap"
        aria-pressed={quickCopy}
        title={
          quickCopy
            ? 'Quick copy is on: tiles copy straight to the clipboard'
            : 'Quick copy is off: tiles build a message you copy once'
        }
        onClick={onToggleQuickCopy}
      >
        <span className="header-quick-copy__icon" aria-hidden="true">⚡</span>
        <span className="header-quick-copy__label">Quick copy</span>
        <span className="header-quick-copy__switch switch" aria-hidden="true">
          <span className="switch__knob" />
        </span>
      </button>

      {children}
    </header>
  );
}
