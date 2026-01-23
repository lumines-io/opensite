'use client';

import Script from 'next/script';

interface MediavineProviderProps {
  siteId: string;
  enableGrowMe?: boolean;
}

/**
 * Mediavine Ad Provider Component
 *
 * Loads the Mediavine script for premium ad serving.
 *
 * Requirements:
 * - Minimum 50,000 sessions per month
 * - Original, long-form content
 * - Good standing with Google AdSense
 */
export function MediavineProvider({ siteId, enableGrowMe = true }: MediavineProviderProps) {
  if (!siteId) {
    return null;
  }

  return (
    <>
      {/* Mediavine Ad Script */}
      <Script
        id="mediavine-script"
        src={`https://scripts.mediavine.com/tags/${siteId}.js`}
        strategy="lazyOnload"
        data-noptimize="1"
        data-cfasync="false"
      />
      {enableGrowMe && (
        <Script
          id="mediavine-grow"
          src={`https://grow.me/integration/grow-init.min.js`}
          strategy="lazyOnload"
        />
      )}
    </>
  );
}

interface MediavineAdUnitProps {
  type: 'leaderboard' | 'sidebar' | 'content' | 'recipe' | 'adhesion';
  className?: string;
}

/**
 * Mediavine Ad Unit Component
 *
 * Creates a wrapper for Mediavine to inject ads.
 * Mediavine handles placement automatically based on their optimization.
 */
export function MediavineAdUnit({ type, className = '' }: MediavineAdUnitProps) {
  // Mediavine uses data attributes to identify ad slots
  return (
    <div
      className={`mediavine-ad ${className}`}
      data-mediavine-ad={type}
      style={{ minHeight: type === 'leaderboard' ? '90px' : type === 'sidebar' ? '250px' : '280px' }}
    />
  );
}
