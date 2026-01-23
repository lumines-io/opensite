'use client';

/**
 * Universal Analytics - Mixpanel Provider
 *
 * Adapter for Mixpanel analytics.
 * Only tracks if Mixpanel is configured.
 */

import type { AnalyticsEvent, AnalyticsProvider } from '../types';

// Extend Window interface for Mixpanel
declare global {
  interface Window {
    mixpanel?: {
      track: (eventName: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string) => void;
      people: {
        set: (properties: Record<string, unknown>) => void;
      };
      reset: () => void;
    };
  }
}

/**
 * Get Mixpanel token from environment
 */
function getMixpanelToken(): string | undefined {
  return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
}

/**
 * Check if Mixpanel is available and configured
 */
function isMixpanelAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const token = getMixpanelToken();
  if (!token) {
    return false;
  }

  return typeof window.mixpanel?.track === 'function';
}

/**
 * Format properties for Mixpanel
 */
function formatPropertiesForMixpanel(
  event: AnalyticsEvent
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    category: event.eventCategory,
    timestamp: event.timestamp,
    session_id: event.sessionId,
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

  // Add event properties
  if (event.properties) {
    Object.assign(props, event.properties);
  }

  // Add context
  if (event.context) {
    props.$browser = event.context.browser;
    props.$browser_version = event.context.browserVersion;
    props.$os = event.context.os;
    props.$device = event.context.deviceType;
    props.$screen_width = event.context.screenWidth;
    props.$screen_height = event.context.screenHeight;
    props.$referrer = event.context.referrer;
    props.$current_url = event.context.pageUrl;

    // UTM parameters
    if (event.context.utmSource) props.utm_source = event.context.utmSource;
    if (event.context.utmMedium) props.utm_medium = event.context.utmMedium;
    if (event.context.utmCampaign) props.utm_campaign = event.context.utmCampaign;
    if (event.context.utmTerm) props.utm_term = event.context.utmTerm;
    if (event.context.utmContent) props.utm_content = event.context.utmContent;
  }

  return props;
}

/**
 * Track event using Mixpanel
 */
async function trackMixpanelEvent(event: AnalyticsEvent): Promise<void> {
  if (!isMixpanelAvailable()) {
    return;
  }

  try {
    const properties = formatPropertiesForMixpanel(event);
    window.mixpanel?.track(event.eventName, properties);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics:Mixpanel] Failed to track event:', error);
    }
  }
}

/**
 * Identify user in Mixpanel
 */
async function identifyMixpanelUser(
  userId: string,
  traits?: Record<string, unknown>
): Promise<void> {
  if (!isMixpanelAvailable()) {
    return;
  }

  try {
    window.mixpanel?.identify(userId);

    if (traits) {
      window.mixpanel?.people.set(traits);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics:Mixpanel] Failed to identify user:', error);
    }
  }
}

/**
 * Track pageview in Mixpanel
 */
async function trackMixpanelPage(
  name: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!isMixpanelAvailable()) {
    return;
  }

  try {
    window.mixpanel?.track('$mp_web_page_view', {
      $current_url: window.location.href,
      page_name: name,
      ...properties,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics:Mixpanel] Failed to track pageview:', error);
    }
  }
}

/**
 * Mixpanel Provider
 */
export const mixpanelProvider: AnalyticsProvider = {
  name: 'mixpanel',

  isEnabled: () => {
    const token = getMixpanelToken();
    return Boolean(token);
  },

  track: trackMixpanelEvent,
  identify: identifyMixpanelUser,
  page: trackMixpanelPage,
};

export default mixpanelProvider;
