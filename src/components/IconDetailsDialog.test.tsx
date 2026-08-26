import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { stubDialogMethods } from '../test/dom-stubs';
import { iconCatalogFixture } from '../test/catalog-fixture';
import { IconDetailsDialog } from './IconDetailsDialog';

describe('IconDetailsDialog', () => {
  const icon = iconCatalogFixture.icons[0]!; // arrow-right

  it('renders icon details, metadata, interactive preview controls, and copy actions', async () => {
    const user = userEvent.setup();
    const onCopySvg = vi.fn();
    const onCopyJsx = vi.fn();
    const onCopyName = vi.fn();
    const onCopyHtml = vi.fn();
    const onToggleFavorite = vi.fn();
    const onClose = vi.fn();
    const onViewRelated = vi.fn();

    // Mock URL.createObjectURL and revokeObjectURL for download
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL;

    render(
      <IconDetailsDialog
        icon={icon}
        favorite={false}
        relatedIcons={iconCatalogFixture.icons.slice(1)}
        onCopySvg={onCopySvg}
        onCopyJsx={onCopyJsx}
        onCopyName={onCopyName}
        onCopyHtml={onCopyHtml}
        onToggleFavorite={onToggleFavorite}
        onViewRelated={onViewRelated}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'arrow right' })).toBeInTheDocument();
    expect(screen.getByText('<ArrowRight />')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2.5px' }));
    expect(screen.getByRole('button', { name: '2.5px' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '64px' }));
    expect(screen.getByRole('button', { name: '64px' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Copy SVG' }));
    expect(onCopySvg).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Copy React / JSX' }));
    expect(onCopyJsx).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Copy Name' }));
    expect(onCopyName).toHaveBeenCalledWith('arrow-right');

    await user.click(screen.getByRole('button', { name: 'Copy HTML' }));
    expect(onCopyHtml).toHaveBeenCalledWith('<i data-lucide="arrow-right"></i>');

    await user.click(screen.getByRole('button', { name: 'Download SVG' }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');

    await user.click(screen.getByRole('button', { name: '☆ Add to favorites' }));
    expect(onToggleFavorite).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('triggers onViewRelated when clicking a related icon', async () => {
    const user = userEvent.setup();
    const onViewRelated = vi.fn();
    const related = iconCatalogFixture.icons[1]!;

    render(
      <IconDetailsDialog
        icon={icon}
        favorite={true}
        relatedIcons={[related]}
        onCopySvg={vi.fn()}
        onCopyJsx={vi.fn()}
        onCopyName={vi.fn()}
        onCopyHtml={vi.fn()}
        onToggleFavorite={vi.fn()}
        onViewRelated={onViewRelated}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '★ In favorites' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `View details for ${related.name}` }));
    expect(onViewRelated).toHaveBeenCalledWith(related);
  });

  it('handles dialog cancel event and empty tags', () => {
    const onClose = vi.fn();
    const iconWithoutTags = { ...icon, tags: [] };

    render(
      <IconDetailsDialog
        icon={iconWithoutTags}
        favorite={false}
        relatedIcons={[]}
        onCopySvg={vi.fn()}
        onCopyJsx={vi.fn()}
        onCopyName={vi.fn()}
        onCopyHtml={vi.fn()}
        onToggleFavorite={vi.fn()}
        onViewRelated={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('None')).toBeInTheDocument();

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
        <IconDetailsDialog
          icon={icon}
          favorite={false}
          relatedIcons={[]}
          onCopySvg={vi.fn()}
          onCopyJsx={vi.fn()}
          onCopyName={vi.fn()}
          onCopyHtml={vi.fn()}
          onToggleFavorite={vi.fn()}
          onViewRelated={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      const dialog = screen.getByRole('dialog');
      expect(showModal).toHaveBeenCalledOnce();
      expect(dialog).toHaveAttribute('open');

      unmount();
      expect(close).toHaveBeenCalledOnce();
      expect(dialog).not.toHaveAttribute('open');
    } finally {
      restore();
    }
  });

  it('falls back to non-modal dialog when showModal is unsupported', () => {
    expect(HTMLDialogElement.prototype.showModal).toBeUndefined();

    const { unmount } = render(
      <IconDetailsDialog
        icon={icon}
        favorite={false}
        relatedIcons={[]}
        onCopySvg={vi.fn()}
        onCopyJsx={vi.fn()}
        onCopyName={vi.fn()}
        onCopyHtml={vi.fn()}
        onToggleFavorite={vi.fn()}
        onViewRelated={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('open');

    unmount();
    expect(dialog).not.toHaveAttribute('open');
  });
});
