import { useCallback, useEffect, useRef } from 'react';
import type { ContentType } from '../data/catalog-types';

export interface ContentTypeFilterProps {
  value: ContentType;
  onChange: (value: ContentType) => void;
  totalCount?: number;
}

interface FilterOption {
  value: ContentType;
  label: string;
  count?: number;
  icon: string;
}

/**
 * The segmented control. A single gradient pill slides between the buttons
 * instead of each button carrying its own active fill, so the transition reads
 * as one object moving. The pill is measured from the live DOM because the
 * buttons are sized by their own text.
 */
export function ContentTypeFilter({
  value,
  onChange,
  totalCount,
}: ContentTypeFilterProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const options: FilterOption[] = [
    { value: 'all', label: 'All', count: totalCount, icon: '✦' },
    { value: 'emoji', label: 'Emoji', icon: '😀' },
    { value: 'icon', label: 'Icons', icon: '◆' },
  ];

  const movePill = useCallback(() => {
    const pill = pillRef.current;
    const active = groupRef.current?.querySelector<HTMLButtonElement>(
      '[data-active="true"]',
    );
    // Nothing is active while an unknown content type is in play; leave the
    // pill where it is rather than snapping it to the first segment.
    if (!pill || !active) return;
    pill.style.left = `${active.offsetLeft}px`;
    pill.style.width = `${active.offsetWidth}px`;
  }, []);

  useEffect(() => {
    movePill();
    window.addEventListener('resize', movePill);
    return () => window.removeEventListener('resize', movePill);
  }, [movePill, value, totalCount]);

  return (
    <div
      className="content-type-filter"
      ref={groupRef}
      role="tablist"
      aria-label="Filter content type"
    >
      <span className="content-type-filter__pill" ref={pillRef} aria-hidden="true" />
      {options.map((option) => {
        const isSelected = value === option.value;
        const ariaLabel =
          option.count !== undefined
            ? `${option.label} (${option.count.toLocaleString('en-US')})`
            : option.label;
        return (
          <button
            type="button"
            key={option.value}
            role="tab"
            aria-label={ariaLabel}
            aria-selected={isSelected}
            className="content-type-filter__chip"
            data-active={isSelected || undefined}
            onClick={() => onChange(option.value)}
          >
            <span className="content-type-filter__icon" aria-hidden="true">
              {option.icon}
            </span>
            <span>{option.label}</span>
            {option.count !== undefined ? (
              <span className="content-type-filter__count" aria-hidden="true">
                {option.count.toLocaleString('en-US')}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
