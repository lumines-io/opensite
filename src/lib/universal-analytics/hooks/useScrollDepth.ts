'use client';

/**
 * Universal Analytics - useScrollDepth Hook
 *
 * Tracks scroll depth milestones (25%, 50%, 75%, 100%).
 */

import { useEffect, useRef } from 'react';
import { trackEvent } from '../analytics-client';
import { SCROLL_THRESHOLDS, DEBOUNCE_INTERVALS } from '../constants';
import type { ConstructionEventProperties } from '../types';

interface UseScrollDepthOptions {
  /** Construction ID if tracking on a construction page */
  constructionId?: string;
  /** Custom thresholds to track (default: [25, 50, 75, 100]) */
  thresholds?: readonly number[];
  /** Debounce interval in ms (default: 200) */
  debounceMs?: number;
  /** Whether tracking is enabled */
  enabled?: boolean;
}

/**
 * Track scroll depth on a page
 *
 * Fires events when user scrolls past 25%, 50%, 75%, and 100% of the page.
 *
 * @example
 * ```tsx
 * function ConstructionPage({ constructionId }) {
 *   useScrollDepth({ constructionId });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useScrollDepth(options: UseScrollDepthOptions = {}) {
  const {
    constructionId,
    thresholds = SCROLL_THRESHOLDS,
    debounceMs = DEBOUNCE_INTERVALS.SCROLL,
    enabled = true,
  } = options;

  const trackedThresholds = useRef<Set<number>>(new Set());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    // Reset tracked thresholds when constructionId changes
    trackedThresholds.current = new Set();

    const calculateScrollPercent = (): number => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollHeight <= 0) return 100;
      return Math.round((scrollTop / scrollHeight) * 100);
    };

    const checkThresholds = () => {
      const scrollPercent = calculateScrollPercent();

      for (const threshold of thresholds) {
        if (scrollPercent >= threshold && !trackedThresholds.current.has(threshold)) {
          trackedThresholds.current.add(threshold);

          const properties: ConstructionEventProperties = {
            scrollDepthPercent: threshold as 25 | 50 | 75 | 100,
          };

          trackEvent('construction_scroll_depth', {
            constructionId,
            properties,
          });
        }
      }
    };

    const handleScroll = () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(checkThresholds, debounceMs);
    };

    // Initial check (in case page is already scrolled)
    checkThresholds();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [constructionId, thresholds, debounceMs, enabled]);

  return {
    /** Get current scroll percentage */
    getScrollPercent: () => {
      if (typeof window === 'undefined') return 0;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollHeight <= 0) return 100;
      return Math.round((scrollTop / scrollHeight) * 100);
    },
    /** Get list of tracked thresholds */
    trackedThresholds: trackedThresholds.current,
  };
}

export default useScrollDepth;
