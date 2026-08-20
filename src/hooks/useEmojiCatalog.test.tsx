import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { EmojiCatalog } from '../data/catalog-types';
import { loadEmojiCatalog, useEmojiCatalog } from './useEmojiCatalog';

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

function CatalogHarness({ fetcher }: { fetcher: typeof fetch }) {
  const state = useEmojiCatalog(fetcher);

  if (state.status === 'loading') return <p>Loading catalog</p>;
  if (state.status === 'error') {
    return <button onClick={state.retry}>Retry: {state.message}</button>;
  }
  return <p>{state.catalog.totalCount} emoji ready</p>;
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
});

describe('useEmojiCatalog', () => {
  it('moves from loading to ready', async () => {
    const fetcher = vi.fn().mockResolvedValue(responseWith(catalogFixture));

    render(<CatalogHarness fetcher={fetcher} />);

    expect(screen.getByText('Loading catalog')).toBeInTheDocument();
    expect(await screen.findByText('1 emoji ready')).toBeInTheDocument();
  });

  it('offers a working retry after a load error', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(responseWith(catalogFixture));

    render(<CatalogHarness fetcher={fetcher} />);

    await userEvent.click(await screen.findByRole('button', { name: /Retry: offline/ }));
    expect(await screen.findByText('1 emoji ready')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
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
});
