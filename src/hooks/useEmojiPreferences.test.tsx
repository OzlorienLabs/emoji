import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  PREFERENCES_STORAGE_KEY,
  createDefaultPreferences,
  type StorageLike,
} from '../lib/preferences';
import { useEmojiPreferences } from './useEmojiPreferences';

function memoryStorage(initial?: string): StorageLike & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
  };
}

describe('useEmojiPreferences', () => {
  it('loads, updates, and persists preferences', () => {
    const storage = memoryStorage(JSON.stringify({ size: 'large', quickCopy: true }));
    const { result } = renderHook(() => useEmojiPreferences({ storage }));

    expect(result.current.preferences.size).toBe('large');
    expect(result.current.preferences.quickCopy).toBe(true);
    act(() => result.current.update({ theme: 'dark' }));

    expect(result.current.preferences.theme).toBe('dark');
    expect(JSON.parse(storage.value ?? '{}')).toMatchObject({ theme: 'dark', size: 'large' });
  });

  it('supports immutable favorite and recent actions', () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useEmojiPreferences({
      storage,
      initial: createDefaultPreferences(),
    }));

    act(() => {
      result.current.toggleFavorite('1F600');
      result.current.remember('1F600');
    });
    expect(result.current.preferences.favoriteIds).toEqual(['1F600']);
    expect(result.current.preferences.recentIds).toEqual(['1F600']);
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toContain('1F600');
  });
});
