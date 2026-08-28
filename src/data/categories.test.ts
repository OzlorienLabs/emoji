import { describe, expect, it } from 'vitest';
import { catalogFixture, iconCatalogFixture } from '../test/catalog-fixture';
import {
  filterCategoriesForContentType,
  resolveCategories,
  resolveCategoryId,
} from './categories';

describe('categories', () => {
  it('resolves categories and combines emoji and icon categories when matching', () => {
    const categories = resolveCategories(catalogFixture, iconCatalogFixture);

    const smileys = categories.find((c) => c.id === 'smileys-emotion');
    expect(smileys).toBeDefined();
    expect(smileys?.hasEmojis).toBe(true);
    expect(smileys?.hasIcons).toBe(false);

    const arrows = categories.find((c) => c.id === 'arrows');
    expect(arrows).toBeDefined();
    expect(arrows?.hasEmojis).toBe(false);
    expect(arrows?.hasIcons).toBe(true);
  });

  it('filters category chips by content type', () => {
    const categories = resolveCategories(catalogFixture, iconCatalogFixture);

    const allOptions = filterCategoriesForContentType(categories, 'all');
    expect(allOptions.some((o) => o.label === 'Smileys & emotion')).toBe(true);
    expect(allOptions.some((o) => o.label === 'Arrows & Navigation')).toBe(true);

    const emojiOptions = filterCategoriesForContentType(categories, 'emoji');
    expect(emojiOptions.some((o) => o.label === 'Smileys & emotion')).toBe(true);
    expect(emojiOptions.some((o) => o.label === 'Arrows & Navigation')).toBe(false);

    const iconOptions = filterCategoriesForContentType(categories, 'icon');
    expect(iconOptions.some((o) => o.label === 'Smileys & emotion')).toBe(false);
    expect(iconOptions.some((o) => o.label === 'Arrows & Navigation')).toBe(true);
  });

  it('resolves URL parameters by numeric ID, category ID, or alias', () => {
    const categories = resolveCategories(catalogFixture, iconCatalogFixture);

    expect(resolveCategoryId('0', categories)).toBe('smileys-emotion');
    expect(resolveCategoryId('smileys-emotion', categories)).toBe('smileys-emotion');
    expect(resolveCategoryId('arrows', categories)).toBe('arrows');
    expect(resolveCategoryId('favorites', categories)).toBe('favorites');
    expect(resolveCategoryId('recent', categories)).toBe('recent');
    expect(resolveCategoryId('9999', categories)).toBeNull();
    expect(resolveCategoryId(null, categories)).toBeNull();
  });
});
