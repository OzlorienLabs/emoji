import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type {
  EmojiFamily,
  EmojiSize,
  EmojiStyle,
  EmojiVariant,
  SearchableEmoji,
} from '../data/catalog-types';
import {
  getDisplayGlyph,
  selectToneVariant,
  type ToneSelection,
} from '../lib/variants';

const DEFAULT_PAGE_SIZE = 120;
const MAX_LIVE_ITEMS = 240;

export type EmojiGridItem = EmojiFamily | SearchableEmoji;

export interface EmojiGridProps {
  items: readonly EmojiGridItem[];
  onSelect: (emoji: EmojiVariant, source: EmojiGridItem) => void;
  onDetails: (source: EmojiGridItem, emoji: EmojiVariant) => void;
  style?: EmojiStyle;
  size?: EmojiSize;
  tone?: ToneSelection;
  initialPageSize?: number;
  actionLabel?: string;
  id?: string;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

interface GridState {
  items: readonly EmojiGridItem[];
  pageSize: number;
  visibleCount: number;
  focusedIndex: number;
  offset: number;
}

function pageSizeWithinLimit(pageSize: number): number {
  if (!Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_LIVE_ITEMS, Math.max(1, Math.floor(pageSize)));
}

function isEmojiFamily(item: EmojiGridItem): item is EmojiFamily {
  return 'variants' in item;
}

function displayedEmoji(item: EmojiGridItem, tone: ToneSelection): EmojiVariant {
  return isEmojiFamily(item) ? selectToneVariant(item, tone) : item;
}

export function EmojiGrid({
  items,
  onSelect,
  onDetails,
  style = 'native',
  size = 'medium',
  tone = 0,
  initialPageSize = DEFAULT_PAGE_SIZE,
  actionLabel = 'Select',
  id,
  ariaLabel = 'Emoji results',
  emptyTitle = 'No emojis found',
  emptyMessage = 'Try another word, feeling, or idea.',
}: EmojiGridProps) {
  const pageSize = pageSizeWithinLimit(initialPageSize);
  const [gridState, setGridState] = useState<GridState>(() => ({
    items,
    pageSize,
    visibleCount: pageSize,
    focusedIndex: 0,
    offset: 0,
  }));
  const gridRef = useRef<HTMLUListElement | null>(null);
  const revealSentinelRef = useRef<HTMLDivElement | null>(null);
  let currentState = gridState;

  if (gridState.items !== items || gridState.pageSize !== pageSize) {
    currentState = {
      items,
      pageSize,
      visibleCount: pageSize,
      focusedIndex: 0,
      offset: 0,
    };
    setGridState(currentState);
  }

  const visibleItems = items.slice(
    currentState.offset,
    currentState.offset + currentState.visibleCount,
  );
  const endIndex = currentState.offset + visibleItems.length;
  const remainingCount = Math.max(0, items.length - endIndex);
  const revealCount = Math.min(
    pageSize,
    remainingCount,
    MAX_LIVE_ITEMS - visibleItems.length,
  );
  const nextPageCount = Math.min(MAX_LIVE_ITEMS, remainingCount);

  useEffect(() => {
    const sentinel = revealSentinelRef.current;
    if (!sentinel || revealCount <= 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setGridState((current) => {
        if (current.items !== items || current.pageSize !== pageSize) return current;
        const liveCount = Math.min(
          current.visibleCount,
          Math.max(0, items.length - current.offset),
        );
        const remaining = Math.max(0, items.length - current.offset - liveCount);
        const count = Math.min(
          current.pageSize,
          remaining,
          MAX_LIVE_ITEMS - liveCount,
        );
        return count > 0
          ? { ...current, visibleCount: current.visibleCount + count }
          : current;
      });
    }, { rootMargin: '320px 0px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentState.offset, currentState.visibleCount, items, pageSize, revealCount]);

  if (items.length === 0) {
    return (
      <div className="emoji-grid__empty" role="status">
        <h2>{emptyTitle}</h2>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const moveFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let targetIndex: number | undefined;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = Math.min(currentIndex + 1, visibleItems.length - 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = visibleItems.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setGridState((current) => ({ ...current, focusedIndex: targetIndex }));
    const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>(
      '[data-emoji-action="select"]',
    );
    buttons?.[targetIndex]?.focus();
  };

  return (
    <section className="emoji-grid" aria-label={ariaLabel} data-size={size}>
      <ul id={id} ref={gridRef} className="emoji-grid__list" role="list">
        {visibleItems.map((item, index) => {
          const emoji = displayedEmoji(item, tone);
          return (
            <li key={item.id} className="emoji-tile" data-testid="emoji-tile">
              <button
                className="emoji-tile__select"
                type="button"
                aria-label={`${actionLabel} ${emoji.name}`}
                data-emoji-action="select"
                tabIndex={index === currentState.focusedIndex ? 0 : -1}
                onClick={() => onSelect(emoji, item)}
                onFocus={() =>
                  setGridState((current) => ({ ...current, focusedIndex: index }))
                }
                onKeyDown={(event) => moveFocus(event, index)}
              >
                <span className="emoji-tile__glyph" aria-hidden="true">
                  {getDisplayGlyph(emoji, style)}
                </span>
                <span className="emoji-tile__name">{emoji.name}</span>
              </button>
              <button
                className="emoji-tile__details"
                type="button"
                aria-label={`Details for ${emoji.name}`}
                tabIndex={index === currentState.focusedIndex ? 0 : -1}
                onFocus={() =>
                  setGridState((current) => ({ ...current, focusedIndex: index }))
                }
                onClick={() => onDetails(item, emoji)}
              >
                Details
              </button>
            </li>
          );
        })}
      </ul>
      {revealCount > 0 ? (
        <div
          ref={revealSentinelRef}
          className="emoji-grid__sentinel"
          aria-hidden="true"
        />
      ) : null}
      <p className="emoji-grid__status" role="status" aria-live="polite">
        {currentState.offset > 0
          ? `Showing ${currentState.offset + 1}–${endIndex} of ${items.length} emojis`
          : remainingCount > 0
            ? `Showing ${visibleItems.length} of ${items.length} emojis`
            : `Showing all ${items.length} ${items.length === 1 ? 'emoji' : 'emojis'}`}
      </p>
      <div className="emoji-grid__pagination">
        {currentState.offset > 0 ? (
          <button
            className="emoji-grid__more"
            type="button"
            onClick={() => setGridState((current) => ({
              ...current,
              offset: Math.max(0, current.offset - MAX_LIVE_ITEMS),
              visibleCount: MAX_LIVE_ITEMS,
              focusedIndex: 0,
            }))}
          >
            Show previous emojis
          </button>
        ) : null}
        {revealCount > 0 ? (
          <button
            className="emoji-grid__more"
            type="button"
            onClick={() => setGridState((current) => ({
              ...current,
              visibleCount: current.visibleCount + revealCount,
            }))}
          >
            Show {revealCount} more {revealCount === 1 ? 'emoji' : 'emojis'}
          </button>
        ) : remainingCount > 0 ? (
          <button
            className="emoji-grid__more"
            type="button"
            onClick={() => setGridState((current) => ({
              ...current,
              offset: endIndex,
              visibleCount: pageSize,
              focusedIndex: 0,
            }))}
          >
            Show next {nextPageCount} {nextPageCount === 1 ? 'emoji' : 'emojis'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
