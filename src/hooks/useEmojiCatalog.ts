import { useCallback, useEffect, useState } from 'react';
import { validateCatalog } from '../data/catalog';
import type { EmojiCatalog } from '../data/catalog-types';

const CATALOG_URL = '/data/emoji-en-17.0.json';

export type EmojiCatalogState =
  | { status: 'loading'; retry: () => void }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; catalog: EmojiCatalog; retry: () => void };

type InternalCatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: EmojiCatalog };

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

export async function loadEmojiCatalog(
  fetcher: typeof fetch = globalThis.fetch,
  signal?: AbortSignal,
): Promise<EmojiCatalog> {
  const response = await fetcher(CATALOG_URL, { signal });

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Emoji catalog could not be loaded.';
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

    loadEmojiCatalog(fetcher, controller.signal)
      .then((catalog) => {
        if (active) setState({ status: 'ready', catalog });
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
