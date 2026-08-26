import type { EmojiPreferences } from '../lib/preferences';
import { TONE_OPTIONS } from '../lib/variants';

interface PreferencePanelProps {
  preferences: EmojiPreferences;
  onChange: (patch: Partial<EmojiPreferences>) => void;
}

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small', display: 'S' },
  { value: 'medium', label: 'Medium', display: 'M' },
  { value: 'large', label: 'Large', display: 'L' },
] as const;

const STYLE_OPTIONS = [
  { value: 'native', label: 'Native', icon: '🎨' },
  { value: 'text', label: 'Text', icon: '🔤' },
] as const;

const TONE_ICONS: Readonly<Record<number, string>> = {
  0: '✋',
  1: '✋🏻',
  2: '✋🏼',
  3: '✋🏽',
  4: '✋🏾',
  5: '✋🏿',
};

const THEME_OPTIONS = [
  { value: 'system', label: 'System theme', icon: '💻' },
  { value: 'light', label: 'Light theme', icon: '☀️' },
  { value: 'dark', label: 'Dark theme', icon: '🌙' },
] as const;

export function PreferencePanel({ preferences, onChange }: PreferencePanelProps) {
  return (
    <div className="preference-panel" role="toolbar" aria-label="Display preferences">
      <fieldset className="segmented-control preference-group" aria-label="Emoji size">
        <legend className="sr-only">Emoji size</legend>
        <div className="segmented-control__group">
          {SIZE_OPTIONS.map(({ value, label, display }) => (
            <button
              type="button"
              key={value}
              aria-label={label}
              title={`Emoji size: ${label}`}
              aria-pressed={preferences.size === value}
              onClick={() => onChange({ size: value })}
            >
              {display}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="segmented-control preference-group" aria-label="Emoji appearance">
        <legend className="sr-only">Emoji appearance</legend>
        <div className="segmented-control__group">
          {STYLE_OPTIONS.map(({ value, label, icon }) => (
            <button
              type="button"
              key={value}
              aria-label={label}
              title={`Appearance: ${label}`}
              aria-pressed={preferences.style === value}
              onClick={() => onChange({ style: value })}
            >
              <span aria-hidden="true" className="control-icon">{icon}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="segmented-control preference-group tone-control" aria-label="Default skin tone">
        <legend className="sr-only">Default skin tone</legend>
        <div className="segmented-control__group">
          {TONE_OPTIONS.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              aria-label={label}
              title={`Skin tone: ${label}`}
              aria-pressed={preferences.tone === value}
              onClick={() => onChange({ tone: value })}
            >
              <span aria-hidden="true" className="tone-icon">{TONE_ICONS[value]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="segmented-control preference-group theme-control" aria-label="Color theme">
        <legend className="sr-only">Color theme</legend>
        <div className="segmented-control__group">
          {THEME_OPTIONS.map(({ value, label, icon }) => (
            <button
              type="button"
              key={value}
              aria-label={label}
              title={`Theme: ${label}`}
              aria-pressed={preferences.theme === value}
              onClick={() => onChange({ theme: value })}
            >
              <span aria-hidden="true" className="theme-icon">{icon}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        className="quick-copy-button"
        aria-label="Copy a single emoji on tap"
        title="Copy a single emoji on tap"
        aria-pressed={preferences.quickCopy}
        onClick={() => onChange({ quickCopy: !preferences.quickCopy })}
      >
        <span aria-hidden="true">⚡</span>
        <span className="quick-copy-label">Quick copy</span>
      </button>
    </div>
  );
}
