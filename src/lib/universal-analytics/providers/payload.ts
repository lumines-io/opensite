'use client';

/**
 * Universal Analytics - Payload CMS Provider
 *
 * Adapter for storing analytics events in Payload CMS.
 * Sends events to the /api/analytics/events endpoint.
 */

import type { AnalyticsEvent, AnalyticsProvider } from '../types';
import { BILLING_RATES } from '../constants';

/**
 * Get the API endpoint for analytics events
 */
function getApiEndpoint(): string {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || '/api/analytics/events';
}

/**
 * Check if Payload analytics is enabled
 */
function isPayloadAnalyticsEnabled(): boolean {
  // Payload analytics is enabled by default
  // Can be disabled via environment variable
  return process.env.NEXT_PUBLIC_DISABLE_PAYLOAD_ANALYTICS !== 'true';
}

/**
 * Calculate billable amount for sponsor events
 */
function calculateBillingAmount(eventName: string): number {
  return BILLING_RATES[eventName] || 0;
}

/**
 * Format event for Payload API
 */
function formatEventForPayload(event: AnalyticsEvent): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    eventName: event.eventName,
    eventCategory: event.eventCategory,
    timestamp: event.timestamp || new Date().toISOString(),
    sessionId: event.sessionId,
    anonymousId: event.anonymousId,
  };

  // Add optional fields
  if (event.userId) payload.userId = event.userId;
  if (event.constructionId) payload.constructionId = event.constructionId;
  if (event.suggestionId) payload.suggestionId = event.suggestionId;
  if (event.organizationId) payload.organizationId = event.organizationId;

  // Add properties
  if (event.properties) {
    payload.properties = event.properties;
  }

  // Add context
  if (event.context) {
    payload.context = event.context;
  }

  // Add consent
  if (event.consent) {
    payload.consent = event.consent;
  }

  // Add billing for sponsor events
  if (event.eventCategory === 'sponsor') {
    const billableAmount = calculateBillingAmount(event.eventName);
    if (billableAmount > 0) {
      payload.billing = {
        isBillable: true,
        billableAmount,
        billingPeriod: new Date().toISOString().slice(0, 7),
        invoiced: false,
      };
    }
  }

  return payload;
}

/**
 * Send events to Payload API using fetch
 */
async function sendToPayloadApi(events: AnalyticsEvent[]): Promise<boolean> {
  if (!isPayloadAnalyticsEnabled() || events.length === 0) {
    return true;
  }

  const endpoint = getApiEndpoint();
  const formattedEvents = events.map(formatEventForPayload);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: formattedEvents }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics:Payload] Failed to send events:', error);
    }
    return false;
  }
}

/**
 * Send events using sendBeacon for reliable delivery on page unload
 */
function sendBeaconToPayload(events: AnalyticsEvent[]): boolean {
  if (!isPayloadAnalyticsEnabled() || events.length === 0) {
    return true;
  }

  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    return false;
  }

  const endpoint = getApiEndpoint();
  const formattedEvents = events.map(formatEventForPayload);

  try {
    const blob = new Blob([JSON.stringify({ events: formattedEvents })], {
      type: 'application/json',
    });

    return navigator.sendBeacon(endpoint, blob);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics:Payload] sendBeacon failed:', error);
    }
    return false;
  }
}

// Event queue for batching
let eventQueue: AnalyticsEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000;

/**
 * Schedule a flush of the event queue
 */
function scheduleFlush(): void {
  if (flushTimeout) return;

  flushTimeout = setTimeout(async () => {
    await flushQueue();
    flushTimeout = null;
  }, FLUSH_INTERVAL);
}

/**
 * Flush the event queue
 */
async function flushQueue(): Promise<void> {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  await sendToPayloadApi(eventsToSend);
}

/**
 * Track event using Payload CMS
 */
async function trackPayloadEvent(event: AnalyticsEvent): Promise<void> {
  if (!isPayloadAnalyticsEnabled()) {
    return;
  }

  eventQueue.push(event);

  if (eventQueue.length >= BATCH_SIZE) {
    await flushQueue();
  } else {
    scheduleFlush();
  }
}

// Register page unload handler to flush events
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      sendBeaconToPayload(eventQueue);
      eventQueue = [];
    }
  });

  // Also flush on visibility change (tab switch, minimize)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && eventQueue.length > 0) {
      sendBeaconToPayload(eventQueue);
      eventQueue = [];
    }
  });
}

/**
 * Payload CMS Provider
 */
export const payloadProvider: AnalyticsProvider = {
  name: 'payload',

  isEnabled: isPayloadAnalyticsEnabled,

  track: trackPayloadEvent,

  flush: flushQueue,
};

export default payloadProvider;

// Export additional functions for direct use
export { sendToPayloadApi, sendBeaconToPayload, flushQueue };
