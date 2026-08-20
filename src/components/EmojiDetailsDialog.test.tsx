import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { catalogFixture } from '../test/catalog-fixture';
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
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
