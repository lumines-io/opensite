'use client';

/**
 * Universal Analytics - useAnalytics Hook
 *
 * React hook for tracking analytics events in components.
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  trackEvent,
  trackMapEvent,
  trackConstructionEvent,
  trackSponsorEvent,
  trackSuggestionEvent,
  trackPageView,
  identifyUser,
} from '../analytics-client';
import type {
  EventName,
  EventProperties,
  MapEventProperties,
  ConstructionEventProperties,
  SponsorEventProperties,
} from '../types';

interface UseAnalyticsOptions {
  /** User ID for authenticated users */
  userId?: string;
  /** Auto-track page views */
  trackPageViews?: boolean;
}

/**
 * Main analytics hook
 *
 * Provides tracking functions and handles page view tracking.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { track, trackMap, trackConstruction } = useAnalytics();
 *
 *   const handleClick = () => {
 *     track('construction_cta_click', {
 *       properties: { ctaType: 'phone', ctaLabel: 'Call Now' }
 *     });
 *   };
 *
 *   return <button onClick={handleClick}>Call Now</button>;
 * }
 * ```
 */
export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { userId, trackPageViews = true } = options;
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  const pageEntryTime = useRef<number>(Date.now());

  // Track page views on route change
  useEffect(() => {
    if (!trackPageViews) return;

    if (pathname !== previousPathname.current) {
      // Track time on previous page
      if (previousPathname.current !== null) {
        const timeOnPage = Math.round((Date.now() - pageEntryTime.current) / 1000);
        trackEvent('construction_view', {
          properties: {
            timeOnPage,
            pagePath: previousPathname.current,
          } as EventProperties,
        });
      }

      // Track new page view
      trackPageView(pathname);
      previousPathname.current = pathname;
      pageEntryTime.current = Date.now();
    }
  }, [pathname, trackPageViews]);

  // Identify user when userId changes
  useEffect(() => {
    if (userId) {
      identifyUser(userId);
    }
  }, [userId]);

  // Track with user ID automatically attached
  const track = useCallback(
    <T extends EventProperties = EventProperties>(
      eventName: EventName,
      eventOptions: {
        properties?: T;
        constructionId?: string;
        suggestionId?: string;
        organizationId?: string;
      } = {}
    ) => {
      return trackEvent(eventName, {
        ...eventOptions,
        userId,
      });
    },
    [userId]
  );

  // Map event tracking
  const trackMap = useCallback(
    (eventName: EventName, properties?: MapEventProperties) => {
      return trackMapEvent(eventName, properties);
    },
    []
  );

  // Construction event tracking
  const trackConstruction = useCallback(
    (
      eventName: EventName,
      constructionId: string,
      properties?: ConstructionEventProperties
    ) => {
      return trackConstructionEvent(eventName, constructionId, properties);
    },
    []
  );

  // Sponsor event tracking
  const trackSponsor = useCallback(
    (
      eventName: EventName,
      constructionId: string,
      organizationId: string,
      properties?: SponsorEventProperties
    ) => {
      return trackSponsorEvent(eventName, constructionId, organizationId, properties);
    },
    []
  );

  // Suggestion event tracking
  const trackSuggestion = useCallback(
    (eventName: EventName, suggestionId: string, properties?: EventProperties) => {
      return trackSuggestionEvent(eventName, suggestionId, properties);
    },
    []
  );

  return {
    track,
    trackMap,
    trackConstruction,
    trackSponsor,
    trackSuggestion,
    identify: identifyUser,
  };
}

export default useAnalytics;
