/**
 * Presentation-only motion helpers.
 *
 * Every function degrades to a no-op when the platform cannot run it — the
 * Web Animations API is optional, `matchMedia` is missing in some test and
 * embedded environments, and `prefers-reduced-motion` must switch all of it
 * off. Each one reports whether it actually ran so callers (and tests) can
 * tell the difference between "skipped" and "played".
 */

export const FLY_DURATION_MS = 560;
export const FLY_EASING = 'cubic-bezier(.32,.86,.28,1)';
export const STAGGER_DURATION_MS = 340;
export const STAGGER_MAX_CELLS = 48;
export const STAGGER_STEP_MS = 11;
export const STAGGER_MAX_DELAY_MS = 420;
export const COUNT_DURATION_MS = 900;

/** `Element.animate` is not implemented by every DOM, so it is treated as optional. */
type MaybeAnimatable = Element & {
  animate?: (
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) => Animation | undefined;
};

function canAnimate(element: Element | null | undefined): element is MaybeAnimatable {
  return typeof (element as MaybeAnimatable | null)?.animate === 'function';
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export interface FlyOptions {
  /** Overrides the reduced-motion check, so a caller can force the animation off. */
  readonly enabled?: boolean;
  readonly duration?: number;
}

/**
 * Sends a ghost of the tapped tile toward the composer dock. The clone carries
 * no background so it reads as the glyph travelling rather than a moving card.
 */
export function flyToDock(
  source: Element | null,
  dock: Element | null,
  options: FlyOptions = {},
): boolean {
  const { enabled = true, duration = FLY_DURATION_MS } = options;
  if (!enabled || !source || !dock || !canAnimate(source)) return false;
  if (typeof document === 'undefined') return false;

  const from = source.getBoundingClientRect();
  const to = dock.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.classList.add('fly-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  document.body.appendChild(ghost);

  const dx = to.left + Math.min(to.width * 0.28, 220) - from.left;
  const dy = to.top + 40 - from.top;
  const remove = () => ghost.remove();

  const animation = (ghost as MaybeAnimatable).animate?.(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      {
        transform: `translate(${dx * 0.6}px, ${dy - 90}px) scale(.8)`,
        opacity: 0.95,
        offset: 0.6,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0 },
    ],
    { duration, easing: FLY_EASING },
  );

  if (animation?.finished) animation.finished.then(remove, remove);
  else if (animation) animation.onfinish = remove;
  else remove();

  return true;
}

export interface StaggerOptions {
  readonly enabled?: boolean;
  readonly max?: number;
}

/** Fades the first screenful of grid cells in, so a new result set feels dealt out. */
export function staggerGridCells(
  grid: Element | null,
  options: StaggerOptions = {},
): number {
  const { enabled = true, max = STAGGER_MAX_CELLS } = options;
  if (!enabled || !grid) return 0;

  const cells = Array.from(grid.children).slice(0, max);
  let animated = 0;
  for (const [index, cell] of cells.entries()) {
    if (!canAnimate(cell)) continue;
    cell.animate?.(
      [
        { opacity: 0, transform: 'translateY(12px) scale(.94)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: STAGGER_DURATION_MS,
        delay: Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_DELAY_MS),
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards',
      },
    );
    animated += 1;
  }
  return animated;
}

export interface CountUpOptions {
  readonly enabled?: boolean;
  readonly duration?: number;
}

/**
 * Eases a stat from zero to `total` with a cubic ease-out. Returns a cancel
 * function; when the animation is skipped the final value is reported once so
 * the caller never has to special-case reduced motion.
 */
export function countUp(
  total: number,
  onTick: (value: number) => void,
  options: CountUpOptions = {},
): () => void {
  const { enabled = true, duration = COUNT_DURATION_MS } = options;
  if (
    !enabled ||
    duration <= 0 ||
    typeof requestAnimationFrame !== 'function' ||
    typeof performance === 'undefined'
  ) {
    onTick(total);
    return () => {};
  }

  const start = performance.now();
  let frame = 0;
  let cancelled = false;

  const step = (now: number) => {
    if (cancelled) return;
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    onTick(Math.round(total * eased));
    if (progress < 1) frame = requestAnimationFrame(step);
  };

  frame = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
  };
}
