import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SiteHeader } from './SiteHeader';

describe('SiteHeader', () => {
  it('renders brand, theme toggle, preferences toggle, and quick copy toggle with accessible labels', () => {
    render(
      <SiteHeader
        isDark={false}
        prefsOpen={false}
        quickCopy={false}
        onToggleTheme={vi.fn()}
        onTogglePrefs={vi.fn()}
        onToggleQuickCopy={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'Emoji Compass home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to night' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open preferences' })).toBeInTheDocument();

    const quickCopyButton = screen.getByRole('button', {
      name: 'Quick copy: copy a single emoji or icon on tap',
    });
    expect(quickCopyButton).toBeInTheDocument();
    expect(quickCopyButton).toHaveAttribute('aria-pressed', 'false');
    expect(quickCopyButton).toHaveAttribute(
      'title',
      'Quick copy is off: tiles build a message you copy once',
    );
    expect(screen.getByText('Quick copy')).toBeInTheDocument();
  });

  it('reflects active quick copy state and calls onToggleQuickCopy on click', async () => {
    const user = userEvent.setup();
    const onToggleQuickCopy = vi.fn();

    const { rerender } = render(
      <SiteHeader
        isDark={true}
        prefsOpen={false}
        quickCopy={false}
        onToggleTheme={vi.fn()}
        onTogglePrefs={vi.fn()}
        onToggleQuickCopy={onToggleQuickCopy}
      />,
    );

    const button = screen.getByRole('button', {
      name: 'Quick copy: copy a single emoji or icon on tap',
    });
    await user.click(button);
    expect(onToggleQuickCopy).toHaveBeenCalledTimes(1);

    rerender(
      <SiteHeader
        isDark={true}
        prefsOpen={false}
        quickCopy={true}
        onToggleTheme={vi.fn()}
        onTogglePrefs={vi.fn()}
        onToggleQuickCopy={onToggleQuickCopy}
      />,
    );

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute(
      'title',
      'Quick copy is on: tiles copy straight to the clipboard',
    );
  });

  it('handles theme and preferences toggle actions', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    const onTogglePrefs = vi.fn();

    render(
      <SiteHeader
        isDark={true}
        prefsOpen={true}
        quickCopy={false}
        onToggleTheme={onToggleTheme}
        onTogglePrefs={onTogglePrefs}
        onToggleQuickCopy={vi.fn()}
      >
        <div data-testid="child-popover">Preferences Popover</div>
      </SiteHeader>,
    );

    await user.click(screen.getByRole('button', { name: 'Switch to daylight' }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Open preferences' }));
    expect(onTogglePrefs).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId('child-popover')).toBeInTheDocument();
  });
});
