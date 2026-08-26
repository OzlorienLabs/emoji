import { useEffect, useRef, useState } from 'react';
import type { IconRecord } from '../data/catalog-types';
import { getIconHtml, getIconJsx, getIconSvg } from '../data/catalog';
import { IconSvg } from './IconSvg';

export interface IconDetailsDialogProps {
  icon: IconRecord;
  favorite: boolean;
  relatedIcons: readonly IconRecord[];
  onCopySvg: (svg: string) => void;
  onCopyJsx: (jsx: string) => void;
  onCopyName: (name: string) => void;
  onCopyHtml: (html: string) => void;
  onToggleFavorite: () => void;
  onViewRelated: (icon: IconRecord) => void;
  onClose: () => void;
}

export function IconDetailsDialog({
  icon,
  favorite,
  relatedIcons,
  onCopySvg,
  onCopyJsx,
  onCopyName,
  onCopyHtml,
  onToggleFavorite,
  onViewRelated,
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

  return (
    <dialog
      ref={dialogRef}
      className="details-dialog icon-details-dialog"
      aria-labelledby="icon-details-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="details-heading">
        <div className="details-heading__info">
          <div className="details-glyph details-glyph--icon" aria-hidden="true">
            <IconSvg nodes={icon.nodes} size={previewSize} strokeWidth={strokeWidth} />
          </div>
          <div>
            <span className="section-kicker">Vector icon · {icon.categoryLabel}</span>
            <h2 id="icon-details-title">{icon.name}</h2>
            <code className="icon-component-name">&lt;{icon.pascalName} /&gt;</code>
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="icon-button"
          aria-label="Close details"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="icon-preview-controls" aria-label="Icon preview controls">
        <div className="icon-preview-control-group">
          <span className="control-label">Stroke width:</span>
          <div className="segmented-control__group">
            {[1.5, 2, 2.5].map((width) => (
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
          <span className="control-label">Preview size:</span>
          <div className="segmented-control__group">
            {[24, 36, 48, 64].map((size) => (
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

      <div className="icon-copy-actions" aria-label="Copy icon formats">
        <button
          type="button"
          className="button button-primary"
          onClick={() => onCopySvg(getIconSvg(icon, { size: 24, strokeWidth }))}
        >
          Copy SVG
        </button>
        <button
          type="button"
          className="button button-subtle"
          onClick={() => onCopyJsx(getIconJsx(icon, { size: 24, strokeWidth }))}
        >
          Copy React / JSX
        </button>
        <button
          type="button"
          className="button button-subtle"
          onClick={() => onCopyName(icon.kebabName)}
        >
          Copy Name
        </button>
        <button
          type="button"
          className="button button-subtle"
          onClick={() => onCopyHtml(getIconHtml(icon))}
        >
          Copy HTML
        </button>
        <button
          type="button"
          className="button button-subtle"
          onClick={downloadSvgFile}
        >
          Download SVG
        </button>
        <button
          type="button"
          className="button button-subtle"
          onClick={onToggleFavorite}
        >
          {favorite ? '★ In favorites' : '☆ Add to favorites'}
        </button>
      </div>

      <dl className="details-meta">
        <div>
          <dt>Name</dt>
          <dd>{icon.kebabName}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{icon.categoryLabel}</dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{icon.tags.length > 0 ? icon.tags.join(', ') : 'None'}</dd>
        </div>
        <div>
          <dt>License</dt>
          <dd>ISC · Lucide</dd>
        </div>
      </dl>

      {relatedIcons.length > 0 ? (
        <section className="related-section" aria-labelledby="related-icons-title">
          <div className="section-kicker" id="related-icons-title">
            Related icons in {icon.categoryLabel}
          </div>
          <div className="related-grid related-grid--icons">
            {relatedIcons.map((related) => (
              <button
                type="button"
                key={related.id}
                aria-label={`View details for ${related.name}`}
                onClick={() => onViewRelated(related)}
              >
                <span className="related-icon-glyph" aria-hidden="true">
                  <IconSvg nodes={related.nodes} size={24} strokeWidth={2} />
                </span>
                <small>{related.name}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </dialog>
  );
}
