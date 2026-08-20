import type { EmojiPreferences } from '../lib/preferences';
import { TONE_OPTIONS } from '../lib/variants';

interface PreferencePanelProps {
  preferences: EmojiPreferences;
  onChange: (patch: Partial<EmojiPreferences>) => void;
}

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const;

const STYLE_OPTIONS = [
  { value: 'native', label: 'Native' },
  { value: 'text', label: 'Text' },
] as const;

export function PreferencePanel({ preferences, onChange }: PreferencePanelProps) {
  return (
    <section className="preference-panel" aria-labelledby="preferences-title">
      <div className="section-kicker" id="preferences-title">Display preferences</div>
      <div className="preference-row">
        <fieldset className="segmented-control">
          <legend>Emoji size</legend>
          <div>
            {SIZE_OPTIONS.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                aria-pressed={preferences.size === value}
                onClick={() => onChange({ size: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="segmented-control">
          <legend>Emoji appearance</legend>
          <div>
            {STYLE_OPTIONS.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                aria-pressed={preferences.style === value}
                onClick={() => onChange({ style: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="select-control">
          <span>Default skin tone</span>
          <select
            value={preferences.tone}
            onChange={(event) => onChange({
              tone: Number(event.currentTarget.value) as EmojiPreferences['tone'],
            })}
          >
            {TONE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <span>Color theme</span>
          <select
            value={preferences.theme}
            onChange={(event) => onChange({
              theme: event.currentTarget.value as EmojiPreferences['theme'],
            })}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="toggle-control">
          <input
            type="checkbox"
            checked={preferences.quickCopy}
            onChange={(event) => onChange({ quickCopy: event.currentTarget.checked })}
          />
          <span>Copy a single emoji on tap</span>
        </label>
      </div>
    </section>
  );
}
