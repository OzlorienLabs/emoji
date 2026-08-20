import { useCallback, useEffect, useState } from 'react';
import {
  addRecent,
  loadPreferences,
  savePreferences,
  sanitizePreferences,
  toggleFavorite,
  updatePreferences,
  type EmojiPreferences,
  type StorageLike,
} from '../lib/preferences';

interface UseEmojiPreferencesOptions {
  initial?: EmojiPreferences;
  storage?: StorageLike | null;
}

export interface EmojiPreferenceController {
  preferences: EmojiPreferences;
  update: (patch: Partial<EmojiPreferences>) => void;
  toggleFavorite: (id: string) => void;
  remember: (id: string) => void;
}

export function useEmojiPreferences(
  options: UseEmojiPreferencesOptions = {},
): EmojiPreferenceController {
  const { initial, storage } = options;
  const [preferences, setPreferences] = useState<EmojiPreferences>(() =>
    initial ? sanitizePreferences(initial) : loadPreferences(storage),
  );

  useEffect(() => {
    savePreferences(preferences, storage);
  }, [preferences, storage]);

  const update = useCallback((patch: Partial<EmojiPreferences>) => {
    setPreferences((current) => updatePreferences(current, patch));
  }, []);
  const toggleFavoriteId = useCallback((id: string) => {
    setPreferences((current) => toggleFavorite(current, id));
  }, []);
  const remember = useCallback((id: string) => {
    setPreferences((current) => addRecent(current, id));
  }, []);

  return {
    preferences,
    update,
    toggleFavorite: toggleFavoriteId,
    remember,
  };
}
