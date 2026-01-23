import { HTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

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
      <Loader2
        className={`animate-spin ${sizeStyles[size]} ${color || 'text-primary'}`}
        aria-hidden="true"
      />
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
