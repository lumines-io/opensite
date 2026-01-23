'use client';

/**
 * Universal Analytics - Google Analytics 4 Provider
 *
 * Adapter for Google Analytics 4 (GA4).
 * Only tracks if GA4 is configured and consent is given.
 */

import type { AnalyticsEvent, AnalyticsProvider } from '../types';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Get the GA4 measurement ID from environment
 */
function getMeasurementId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
}

/**
 * Check if GA4 is available and configured
 */
function isGA4Available(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const measurementId = getMeasurementId();
  if (!measurementId) {
    return false;
  }

  return typeof window.gtag === 'function';
}

/**
 * Flatten properties for GA4
 * GA4 has specific naming conventions (snake_case)
 */
function formatPropertiesForGA4(
  event: AnalyticsEvent
): Record<string, string | number | boolean | undefined> {
  const props: Record<string, string | number | boolean | undefined> = {
    event_category: event.eventCategory,
  };

  // Add entity IDs
  if (event.constructionId) {
    props.construction_id = event.constructionId;
  }
  if (event.suggestionId) {
    props.suggestion_id = event.suggestionId;
  }
  if (event.organizationId) {
    props.organization_id = event.organizationId;
  }

  // Flatten event properties
  if (event.properties) {
    for (const [key, value] of Object.entries(event.properties)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        props[snakeKey] = value;
      } else if (value !== null && value !== undefined) {
        props[snakeKey] = JSON.stringify(value);
      }
    }
  }

  // Add page info from context
  if (event.context?.pagePath) {
    props.page_path = event.context.pagePath;
  }

  return props;
}

/**
 * Track event using GA4
 */
async function trackGA4Event(event: AnalyticsEvent): Promise<void> {
  if (!isGA4Available()) {
    return;
  }

  try {
    const properties = formatPropertiesForGA4(event);
    window.gtag?.('event', event.eventName, properties);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics:GA4] Failed to track event:', error);
    }
  }
}

/**
 * Identify user in GA4
 */
async function identifyGA4User(
  userId: string,
  traits?: Record<string, unknown>
): Promise<void> {
  if (!isGA4Available()) {
    return;
  }

  try {
    const measurementId = getMeasurementId();
    window.gtag?.('config', measurementId, {
      user_id: userId,
      ...traits,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics:GA4] Failed to identify user:', error);
    }
  }
}

/**
 * Track pageview in GA4
 */
async function trackGA4Page(
  name: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!isGA4Available()) {
    return;
  }

  try {
    const measurementId = getMeasurementId();
    window.gtag?.('config', measurementId, {
      page_title: name,
      page_path: properties?.path || window.location.pathname,
      ...properties,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics:GA4] Failed to track pageview:', error);
    }
  }
}

/**
 * Google Analytics 4 Provider
 */
export const ga4Provider: AnalyticsProvider = {
  name: 'ga4',

  isEnabled: () => {
    const measurementId = getMeasurementId();
    return Boolean(measurementId);
  },

  track: trackGA4Event,
  identify: identifyGA4User,
  page: trackGA4Page,
};

export default ga4Provider;
