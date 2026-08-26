import type { ContentType } from '../data/catalog-types';

export interface ContentTypeFilterProps {
  value: ContentType;
  onChange: (value: ContentType) => void;
  emojiCount?: number;
  iconCount?: number;
  totalCount?: number;
}

interface FilterOption {
  value: ContentType;
  label: string;
  count?: number;
  icon: string;
}

export function ContentTypeFilter({
  value,
  onChange,
  emojiCount,
  iconCount,
  totalCount,
}: ContentTypeFilterProps) {
  const options: FilterOption[] = [
    {
      value: 'all',
      label: 'All',
      count: totalCount,
      icon: '✨',
    },
    {
      value: 'emoji',
      label: 'Emojis',
      count: emojiCount,
      icon: '😀',
    },
    {
      value: 'icon',
      label: 'Icons',
      count: iconCount,
      icon: '⚡',
    },
  ];

  return (
    <div className="content-type-filter" role="tablist" aria-label="Filter content type">
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
            {option.icon ? (
              <span className="content-type-filter__icon" aria-hidden="true">
                {option.icon}
              </span>
            ) : null}
            <span>{option.label}</span>
            {option.count !== undefined ? (
              <span className="content-type-filter__count">
                {option.count.toLocaleString('en-US')}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
