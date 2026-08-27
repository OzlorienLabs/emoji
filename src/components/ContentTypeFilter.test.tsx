import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ContentType } from '../data/catalog-types';
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
    expect(screen.getByRole('tab', { name: 'Emoji (3,953)' })).toHaveAttribute('aria-selected', 'false');
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

    await user.click(screen.getByRole('tab', { name: 'Emoji' }));
    expect(onChange).toHaveBeenCalledWith('emoji');
  });

  it('slides the pill onto the active segment and keeps it there on resize', () => {
    const { container, rerender } = render(
      <ContentTypeFilter value="all" onChange={vi.fn()} />,
    );

    const pill = container.querySelector<HTMLElement>('.content-type-filter__pill');
    expect(pill).not.toBeNull();

    // jsdom reports zero layout, so the offsets are stubbed to prove the pill
    // is measured from the live active button rather than from a fixed table.
    const icons = screen.getByRole('tab', { name: 'Icons' });
    Object.defineProperty(icons, 'offsetLeft', { configurable: true, value: 140 });
    Object.defineProperty(icons, 'offsetWidth', { configurable: true, value: 92 });

    rerender(<ContentTypeFilter value="icon" onChange={vi.fn()} />);
    expect(pill!.style.left).toBe('140px');
    expect(pill!.style.width).toBe('92px');

    Object.defineProperty(icons, 'offsetLeft', { configurable: true, value: 100 });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(pill!.style.left).toBe('100px');
  });

  it('leaves the pill alone when no segment matches the current value', () => {
    const { container } = render(
      <ContentTypeFilter value={'unknown' as ContentType} onChange={vi.fn()} />,
    );

    const pill = container.querySelector<HTMLElement>('.content-type-filter__pill');
    expect(pill!.style.left).toBe('');
    for (const name of ['All', 'Emoji', 'Icons']) {
      expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'false');
    }
  });
});
