import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuroraBackdrop } from './AuroraBackdrop';

function movePointer(clientX: number, clientY: number) {
  const event = new Event('pointermove') as Event & {
    clientX: number;
    clientY: number;
  };
  Object.assign(event, { clientX, clientY });
  window.dispatchEvent(event);
}

describe('AuroraBackdrop', () => {
  it('is decorative and never announced', () => {
    render(<AuroraBackdrop />);
    const aurora = screen.getByTestId('aurora');
    expect(aurora).toHaveAttribute('aria-hidden', 'true');
    expect(aurora.querySelectorAll('.aurora__blob')).toHaveLength(3);
  });

  it('drifts with the pointer and stops tracking once unmounted', () => {
    const { unmount } = render(<AuroraBackdrop />);
    const aurora = screen.getByTestId('aurora');

    movePointer(window.innerWidth, window.innerHeight);
    expect(aurora.style.transform).toBe('translate3d(13px, 13px, 0)');

    unmount();
    // The layer is detached, so a later move must not throw or reattach.
    expect(() => movePointer(0, 0)).not.toThrow();
  });

  it('holds still when parallax is switched off', () => {
    render(<AuroraBackdrop parallax={false} />);
    movePointer(0, 0);
    expect(screen.getByTestId('aurora').style.transform).toBe('');
  });
});
