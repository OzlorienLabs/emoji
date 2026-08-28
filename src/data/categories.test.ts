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

  it('handles extra emoji groups and extra icon categories not in standard list', () => {
    const customCatalog = {
      ...catalogFixture,
      groups: [
        ...catalogFixture.groups,
        { id: 99, key: 'custom-emoji-group', label: 'Custom Emoji Group' },
        { id: 100, key: '', label: 'Fallback Emoji Group' },
      ],
      emojis: [
        ...catalogFixture.emojis,
        {
          id: 'custom-emoji',
          glyph: '🧪',
          name: 'test-emoji',
          order: 99,
          version: 1,
          shortcodes: [],
          group: 99,
          subgroup: 0,
          keywords: [],
          variants: [],
        },
      ],
    };

    const customIconCatalog = {
      ...iconCatalogFixture,
      categories: [
        ...iconCatalogFixture.categories,
        { id: 'custom-icons', label: 'Custom Icons', icon: '🎨', count: 1 },
        { id: 'extra-icons-no-icon', label: 'Extra Icons Without Icon', icon: '', count: 0 },
      ],
      icons: [
        ...iconCatalogFixture.icons,
        {
          id: 'custom-icon',
          name: 'custom icon',
          kebabName: 'custom-icon',
          pascalName: 'CustomIcon',
          category: 'custom-icons',
          categoryLabel: 'Custom Icons',
          tags: ['custom'],
          nodes: [],
          order: 100,
        },
      ],
    };

    const categories = resolveCategories(customCatalog, customIconCatalog);
    const customGroup = categories.find((c) => c.id === 'custom-emoji-group');
    expect(customGroup).toBeDefined();
    expect(customGroup?.hasEmojis).toBe(true);

    const fallbackGroup = categories.find((c) => c.id === 'emoji-group-100');
    expect(fallbackGroup).toBeDefined();
    expect(fallbackGroup?.hasEmojis).toBe(false);

    const customIcons = categories.find((c) => c.id === 'custom-icons');
    expect(customIcons).toBeDefined();
    expect(customIcons?.hasIcons).toBe(true);

    const extraIcons = categories.find((c) => c.id === 'extra-icons-no-icon');
    expect(extraIcons).toBeDefined();
    expect(extraIcons?.icon).toBe('⚡');
    expect(extraIcons?.hasIcons).toBe(false);

    // Test filterCategoriesForContentType with category having neither emoji nor icon
    const filteredAll = filterCategoriesForContentType(categories, 'all');
    expect(filteredAll.some((c) => c.id === 'extra-icons-no-icon')).toBe(false);
  });

  it('resolves category ID by icon category ID even when aliases do not match', () => {
    const customCategories = [
      {
        id: 'test-cat',
        label: 'Test Category',
        icon: '★',
        emojiGroupIds: [],
        iconCategoryIds: ['secret-icon-cat'],
        aliases: [],
        hasEmojis: false,
        hasIcons: true,
      },
    ];

    expect(resolveCategoryId('secret-icon-cat', customCategories)).toBe('test-cat');
  });
});
