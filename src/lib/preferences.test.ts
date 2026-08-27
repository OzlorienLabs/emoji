// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  addRecent,
  DEFAULT_PREFERENCES,
  loadPreferences,
  MAX_FAVORITES,
  MAX_RECENTS,
  PREFERENCES_STORAGE_KEY,
  sanitizePreferences,
  savePreferences,
  toggleFavorite,
  updatePreferences,
  type StorageLike,
} from './preferences';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('sanitizePreferences', () => {
  it('accepts every supported preference', () => {
    expect(
      sanitizePreferences({
        size: 'large',
        style: 'text',
        tone: 5,
        theme: 'dark',
        quickCopy: true,
        contentType: 'icon',
        iconCopyFormat: 'jsx',
        favoriteIds: ['wave', 'heart', 'arrow-right'],
        recentIds: ['smile', 'party', 'download'],
      }),
    ).toEqual({
      size: 'large',
      style: 'text',
      tone: 5,
      theme: 'dark',
      quickCopy: true,
      contentType: 'icon',
      iconCopyFormat: 'jsx',
      favoriteIds: ['wave', 'heart', 'arrow-right'],
      recentIds: ['smile', 'party', 'download'],
    });
  });

  it('defaults invalid fields independently and ignores unknown state', () => {
    expect(
      sanitizePreferences({
        size: 'huge',
        style: null,
        tone: 9,
        theme: 'midnight',
        quickCopy: 'yes',
        contentType: 'unknown-mode',
        iconCopyFormat: 'invalid-format',
        favoriteIds: 'wave',
        recentIds: {},
        searchText: 'private query',
        composerText: 'not persisted',
      }),
    ).toEqual(DEFAULT_PREFERENCES);
  });

  it('trims, deduplicates, validates, and caps stored IDs', () => {
    const favoriteIds = [
      ' wave ',
      'wave',
      '',
      42,
      ...Array.from({ length: 250 }, (_, index) => `favorite-${index}`),
    ];
    const recentIds = [
      ' smile ',
      'smile',
      null,
      ...Array.from({ length: 60 }, (_, index) => `recent-${index}`),
    ];

    const preferences = sanitizePreferences({ favoriteIds, recentIds });

    expect(preferences.favoriteIds).toHaveLength(200);
    expect(preferences.favoriteIds.slice(0, 3)).toEqual([
      'wave',
      'favorite-0',
      'favorite-1',
    ]);
    expect(preferences.recentIds).toHaveLength(48);
    expect(preferences.recentIds.slice(0, 3)).toEqual([
      'smile',
      'recent-0',
      'recent-1',
    ]);
  });
});

describe('loadPreferences', () => {
  it('loads and sanitizes a stored payload', () => {
    const storage = new MemoryStorage();
    storage.values.set(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ size: 'small', tone: 3, quickCopy: true, theme: false }),
    );

    expect(loadPreferences(storage)).toEqual({
      ...DEFAULT_PREFERENCES,
      size: 'small',
      tone: 3,
      quickCopy: true,
    });
  });

  it.each([null, '', '{broken', 'false', '[]'])(
    'returns fresh defaults for absent or corrupt storage: %j',
    (storedValue) => {
      const storage = new MemoryStorage();
      if (storedValue !== null) {
        storage.values.set(PREFERENCES_STORAGE_KEY, storedValue);
      }

      const loaded = loadPreferences(storage);

      expect(loaded).toEqual(DEFAULT_PREFERENCES);
      expect(loaded.favoriteIds).not.toBe(DEFAULT_PREFERENCES.favoriteIds);
      expect(loaded.recentIds).not.toBe(DEFAULT_PREFERENCES.recentIds);
    },
  );

  it('returns defaults when storage access throws or is unavailable', () => {
    const throwingStorage: StorageLike = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => undefined,
    };

    expect(loadPreferences(throwingStorage)).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('savePreferences', () => {
  it('persists only a sanitized allowlist and round-trips it', () => {
    const storage = new MemoryStorage();
    const stateWithEphemeralText = {
      size: 'large',
      style: 'text',
      tone: 4,
      theme: 'light',
      quickCopy: true,
      contentType: 'all',
      iconCopyFormat: 'svg',
      favoriteIds: ['heart', 'heart', 'arrow-right'],
      recentIds: ['wave'],
      searchText: 'sympathy',
      composerText: '❤️',
      anotherTransientField: 'discard me',
    };

    expect(savePreferences(stateWithEphemeralText, storage)).toBe(true);
    expect(JSON.parse(storage.values.get(PREFERENCES_STORAGE_KEY)!)).toEqual({
      size: 'large',
      style: 'text',
      tone: 4,
      theme: 'light',
      quickCopy: true,
      contentType: 'all',
      iconCopyFormat: 'svg',
      favoriteIds: ['heart', 'arrow-right'],
      recentIds: ['wave'],
    });
    expect(loadPreferences(storage)).toEqual({
      size: 'large',
      style: 'text',
      tone: 4,
      theme: 'light',
      quickCopy: true,
      contentType: 'all',
      iconCopyFormat: 'svg',
      favoriteIds: ['heart', 'arrow-right'],
      recentIds: ['wave'],
    });
  });

  it('reports storage failures without throwing', () => {
    const throwingStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };

    expect(savePreferences(DEFAULT_PREFERENCES, throwingStorage)).toBe(false);
    expect(savePreferences(DEFAULT_PREFERENCES, null)).toBe(false);
    expect(savePreferences(DEFAULT_PREFERENCES)).toBe(false);
  });
});

describe('preference updates', () => {
  it('applies an immutable, schema-safe partial update', () => {
    const original = sanitizePreferences({
      size: 'small',
      favoriteIds: ['heart'],
      recentIds: ['wave'],
    });
    const patch = {
      size: 'large' as const,
      theme: 'dark' as const,
      contentType: 'icon' as const,
      iconCopyFormat: 'jsx' as const,
      searchText: 'do not retain',
    };

    const updated = updatePreferences(original, patch);

    expect(updated).toEqual({
      ...original,
      size: 'large',
      theme: 'dark',
      contentType: 'icon',
      iconCopyFormat: 'jsx',
    });
    expect(original.size).toBe('small');
    expect(updated).not.toBe(original);
  });

  it('toggles a normalized favorite without mutating the source', () => {
    const original = sanitizePreferences({ favoriteIds: ['heart'] });

    const added = toggleFavorite(original, ' wave ');
    const addedIcon = toggleFavorite(added, 'arrow-right');
    const removed = toggleFavorite(addedIcon, 'heart');

    expect(original.favoriteIds).toEqual(['heart']);
    expect(added.favoriteIds).toEqual(['wave', 'heart']);
    expect(addedIcon.favoriteIds).toEqual(['arrow-right', 'wave', 'heart']);
    expect(removed.favoriteIds).toEqual(['arrow-right', 'wave']);
  });

  it('keeps favorites unique and capped after an update', () => {
    const original = sanitizePreferences({
      favoriteIds: Array.from({ length: MAX_FAVORITES }, (_, index) => `id-${index}`),
    });

    const updated = toggleFavorite(original, 'new-id');

    expect(updated.favoriteIds).toHaveLength(MAX_FAVORITES);
    expect(updated.favoriteIds[0]).toBe('new-id');
    expect(new Set(updated.favoriteIds)).toHaveLength(MAX_FAVORITES);
  });

  it('moves a recent ID to the front and caps the history', () => {
    const original = sanitizePreferences({
      recentIds: Array.from({ length: MAX_RECENTS }, (_, index) => `id-${index}`),
    });

    const moved = addRecent(original, ' id-10 ');
    const added = addRecent(moved, 'new-id');

    expect(moved.recentIds[0]).toBe('id-10');
    expect(moved.recentIds.filter((id) => id === 'id-10')).toHaveLength(1);
    expect(added.recentIds).toHaveLength(MAX_RECENTS);
    expect(added.recentIds[0]).toBe('new-id');
    expect(original.recentIds[0]).toBe('id-0');
  });

  it('treats blank favorite and recent IDs as no-op values', () => {
    const original = sanitizePreferences({ favoriteIds: ['heart'], recentIds: ['wave'] });

    expect(toggleFavorite(original, '   ')).toEqual(original);
    expect(addRecent(original, '')).toEqual(original);
  });
});
