export type CategoryId = number | string;

export interface CategoryOption {
  id: CategoryId;
  label: string;
  icon?: string;
}

export interface CategoryNavProps {
  categories: readonly CategoryOption[];
  activeCategory: CategoryId | null;
  onCategoryChange: (category: CategoryId | null) => void;
  ariaLabel?: string;
  allLabel?: string;
}

interface CategoryButtonProps {
  active: boolean;
  icon?: string;
  label: string;
  onClick: () => void;
}

function CategoryButton({ active, icon, label, onClick }: CategoryButtonProps) {
  return (
    <button
      className="category-nav__chip"
      type="button"
      aria-pressed={active}
      aria-current={active ? 'page' : undefined}
      data-active={active || undefined}
      onClick={onClick}
    >
      {icon ? (
        <span className="category-nav__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </button>
  );
}

export function CategoryNav({
  categories,
  activeCategory,
  onCategoryChange,
  ariaLabel = 'Emoji categories',
  allLabel = 'All emojis',
}: CategoryNavProps) {
  return (
    <nav className="category-nav" aria-label={ariaLabel}>
      <div className="category-nav__scroller">
        <CategoryButton
          active={activeCategory === null}
          label={allLabel}
          onClick={() => onCategoryChange(null)}
        />
        {categories.map((category) => (
          <CategoryButton
            key={`${typeof category.id}:${category.id}`}
            active={activeCategory === category.id}
            icon={category.icon}
            label={category.label}
            onClick={() => onCategoryChange(category.id)}
          />
        ))}
      </div>
    </nav>
  );
}
