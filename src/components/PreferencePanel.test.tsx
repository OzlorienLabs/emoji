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

  it('supports selecting all skin tone variants', async () => {
    const onChange = vi.fn();
    render(<PreferencePanel preferences={createDefaultPreferences()} onChange={onChange} />);

    const tones = [
      { name: 'Default', value: 0 },
      { name: 'Light skin tone', value: 1 },
      { name: 'Medium-light skin tone', value: 2 },
      { name: 'Medium skin tone', value: 3 },
      { name: 'Medium-dark skin tone', value: 4 },
      { name: 'Dark skin tone', value: 5 },
    ] as const;

    for (const { name, value } of tones) {
      await userEvent.click(screen.getByRole('button', { name }));
      expect(onChange).toHaveBeenLastCalledWith({ tone: value });
    }
  });

  it('supports selecting all theme options', async () => {
    const onChange = vi.fn();
    render(<PreferencePanel preferences={createDefaultPreferences()} onChange={onChange} />);

    const themes = [
      { name: 'System theme', value: 'system' },
      { name: 'Light theme', value: 'light' },
      { name: 'Dark theme', value: 'dark' },
    ] as const;

    for (const { name, value } of themes) {
      await userEvent.click(screen.getByRole('button', { name }));
      expect(onChange).toHaveBeenLastCalledWith({ theme: value });
    }
  });

  it('provides accessible toolbar semantics and descriptive button titles', () => {
    render(<PreferencePanel preferences={createDefaultPreferences()} onChange={() => undefined} />);

    const toolbar = screen.getByRole('toolbar', { name: 'Display preferences' });
    expect(toolbar).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute('title', 'Skin tone: Default');
    expect(screen.getByRole('button', { name: 'System theme' })).toHaveAttribute('title', 'Theme: System theme');
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveAttribute('title', 'Emoji size: Medium');
    expect(screen.getByRole('button', { name: 'Native' })).toHaveAttribute('title', 'Appearance: Native');
  });
});
