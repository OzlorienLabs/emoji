import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CategoryNav } from './CategoryNav';

const categories = [
  { id: 0, label: 'Smileys & Emotion', icon: '😀' },
  { id: 1, label: 'People & Body', icon: '👋' },
  { id: 'favorites', label: 'Favorites', icon: '★' },
] as const;

describe('CategoryNav', () => {
  it('renders an accessible All option and labeled category chips', () => {
    render(
      <CategoryNav
        categories={categories}
        activeCategory={null}
        onCategoryChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Emoji categories' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'All emojis' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Smileys & Emotion' })).toHaveTextContent(
      '😀Smileys & Emotion',
    );
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('marks the selected category and reports category changes', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    render(
      <CategoryNav
        categories={categories}
        activeCategory="favorites"
        onCategoryChange={onCategoryChange}
      />,
    );

    const favoriteButton = screen.getByRole('button', { name: 'Favorites' });
    expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
    expect(favoriteButton).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'People & Body' }));
    await user.click(screen.getByRole('button', { name: 'All emojis' }));

    expect(onCategoryChange).toHaveBeenNthCalledWith(1, 1);
    expect(onCategoryChange).toHaveBeenNthCalledWith(2, null);
  });

  it('supports a custom navigation and All label', () => {
    render(
      <CategoryNav
        ariaLabel="Browse collections"
        allLabel="Everything"
        categories={[]}
        activeCategory={null}
        onCategoryChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Browse collections' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Everything' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('clears the filter when the active chip is tapped again', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    render(
      <CategoryNav
        categories={categories}
        activeCategory={0}
        onCategoryChange={onCategoryChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Smileys & Emotion' }));
    expect(onCategoryChange).toHaveBeenCalledWith(null);
  });

  it('renders a chip without an icon', () => {
    render(
      <CategoryNav
        categories={[{ id: 'plain', label: 'Uncategorised' }]}
        activeCategory={null}
        onCategoryChange={vi.fn()}
      />,
    );

    const chip = screen.getByRole('button', { name: 'Uncategorised' });
    expect(chip).toHaveTextContent('Uncategorised');
    expect(chip.querySelector('.category-nav__icon')).toBeNull();
  });
});
