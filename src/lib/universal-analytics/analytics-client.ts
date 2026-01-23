'use client';

/**
 * Universal Analytics - Client-Side Analytics
 *
 * Main entry point for client-side analytics tracking.
 * Handles event batching, provider routing, and consent management.
 */

import type {
  AnalyticsEvent,
  EventName,
  EventCategory,
  EventProperties,
  MapEventProperties,
  ConstructionEventProperties,
  SponsorEventProperties,
  UniversalAnalyticsConfig,
} from './types';
import { DEFAULT_CONFIG, type ConsentState } from './types';
import { EVENT_CATEGORY_MAP } from './constants';
import { getSessionId, getAnonymousId } from './session';
import { getConsentState, hasAnalyticsConsent } from './consent';
import { enrichContext } from './enrichment';
import { vercelProvider } from './providers/vercel';
import { ga4Provider } from './providers/ga4';
import { mixpanelProvider } from './providers/mixpanel';
import { payloadProvider, flushQueue as flushPayloadQueue } from './providers/payload';

// =====================================
// CONFIGURATION
// =====================================

let config: UniversalAnalyticsConfig = { ...DEFAULT_CONFIG };

/**
 * Configure the analytics client
 */
export function configureAnalytics(
  newConfig: Partial<UniversalAnalyticsConfig>
): void {
  config = { ...config, ...newConfig };

  if (config.debug) {
    console.log('[Analytics] Configuration updated:', config);
  }
}

/**
 * Get current configuration
 */
export function getAnalyticsConfig(): UniversalAnalyticsConfig {
  return { ...config };
}

// =====================================
// MAIN TRACKING FUNCTION
// =====================================

/**
 * Track an analytics event
 *
 * This is the main function for tracking events.
 * It handles consent checking, context enrichment, and routing to providers.
 */
export async function trackEvent<T extends EventProperties = EventProperties>(
  eventName: EventName,
  options: {
    properties?: T;
    constructionId?: string;
    suggestionId?: string;
    organizationId?: string;
    userId?: string;
  } = {}
): Promise<void> {
  // Check if analytics is enabled
  if (!config.enabled) {
    return;
  }

  // Check consent if required
  if (config.consentRequired && !hasAnalyticsConsent()) {
    if (config.debug) {
      console.log('[Analytics] Event blocked - no consent:', eventName);
    }
    return;
  }

  // Determine event category
  const eventCategory = (EVENT_CATEGORY_MAP[eventName] || 'system') as EventCategory;

  // Build the event object
  const event: AnalyticsEvent<T> = {
    eventName,
    eventCategory,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    anonymousId: getAnonymousId(),
    userId: options.userId,
    constructionId: options.constructionId,
    suggestionId: options.suggestionId,
    organizationId: options.organizationId,
    properties: options.properties,
    context: config.enrichContext ? enrichContext() : undefined,
    consent: getConsentState(),
  };

  if (config.debug) {
    console.log('[Analytics] Tracking event:', event);
  }

  // Send to all enabled providers
  const promises: Promise<void>[] = [];

  // Vercel Analytics
  if (config.providers.vercel.enabled && vercelProvider.isEnabled()) {
    promises.push(vercelProvider.track(event));
  }

  // Google Analytics 4
  if (config.providers.ga4.enabled && ga4Provider.isEnabled()) {
    promises.push(ga4Provider.track(event));
  }

  // Mixpanel
  if (config.providers.mixpanel.enabled && mixpanelProvider.isEnabled()) {
    promises.push(mixpanelProvider.track(event));
  }

  // Payload CMS
  if (config.providers.payload.enabled && payloadProvider.isEnabled()) {
    promises.push(payloadProvider.track(event));
  }

  // Wait for all providers (don't throw on individual failures)
  await Promise.allSettled(promises);
}

// =====================================
// CONVENIENCE FUNCTIONS
// =====================================

/**
 * Track a map event
 */
export function trackMapEvent(
  eventName: EventName,
  properties?: MapEventProperties
): Promise<void> {
  return trackEvent(eventName, { properties });
}

/**
 * Track a construction event
 */
export function trackConstructionEvent(
  eventName: EventName,
  constructionId: string,
  properties?: ConstructionEventProperties
): Promise<void> {
  return trackEvent(eventName, {
    constructionId,
    properties,
  });
}

/**
 * Track a sponsor event (billable)
 */
export function trackSponsorEvent(
  eventName: EventName,
  constructionId: string,
  organizationId: string,
  properties?: SponsorEventProperties
): Promise<void> {
  return trackEvent(eventName, {
    constructionId,
    organizationId,
    properties,
  });
}

/**
 * Track a suggestion event
 */
export function trackSuggestionEvent(
  eventName: EventName,
  suggestionId: string,
  properties?: EventProperties
): Promise<void> {
  return trackEvent(eventName, {
    suggestionId,
    properties,
  });
}

/**
 * Track a user event
 */
export function trackUserEvent(
  eventName: EventName,
  userId: string,
  properties?: EventProperties
): Promise<void> {
  return trackEvent(eventName, {
    userId,
    properties,
  });
}

// =====================================
// IDENTITY MANAGEMENT
// =====================================

/**
 * Identify a user across all providers
 */
export async function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): Promise<void> {
  if (!config.enabled) return;

  const promises: Promise<void>[] = [];

  if (config.providers.ga4.enabled && ga4Provider.identify) {
    promises.push(ga4Provider.identify(userId, traits));
  }

  if (config.providers.mixpanel.enabled && mixpanelProvider.identify) {
    promises.push(mixpanelProvider.identify(userId, traits));
  }

  await Promise.allSettled(promises);
}

// =====================================
// PAGE TRACKING
// =====================================

/**
 * Track a page view across all providers
 */
export async function trackPageView(
  pageName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!config.enabled) return;
  if (config.consentRequired && !hasAnalyticsConsent()) return;

  const promises: Promise<void>[] = [];

  if (config.providers.ga4.enabled && ga4Provider.page) {
    promises.push(ga4Provider.page(pageName, properties));
  }

  if (config.providers.mixpanel.enabled && mixpanelProvider.page) {
    promises.push(mixpanelProvider.page(pageName, properties));
  }

  await Promise.allSettled(promises);
}

// =====================================
// FLUSH & CLEANUP
// =====================================

/**
 * Flush all pending events
 */
export async function flushAnalytics(): Promise<void> {
  if (config.providers.payload.enabled && payloadProvider.flush) {
    await payloadProvider.flush();
  }
}

// Re-export consent functions for convenience
export { getConsentState, hasAnalyticsConsent } from './consent';
export type { ConsentState };
