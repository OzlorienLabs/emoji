import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_ICON_CATALOG, validateCatalog, validateIconCatalog } from '../data/catalog';
import type { EmojiCatalog, IconCatalog } from '../data/catalog-types';

const EMOJI_CATALOG_URL = '/data/emoji-en-17.0.json';
const ICON_CATALOG_URL = '/data/icons-1.34.json';

export type EmojiCatalogState =
  | { status: 'loading'; retry: () => void }
  | { status: 'error'; message: string; retry: () => void }
  | {
      status: 'ready';
      catalog: EmojiCatalog;
      iconCatalog: IconCatalog;
      iconsLoaded: boolean;
      loadIcons: () => Promise<IconCatalog>;
      retry: () => void;
    };

type InternalCatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      catalog: EmojiCatalog;
      iconCatalog: IconCatalog;
      iconsLoaded: boolean;
    };

export function isSaveDataEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (
    navigator as unknown as {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return Boolean(
    connection?.saveData ||
      connection?.effectiveType === '2g' ||
      connection?.effectiveType === 'slow-2g',
  );
}

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

export interface UseEmojiCatalogOptions {
  deferIcons?: boolean;
}

export function useEmojiCatalog(
  fetcher: typeof fetch = globalThis.fetch,
  options?: UseEmojiCatalogOptions,
): EmojiCatalogState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<InternalCatalogState>({
    status: 'loading',
  });
  const iconCatalogRef = useRef<IconCatalog | null>(null);
  const inFlightIcons = useRef<Promise<IconCatalog> | null>(null);

  const retry = useCallback(() => {
    iconCatalogRef.current = null;
    inFlightIcons.current = null;
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  const loadIcons = useCallback(async (): Promise<IconCatalog> => {
    if (iconCatalogRef.current) {
      return iconCatalogRef.current;
    }
    if (inFlightIcons.current) {
      return inFlightIcons.current;
    }

    const promise = loadIconCatalog(fetcher)
      .then((loadedIcons) => {
        iconCatalogRef.current = loadedIcons;
        setState((current) => {
          if (current.status !== 'ready') return current;
          return {
            ...current,
            iconCatalog: loadedIcons,
            iconsLoaded: true,
          };
        });
        return loadedIcons;
      })
      .finally(() => {
        inFlightIcons.current = null;
      });

    inFlightIcons.current = promise;
    return promise;
  }, [fetcher]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const deferIcons = options?.deferIcons ?? isSaveDataEnabled();

    loadEmojiCatalog(fetcher, controller.signal)
      .then((emojiCatalog) => {
        if (!active) return;
        const currentIcons = iconCatalogRef.current;
        setState({
          status: 'ready',
          catalog: emojiCatalog,
          iconCatalog: currentIcons ?? EMPTY_ICON_CATALOG,
          iconsLoaded: Boolean(currentIcons),
        });
      })
      .catch((error: unknown) => {
        if (active && !controller.signal.aborted) {
          setState({ status: 'error', message: getErrorMessage(error) });
        }
      });

    if (!deferIcons) {
      loadIconCatalog(fetcher, controller.signal)
        .then((loadedIcons) => {
          if (!active) return;
          iconCatalogRef.current = loadedIcons;
          setState((current) => {
            if (current.status !== 'ready') return current;
            return {
              ...current,
              iconCatalog: loadedIcons,
              iconsLoaded: true,
            };
          });
        })
        .catch((error: unknown) => {
          if (!active || controller.signal.aborted) return;
          setState((current) => {
            if (current.status === 'ready') return current;
            return { status: 'error', message: getErrorMessage(error) };
          });
        });
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, fetcher, options?.deferIcons]);

  if (state.status === 'ready') {
    return {
      ...state,
      loadIcons,
      retry,
    };
  }

  return { ...state, retry };
}

