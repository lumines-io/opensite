'use client';

/**
 * Universal Analytics - Vercel Analytics Provider
 *
 * Adapter for Vercel Analytics (@vercel/analytics).
 * Only tracks if Vercel Analytics is available.
 */

import type { AnalyticsEvent, AnalyticsProvider } from '../types';

/**
 * Check if Vercel Analytics track function is available
 */
function isVercelAnalyticsAvailable(): boolean {
  try {
    // Check if @vercel/analytics is available
    // The track function is dynamically imported
    return typeof window !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Flatten nested properties for Vercel Analytics
 * Vercel Analytics only accepts flat key-value pairs
 */
function flattenProperties(
  props?: Record<string, unknown>
): Record<string, string | number | boolean> {
  if (!props) return {};

  const flat: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      flat[key] = value;
    } else if (value !== null && value !== undefined) {
      flat[key] = JSON.stringify(value);
    }
  }
  return flat;
}

/**
 * Track event using Vercel Analytics
 */
async function trackVercelEvent(event: AnalyticsEvent): Promise<void> {
  if (!isVercelAnalyticsAvailable()) {
    return;
  }

  try {
    // Dynamically import to avoid build issues if @vercel/analytics is not installed
    const { track } = await import('@vercel/analytics');

    const properties: Record<string, string | number | boolean> = {
      category: event.eventCategory,
      ...flattenProperties(event.properties as Record<string, unknown>),
    };

    // Add entity IDs if present
    if (event.constructionId) {
      properties.construction_id = event.constructionId;
    }
    if (event.suggestionId) {
      properties.suggestion_id = event.suggestionId;
    }
    if (event.organizationId) {
      properties.organization_id = event.organizationId;
    }

    track(event.eventName, properties);
  } catch (error) {
    // Silently fail if Vercel Analytics is not available
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics:Vercel] Failed to track event:', error);
    }
  }
}

/**
 * Vercel Analytics Provider
 */
export const vercelProvider: AnalyticsProvider = {
  name: 'vercel',

  isEnabled: () => {
    // Vercel Analytics is enabled by default in Vercel deployments
    // No explicit environment variable needed
    return isVercelAnalyticsAvailable();
  },

  track: trackVercelEvent,
};

export default vercelProvider;
