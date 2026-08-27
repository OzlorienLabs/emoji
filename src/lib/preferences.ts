import type {
  ContentType,
  EmojiSize as CatalogEmojiSize,
  EmojiStyle as CatalogEmojiStyle,
  IconCopyFormat,
} from '../data/catalog-types';

export type EmojiSize = CatalogEmojiSize;
export type EmojiStyle = CatalogEmojiStyle;
export type EmojiTone = 0 | 1 | 2 | 3 | 4 | 5;
export type ThemePreference = 'system' | 'light' | 'dark';

export interface EmojiPreferences {
  size: EmojiSize;
  style: EmojiStyle;
  tone: EmojiTone;
  theme: ThemePreference;
  quickCopy: boolean;
  contentType: ContentType;
  iconCopyFormat: IconCopyFormat;
  favoriteIds: readonly string[];
  recentIds: readonly string[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PREFERENCES_STORAGE_KEY = 'emoji-compass:preferences';
export const MAX_FAVORITES = 200;
export const MAX_RECENTS = 48;

export const DEFAULT_PREFERENCES: Readonly<EmojiPreferences> = Object.freeze({
  size: 'medium',
  style: 'native',
  tone: 0,
  theme: 'light',
  quickCopy: false,
  contentType: 'all',
  iconCopyFormat: 'svg',
  favoriteIds: Object.freeze([]) as readonly string[],
  recentIds: Object.freeze([]) as readonly string[],
});

export function createDefaultPreferences(): EmojiPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    favoriteIds: [],
    recentIds: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeIds(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== 'string') continue;
    const id = candidate.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length === limit) break;
  }
  return ids;
}

export function sanitizePreferences(value: unknown): EmojiPreferences {
  if (!isRecord(value)) return createDefaultPreferences();

  const {
    size,
    style,
    tone,
    theme,
    quickCopy,
    contentType,
    iconCopyFormat,
    favoriteIds,
    recentIds,
  } = value;

  return {
    size: size === 'small' || size === 'medium' || size === 'large' ? size : 'medium',
    style: style === 'native' || style === 'text' ? style : 'native',
    tone:
      tone === 0 || tone === 1 || tone === 2 || tone === 3 || tone === 4 || tone === 5
        ? tone
        : 0,
    theme: theme === 'system' || theme === 'light' || theme === 'dark' ? theme : 'light',
    quickCopy: typeof quickCopy === 'boolean' ? quickCopy : false,
    contentType:
      contentType === 'all' || contentType === 'emoji' || contentType === 'icon'
        ? contentType
        : 'all',
    iconCopyFormat:
      iconCopyFormat === 'svg' ||
      iconCopyFormat === 'jsx' ||
      iconCopyFormat === 'name' ||
      iconCopyFormat === 'html'
        ? iconCopyFormat
        : 'svg',
    favoriteIds: sanitizeIds(favoriteIds, MAX_FAVORITES),
    recentIds: sanitizeIds(recentIds, MAX_RECENTS),
  };
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadPreferences(storage?: StorageLike | null): EmojiPreferences {
  try {
    const stored = resolveStorage(storage)?.getItem(PREFERENCES_STORAGE_KEY);
    return stored ? sanitizePreferences(JSON.parse(stored) as unknown) : createDefaultPreferences();
  } catch {
    return createDefaultPreferences();
  }
}

export function savePreferences(
  preferences: unknown,
  storage?: StorageLike | null,
): boolean {
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(sanitizePreferences(preferences)));
    return true;
  } catch {
    return false;
  }
}

export function updatePreferences(
  current: EmojiPreferences,
  patch: Partial<EmojiPreferences>,
): EmojiPreferences {
  return sanitizePreferences({ ...current, ...patch });
}

function normalizeId(value: string): string | undefined {
  const id = value.trim();
  return id || undefined;
}

export function toggleFavorite(
  current: EmojiPreferences,
  rawId: string,
): EmojiPreferences {
  const preferences = sanitizePreferences(current);
  const id = normalizeId(rawId);
  if (!id) return preferences;

  const favoriteIds = preferences.favoriteIds.includes(id)
    ? preferences.favoriteIds.filter((favoriteId) => favoriteId !== id)
    : [id, ...preferences.favoriteIds].slice(0, MAX_FAVORITES);

  return { ...preferences, favoriteIds };
}

export function addRecent(current: EmojiPreferences, rawId: string): EmojiPreferences {
  const preferences = sanitizePreferences(current);
  const id = normalizeId(rawId);
  if (!id) return preferences;

  return {
    ...preferences,
    recentIds: [
      id,
      ...preferences.recentIds.filter((recentId) => recentId !== id),
    ].slice(0, MAX_RECENTS),
  };
}
