'use client';

import { HTMLAttributes } from 'react';
import { Spinner } from './Spinner';

export interface GlobalLoadingProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show the loading overlay
   */
  isLoading: boolean;
  /**
   * Loading text to display below the spinner
   */
  text?: string;
  /**
   * Spinner size
   * @default 'xl'
   */
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Background opacity (0-100)
   * @default 50
   */
  opacity?: number;
  /**
   * Additional className for the overlay
   */
  className?: string;
}

/**
 * GlobalLoading - A full-screen loading overlay component
 *
 * Use this component for page-level loading states, route transitions,
 * or any situation where the entire UI should be blocked while loading.
 *
 * @example
 * ```tsx
 * <GlobalLoading isLoading={isPageLoading} text="Loading page..." />
 * ```
 */
export function GlobalLoading({
  isLoading,
  text,
  spinnerSize = 'xl',
  opacity = 50,
  className = '',
  ...props
}: GlobalLoadingProps) {
  if (!isLoading) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={text || 'Loading'}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900/${opacity} ${className}`}
      {...props}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size={spinnerSize} color="text-white" />
        {text && (
          <p className="text-white text-sm font-medium animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
}
