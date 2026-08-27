import { useEffect, useRef } from 'react';

export interface AuroraBackdropProps {
  /** When false the layer holds still — reduced motion, or an embedded preview. */
  parallax?: boolean;
}

/** How far, in pixels, the aurora drifts from the centre of the viewport. */
const PARALLAX_RANGE = 26;

/**
 * The three drifting colour fields and the vignette that sits over them. Purely
 * decorative: it is `aria-hidden`, never receives pointer events, and its only
 * behaviour is a slow parallax that follows the pointer.
 */
export function AuroraBackdrop({ parallax = true }: AuroraBackdropProps) {
  const auroraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = auroraRef.current;
    if (!parallax || !layer) return;

    const onPointerMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * PARALLAX_RANGE;
      const y = (event.clientY / window.innerHeight - 0.5) * PARALLAX_RANGE;
      layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      layer.style.transform = '';
    };
  }, [parallax]);

  return (
    <>
      <div className="aurora" ref={auroraRef} aria-hidden="true" data-testid="aurora">
        <div className="aurora__blob aurora__blob--clay" />
        <div className="aurora__blob aurora__blob--violet" />
        <div className="aurora__blob aurora__blob--mint" />
      </div>
      <div className="vignette" aria-hidden="true" />
    </>
  );
}
