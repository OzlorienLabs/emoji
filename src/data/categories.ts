import type { CategoryOption } from '../components/CategoryNav';
import type { ContentType, EmojiCatalog, IconCatalog } from './catalog-types';

export interface UnifiedCategory {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly emojiGroupKeys: readonly string[];
  readonly iconCategoryIds: readonly string[];
  readonly aliases: readonly (number | string)[];
}

export interface ResolvedCategory {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly emojiGroupIds: readonly number[];
  readonly iconCategoryIds: readonly string[];
  readonly aliases: readonly (number | string)[];
  readonly hasEmojis: boolean;
  readonly hasIcons: boolean;
}

export const STANDARD_COMBINED_CATEGORIES: readonly UnifiedCategory[] = [
  {
    id: 'smileys-emotion',
    label: 'Smileys & emotion',
    icon: '😀',
    emojiGroupKeys: ['smileys-emotion'],
    iconCategoryIds: [],
    aliases: [0, '0', 'smileys-emotion'],
  },
  {
    id: 'people-body',
    label: 'People & body',
    icon: '👋',
    emojiGroupKeys: ['people-body'],
    iconCategoryIds: [],
    aliases: [1, '1', 'people-body'],
  },
  {
    id: 'animals-nature',
    label: 'Animals & Nature',
    icon: '🌿',
    emojiGroupKeys: ['animals-nature'],
    iconCategoryIds: ['weather'],
    aliases: [3, '3', 'animals-nature', 'weather'],
  },
  {
    id: 'food-drink',
    label: 'Food & Drink',
    icon: '🍔',
    emojiGroupKeys: ['food-drink'],
    iconCategoryIds: ['food'],
    aliases: [4, '4', 'food-drink', 'food', 'food-beverage'],
  },
  {
    id: 'travel-places',
    label: 'Travel & Places',
    icon: '🚀',
    emojiGroupKeys: ['travel-places'],
    iconCategoryIds: ['travel'],
    aliases: [5, '5', 'travel-places', 'travel'],
  },
  {
    id: 'activities',
    label: 'Activities',
    icon: '⚽',
    emojiGroupKeys: ['activities'],
    iconCategoryIds: [],
    aliases: [6, '6', 'activities'],
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: '💡',
    emojiGroupKeys: ['objects'],
    iconCategoryIds: ['objects'],
    aliases: [7, '7', 'objects', 'objects-home'],
  },
  {
    id: 'symbols',
    label: 'Symbols & Shapes',
    icon: '✦',
    emojiGroupKeys: ['symbols'],
    iconCategoryIds: ['shapes'],
    aliases: [8, '8', 'symbols', 'shapes'],
  },
  {
    id: 'flags',
    label: 'Flags',
    icon: '🏳️',
    emojiGroupKeys: ['flags'],
    iconCategoryIds: [],
    aliases: [9, '9', 'flags'],
  },
  {
    id: 'component',
    label: 'Components',
    icon: '🏻',
    emojiGroupKeys: ['component'],
    iconCategoryIds: [],
    aliases: [2, '2', 'component'],
  },
  {
    id: 'arrows',
    label: 'Arrows & Navigation',
    icon: '➔',
    emojiGroupKeys: [],
    iconCategoryIds: ['arrows'],
    aliases: ['arrows'],
  },
  {
    id: 'communication',
    label: 'Communication & Social',
    icon: '💬',
    emojiGroupKeys: [],
    iconCategoryIds: ['communication'],
    aliases: ['communication'],
  },
  {
    id: 'interface',
    label: 'Interface & Controls',
    icon: '🔲',
    emojiGroupKeys: [],
    iconCategoryIds: ['interface'],
    aliases: ['interface'],
  },
  {
    id: 'files',
    label: 'Files & Documents',
    icon: '📁',
    emojiGroupKeys: [],
    iconCategoryIds: ['files'],
    aliases: ['files'],
  },
  {
    id: 'devices',
    label: 'Devices & Hardware',
    icon: '💻',
    emojiGroupKeys: [],
    iconCategoryIds: ['devices'],
    aliases: ['devices'],
  },
  {
    id: 'media',
    label: 'Media & Audio',
    icon: '🎵',
    emojiGroupKeys: [],
    iconCategoryIds: ['media'],
    aliases: ['media'],
  },
  {
    id: 'design',
    label: 'Design & Editing',
    icon: '🎨',
    emojiGroupKeys: [],
    iconCategoryIds: ['design'],
    aliases: ['design'],
  },
  {
    id: 'development',
    label: 'Code & Development',
    icon: '🛠️',
    emojiGroupKeys: [],
    iconCategoryIds: ['development'],
    aliases: ['development'],
  },
  {
    id: 'commerce',
    label: 'Commerce & Finance',
    icon: '💳',
    emojiGroupKeys: [],
    iconCategoryIds: ['commerce'],
    aliases: ['commerce'],
  },
  {
    id: 'health',
    label: 'Health & Lifestyle',
    icon: '🧬',
    emojiGroupKeys: [],
    iconCategoryIds: ['health'],
    aliases: ['health'],
  },
];

export function resolveCategories(
  catalog: EmojiCatalog,
  iconCatalog: IconCatalog,
): readonly ResolvedCategory[] {
  const emojiGroupByGroupKey = new Map(catalog.groups.map((g) => [g.key, g.id]));
  const emojiGroupIdsInCatalog = new Set(catalog.groups.map((g) => g.id));
  const iconCategoryIdsInCatalog = new Set(iconCatalog.categories.map((c) => c.id));

  const emojisByGroup = new Set(catalog.emojis.map((e) => e.group));
  const iconsByCategory = new Set(iconCatalog.icons.map((i) => i.category));

  const resolved: ResolvedCategory[] = [];
  const claimedEmojiGroups = new Set<number>();
  const claimedIconCategories = new Set<string>();

  for (const def of STANDARD_COMBINED_CATEGORIES) {
    const emojiGroupIds: number[] = [];
    for (const key of def.emojiGroupKeys) {
      const groupId = emojiGroupByGroupKey.get(key);
      if (groupId !== undefined && emojiGroupIdsInCatalog.has(groupId)) {
        emojiGroupIds.push(groupId);
        claimedEmojiGroups.add(groupId);
      }
    }

    const iconCategoryIds: string[] = [];
    for (const catId of def.iconCategoryIds) {
      if (iconCategoryIdsInCatalog.has(catId)) {
        iconCategoryIds.push(catId);
        claimedIconCategories.add(catId);
      }
    }

    const hasEmojis = emojiGroupIds.some((id) => emojisByGroup.has(id));
    const hasIcons = iconCategoryIds.some((id) => iconsByCategory.has(id));

    if (emojiGroupIds.length > 0 || iconCategoryIds.length > 0) {
      resolved.push({
        id: def.id,
        label: def.label,
        icon: def.icon,
        emojiGroupIds,
        iconCategoryIds,
        aliases: def.aliases,
        hasEmojis,
        hasIcons,
      });
    }
  }

  // Add any extra emoji groups not covered by standard list
  for (const group of catalog.groups) {
    if (!claimedEmojiGroups.has(group.id)) {
      const hasEmojis = emojisByGroup.has(group.id);
      resolved.push({
        id: group.key || `emoji-group-${group.id}`,
        label: group.label,
        icon: '•',
        emojiGroupIds: [group.id],
        iconCategoryIds: [],
        aliases: [group.id, String(group.id), group.key],
        hasEmojis,
        hasIcons: false,
      });
    }
  }

  // Add any extra icon categories not covered by standard list
  for (const cat of iconCatalog.categories) {
    if (!claimedIconCategories.has(cat.id)) {
      const hasIcons = iconsByCategory.has(cat.id);
      resolved.push({
        id: cat.id,
        label: cat.label,
        icon: cat.icon || '⚡',
        emojiGroupIds: [],
        iconCategoryIds: [cat.id],
        aliases: [cat.id],
        hasEmojis: false,
        hasIcons,
      });
    }
  }

  return resolved;
}

export function filterCategoriesForContentType(
  categories: readonly ResolvedCategory[],
  contentType: ContentType,
): readonly CategoryOption[] {
  const options: CategoryOption[] = [
    { id: 'favorites', label: 'Favorites', icon: '★' },
    { id: 'recent', label: 'Recently used', icon: '↺' },
  ];

  for (const cat of categories) {
    if (contentType === 'emoji' && !cat.hasEmojis) continue;
    if (contentType === 'icon' && !cat.hasIcons) continue;
    if (contentType === 'all' && !cat.hasEmojis && !cat.hasIcons) continue;

    options.push({
      id: cat.id,
      label: cat.label,
      icon: cat.icon,
    });
  }

  return options;
}

export function resolveCategoryId(
  groupParam: string | null | undefined,
  categories: readonly ResolvedCategory[],
): string | null {
  if (groupParam === null || groupParam === undefined) return null;
  if (groupParam === 'favorites' || groupParam === 'recent') return groupParam;

  const numeric = Number(groupParam);
  const isNumber = Number.isInteger(numeric) && !Number.isNaN(numeric);

  for (const cat of categories) {
    if (cat.id === groupParam) return cat.id;
    if (cat.aliases.some((alias) => String(alias) === groupParam)) return cat.id;
    if (isNumber && cat.emojiGroupIds.includes(numeric)) return cat.id;
    if (cat.iconCategoryIds.includes(groupParam)) return cat.id;
  }
  return null;
}
