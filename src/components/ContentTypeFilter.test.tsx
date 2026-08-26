import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContentTypeFilter } from './ContentTypeFilter';

describe('ContentTypeFilter', () => {
  it('renders all, emoji, and icon options with counts', () => {
    render(
      <ContentTypeFilter
        value="all"
        onChange={vi.fn()}
        totalCount={5730}
        emojiCount={3953}
        iconCount={1777}
      />,
    );

    expect(screen.getByRole('tab', { name: 'All (5,730)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Emojis (3,953)' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Icons (1,777)' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when clicking a tab', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ContentTypeFilter
        value="all"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /Icons/ }));
    expect(onChange).toHaveBeenCalledWith('icon');

    await user.click(screen.getByRole('tab', { name: /Emojis/ }));
    expect(onChange).toHaveBeenCalledWith('emoji');
  });
});
