import { useCallback, useEffect, useState } from 'react';
import { validateCatalog, validateIconCatalog } from '../data/catalog';
import type { EmojiCatalog, IconCatalog } from '../data/catalog-types';

const EMOJI_CATALOG_URL = '/data/emoji-en-17.0.json';
const ICON_CATALOG_URL = '/data/icons-1.34.json';

export type EmojiCatalogState =
  | { status: 'loading'; retry: () => void }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; catalog: EmojiCatalog; iconCatalog: IconCatalog; retry: () => void };

type InternalCatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: EmojiCatalog; iconCatalog: IconCatalog };

function isCatalogPayload(value: unknown): value is EmojiCatalog {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<EmojiCatalog>;
  return (
    typeof candidate.source === 'string' &&
    typeof candidate.totalCount === 'number' &&
    Array.isArray(candidate.groups) &&
    Array.isArray(candidate.subgroups) &&
    Array.isArray(candidate.emojis)
  );
}

function isIconCatalogPayload(value: unknown): value is IconCatalog {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<IconCatalog>;
  return (
    typeof candidate.source === 'string' &&
    typeof candidate.totalCount === 'number' &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.icons)
  );
}

export async function loadEmojiCatalog(
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal,
): Promise<EmojiCatalog> {
  const response = await fetcher(EMOJI_CATALOG_URL, { signal });

  if (!response.ok) {
    throw new Error(`Emoji catalog request failed (${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!isCatalogPayload(payload)) {
    throw new Error('Emoji catalog response was malformed.');
  }

  const issues = validateCatalog(payload);
  if (issues.length > 0) {
    throw new Error(`Emoji catalog could not be verified: ${issues.join(' ')}`);
  }

  return payload;
}

export async function loadIconCatalog(
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal,
): Promise<IconCatalog> {
  const response = await fetcher(ICON_CATALOG_URL, { signal });

  if (!response.ok) {
    throw new Error(`Icon catalog request failed (${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!isIconCatalogPayload(payload)) {
    throw new Error('Icon catalog response was malformed.');
  }

  const issues = validateIconCatalog(payload);
  if (issues.length > 0) {
    throw new Error(`Icon catalog could not be verified: ${issues.join(' ')}`);
  }

  return payload;
}

export async function loadCatalogs(
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal,
): Promise<{ catalog: EmojiCatalog; iconCatalog: IconCatalog }> {
  const [catalog, iconCatalog] = await Promise.all([
    loadEmojiCatalog(fetcher, signal),
    loadIconCatalog(fetcher, signal),
  ]);
  return { catalog, iconCatalog };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Catalog could not be loaded.';
}

export function useEmojiCatalog(fetcher: typeof fetch = globalThis.fetch): EmojiCatalogState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<InternalCatalogState>({
    status: 'loading',
  });
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    loadCatalogs(fetcher, controller.signal)
      .then(({ catalog, iconCatalog }) => {
        if (active) setState({ status: 'ready', catalog, iconCatalog });
      })
      .catch((error: unknown) => {
        if (active && !controller.signal.aborted) {
          setState({ status: 'error', message: getErrorMessage(error) });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, fetcher]);

  return { ...state, retry };
}
