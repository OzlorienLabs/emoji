import { useEffect, useRef, useState } from 'react';
import type { IconRecord } from '../data/catalog-types';
import { getIconHtml, getIconJsx, getIconSvg } from '../data/catalog';
import { IconSvg } from './IconSvg';

export interface IconDetailsDialogProps {
  icon: IconRecord;
  favorite: boolean;
  relatedIcons: readonly IconRecord[];
  onAddToMessage?: (icon: IconRecord) => void;
  onCopySvg: (svg: string) => void;
  onCopyJsx: (jsx: string) => void;
  onCopyName: (name: string) => void;
  onCopyHtml: (html: string) => void;
  onToggleFavorite: () => void;
  onViewRelated: (icon: IconRecord) => void;
  onSearchKeyword?: (keyword: string) => void;
  onClose: () => void;
}

const STROKE_WIDTHS = [1.5, 2, 2.5];
const PREVIEW_SIZES = [24, 36, 48, 64];

export function IconDetailsDialog({
  icon,
  favorite,
  relatedIcons,
  onAddToMessage,
  onCopySvg,
  onCopyJsx,
  onCopyName,
  onCopyHtml,
  onToggleFavorite,
  onViewRelated,
  onSearchKeyword,
  onClose,
}: IconDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [previewSize, setPreviewSize] = useState<number>(48);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const supportsModal = typeof dialog.showModal === 'function';
    if (supportsModal) dialog.showModal();
    else dialog.setAttribute('open', '');
    closeRef.current?.focus();

    return () => {
      if (supportsModal) dialog.close();
      else dialog.removeAttribute('open');
    };
  }, []);

  const downloadSvgFile = () => {
    const svg = getIconSvg(icon, { size: 24, strokeWidth });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${icon.kebabName}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const meta = `${icon.kebabName} · Lucide 1.34 · ${icon.tags.length} ${
    icon.tags.length === 1 ? 'tag' : 'tags'
  }`;

  return (
    <dialog
      ref={dialogRef}
      className="details-dialog icon-details-dialog"
      aria-labelledby="icon-details-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="details-heading">
        <div className="details-heading__info">
          <div className="details-glyph details-glyph--icon" aria-hidden="true">
            <IconSvg nodes={icon.nodes} size={previewSize} strokeWidth={strokeWidth} />
          </div>
          <div className="details-heading__copy">
            <span className="section-kicker">Vector icon · {icon.categoryLabel}</span>
            <h2 id="icon-details-title">{icon.name}</h2>
            <span className="details-meta-line">{meta}</span>
            <code className="icon-component-name">&lt;{icon.pascalName} /&gt;</code>
          </div>
        </div>
        <div className="details-heading__actions">
          <button
            type="button"
            className="icon-button favorite-button"
            aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={favorite}
            onClick={onToggleFavorite}
          >
            <span aria-hidden="true">{favorite ? '★' : '☆'}</span>
          </button>
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            aria-label="Close details"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>

      <div className="icon-preview-controls" aria-label="Icon preview controls">
        <div className="icon-preview-control-group">
          <span className="control-label">Stroke width</span>
          <div className="segmented-control__group">
            {STROKE_WIDTHS.map((width) => (
              <button
                type="button"
                key={width}
                aria-pressed={strokeWidth === width}
                onClick={() => setStrokeWidth(width)}
              >
                {width}px
              </button>
            ))}
          </div>
        </div>

        <div className="icon-preview-control-group">
          <span className="control-label">Preview size</span>
          <div className="segmented-control__group">
            {PREVIEW_SIZES.map((size) => (
              <button
                type="button"
                key={size}
                aria-pressed={previewSize === size}
                onClick={() => setPreviewSize(size)}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>
      </div>

      {icon.tags.length > 0 ? (
        <section className="details-section" aria-labelledby="icon-tags-title">
          <span className="details-section__label" id="icon-tags-title">Also known as</span>
          <div className="keyword-pills">
            {icon.tags.map((tag) => (
              <button
                type="button"
                key={tag}
                className="keyword-pill"
                aria-label={`Search for ${tag}`}
                onClick={() => onSearchKeyword?.(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="details-actions" aria-label="Copy icon formats">
        <button
          type="button"
          className="button button-primary"
          onClick={() => onAddToMessage?.(icon)}
        >
          Add to message
        </button>
        <button
          type="button"
          className="button"
          onClick={() => onCopySvg(getIconSvg(icon, { size: 24, strokeWidth }))}
        >
          Copy SVG
        </button>
        <button
          type="button"
          className="button"
          onClick={() => onCopyJsx(getIconJsx(icon, { size: 24, strokeWidth }))}
        >
          Copy React / JSX
        </button>
        <button
          type="button"
          className="button"
          onClick={() => onCopyName(icon.kebabName)}
        >
          Copy Name
        </button>
        <button
          type="button"
          className="button"
          onClick={() => onCopyHtml(getIconHtml(icon))}
        >
          Copy HTML
        </button>
        <button type="button" className="button" onClick={downloadSvgFile}>
          Download SVG
        </button>
      </div>

      {relatedIcons.length > 0 ? (
        <section
          className="details-section details-section--divided"
          aria-labelledby="related-icons-title"
        >
          <span className="details-section__label" id="related-icons-title">
            Related in {icon.categoryLabel}
          </span>
          <div className="related-grid related-grid--icons">
            {relatedIcons.map((related) => (
              <button
                type="button"
                key={related.id}
                title={related.name}
                aria-label={`View details for ${related.name}`}
                onClick={() => onViewRelated(related)}
              >
                <span className="related-icon-glyph" aria-hidden="true">
                  <IconSvg nodes={related.nodes} size={24} strokeWidth={1.7} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </dialog>
  );
}
