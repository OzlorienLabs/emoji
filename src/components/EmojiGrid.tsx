import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import type {
  EmojiFamily,
  EmojiSize,
  EmojiStyle,
  EmojiVariant,
  IconRecord,
  SearchableEmoji,
  SearchableIcon,
} from '../data/catalog-types';
import {
  getDisplayGlyph,
  selectToneVariant,
  type ToneSelection,
} from '../lib/variants';
import { IconSvg } from './IconSvg';

const DEFAULT_PAGE_SIZE = 120;
const MAX_LIVE_ITEMS = 240;

export type EmojiGridItem =
  | EmojiFamily
  | SearchableEmoji
  | IconRecord
  | SearchableIcon;

export type GridSelectableItem = EmojiVariant | IconRecord;

export interface EmojiGridProps {
  items: readonly EmojiGridItem[];
  onSelect: (item: GridSelectableItem, source: EmojiGridItem, tile: HTMLElement) => void;
  onDetails: (source: EmojiGridItem, item: GridSelectableItem) => void;
  style?: EmojiStyle;
  size?: EmojiSize;
  tone?: ToneSelection;
  initialPageSize?: number;
  actionLabel?: string;
  itemNoun?: string;
  id?: string;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Exposes the list element so the app can stagger its entrance. */
  gridRef?: RefObject<HTMLUListElement | null>;
  /** Hover tooltip for a tile — the design shows "{name} · {category}". */
  titleFor?: (source: EmojiGridItem, display: GridSelectableItem) => string;
  /** Rendered inside the empty state, under the message. */
  emptyAction?: ReactNode;
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

function isIconItem(item: EmojiGridItem): item is IconRecord | SearchableIcon {
  return 'nodes' in item;
}

function isEmojiFamily(item: EmojiGridItem): item is EmojiFamily {
  return 'variants' in item;
}

function displayedItem(item: EmojiGridItem, tone: ToneSelection): GridSelectableItem {
  if (isIconItem(item)) return item;
  return isEmojiFamily(item) ? selectToneVariant(item, tone) : item;
}

const ICON_PIXEL_SIZES: Record<EmojiSize, number> = {
  small: 22,
  medium: 30,
  large: 42,
};

export function EmojiGrid({
  items,
  onSelect,
  onDetails,
  style = 'native',
  size = 'medium',
  tone = 0,
  initialPageSize = DEFAULT_PAGE_SIZE,
  actionLabel = 'Select',
  itemNoun = 'emoji',
  id,
  ariaLabel = 'Catalog results',
  emptyTitle = 'No items found',
  emptyMessage = 'Try another word, feeling, or idea.',
  gridRef: externalGridRef,
  titleFor,
  emptyAction,
}: EmojiGridProps) {
  const pageSize = pageSizeWithinLimit(initialPageSize);
  const [gridState, setGridState] = useState<GridState>(() => ({
    items,
    pageSize,
    visibleCount: pageSize,
    focusedIndex: 0,
    offset: 0,
  }));
  const internalGridRef = useRef<HTMLUListElement | null>(null);
  const gridRef = externalGridRef ?? internalGridRef;
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
    }, { rootMargin: '600px 0px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentState.offset, currentState.visibleCount, items, pageSize, revealCount]);

  if (items.length === 0) {
    return (
      <div className="emoji-grid__empty" role="status">
        <span className="emoji-grid__empty-mark" aria-hidden="true">🧭</span>
        <h2>{emptyTitle}</h2>
        <p>{emptyMessage}</p>
        {emptyAction}
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

  const iconPx = ICON_PIXEL_SIZES[size] ?? 30;

  return (
    <section className="emoji-grid" aria-label={ariaLabel} data-size={size}>
      <ul id={id} ref={gridRef} className="emoji-grid__list" role="list">
        {visibleItems.map((item, index) => {
          const display = displayedItem(item, tone);
          const isIcon = isIconItem(item);
          return (
            <li
              key={item.id}
              className="emoji-tile"
              data-testid="emoji-tile"
              data-kind={isIcon ? 'icon' : 'emoji'}
            >
              <button
                className="emoji-tile__select"
                type="button"
                aria-label={`${actionLabel} ${display.name}`}
                title={titleFor?.(item, display) ?? display.name}
                data-emoji-action="select"
                tabIndex={index === currentState.focusedIndex ? 0 : -1}
                onClick={(event) => onSelect(display, item, event.currentTarget)}
                onFocus={() =>
                  setGridState((current) => ({ ...current, focusedIndex: index }))
                }
                onKeyDown={(event) => moveFocus(event, index)}
              >
                <span className="emoji-tile__glyph" aria-hidden="true">
                  {isIcon ? (
                    <IconSvg nodes={(item as IconRecord).nodes} size={iconPx} strokeWidth={1.7} />
                  ) : (
                    getDisplayGlyph(display as EmojiVariant, style)
                  )}
                </span>
                <span className="emoji-tile__name">{display.name}</span>
              </button>
              <button
                className="emoji-tile__details"
                type="button"
                aria-label={`Details for ${display.name}`}
                tabIndex={index === currentState.focusedIndex ? 0 : -1}
                onFocus={() =>
                  setGridState((current) => ({ ...current, focusedIndex: index }))
                }
                onClick={(event) => {
                  event.stopPropagation();
                  onDetails(item, display);
                }}
              >
                <span aria-hidden="true">i</span>
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
          ? `Showing ${currentState.offset + 1}–${endIndex} of ${items.length} ${itemNoun}s`
          : remainingCount > 0
            ? `Showing ${visibleItems.length} of ${items.length} ${itemNoun}s`
            : `Showing all ${items.length} ${items.length === 1 ? itemNoun : `${itemNoun}s`}`}
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
            Show previous {itemNoun}s
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
            Show {revealCount} more {revealCount === 1 ? itemNoun : `${itemNoun}s`}
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
            Show next {nextPageCount} {nextPageCount === 1 ? itemNoun : `${itemNoun}s`}
          </button>
        ) : null}
      </div>
    </section>
  );
}
