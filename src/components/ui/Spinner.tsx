import { HTMLAttributes } from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Spinner size
   * @default 'md'
   */
  size?: SpinnerSize;
  /**
   * Spinner color - uses current text color by default
   */
  color?: string;
  /**
   * Label for screen readers
   * @default 'Loading'
   */
  label?: string;
  /**
   * Additional className
   */
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function Spinner({
  size = 'md',
  color,
  label = 'Loading',
  className = '',
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
      {...props}
    >
      <svg
        className={`animate-spin ${sizeStyles[size]} ${color || 'text-primary'}`}
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export interface LoadingOverlayProps {
  /**
   * Whether to show the overlay
   */
  isLoading: boolean;
  /**
   * Loading text to display
   */
  text?: string;
  /**
   * Spinner size
   * @default 'lg'
   */
  size?: SpinnerSize;
}

export function LoadingOverlay({
  isLoading,
  text,
  size = 'lg',
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <Spinner size={size} />
      {text && <p className="mt-4 text-muted-foreground">{text}</p>}
    </div>
  );
}
