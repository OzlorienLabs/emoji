import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconSvg } from './IconSvg';

describe('IconSvg', () => {
  it('renders SVG with default attributes and custom title/ariaHidden', () => {
    const nodes = [
      ['path', { d: 'M5 12h14' }],
      ['polyline', { points: '12 5 19 12 12 19' }],
    ] as const;

    const { rerender } = render(
      <IconSvg nodes={nodes} size={32} strokeWidth={2.5} title="Arrow Icon" ariaHidden={false} />,
    );

    const titleEl = screen.getByText('Arrow Icon');
    expect(titleEl).toBeInTheDocument();
    const svg = titleEl.closest('svg')!;
    expect(svg).toBeInTheDocument();
    expect(svg).not.toHaveAttribute('aria-hidden');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
    expect(svg).toHaveAttribute('stroke-width', '2.5');

    rerender(<IconSvg nodes={nodes} ariaHidden />);
    expect(document.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
