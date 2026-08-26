import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultPreferences } from '../lib/preferences';
import { PreferencePanel } from './PreferencePanel';

describe('PreferencePanel', () => {
  it('exposes every visual and interaction preference with icon controls and accessible labels', async () => {
    const onChange = vi.fn();
    render(<PreferencePanel preferences={createDefaultPreferences()} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Large' }));
    await userEvent.click(screen.getByRole('button', { name: 'Text' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dark skin tone' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dark theme' }));
    await userEvent.click(screen.getByRole('button', { name: /copy a single emoji/i }));

    expect(onChange.mock.calls).toEqual([
      [{ size: 'large' }],
      [{ style: 'text' }],
      [{ tone: 5 }],
      [{ theme: 'dark' }],
      [{ quickCopy: true }],
    ]);
  });

  it('marks the active segmented choices and icons', () => {
    render(
      <PreferencePanel
        preferences={{
          ...createDefaultPreferences(),
          size: 'small',
          style: 'text',
          tone: 3,
          theme: 'dark',
          quickCopy: true,
        }}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Small' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Medium skin tone' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /copy a single emoji/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
