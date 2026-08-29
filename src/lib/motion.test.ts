import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COUNT_DURATION_MS,
  countUp,
  flyToDock,
  prefersReducedMotion,
  staggerGridCells,
  STAGGER_MAX_CELLS,
} from './motion';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

/** Installs an `Element.animate` stand-in and reports what it was handed. */
function stubAnimate(result: unknown) {
  const animate = vi.fn(() => result);
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: animate,
  });
  return animate;
}

function removeAnimateStub() {
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
}

function tile(): HTMLElement {
  const element = document.createElement('button');
  element.className = 'emoji-tile__select';
  document.body.appendChild(element);
  return element;
}

describe('prefersReducedMotion', () => {
  it('reports full motion when matchMedia is unavailable', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('follows the media query when one is available', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    expect(prefersReducedMotion()).toBe(true);
  });

  it('falls back to full motion when the query throws', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => {
      throw new Error('unsupported query');
    }));
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('flyToDock', () => {
  it('does nothing when disabled, unanchored, or unsupported', () => {
    const dock = document.createElement('div');
    document.body.appendChild(dock);

    expect(flyToDock(tile(), dock, { enabled: false })).toBe(false);
    expect(flyToDock(null, dock)).toBe(false);
    expect(flyToDock(tile(), null)).toBe(false);
    // No `Element.animate` in this DOM, so the effect is skipped entirely.
    expect(flyToDock(tile(), dock)).toBe(false);
    expect(document.querySelector('.fly-ghost')).toBeNull();

    const sourceTile = tile();
    const origDoc = globalThis.document;
    try {
      // @ts-expect-error test undefined document
      delete globalThis.document;
      expect(flyToDock(sourceTile, dock)).toBe(false);
    } finally {
      globalThis.document = origDoc;
    }
  });

  it('animates a ghost toward the dock and removes it when the animation settles', async () => {
    const finished = Promise.resolve();
    const animate = stubAnimate({ finished });
    try {
      const dock = document.createElement('div');
      document.body.appendChild(dock);
      const source = tile();

      expect(flyToDock(source, dock, { duration: 120 })).toBe(true);
      const ghost = document.querySelector('.fly-ghost');
      expect(ghost).not.toBeNull();
      expect(ghost).toHaveAttribute('aria-hidden', 'true');

      const [keyframes, options] = animate.mock.calls.at(-1) as unknown as [
        Keyframe[],
        KeyframeAnimationOptions,
      ];
      expect(keyframes).toHaveLength(3);
      expect(options.duration).toBe(120);

      await finished;
      expect(document.querySelector('.fly-ghost')).toBeNull();
    } finally {
      removeAnimateStub();
    }
  });

  it('falls back to onfinish, and cleans up when the platform returns no animation', () => {
    const handle: { onfinish?: () => void } = {};
    stubAnimate(handle);
    try {
      const dock = document.createElement('div');
      document.body.appendChild(dock);

      expect(flyToDock(tile(), dock)).toBe(true);
      expect(document.querySelector('.fly-ghost')).not.toBeNull();
      handle.onfinish?.();
      expect(document.querySelector('.fly-ghost')).toBeNull();
    } finally {
      removeAnimateStub();
    }

    stubAnimate(undefined);
    try {
      const dock = document.createElement('div');
      document.body.appendChild(dock);
      expect(flyToDock(tile(), dock)).toBe(true);
      expect(document.querySelector('.fly-ghost')).toBeNull();
    } finally {
      removeAnimateStub();
    }
  });

  it('removes the ghost even when the animation rejects', async () => {
    const finished = Promise.reject(new Error('interrupted'));
    stubAnimate({ finished });
    try {
      const dock = document.createElement('div');
      document.body.appendChild(dock);
      expect(flyToDock(tile(), dock)).toBe(true);
      await finished.catch(() => undefined);
      await Promise.resolve();
      expect(document.querySelector('.fly-ghost')).toBeNull();
    } finally {
      removeAnimateStub();
    }
  });
});

describe('staggerGridCells', () => {
  function grid(cellCount: number): HTMLElement {
    const list = document.createElement('ul');
    for (let index = 0; index < cellCount; index += 1) {
      list.appendChild(document.createElement('li'));
    }
    document.body.appendChild(list);
    return list;
  }

  it('skips when disabled, when there is no grid, or when animation is unsupported', () => {
    expect(staggerGridCells(grid(3), { enabled: false })).toBe(0);
    expect(staggerGridCells(null)).toBe(0);
    expect(staggerGridCells(grid(3))).toBe(0);
  });

  it('animates the first screenful and ramps the delay to a ceiling', () => {
    const animate = stubAnimate({});
    try {
      expect(staggerGridCells(grid(STAGGER_MAX_CELLS + 20))).toBe(STAGGER_MAX_CELLS);

      const delays = animate.mock.calls.map(
        (call) => (call as unknown as [Keyframe[], KeyframeAnimationOptions])[1].delay,
      );
      expect(delays[0]).toBe(0);
      expect(delays[1]).toBe(11);
      expect(Math.max(...(delays as number[]))).toBeLessThanOrEqual(420);
    } finally {
      removeAnimateStub();
    }
  });

  it('honours a custom cap', () => {
    stubAnimate({});
    try {
      expect(staggerGridCells(grid(10), { max: 4 })).toBe(4);
    } finally {
      removeAnimateStub();
    }
  });
});

describe('countUp', () => {
  it('reports the final value immediately when the animation is skipped', () => {
    const onTick = vi.fn();
    expect(countUp(1777, onTick, { enabled: false })()).toBeUndefined();
    expect(onTick).toHaveBeenCalledExactlyOnceWith(1777);

    onTick.mockClear();
    countUp(1777, onTick, { duration: 0 });
    expect(onTick).toHaveBeenCalledExactlyOnceWith(1777);
  });

  it('reports the final value when the platform has no animation frames', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const onTick = vi.fn();
    countUp(42, onTick);
    expect(onTick).toHaveBeenCalledExactlyOnceWith(42);
  });

  it('eases from zero to the total and stops on the final frame', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(performance, 'now').mockReturnValue(1000);

    const onTick = vi.fn();
    countUp(1000, onTick);

    frames.shift()!(1000 + COUNT_DURATION_MS / 2);
    expect(onTick).toHaveBeenLastCalledWith(875);

    frames.shift()!(1000 + COUNT_DURATION_MS);
    expect(onTick).toHaveBeenLastCalledWith(1000);
    // The eased value reached the total, so no further frame was scheduled.
    expect(frames).toHaveLength(0);
  });

  it('stops reporting once cancelled', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancelAnimation = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelAnimation);
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const onTick = vi.fn();
    const cancel = countUp(500, onTick);
    cancel();

    expect(cancelAnimation).toHaveBeenCalledOnce();
    frames.shift()!(10);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('cancels cleanly when the platform has no cancelAnimationFrame', () => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', undefined);
    expect(() => countUp(10, vi.fn())()).not.toThrow();
  });
});
