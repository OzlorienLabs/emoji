import { useEffect, useRef } from 'react';
import { getCodePointLabel } from '../data/catalog';
import type { EmojiFamily, EmojiVariant } from '../data/catalog-types';
import { getFamilyVariants, getVariantToneLabel } from '../lib/variants';

export interface EmojiDetailsDialogProps {
  family: EmojiFamily;
  groupLabel: string;
  subgroupLabel: string;
  favorite: boolean;
  relatedFamilies: readonly EmojiFamily[];
  /** The tone-resolved glyph the tile would have used. */
  displayVariant?: EmojiVariant;
  onChoose: (variant: EmojiVariant) => void;
  onViewRelated: (family: EmojiFamily) => void;
  onToggleFavorite: () => void;
  onClose: () => void;
  onCopyGlyph?: (glyph: string) => void;
  onCopyShortcode?: (shortcode: string) => void;
  onSearchKeyword?: (keyword: string) => void;
}

/**
 * The emoji details sheet. Every variant the dataset ships is listed — the
 * exact stored sequence is what gets copied, never a modifier concatenated
 * onto the base glyph.
 */
export function EmojiDetailsDialog({
  family,
  groupLabel,
  subgroupLabel,
  favorite,
  relatedFamilies,
  displayVariant,
  onChoose,
  onViewRelated,
  onToggleFavorite,
  onClose,
  onCopyGlyph,
  onCopyShortcode,
  onSearchKeyword,
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

  const variants = getFamilyVariants(family);
  const shown = displayVariant ?? family;
  const shortcode = family.shortcodes[0];
  const meta = [
    getCodePointLabel(family.id),
    `Emoji ${family.version}`,
    shortcode ? `:${shortcode}:` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <dialog
      ref={dialogRef}
      className="details-dialog"
      aria-labelledby="details-title"
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
          <span className="details-glyph" aria-hidden="true">{shown.glyph}</span>
          <div className="details-heading__copy">
            <span className="section-kicker">{groupLabel} · {subgroupLabel}</span>
            <h2 id="details-title">{family.name}</h2>
            <span className="details-meta-line">{meta}</span>
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

      <section className="details-section" aria-labelledby="variants-title">
        <span className="details-section__label" id="variants-title">
          {variants.length > 1 ? `All ${variants.length} variants` : 'Use emoji'}
        </span>
        <div className="variant-grid">
          {variants.map((variant) => (
            <button
              type="button"
              key={variant.id}
              className="variant-button"
              title={`${variant.name} · ${getVariantToneLabel(variant.tone)}`}
              aria-label={`Use ${variant.name} (${getVariantToneLabel(variant.tone)})`}
              onClick={() => onChoose(variant)}
            >
              <span aria-hidden="true">{variant.glyph}</span>
            </button>
          ))}
        </div>
      </section>

      {family.keywords.length > 0 ? (
        <section className="details-section" aria-labelledby="keywords-title">
          <span className="details-section__label" id="keywords-title">Also known as</span>
          <div className="keyword-pills">
            {family.keywords.map((keyword) => (
              <button
                type="button"
                key={keyword}
                className="keyword-pill"
                aria-label={`Search for ${keyword}`}
                onClick={() => onSearchKeyword?.(keyword)}
              >
                {keyword}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="details-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => onChoose(shown)}
        >
          Add to message
        </button>
        <button
          type="button"
          className="button"
          onClick={() => onCopyGlyph?.(shown.glyph)}
        >
          Copy emoji
        </button>
        {shortcode ? (
          <button
            type="button"
            className="button"
            onClick={() => onCopyShortcode?.(`:${shortcode}:`)}
          >
            Copy shortcode
          </button>
        ) : null}
      </div>

      {relatedFamilies.length > 0 ? (
        <section
          className="details-section details-section--divided"
          aria-labelledby="related-title"
        >
          <span className="details-section__label" id="related-title">Related</span>
          <div className="related-grid">
            {relatedFamilies.map((related) => (
              <button
                type="button"
                key={related.id}
                title={related.name}
                aria-label={`View details for ${related.name}`}
                onClick={() => onViewRelated(related)}
              >
                <span aria-hidden="true">{related.glyph}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </dialog>
  );
}
