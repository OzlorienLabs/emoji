import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClipboardResult } from './lib/clipboard';
import { createDefaultPreferences } from './lib/preferences';
import { catalogFixture } from './test/catalog-fixture';
import { App } from './App';

const copied = (): ClipboardResult => ({ status: 'copied', method: 'clipboard-api' });

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('Emoji Compass', () => {
  it('finds a multi-word meaning, composes the exact glyph, and copies the message', async () => {
    const user = userEvent.setup();
    const copy = vi.fn().mockResolvedValue(copied());
    render(<App initialCatalog={catalogFixture} copy={copy} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Find the emoji you mean' }))
      .toBeInTheDocument();
    expect(screen.getByLabelText('Catalog completeness')).toHaveTextContent(
      '9 complete emoji sequences',
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search emojis' }), 'blue heart');
    await user.click(await screen.findByRole('button', { name: 'Add blue heart' }));

    expect(screen.getByLabelText('Emoji composer')).toHaveValue('💙');
    await user.click(screen.getByRole('button', { name: 'Copy composition' }));
    expect(copy).toHaveBeenCalledWith('💙', expect.objectContaining({
      selectionTarget: expect.any(HTMLTextAreaElement),
    }));
    expect(await screen.findByRole('status', { name: 'Copy status' })).toHaveTextContent(
      'Message copied',
    );

    await user.click(screen.getByRole('button', { name: 'Clear composer' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveValue('💙');
  });

  it('applies display and tone preferences and preserves exact variants', async () => {
    const user = userEvent.setup();
    render(<App initialCatalog={catalogFixture} />);

    await user.click(screen.getByText('Filters & display'));
    await user.click(screen.getByRole('button', { name: 'Large' }));
    await user.click(screen.getByRole('button', { name: 'Text' }));
    await user.selectOptions(screen.getByLabelText('Default skin tone'), '5');
    await user.selectOptions(screen.getByLabelText('Color theme'), 'dark');

    const app = screen.getByTestId('emoji-app');
    expect(app).toHaveAttribute('data-size', 'large');
    expect(app).toHaveAttribute('data-theme', 'dark');

    await user.type(screen.getByRole('searchbox', { name: 'Search emojis' }), 'woman technologist');
    await user.click(await screen.findByRole('button', {
      name: 'Add woman technologist: dark skin tone',
    }));
    expect(screen.getByLabelText('Emoji composer')).toHaveValue('👩🏿‍💻');
  });

  it('exposes details and variants, favorites, and recently used collections', async () => {
    const user = userEvent.setup();
    render(<App initialCatalog={catalogFixture} />);

    const detailsButton = screen.getByRole('button', { name: 'Details for woman technologist' });
    await user.click(detailsButton);
    await user.click(screen.getByRole('button', { name: 'Add to favorites' }));
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    expect(detailsButton).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Favorites' }));

    expect(screen.getByRole('button', { name: 'Add woman technologist' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Add woman technologist' }));
    await user.click(screen.getByRole('button', { name: 'Recently used' }));
    expect(screen.getByRole('button', { name: 'Add woman technologist' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'All emojis' }));
    await user.click(screen.getByRole('button', { name: 'People & body' }));
    expect(screen.getByRole('heading', { name: 'People & body' })).toBeInTheDocument();
  });

  it('adds an exact details variant and closes the dialog', async () => {
    const user = userEvent.setup();
    render(<App initialCatalog={catalogFixture} />);

    await user.click(screen.getByRole('button', { name: 'Details for woman technologist' }));
    await user.click(screen.getByRole('button', { name: /Use woman technologist: dark skin tone/ }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Emoji composer')).toHaveValue('👩🏿‍💻');
  });

  it('combines search with local collections and ignores stale saved IDs', async () => {
    const user = userEvent.setup();
    render(
      <App
        initialCatalog={catalogFixture}
        initialPreferences={{
          ...createDefaultPreferences(),
          favoriteIds: ['1F499', 'missing'],
          recentIds: ['1F389', 'missing'],
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Favorites' }));
    expect(screen.getByRole('heading', { name: 'Your favorites' })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search emojis' }), 'love');
    expect(await screen.findByRole('button', { name: 'Add blue heart' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await user.click(screen.getByRole('button', { name: 'Recently used' }));
    expect(screen.getByRole('heading', { name: 'Recently used' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add party popper' })).toBeVisible();
  });

  it('quick-copies a tile, keeps the composer empty, and supports search shortcuts', async () => {
    const user = userEvent.setup();
    const copy = vi.fn().mockResolvedValue(copied());
    render(<App initialCatalog={catalogFixture} copy={copy} />);

    await user.click(screen.getByText('Filters & display'));
    await user.click(screen.getByRole('checkbox', { name: /copy a single emoji/i }));
    await user.click(screen.getByRole('button', { name: 'Copy grinning face' }));

    expect(copy).toHaveBeenCalledWith('😀');
    expect(screen.getByLabelText('Emoji composer')).toHaveValue('');
    expect(screen.getByRole('status', { name: 'Copy status' })).toHaveTextContent(
      'grinning face copied',
    );

    await user.keyboard('/');
    const search = screen.getByRole('searchbox', { name: 'Search emojis' });
    expect(search).toHaveFocus();
    await user.type(search, 'party');
    await waitFor(() => expect(window.location.search).toContain('q=party'));
    await user.keyboard('{Escape}');
    expect(search).toHaveValue('');
  });

  it('offers helpful suggestions for an empty result and handles a blocked clipboard', async () => {
    const user = userEvent.setup();
    const copy = vi.fn().mockResolvedValue({
      status: 'manual',
      message: 'Copy was blocked. Press Command+C.',
      selection: null,
    } satisfies ClipboardResult);
    render(<App initialCatalog={catalogFixture} copy={copy} />);

    const search = screen.getByRole('searchbox', { name: 'Search emojis' });
    await user.type(search, 'zzzz');
    expect(await screen.findByText('Nothing matched “zzzz”')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try celebration' }));
    expect(search).toHaveValue('celebration');

    await user.click(await screen.findByRole('button', { name: 'Add party popper' }));
    await user.click(screen.getByRole('button', { name: 'Copy composition' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Press Command+C');
  });

  it('renders loading, error, and retry states around the catalog', async () => {
    const user = userEvent.setup();
    const response = { ok: true, status: 200, json: vi.fn().mockResolvedValue(catalogFixture) };
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(response);

    render(<App fetcher={fetcher as unknown as typeof fetch} />);
    expect(screen.getByText('Loading every emoji…')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Try loading again' }));
    expect(await screen.findByRole('heading', { name: 'Find the emoji you mean' }))
      .toBeInTheDocument();
  });

  it('starts from a shareable query and group URL', async () => {
    window.history.replaceState({}, '', '/?q=happy&group=0');
    render(
      <App
        initialCatalog={catalogFixture}
        initialPreferences={{ ...createDefaultPreferences(), size: 'small' }}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Search emojis' })).toHaveValue('happy');
    expect(screen.getByRole('button', { name: 'Smileys & emotion' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('emoji-app')).toHaveAttribute('data-size', 'small');
  });

  it('ignores invalid shared groups and can select a searched variant record', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?group=999');
    render(<App initialCatalog={catalogFixture} />);

    expect(screen.getByRole('button', { name: 'All emojis' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.type(screen.getByRole('searchbox', { name: 'Search emojis' }), 'dark skin tone');
    await user.click(await screen.findByRole('button', {
      name: 'Add woman technologist: dark skin tone',
    }));
    expect(screen.getByLabelText('Emoji composer')).toHaveValue('👩🏿‍💻');
  });
});
