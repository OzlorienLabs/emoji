import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EmojiFamily, SearchableEmoji } from '../data/catalog-types';
import { stubIntersectionObserver } from '../test/dom-stubs';
import { EmojiGrid } from './EmojiGrid';

const wavingHand: EmojiFamily = {
  id: '1F44B',
  glyph: '👋',
  textGlyph: '👋︎',
  name: 'waving hand',
  order: 1,
  version: 0.6,
  shortcodes: ['wave'],
  group: 1,
  subgroup: 10,
  keywords: ['hello'],
  variants: [
    {
      id: '1F44B-1F3FF',
      glyph: '👋🏿',
      name: 'waving hand: dark skin tone',
      order: 2,
      version: 1,
      tone: 5,
      shortcodes: ['wave_tone5'],
    },
  ],
};

const heart: SearchableEmoji = {
  id: '2764-FE0F',
  familyId: '2764-FE0F',
  glyph: '❤️',
  textGlyph: '❤︎',
  name: 'red heart',
  order: 3,
  version: 0.6,
  shortcodes: ['heart'],
  group: 0,
  subgroup: 1,
  groupLabel: 'Smileys & Emotion',
  subgroupLabel: 'Emotion',
  keywords: ['love'],
  searchTerms: ['red heart', 'love'],
};

const party: EmojiFamily = {
  ...wavingHand,
  id: '1F973',
  glyph: '🥳',
  textGlyph: undefined,
  name: 'partying face',
  order: 4,
  variants: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EmojiGrid', () => {
  it('progressively reveals items and reports exact selection and details records', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onDetails = vi.fn();
    render(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        initialPageSize={2}
        tone={5}
        onSelect={onSelect}
        onDetails={onDetails}
      />,
    );

    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 3 emojis');
    expect(screen.getByRole('button', { name: 'Select waving hand: dark skin tone' }))
      .toHaveTextContent('👋🏿');

    await user.click(
      screen.getByRole('button', { name: 'Select waving hand: dark skin tone' }),
    );
    expect(onSelect).toHaveBeenCalledWith(wavingHand.variants[0], wavingHand);

    await user.click(screen.getByRole('button', { name: 'Details for red heart' }));
    expect(onDetails).toHaveBeenCalledWith(heart, heart);

    await user.click(screen.getByRole('button', { name: 'Show 1 more emoji' }));
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Show .* more/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing all 3 emojis');
  });

  it('uses text presentation, falls back to the native glyph, and supports action labels', () => {
    render(
      <EmojiGrid
        items={[heart, party]}
        style="text"
        actionLabel="Add"
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add red heart' })).toHaveTextContent('❤︎');
    expect(screen.getByRole('button', { name: 'Add partying face' })).toHaveTextContent('🥳');
  });

  it('uses singular and plural labels for completed and progressive grids', () => {
    const { rerender } = render(
      <EmojiGrid
        items={[heart]}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Showing all 1 emoji');

    rerender(
      <EmojiGrid
        items={[wavingHand, heart, party, { ...party, id: 'second-party' }]}
        initialPageSize={2}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Show 2 more emojis' })).toBeVisible();
  });

  it('moves focus among emoji actions with arrow, Home, and End keys', () => {
    render(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    const first = screen.getByRole('button', { name: 'Select waving hand' });
    const second = screen.getByRole('button', { name: 'Select red heart' });
    const last = screen.getByRole('button', { name: 'Select partying face' });

    first.focus();
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Details for waving hand' }))
      .toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: 'Details for red heart' }))
      .toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(second, { key: 'End' });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'ArrowLeft' });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: 'ArrowRight' });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'ArrowDown' });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Home' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'ArrowUp' });
    expect(first).toHaveFocus();
  });

  it('automatically reveals the next bounded batch near the end of the grid', () => {
    const observer = stubIntersectionObserver();

    render(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        initialPageSize={1}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    expect(observer.observe).toHaveBeenCalledOnce();
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(1);

    act(() => observer.trigger(true));
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(2);
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('leaves the grid untouched when the sentinel is not intersecting', () => {
    const observer = stubIntersectionObserver();

    render(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        initialPageSize={1}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    act(() => observer.trigger(false));
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(1);
  });

  it('stops revealing once every item of the live page is rendered', () => {
    const observer = stubIntersectionObserver();

    render(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        initialPageSize={1}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    act(() => observer.trigger(true));
    act(() => observer.trigger(true));
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(3);

    // Nothing is left to reveal, so the last live observer is now a no-op.
    act(() => observer.trigger(true));
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(3);
    expect(screen.getByText('Showing all 3 emojis')).toBeInTheDocument();
  });

  it('ignores a stale observer callback captured before the items changed', () => {
    const observer = stubIntersectionObserver();
    const { rerender } = render(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        initialPageSize={1}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    rerender(
      <EmojiGrid
        items={[party, heart, wavingHand]}
        initialPageSize={1}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    expect(observer.count()).toBeGreaterThan(1);
    act(() => observer.triggerObserver(0, true));

    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Select partying face' })).toBeInTheDocument();
  });

  it('resets progressive disclosure when the item collection changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        initialPageSize={1}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Show 1 more emoji' }));
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(2);

    rerender(
      <EmojiGrid
        items={[heart, party]}
        initialPageSize={1}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Select red heart' })).toBeVisible();
  });

  it('caps the live window and pages through every emoji without accumulating DOM', async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 481 }, (_, index): EmojiFamily => ({
      ...party,
      id: `party-${index}`,
      order: index,
    }));
    render(
      <EmojiGrid
        items={items}
        initialPageSize={999}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(240);
    await user.click(screen.getByRole('button', { name: 'Show next 240 emojis' }));
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(240);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 241–480 of 481 emojis');

    await user.click(screen.getByRole('button', { name: 'Show next 1 emoji' }));
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Show previous emojis' }));
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(240);
  });

  it('normalizes non-positive, fractional, and non-finite page sizes', () => {
    const { rerender } = render(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        initialPageSize={0}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(1);

    rerender(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        initialPageSize={2.9}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(2);

    rerender(
      <EmojiGrid
        items={[wavingHand, heart, party]}
        initialPageSize={Number.NaN}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId('emoji-tile')).toHaveLength(3);
  });

  it('renders a customizable empty state', () => {
    render(
      <EmojiGrid
        items={[]}
        emptyTitle="Nothing matches"
        emptyMessage="Try a broader feeling."
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Nothing matchesTry a broader feeling.',
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
