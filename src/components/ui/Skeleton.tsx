import { HTMLAttributes } from 'react';

type SkeletonVariant = 'rectangular' | 'circular' | 'rounded' | 'text';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Shape variant of the skeleton
   * - rectangular: Sharp corners (for images, cards)
   * - circular: Fully rounded (for avatars)
   * - rounded: Slightly rounded corners (default, general purpose)
   * - text: Thin, text-like shape with rounded ends
   * @default 'rounded'
   */
  variant?: SkeletonVariant;
  /**
   * Width of the skeleton
   * Can be any valid CSS width value (e.g., '100%', '200px', '10rem')
   * @default '100%'
   */
  width?: string | number;
  /**
   * Height of the skeleton
   * Can be any valid CSS height value (e.g., '20px', '1rem', '100%')
   * @default '1rem'
   */
  height?: string | number;
  /**
   * Whether to animate the skeleton with a wave effect
   * @default true
   */
  animate?: boolean;
  /**
   * Number of skeleton lines to render (useful for text placeholders)
   * @default 1
   */
  lines?: number;
  /**
   * Gap between lines when lines > 1
   * @default '0.5rem'
   */
  lineGap?: string;
  /**
   * Additional className for custom styling
   */
  className?: string;
}

const variantStyles: Record<SkeletonVariant, string> = {
  rectangular: 'rounded-none',
  circular: 'rounded-full',
  rounded: 'rounded-md',
  text: 'rounded-full',
};

const defaultHeights: Record<SkeletonVariant, string> = {
  rectangular: '100%',
  circular: '100%',
  rounded: '1rem',
  text: '0.875rem',
};

/**
 * Skeleton - A configurable loading placeholder component with wave animation
 *
 * Use this component to show placeholder content while data is loading.
 * It provides visual feedback that content is coming and maintains layout stability.
 *
 * @example
 * ```tsx
 * // Avatar placeholder
 * <Skeleton variant="circular" width={48} height={48} />
 *
 * // Text placeholder with multiple lines
 * <Skeleton variant="text" lines={3} width="80%" />
 *
 * // Card image placeholder
 * <Skeleton variant="rectangular" width="100%" height={200} />
 *
 * // Custom sized rounded skeleton
 * <Skeleton width="200px" height="40px" />
 * ```
 */
export function Skeleton({
  variant = 'rounded',
  width = '100%',
  height,
  animate = true,
  lines = 1,
  lineGap = '0.5rem',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const resolvedHeight = height ?? defaultHeights[variant];

  const formatDimension = (value: string | number): string => {
    if (typeof value === 'number') {
      return `${value}px`;
    }
    return value;
  };

  const baseClasses = `bg-muted ${variantStyles[variant]} ${
    animate ? 'skeleton-wave' : ''
  } ${className}`;

  // For circular variant, ensure equal width and height for perfect circles
  const computedWidth = formatDimension(width);
  const computedHeight =
    variant === 'circular' && width && !height
      ? computedWidth
      : formatDimension(resolvedHeight);

  if (lines > 1) {
    return (
      <div
        className="flex flex-col"
        style={{ gap: lineGap }}
        role="status"
        aria-label="Loading content"
        {...props}
      >
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={baseClasses}
            style={{
              width: index === lines - 1 ? '60%' : computedWidth,
              height: computedHeight,
              ...style,
            }}
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading content"
      className={baseClasses}
      style={{
        width: computedWidth,
        height: computedHeight,
        ...style,
      }}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Pre-composed skeleton patterns for common use cases
 */

export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes: Record<string, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  return (
    <Skeleton
      variant="circular"
      width={avatarSizes[size]}
      height={avatarSizes[size]}
      className={className}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  width?: string;
  className?: string;
}

export function SkeletonText({ lines = 3, width = '100%', className = '' }: SkeletonTextProps) {
  return <Skeleton variant="text" lines={lines} width={width} className={className} />;
}

export interface SkeletonImageProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function SkeletonImage({
  width = '100%',
  height = 200,
  className = '',
}: SkeletonImageProps) {
  return <Skeleton variant="rectangular" width={width} height={height} className={className} />;
}

export interface SkeletonButtonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function SkeletonButton({
  width = 100,
  height = 40,
  className = '',
}: SkeletonButtonProps) {
  return <Skeleton variant="rounded" width={width} height={height} className={className} />;
}
