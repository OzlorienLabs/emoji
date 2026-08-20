import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultPreferences } from '../lib/preferences';
import { PreferencePanel } from './PreferencePanel';

describe('PreferencePanel', () => {
  it('exposes every visual and interaction preference with text labels', async () => {
    const onChange = vi.fn();
    render(<PreferencePanel preferences={createDefaultPreferences()} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Large' }));
    await userEvent.click(screen.getByRole('button', { name: 'Text' }));
    await userEvent.selectOptions(screen.getByLabelText('Default skin tone'), '5');
    await userEvent.selectOptions(screen.getByLabelText('Color theme'), 'dark');
    await userEvent.click(screen.getByRole('checkbox', { name: /copy a single emoji/i }));

    expect(onChange.mock.calls).toEqual([
      [{ size: 'large' }],
      [{ style: 'text' }],
      [{ tone: 5 }],
      [{ theme: 'dark' }],
      [{ quickCopy: true }],
    ]);
  });

  it('marks the active segmented choices', () => {
    render(
      <PreferencePanel
        preferences={{ ...createDefaultPreferences(), size: 'small', style: 'text' }}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Small' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'true');
  });
});
