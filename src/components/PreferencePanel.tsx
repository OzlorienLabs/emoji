import { useEffect, useRef } from 'react';
import type { EmojiPreferences } from '../lib/preferences';
import { TONE_OPTIONS } from '../lib/variants';

export interface PreferencePanelProps {
  preferences: EmojiPreferences;
  onChange: (patch: Partial<EmojiPreferences>) => void;
  /** Dismisses the popover on an outside click. */
  onDismiss?: () => void;
}

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small', display: 'S' },
  { value: 'medium', label: 'Medium', display: 'M' },
  { value: 'large', label: 'Large', display: 'L' },
] as const;

const STYLE_OPTIONS = [
  { value: 'native', label: 'Native', display: 'Native' },
  { value: 'text', label: 'Text', display: 'Text' },
] as const;

const THEME_OPTIONS = [
  { value: 'light', label: 'Light theme', display: 'Day' },
  { value: 'dark', label: 'Dark theme', display: 'Night' },
  { value: 'system', label: 'System theme', display: 'Auto' },
] as const;

const ICON_FORMAT_OPTIONS = [
  { value: 'svg', label: 'Copy icons as SVG', display: 'SVG' },
  { value: 'jsx', label: 'Copy icons as JSX', display: 'JSX' },
  { value: 'html', label: 'Copy icons as HTML', display: 'HTML' },
  { value: 'name', label: 'Copy icons as name', display: 'Name' },
] as const;

const TONE_GLYPHS: Readonly<Record<number, string>> = {
  0: '✋',
  1: '🏻',
  2: '🏼',
  3: '🏽',
  4: '🏾',
  5: '🏿',
};

/**
 * The preferences popover. It is anchored to the header gear and dismisses on
 * an outside pointer press; `Escape` is handled by the app so it can close the
 * details sheet first.
 */
export function PreferencePanel({
  preferences,
  onChange,
  onDismiss,
}: PreferencePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onDismiss || typeof document === 'undefined') return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      // The gear itself toggles, so a press on it must not double-fire.
      if (target instanceof Element && target.closest('[aria-label="Open preferences"]')) {
        return;
      }
      onDismiss();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [onDismiss]);

  return (
    <div
      className="prefs-popover"
      ref={panelRef}
      aria-label="Display preferences"
      data-testid="preferences"
    >
      <fieldset className="prefs-group">
        <legend className="prefs-label">Tile size</legend>
        <div className="prefs-track">
          {SIZE_OPTIONS.map(({ value, label, display }) => (
            <button
              type="button"
              key={value}
              aria-label={label}
              title={`Tile size: ${label}`}
              aria-pressed={preferences.size === value}
              onClick={() => onChange({ size: value })}
            >
              {display}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="prefs-group">
        <legend className="prefs-label">Default skin tone</legend>
        <div className="prefs-tones">
          {TONE_OPTIONS.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              className="tone-swatch"
              aria-label={label}
              title={`Skin tone: ${label}`}
              aria-pressed={preferences.tone === value}
              onClick={() => onChange({ tone: value })}
            >
              <span aria-hidden="true">{TONE_GLYPHS[value]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="prefs-group">
        <legend className="prefs-label">Emoji presentation</legend>
        <div className="prefs-track">
          {STYLE_OPTIONS.map(({ value, label, display }) => (
            <button
              type="button"
              key={value}
              aria-label={label}
              title={`Presentation: ${label}`}
              aria-pressed={preferences.style === value}
              onClick={() => onChange({ style: value })}
            >
              {display}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="prefs-group">
        <legend className="prefs-label">Theme</legend>
        <div className="prefs-track">
          {THEME_OPTIONS.map(({ value, label, display }) => (
            <button
              type="button"
              key={value}
              aria-label={label}
              title={label}
              aria-pressed={preferences.theme === value}
              onClick={() => onChange({ theme: value })}
            >
              {display}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        className="prefs-toggle"
        aria-label="Quick copy: copy a single emoji or icon on tap"
        aria-pressed={preferences.quickCopy}
        onClick={() => onChange({ quickCopy: !preferences.quickCopy })}
      >
        <span className="prefs-toggle__copy">
          <span className="prefs-toggle__title">Quick copy</span>
          <span className="prefs-toggle__hint">
            {preferences.quickCopy
              ? 'Tiles copy straight to the clipboard'
              : 'Tiles build a message you copy once'}
          </span>
        </span>
        <span className="switch" aria-hidden="true">
          <span className="switch__knob" />
        </span>
      </button>

      <fieldset className="prefs-group">
        <legend className="prefs-label">Icon quick-copy format</legend>
        <div className="prefs-track">
          {ICON_FORMAT_OPTIONS.map(({ value, label, display }) => (
            <button
              type="button"
              key={value}
              aria-label={label}
              title={label}
              aria-pressed={preferences.iconCopyFormat === value}
              onClick={() => onChange({ iconCopyFormat: value })}
            >
              {display}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="prefs-note">
        Everything is kept on this device — favorites, recents and preferences never
        leave the browser.
      </p>
    </div>
  );
}
