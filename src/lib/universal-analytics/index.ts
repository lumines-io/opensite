/**
 * Universal Analytics
 *
 * Comprehensive analytics system for OpenSite.
 * Supports multiple providers: Vercel, GA4, Mixpanel, and Payload CMS.
 *
 * @example Client-side usage
 * ```tsx
 * import { useAnalytics, useScrollDepth, useMapAnalytics } from '@/lib/universal-analytics';
 *
 * function MyComponent() {
 *   const { track, trackConstruction } = useAnalytics();
 *   useScrollDepth({ constructionId: '123' });
 *
 *   const handleClick = () => {
 *     trackConstruction('construction_cta_click', '123', { ctaType: 'phone' });
 *   };
 * }
 * ```
 *
 * @example Server-side usage
 * ```ts
 * import { trackServerEvent, trackConstructionCrudEvent } from '@/lib/universal-analytics/analytics-server';
 *
 * // In a Payload hook
 * afterChange: [
 *   async ({ doc, operation }) => {
 *     if (operation === 'create') {
 *       await trackConstructionCrudEvent('construction_created', doc.id);
 *     }
 *   }
 * ]
 * ```
 */

// Client-side exports
export {
  trackEvent,
  trackMapEvent,
  trackConstructionEvent,
  trackSponsorEvent,
  trackSuggestionEvent,
  trackUserEvent,
  trackPageView,
  identifyUser,
  flushAnalytics,
  configureAnalytics,
  getAnalyticsConfig,
  getConsentState,
  hasAnalyticsConsent,
} from './analytics-client';

// Hooks
export { useAnalytics } from './hooks/useAnalytics';
export { useScrollDepth } from './hooks/useScrollDepth';
export { useMapAnalytics } from './hooks/useMapAnalytics';

// Session management
export {
  getSessionId,
  getAnonymousId,
  clearSession,
  clearAnonymousId,
  touchSession,
  isSessionActive,
} from './session';

// Consent management
export {
  setConsentState,
  acceptAllConsent,
  acceptAnalyticsOnly,
  rejectAllConsent,
  hasMarketingConsent,
  hasConsentChoice,
  clearConsent,
  getConsentTimestamp,
} from './consent';

// Types
export type {
  EventName,
  EventCategory,
  EventProperties,
  MapEventProperties,
  ConstructionEventProperties,
  SuggestionEventProperties,
  SponsorEventProperties,
  SystemEventProperties,
  AnalyticsEvent,
  AnalyticsContext,
  ConsentState,
  UniversalAnalyticsConfig,
} from './types';

// Constants
export { EVENT_NAMES, EVENT_CATEGORIES, BILLING_RATES } from './constants';
