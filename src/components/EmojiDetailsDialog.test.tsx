import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { catalogFixture } from '../test/catalog-fixture';
import { stubDialogMethods } from '../test/dom-stubs';
import { EmojiDetailsDialog } from './EmojiDetailsDialog';

describe('EmojiDetailsDialog', () => {
  const family = catalogFixture.emojis[2]!;

  it('shows useful metadata and lets a user choose an exact variant', async () => {
    const onChoose = vi.fn();
    const onViewRelated = vi.fn();
    render(
      <EmojiDetailsDialog
        family={family}
        groupLabel="People & body"
        subgroupLabel="Person role"
        favorite={false}
        relatedFamilies={[catalogFixture.emojis[3]!]}
        onChoose={onChoose}
        onViewRelated={onViewRelated}
        onToggleFavorite={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'woman technologist' })).toBeInTheDocument();
    expect(screen.getByText(/U\+1F469 U\+200D U\+1F4BB/)).toBeInTheDocument();
    expect(screen.getByText(/Emoji 4/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /dark skin tone/i }));

    expect(onChoose).toHaveBeenCalledWith(family.variants[0]);
    await userEvent.click(screen.getByRole('button', { name: 'View details for woman dancing' }));
    expect(onViewRelated).toHaveBeenCalledWith(catalogFixture.emojis[3]);
  });

  it('supports favorite and close actions', async () => {
    const onToggleFavorite = vi.fn();
    const onClose = vi.fn();
    render(
      <EmojiDetailsDialog
        family={family}
        groupLabel="People & body"
        subgroupLabel="Person role"
        favorite
        relatedFamilies={[]}
        onChoose={() => undefined}
        onViewRelated={() => undefined}
        onToggleFavorite={onToggleFavorite}
        onClose={onClose}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove from favorites' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onToggleFavorite).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes with Escape and labels a family without variants', () => {
    const onClose = vi.fn();
    render(
      <EmojiDetailsDialog
        family={catalogFixture.emojis[0]!}
        groupLabel="Smileys & emotion"
        subgroupLabel="Smiling"
        favorite={false}
        relatedFamilies={[]}
        onChoose={() => undefined}
        onViewRelated={() => undefined}
        onToggleFavorite={() => undefined}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Use emoji')).toBeInTheDocument();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', {
      bubbles: true,
      cancelable: true,
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens and closes through the native modal dialog API when available', () => {
    const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    const close = vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    const restore = stubDialogMethods({ showModal, close });

    try {
      const { unmount } = render(
        <EmojiDetailsDialog
          family={family}
          groupLabel="People & body"
          subgroupLabel="Person role"
          favorite={false}
          relatedFamilies={[]}
          onChoose={() => undefined}
          onViewRelated={() => undefined}
          onToggleFavorite={() => undefined}
          onClose={() => undefined}
        />,
      );

      const dialog = screen.getByRole('dialog');
      expect(showModal).toHaveBeenCalledOnce();
      expect(dialog).toHaveAttribute('open');
      expect(screen.getByRole('button', { name: 'Close details' })).toHaveFocus();

      unmount();
      expect(close).toHaveBeenCalledOnce();
      expect(dialog).not.toHaveAttribute('open');
    } finally {
      restore();
    }
  });

  it('falls back to a non-modal dialog and clears it when showModal is unsupported', () => {
    expect(HTMLDialogElement.prototype.showModal).toBeUndefined();

    const { unmount } = render(
      <EmojiDetailsDialog
        family={family}
        groupLabel="People & body"
        subgroupLabel="Person role"
        favorite={false}
        relatedFamilies={[]}
        onChoose={() => undefined}
        onViewRelated={() => undefined}
        onToggleFavorite={() => undefined}
        onClose={() => undefined}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('open');

    unmount();
    expect(dialog).not.toHaveAttribute('open');
  });

  it('offers the message and copy actions and searches a keyword', async () => {
    const onChoose = vi.fn();
    const onCopyGlyph = vi.fn();
    const onCopyShortcode = vi.fn();
    const onSearchKeyword = vi.fn();
    render(
      <EmojiDetailsDialog
        family={family}
        groupLabel="People & body"
        subgroupLabel="Person role"
        favorite={false}
        relatedFamilies={[]}
        displayVariant={family.variants[0]}
        onChoose={onChoose}
        onViewRelated={() => undefined}
        onToggleFavorite={() => undefined}
        onClose={() => undefined}
        onCopyGlyph={onCopyGlyph}
        onCopyShortcode={onCopyShortcode}
        onSearchKeyword={onSearchKeyword}
      />,
    );

    // The head tile and the message action follow the resolved tone.
    expect(screen.getByText(`All ${family.variants.length + 1} variants`)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add to message' }));
    expect(onChoose).toHaveBeenCalledWith(family.variants[0]);

    await userEvent.click(screen.getByRole('button', { name: 'Copy emoji' }));
    expect(onCopyGlyph).toHaveBeenCalledWith(family.variants[0]!.glyph);

    await userEvent.click(screen.getByRole('button', { name: 'Copy shortcode' }));
    expect(onCopyShortcode).toHaveBeenCalledWith(`:${family.shortcodes[0]}:`);

    await userEvent.click(screen.getByRole('button', { name: `Search for ${family.keywords[0]}` }));
    expect(onSearchKeyword).toHaveBeenCalledWith(family.keywords[0]);
  });

  it('omits the shortcode action and keyword list when the family has neither', () => {
    render(
      <EmojiDetailsDialog
        family={{ ...family, shortcodes: [], keywords: [] }}
        groupLabel="People & body"
        subgroupLabel="Person role"
        favorite={false}
        relatedFamilies={[]}
        onChoose={() => undefined}
        onViewRelated={() => undefined}
        onToggleFavorite={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Copy shortcode' })).not.toBeInTheDocument();
    expect(screen.queryByText('Also known as')).not.toBeInTheDocument();
    // Copy actions with no handler wired must still be safe to press.
    expect(() => screen.getByRole('button', { name: 'Copy emoji' }).click()).not.toThrow();
  });

  it('closes when the backdrop outside the sheet is clicked', async () => {
    const onClose = vi.fn();
    render(
      <EmojiDetailsDialog
        family={family}
        groupLabel="People & body"
        subgroupLabel="Person role"
        favorite={false}
        relatedFamilies={[]}
        onChoose={() => undefined}
        onViewRelated={() => undefined}
        onToggleFavorite={() => undefined}
        onClose={onClose}
      />,
    );

    await userEvent.click(screen.getByRole('heading', { level: 2 }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
