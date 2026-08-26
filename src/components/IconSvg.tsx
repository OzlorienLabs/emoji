import type { SVGProps } from 'react';
import type { IconNode } from '../data/catalog-types';

export interface IconSvgProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  nodes: readonly IconNode[];
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  ariaHidden?: boolean;
  title?: string;
}

export function IconSvg({
  nodes,
  size = 24,
  strokeWidth = 2,
  className,
  ariaHidden = true,
  title,
  ...props
}: IconSvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden ? 'true' : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {nodes.map(([tag, attrs], index) => {
        const Element = tag as keyof React.JSX.IntrinsicElements;
        return <Element key={index} {...attrs} />;
      })}
    </svg>
  );
}
