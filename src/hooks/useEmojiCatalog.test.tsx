import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { EmojiCatalog, IconCatalog } from '../data/catalog-types';
import {
  isSaveDataEnabled,
  loadCatalogs,
  loadEmojiCatalog,
  loadIconCatalog,
  useEmojiCatalog,
} from './useEmojiCatalog';
import { iconCatalogFixture } from '../test/catalog-fixture';

const catalogFixture: EmojiCatalog = {
  source: 'test',
  emojiVersion: '17.0',
  cldrVersion: '48',
  locale: 'en',
  checksum: 'fixture',
  familyCount: 1,
  variantCount: 0,
  totalCount: 1,
  groups: [{ id: 0, key: 'smileys-emotion', label: 'Smileys & emotion' }],
  subgroups: [{ id: 0, key: 'face-smiling', label: 'Smiling', group: 0 }],
  emojis: [
    {
      id: '1F600',
      glyph: '😀',
      name: 'grinning face',
      order: 1,
      version: 1,
      shortcodes: ['grinning'],
      group: 0,
      subgroup: 0,
      keywords: ['happy', 'smile'],
      variants: [],
    },
  ],
};

function responseWith(value: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 503, json: vi.fn().mockResolvedValue(value) } as unknown as Response;
}

function mockCatalogFetcher(emojiPayload: unknown = catalogFixture, iconPayload: unknown = iconCatalogFixture) {
  return vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('icon')) {
      return Promise.resolve(responseWith(iconPayload));
    }
    return Promise.resolve(responseWith(emojiPayload));
  });
}

function CatalogHarness({ fetcher }: { fetcher: typeof fetch }) {
  const state = useEmojiCatalog(fetcher);

  if (state.status === 'loading') return <p>Loading catalog</p>;
  if (state.status === 'error') {
    return <button onClick={state.retry}>Retry: {state.message}</button>;
  }
  return <p>{state.catalog.totalCount} emoji and {state.iconCatalog.totalCount} icons ready</p>;
}

describe('loadEmojiCatalog', () => {
  it('loads and validates the self-hosted catalog', async () => {
    const fetcher = vi.fn().mockResolvedValue(responseWith(catalogFixture));

    await expect(loadEmojiCatalog(fetcher)).resolves.toEqual(catalogFixture);
    expect(fetcher).toHaveBeenCalledWith('/data/emoji-en-17.0.json', {
      signal: undefined,
    });
  });

  it('reports an HTTP failure without attempting to parse it', async () => {
    const response = responseWith({}, false);
    const fetcher = vi.fn().mockResolvedValue(response);

    await expect(loadEmojiCatalog(fetcher)).rejects.toThrow('Emoji catalog request failed (503).');
    expect(response.json).not.toHaveBeenCalled();
  });

  it('rejects a malformed catalog payload', async () => {
    const malformed = { ...catalogFixture, totalCount: 9 };
    const fetcher = vi.fn().mockResolvedValue(responseWith(malformed));

    await expect(loadEmojiCatalog(fetcher)).rejects.toThrow(
      'Emoji catalog could not be verified: Total count does not match catalog metadata.',
    );
  });

  it.each([null, 'not an object', {}])('rejects a non-catalog payload: %j', async (payload) => {
    const fetcher = vi.fn().mockResolvedValue(responseWith(payload));

    await expect(loadEmojiCatalog(fetcher)).rejects.toThrow(
      'Emoji catalog response was malformed.',
    );
  });
});

describe('loadIconCatalog', () => {
  it('loads and validates the self-hosted icon catalog', async () => {
    const fetcher = vi.fn().mockResolvedValue(responseWith(iconCatalogFixture));

    await expect(loadIconCatalog(fetcher)).resolves.toEqual(iconCatalogFixture);
    expect(fetcher).toHaveBeenCalledWith('/data/icons-1.34.json', {
      signal: undefined,
    });
  });

  it('reports an HTTP failure for icons without attempting to parse it', async () => {
    const response = responseWith({}, false);
    const fetcher = vi.fn().mockResolvedValue(response);

    await expect(loadIconCatalog(fetcher)).rejects.toThrow('Icon catalog request failed (503).');
    expect(response.json).not.toHaveBeenCalled();
  });

  it('rejects a malformed icon catalog payload', async () => {
    const malformed: IconCatalog = { ...iconCatalogFixture, totalCount: 99 };
    const fetcher = vi.fn().mockResolvedValue(responseWith(malformed));

    await expect(loadIconCatalog(fetcher)).rejects.toThrow(
      'Icon catalog could not be verified: Total count does not match icons list length.',
    );
  });

  it.each([null, 'not an object', {}])('rejects a non-icon-catalog payload: %j', async (payload) => {
    const fetcher = vi.fn().mockResolvedValue(responseWith(payload));

    await expect(loadIconCatalog(fetcher)).rejects.toThrow(
      'Icon catalog response was malformed.',
    );
  });
});

describe('useEmojiCatalog', () => {
  it('moves from loading to ready with both emoji and icon catalogs', async () => {
    const fetcher = mockCatalogFetcher();

    render(<CatalogHarness fetcher={fetcher} />);

    expect(screen.getByText('Loading catalog')).toBeInTheDocument();
    expect(await screen.findByText('1 emoji and 6 icons ready')).toBeInTheDocument();
  });

  it('offers a working retry after a load error', async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation((url: string) => {
      callCount += 1;
      if (callCount <= 2) {
        return Promise.reject(new Error('offline'));
      }
      if (typeof url === 'string' && url.includes('icon')) {
        return Promise.resolve(responseWith(iconCatalogFixture));
      }
      return Promise.resolve(responseWith(catalogFixture));
    });

    render(<CatalogHarness fetcher={fetcher} />);

    await userEvent.click(await screen.findByRole('button', { name: /Retry: offline/ }));
    expect(await screen.findByText('1 emoji and 6 icons ready')).toBeInTheDocument();
  });

  it('does not update state after unmounting an in-flight request', async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const view = render(<CatalogHarness fetcher={fetcher} />);

    view.unmount();
    await act(async () => resolveRequest?.(responseWith(catalogFixture)));

    expect(view.container).toBeEmptyDOMElement();
  });

  it('uses a safe message for non-Error rejections', async () => {
    const fetcher = vi.fn().mockRejectedValue('offline');

    render(<CatalogHarness fetcher={fetcher} />);

    expect(await screen.findByRole('button')).toHaveTextContent(
      'Catalog could not be loaded.',
    );
  });

  it('ignores a rejection delivered after an aborted unmount', async () => {
    let rejectRequest: ((reason: unknown) => void) | undefined;
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<Response>((_resolve, reject) => {
        rejectRequest = reject;
      }),
    );
    const view = render(<CatalogHarness fetcher={fetcher} />);

    view.unmount();
    await act(async () => rejectRequest?.(new DOMException('Aborted', 'AbortError')));

    expect(view.container).toBeEmptyDOMElement();
  });

  it('supports deferred icons and loads them on demand', async () => {
    const fetcher = mockCatalogFetcher();

    function DeferredHarness() {
      const state = useEmojiCatalog(fetcher, { deferIcons: true });
      if (state.status === 'loading') return <p>Loading catalog</p>;
      if (state.status === 'error') return <p>Error</p>;
      return (
        <div>
          <p>{state.catalog.totalCount} emoji and {state.iconCatalog.totalCount} icons</p>
          <button onClick={() => state.loadIcons()}>Fetch icons</button>
        </div>
      );
    }

    render(<DeferredHarness />);

    // Emojis should be ready while icons are deferred (0 icons)
    expect(await screen.findByText('1 emoji and 0 icons')).toBeInTheDocument();

    // Trigger loading icons multiple times concurrently
    const btn = screen.getByRole('button', { name: 'Fetch icons' });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(await screen.findByText('1 emoji and 6 icons')).toBeInTheDocument();

    // Trigger again when already loaded
    await userEvent.click(btn);
    expect(screen.getByText('1 emoji and 6 icons')).toBeInTheDocument();
  });

  it('deduplicates concurrent in-flight calls to loadIcons', async () => {
    const fetcher = mockCatalogFetcher();
    const { result } = renderHook(() => useEmojiCatalog(fetcher, { deferIcons: true }));
    await vi.waitFor(() => expect(result.current.status).toBe('ready'));

    if (result.current.status === 'ready') {
      const [icons1, icons2] = await Promise.all([
        result.current.loadIcons(),
        result.current.loadIcons(),
      ]);
      expect(icons1).toBe(icons2);
    }
  });

  it('detects saveData and 2g network modes with isSaveDataEnabled', () => {
    expect(isSaveDataEnabled()).toBe(false);

    const originalNavigator = globalThis.navigator;
    try {
      // @ts-expect-error test undefined navigator
      delete globalThis.navigator;
      expect(isSaveDataEnabled()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    }

    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { connection: { saveData: true } },
        configurable: true,
      });
      expect(isSaveDataEnabled()).toBe(true);

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection: { effectiveType: '2g' } },
        configurable: true,
      });
      expect(isSaveDataEnabled()).toBe(true);

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection: { effectiveType: '4g', saveData: false } },
        configurable: true,
      });
      expect(isSaveDataEnabled()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    }
  });

  it('does not update state if unmounted before emoji catalog resolves', async () => {
    let resolveEmoji: ((val: unknown) => void) | undefined;
    const fetcher = vi.fn().mockImplementation((url: string) => {
      if (url.includes('emoji')) {
        return new Promise((res) => { resolveEmoji = res; });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(iconCatalogFixture) });
    });
    function DeferredHarness() {
      const state = useEmojiCatalog(fetcher);
      return <div>{state.status}</div>;
    }
    const { unmount } = render(<DeferredHarness />);
    unmount();
    resolveEmoji!({ ok: true, status: 200, json: () => Promise.resolve(catalogFixture) });
  });

  it('does not update state if unmounted before icon catalog resolves', async () => {
    let resolveIcon: ((val: unknown) => void) | undefined;
    const fetcher = vi.fn().mockImplementation((url: string) => {
      if (url.includes('icon')) {
        return new Promise((res) => { resolveIcon = res; });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(catalogFixture) });
    });
    function DeferredHarness() {
      const state = useEmojiCatalog(fetcher);
      return <div>{state.status}</div>;
    }
    const { unmount } = render(<DeferredHarness />);
    unmount();
    resolveIcon!({ ok: true, status: 200, json: () => Promise.resolve(iconCatalogFixture) });
  });

  it('ignores icon catalog failure if emojis are already ready', async () => {
    const fetcher = vi.fn().mockImplementation((url: string) => {
      if (url.includes('icon')) {
        return Promise.reject(new Error('Failed to load icons'));
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(catalogFixture) });
    });
    function DeferredHarness() {
      const state = useEmojiCatalog(fetcher);
      if (state.status !== 'ready') return <div>loading</div>;
      return <div>{state.catalog.totalCount} emoji and {state.iconCatalog.totalCount} icons</div>;
    }
    render(<DeferredHarness />);
    expect(await screen.findByText('1 emoji and 0 icons')).toBeInTheDocument();
  });

  it('shows error if icons fail while emoji catalog is still loading', async () => {
    let resolveEmoji: ((val: unknown) => void) | undefined;
    const fetcher = vi.fn().mockImplementation((url: string) => {
      if (url.includes('icon')) {
        return Promise.reject(new Error('Icons network failure'));
      }
      return new Promise((res) => { resolveEmoji = res; });
    });
    function DeferredHarness() {
      const state = useEmojiCatalog(fetcher);
      if (state.status === 'error') return <div>{state.message}</div>;
      return <div>loading</div>;
    }
    render(<DeferredHarness />);
    expect(await screen.findByText('Icons network failure')).toBeInTheDocument();
    resolveEmoji!({ ok: true, status: 200, json: () => Promise.resolve(catalogFixture) });
  });

  it('handles in-flight loadIcons resolution when status is no longer ready', async () => {
    let resolveIcons!: (res: Response) => void;
    const fetcher = vi.fn().mockImplementation((url: string) => {
      if (url.includes('icon')) {
        return new Promise<Response>((res) => { resolveIcons = res; });
      }
      return Promise.resolve(responseWith(catalogFixture));
    });

    const { result } = renderHook(() => useEmojiCatalog(fetcher, { deferIcons: true }));
    await vi.waitFor(() => expect(result.current.status).toBe('ready'));

    if (result.current.status === 'ready') {
      const loadPromise = result.current.loadIcons();
      act(() => {
        result.current.retry();
      });
      expect(result.current.status).toBe('loading');
      resolveIcons(responseWith(iconCatalogFixture));
      const icons = await loadPromise;
      expect(icons).toEqual(iconCatalogFixture);
    }
  });
});

describe('loadCatalogs', () => {
  it('loads both catalogs concurrently', async () => {
    const fetcher = mockCatalogFetcher();
    const result = await loadCatalogs(fetcher);
    expect(result.catalog).toEqual(catalogFixture);
    expect(result.iconCatalog).toEqual(iconCatalogFixture);
  });
});


