import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClipboardResult } from './lib/clipboard';
import { createDefaultPreferences } from './lib/preferences';
import { catalogFixture, iconCatalogFixture } from './test/catalog-fixture';
import { App } from './App';

const copied = (): ClipboardResult => ({ status: 'copied', method: 'clipboard-api' });

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('Emoji Compass', () => {
  it('finds a multi-word meaning, composes the exact glyph, and copies the message', async () => {
    const user = userEvent.setup();
    const copy = vi.fn().mockResolvedValue(copied());
    render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} copy={copy} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Find the emoji or icon you mean' }))
      .toBeInTheDocument();
    expect(screen.getByLabelText('Catalog completeness')).toHaveTextContent(
      '15 complete sequences & vector icons (9 emojis + 6 vector icons)',
    );

    await user.type(screen.getByRole('searchbox'), 'blue heart');
    await user.click(await screen.findByRole('button', { name: 'Add blue heart' }));

    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('💙');
    await user.click(screen.getByRole('button', { name: 'Copy composition' }));
    expect(copy).toHaveBeenCalledWith('💙');
    expect(await screen.findByRole('status', { name: 'Copy status' })).toHaveTextContent(
      'Message copied',
    );

    await user.click(screen.getByRole('button', { name: 'Clear composer' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('💙');
    await user.click(screen.getByRole('button', { name: 'Add blue heart' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('💙💙');
  });

  it('searches vector icons, adds them to composer or quick-copies SVG/name/JSX/HTML', async () => {
    const user = userEvent.setup();
    const copy = vi.fn().mockResolvedValue(copied());

    // 1. In composer mode (quickCopy = false)
    const { unmount } = render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        initialPreferences={{ ...createDefaultPreferences(), quickCopy: false }}
        copy={copy}
      />,
    );

    await user.type(screen.getByRole('searchbox'), 'arrow right');
    await user.click(await screen.findByRole('button', { name: 'Add arrow right' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent(':arrow-right:');
    expect(screen.getByTestId('composer-icon')).toHaveAttribute('title', 'Icon: arrow right');
    expect(screen.getByText('1 icon selected')).toBeInTheDocument();
    unmount();

    // 2. In quickCopy mode with JSX format
    const { unmount: unmountJsx } = render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        initialPreferences={{ ...createDefaultPreferences(), quickCopy: true, iconCopyFormat: 'jsx' }}
        copy={copy}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Copy arrow right' }));
    expect(copy).toHaveBeenCalledWith('<ArrowRight />');
    unmountJsx();

    // 3. In quickCopy mode with name format
    const { unmount: unmountName } = render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        initialPreferences={{ ...createDefaultPreferences(), quickCopy: true, iconCopyFormat: 'name' }}
        copy={copy}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Copy arrow right' }));
    expect(copy).toHaveBeenCalledWith('arrow-right');
    unmountName();

    // 4. In quickCopy mode with html format
    render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        initialPreferences={{ ...createDefaultPreferences(), quickCopy: true, iconCopyFormat: 'html' }}
        copy={copy}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Copy arrow right' }));
    expect(copy).toHaveBeenCalledWith('<i data-lucide="arrow-right"></i>');
  });

  it('filters by content type tabs (All, Emojis, Icons)', async () => {
    const user = userEvent.setup();
    render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} />);

    await user.click(screen.getByRole('tab', { name: /Icons/ }));
    expect(screen.getByRole('button', { name: 'Arrows & Navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add arrow right' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Arrows & Navigation' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Arrows & Navigation' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Emojis/ }));
    expect(screen.getByRole('button', { name: 'Smileys & emotion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add grinning face' })).toBeVisible();

    await user.click(screen.getByRole('tab', { name: /All/ }));
    expect(screen.getByRole('button', { name: 'Add grinning face' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add arrow right' })).toBeVisible();
  });

  it('opens icon details dialog, copies multiple formats, views related, and toggles favorite', async () => {
    const user = userEvent.setup();
    const copy = vi.fn().mockResolvedValue(copied());
    render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} copy={copy} />);

    await user.click(screen.getByRole('button', { name: 'Details for arrow right' }));
    expect(screen.getByRole('heading', { level: 2, name: 'arrow right' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy SVG' }));
    expect(copy).toHaveBeenCalledWith(expect.stringContaining('<svg'));

    await user.click(screen.getByRole('button', { name: 'Copy React / JSX' }));
    expect(copy).toHaveBeenCalledWith('<ArrowRight size={24} strokeWidth={2} />');

    await user.click(screen.getByRole('button', { name: 'Copy Name' }));
    expect(copy).toHaveBeenCalledWith('arrow-right');

    await user.click(screen.getByRole('button', { name: 'Copy HTML' }));
    expect(copy).toHaveBeenCalledWith('<i data-lucide="arrow-right"></i>');

    await user.click(screen.getByRole('button', { name: /View details for arrow left/i }));
    expect(screen.getByRole('heading', { level: 2, name: 'arrow left' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '☆ Add to favorites' }));
    await user.click(screen.getByRole('button', { name: 'Close details' }));

    await user.click(screen.getByRole('button', { name: 'Favorites' }));
    expect(screen.getByRole('button', { name: 'Add arrow left' })).toBeVisible();
  });

  it('applies display and tone preferences and preserves exact variants', async () => {
    const user = userEvent.setup();
    render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} />);

    await user.click(screen.getByRole('button', { name: 'Large' }));
    await user.click(screen.getByRole('button', { name: 'Text' }));
    await user.click(screen.getByRole('button', { name: 'Dark skin tone' }));
    await user.click(screen.getByRole('button', { name: 'Dark theme' }));

    const app = screen.getByTestId('emoji-app');
    expect(app).toHaveAttribute('data-size', 'large');
    expect(app).toHaveAttribute('data-theme', 'dark');

    await user.type(screen.getByRole('searchbox'), 'woman technologist');
    await user.click(await screen.findByRole('button', {
      name: 'Add woman technologist: dark skin tone',
    }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('👩🏿‍💻');
  });

  it('exposes details and variants, favorites, and recently used collections', async () => {
    const user = userEvent.setup();
    render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} />);

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

    await user.click(screen.getByRole('button', { name: 'All' }));
    await user.click(screen.getByRole('button', { name: 'People & body' }));
    expect(screen.getByRole('heading', { name: 'People & body' })).toBeInTheDocument();
  });

  it('adds an exact details variant and closes the dialog', async () => {
    const user = userEvent.setup();
    render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} />);

    await user.click(screen.getByRole('button', { name: 'Details for woman technologist' }));
    await user.click(screen.getByRole('button', { name: /Use woman technologist: dark skin tone/ }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('👩🏿‍💻');
  });

  it('restores the details trigger after quick-copying a variant', async () => {
    const user = userEvent.setup();
    const copy = vi.fn().mockResolvedValue(copied());
    render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        initialPreferences={{ ...createDefaultPreferences(), quickCopy: true }}
        copy={copy}
      />,
    );

    const detailsButton = screen.getByRole('button', { name: 'Details for woman technologist' });
    await user.click(detailsButton);
    await user.click(screen.getByRole('button', { name: /Use woman technologist: dark skin tone/ }));

    expect(copy).toHaveBeenCalledWith('👩🏿‍💻');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(detailsButton).toHaveFocus();
  });

  it('combines search with local collections and ignores stale saved IDs', async () => {
    const user = userEvent.setup();
    render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        initialPreferences={{
          ...createDefaultPreferences(),
          favoriteIds: ['1F499', 'arrow-right', 'missing'],
          recentIds: ['1F389', 'code', 'missing'],
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Favorites' }));
    expect(screen.getByRole('heading', { name: 'Your favorites' })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'love');
    expect(await screen.findByRole('button', { name: 'Add blue heart' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await user.click(screen.getByRole('button', { name: 'Recently used' }));
    expect(screen.getByRole('heading', { name: 'Recently used' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add party popper' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add code' })).toBeVisible();
  });

  it('quick-copies a tile, keeps the composer empty, and supports search shortcuts', async () => {
    const user = userEvent.setup();
    const copy = vi.fn().mockResolvedValue(copied());
    render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} copy={copy} />);

    await user.click(screen.getByRole('button', { name: /copy a single emoji/i }));
    await user.click(screen.getByRole('button', { name: 'Copy grinning face' }));

    expect(copy).toHaveBeenCalledWith('😀');
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('');
    expect(screen.getByRole('status', { name: 'Copy status' })).toHaveTextContent(
      'grinning face copied',
    );

    await user.keyboard('/');
    const search = screen.getByRole('searchbox');
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
    render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} copy={copy} />);

    const search = screen.getByRole('searchbox');
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
    const responseEmoji = { ok: true, status: 200, json: vi.fn().mockResolvedValue(catalogFixture) };
    const responseIcon = { ok: true, status: 200, json: vi.fn().mockResolvedValue(iconCatalogFixture) };
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation((url: string) => {
      callCount += 1;
      if (callCount === 1) return Promise.reject(new Error('Network unavailable'));
      if (typeof url === 'string' && url.includes('icon')) {
        return Promise.resolve(responseIcon);
      }
      return Promise.resolve(responseEmoji);
    });

    render(<App fetcher={fetcher as unknown as typeof fetch} />);
    expect(screen.getByText('Loading every emoji and icon…')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Try loading again' }));
    expect(await screen.findByRole('heading', { name: 'Find the emoji or icon you mean' }))
      .toBeInTheDocument();
  });

  it('starts from a shareable query, content type, and icon group URL', async () => {
    window.history.replaceState({}, '', '/?q=arrow&type=icon&group=arrows');
    render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        initialPreferences={{ ...createDefaultPreferences(), size: 'small' }}
      />,
    );

    expect(screen.getByRole('searchbox')).toHaveValue('arrow');
    expect(screen.getByRole('tab', { name: /Icons/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Arrows & Navigation' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('emoji-app')).toHaveAttribute('data-size', 'small');
  });

  it('ignores invalid shared groups, handles numeric groups, and can select a searched variant record', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/?group=0');
    const { unmount } = render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} />);
    expect(screen.getByRole('button', { name: 'Smileys & emotion' })).toHaveAttribute('aria-pressed', 'true');
    unmount();

    window.history.replaceState({}, '', '/?group=999');
    render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} />);

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.type(screen.getByRole('searchbox'), 'dark skin tone');
    await user.click(await screen.findByRole('button', {
      name: 'Add woman technologist: dark skin tone',
    }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('👩🏿‍💻');
  });

  it('polishes composed message with on-device AI preserving emojis and vector icons', async () => {
    const user = userEvent.setup();
    const copy = vi.fn().mockResolvedValue(copied());
    const destroy = vi.fn();
    let promptCallCount = 0;
    const prompt = vi.fn().mockImplementation(() => {
      promptCallCount++;
      return Promise.resolve(
        promptCallCount === 1
          ? 'Hello team! :arrow-right: We are launching version 2 🚀 🎉'
          : 'Excited to ship v2 today with full team! :arrow-right: 🚀 🎉',
      );
    });
    const create = vi.fn().mockResolvedValue({ prompt, destroy });
    const mockLanguageModel = {
      availability: vi.fn().mockResolvedValue('readily'),
      create,
    };

    render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        customLanguageModel={mockLanguageModel}
        copy={copy}
      />,
    );

    // 1. Compose message with emojis and icons
    await user.type(screen.getByRole('searchbox'), 'party popper');
    await user.click(await screen.findByRole('button', { name: 'Add party popper' }));

    await user.type(screen.getByRole('searchbox'), '{Control>}a{/Control}{Backspace}arrow right');
    await user.click(await screen.findByRole('button', { name: 'Add arrow right' }));

    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('🎉:arrow-right:');

    // 2. Click AI Polish button directly
    const polishBtn = await screen.findByRole('button', { name: /polish message with ai/i });
    await user.click(polishBtn);

    // 3. Verify output was committed with emojis and icons preserved
    await waitFor(() => {
      expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('Hello team! :arrow-right: We are launching version 2 🚀 🎉');
    });

    expect(screen.getByRole('status', { name: 'Copy status' })).toHaveTextContent(
      'Polished with on-device AI ✨',
    );

    // 4. Button now shows Regenerate
    const regenBtn = screen.getByRole('button', { name: /regenerate polished message with ai/i });
    expect(regenBtn).toHaveTextContent('Regenerate');

    // 5. Click Regenerate to get a fresh rewording
    await user.click(regenBtn);
    await waitFor(() => {
      expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('Excited to ship v2 today with full team! :arrow-right: 🚀 🎉');
    });

    // 6. Undo reverts to previous polished draft
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('Hello team! :arrow-right: We are launching version 2 🚀 🎉');

    // 7. Undo again reverts to original unpolished composition
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('🎉:arrow-right:');

    // 8. Copy works cleanly
    await user.click(screen.getByRole('button', { name: 'Copy composition' }));
    expect(copy).toHaveBeenCalledWith('🎉:arrow-right:');
  });

  it('handles AI polish error gracefully with feedback toast', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockRejectedValue(new Error('Model temporarily unavailable'));
    const mockLanguageModel = {
      availability: vi.fn().mockResolvedValue('readily'),
      create,
    };

    render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        customLanguageModel={mockLanguageModel}
      />,
    );

    await user.type(screen.getByRole('searchbox'), 'blue heart');
    await user.click(await screen.findByRole('button', { name: 'Add blue heart' }));

    const polishBtn = await screen.findByRole('button', { name: /polish message with ai/i });
    await user.click(polishBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Model temporarily unavailable');
  });

  it('cancels ongoing AI polish in App when cancel button is clicked', async () => {
    const user = userEvent.setup();
    let resolvePrompt: ((val: string) => void) | undefined;
    const prompt = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePrompt = resolve;
        }),
    );
    const create = vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() });
    const mockLanguageModel = {
      availability: vi.fn().mockResolvedValue('readily'),
      create,
    };

    render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        customLanguageModel={mockLanguageModel}
      />,
    );

    await user.type(screen.getByRole('searchbox'), 'blue heart');
    await user.click(await screen.findByRole('button', { name: 'Add blue heart' }));

    const polishBtn = await screen.findByRole('button', { name: /polish message with ai/i });
    await user.click(polishBtn);

    // In-box animation overlay is visible
    expect(screen.getByText('Polishing with on-device AI…')).toBeInTheDocument();

    const busyBtn = screen.getByRole('button', { name: /polishing message with on-device ai/i });
    await user.click(busyBtn);

    expect(screen.getByRole('button', { name: /polish message with ai/i })).toBeInTheDocument();
    resolvePrompt?.('late output');
  });

  it('does not add new emojis or icons to the message while polish process is running', async () => {
    const user = userEvent.setup();
    let resolvePrompt: ((val: string) => void) | undefined;
    const prompt = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePrompt = resolve;
        }),
    );
    const create = vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() });
    const mockLanguageModel = {
      availability: vi.fn().mockResolvedValue('readily'),
      create,
    };

    render(
      <App
        initialCatalog={catalogFixture}
        initialIconCatalog={iconCatalogFixture}
        customLanguageModel={mockLanguageModel}
      />,
    );

    // Initial message with blue heart
    await user.type(screen.getByRole('searchbox'), 'blue heart');
    await user.click(await screen.findByRole('button', { name: 'Add blue heart' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('💙');

    // Start polish
    const polishBtn = await screen.findByRole('button', { name: /polish message with ai/i });
    await user.click(polishBtn);
    expect(screen.getByText('Polishing with on-device AI…')).toBeInTheDocument();

    // Try to add another emoji while polish is active
    await user.click(screen.getByRole('button', { name: 'Add blue heart' }));

    // Message must still only be 💙 while polishing
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('💙');

    // Finish polish
    resolvePrompt?.('💙 ✨ polished');
    await waitFor(() => {
      expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('💙 ✨ polished');
    });

    // After polish finishes, adding an emoji must work
    await user.click(screen.getByRole('button', { name: 'Add blue heart' }));
    expect(screen.getByLabelText('Emoji composer')).toHaveTextContent('💙 ✨ polished💙');
  });

  it('fades and clears the "added to your message" notification after 5 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App initialCatalog={catalogFixture} initialIconCatalog={iconCatalogFixture} />);

      await user.type(screen.getByRole('searchbox'), 'blue heart');
      await user.click(await screen.findByRole('button', { name: 'Add blue heart' }));

      expect(screen.getByRole('status', { name: 'Copy status' })).toHaveTextContent(
        'blue heart added to your message',
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByRole('status', { name: 'Copy status' })).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });
});
