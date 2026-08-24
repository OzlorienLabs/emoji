import { useEffect, useRef } from 'react';
import { getCodePointLabel } from '../data/catalog';
import type { EmojiFamily, EmojiVariant } from '../data/catalog-types';
import { getFamilyVariants, getVariantToneLabel } from '../lib/variants';

interface EmojiDetailsDialogProps {
  family: EmojiFamily;
  groupLabel: string;
  subgroupLabel: string;
  favorite: boolean;
  relatedFamilies: readonly EmojiFamily[];
  onChoose: (variant: EmojiVariant) => void;
  onViewRelated: (family: EmojiFamily) => void;
  onToggleFavorite: () => void;
  onClose: () => void;
}

export function EmojiDetailsDialog({
  family,
  groupLabel,
  subgroupLabel,
  favorite,
  relatedFamilies,
  onChoose,
  onViewRelated,
  onToggleFavorite,
  onClose,
}: EmojiDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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

  return (
    <dialog
      ref={dialogRef}
      className="details-dialog"
      aria-labelledby="details-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="details-heading">
        <div>
          <span className="details-glyph" aria-hidden="true">{family.glyph}</span>
          <div>
            <span className="section-kicker">Emoji details</span>
            <h2 id="details-title">{family.name}</h2>
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

      <dl className="details-meta">
        <div><dt>Code points</dt><dd>{getCodePointLabel(family.id)}</dd></div>
        <div><dt>Category</dt><dd>{groupLabel} · {subgroupLabel}</dd></div>
        <div><dt>Version</dt><dd>Emoji {family.version}</dd></div>
        <div><dt>Keywords</dt><dd>{family.keywords.join(', ')}</dd></div>
      </dl>

      <div className="details-actions">
        <button type="button" className="button button-subtle" onClick={onToggleFavorite}>
          {favorite ? 'Remove from favorites' : 'Add to favorites'}
        </button>
      </div>

      <section aria-labelledby="variants-title">
        <div className="section-kicker" id="variants-title">
          {family.variants.length > 0 ? 'Choose a variant' : 'Use emoji'}
        </div>
        <div className="variant-grid">
          {getFamilyVariants(family).map((variant) => (
            <button
              type="button"
              key={variant.id}
              className="variant-button"
              aria-label={`Use ${variant.name} (${getVariantToneLabel(variant.tone)})`}
              onClick={() => onChoose(variant)}
            >
              <span aria-hidden="true">{variant.glyph}</span>
              <small>{getVariantToneLabel(variant.tone)}</small>
            </button>
          ))}
        </div>
      </section>

      {relatedFamilies.length > 0 ? (
        <section className="related-section" aria-labelledby="related-title">
          <div className="section-kicker" id="related-title">Related emoji</div>
          <div className="related-grid">
            {relatedFamilies.map((related) => (
              <button
                type="button"
                key={related.id}
                aria-label={`View details for ${related.name}`}
                onClick={() => onViewRelated(related)}
              >
                <span aria-hidden="true">{related.glyph}</span>
                <small>{related.name}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </dialog>
  );
}
