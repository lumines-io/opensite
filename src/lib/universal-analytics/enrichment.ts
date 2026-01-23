'use client';

/**
 * Universal Analytics - Context Enrichment
 *
 * Automatically enriches events with device, browser, and page context.
 */

import type { AnalyticsContext } from './types';

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Parse user agent to extract browser and OS info
 */
function parseUserAgent(ua: string): {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
} {
  const result = {
    browser: 'Unknown',
    browserVersion: '',
    os: 'Unknown',
    osVersion: '',
  };

  // Browser detection
  if (ua.includes('Firefox/')) {
    result.browser = 'Firefox';
    const match = ua.match(/Firefox\/(\d+(?:\.\d+)?)/);
    if (match) result.browserVersion = match[1];
  } else if (ua.includes('Edg/')) {
    result.browser = 'Edge';
    const match = ua.match(/Edg\/(\d+(?:\.\d+)?)/);
    if (match) result.browserVersion = match[1];
  } else if (ua.includes('Chrome/')) {
    result.browser = 'Chrome';
    const match = ua.match(/Chrome\/(\d+(?:\.\d+)?)/);
    if (match) result.browserVersion = match[1];
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    result.browser = 'Safari';
    const match = ua.match(/Version\/(\d+(?:\.\d+)?)/);
    if (match) result.browserVersion = match[1];
  }

  // OS detection
  if (ua.includes('Windows NT')) {
    result.os = 'Windows';
    if (ua.includes('Windows NT 10.0')) result.osVersion = '10';
    else if (ua.includes('Windows NT 11.0')) result.osVersion = '11';
    else if (ua.includes('Windows NT 6.3')) result.osVersion = '8.1';
    else if (ua.includes('Windows NT 6.2')) result.osVersion = '8';
  } else if (ua.includes('Mac OS X')) {
    result.os = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    if (match) result.osVersion = match[1].replace('_', '.');
  } else if (ua.includes('Linux')) {
    result.os = 'Linux';
  } else if (ua.includes('Android')) {
    result.os = 'Android';
    const match = ua.match(/Android (\d+(?:\.\d+)?)/);
    if (match) result.osVersion = match[1];
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    result.os = 'iOS';
    const match = ua.match(/OS (\d+[._]\d+)/);
    if (match) result.osVersion = match[1].replace('_', '.');
  }

  return result;
}

/**
 * Detect device type based on screen width and user agent
 */
function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (!isBrowser()) {
    return 'desktop';
  }

  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  // Check user agent for mobile/tablet keywords
  const isMobileUA = /mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua);
  const isTabletUA = /tablet|ipad|playbook|silk/i.test(ua);

  if (isTabletUA || (isMobileUA && width >= 768)) {
    return 'tablet';
  }

  if (isMobileUA || width < 768) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Get UTM parameters from URL
 */
function getUtmParams(): Pick<
  AnalyticsContext,
  'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmTerm' | 'utmContent'
> {
  if (!isBrowser()) {
    return {};
  }

  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      utmTerm: params.get('utm_term') || undefined,
      utmContent: params.get('utm_content') || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Enrich event context with device, browser, and page information
 */
export function enrichContext(existingContext?: Partial<AnalyticsContext>): AnalyticsContext {
  if (!isBrowser()) {
    return existingContext || {};
  }

  const ua = navigator.userAgent;
  const parsed = parseUserAgent(ua);
  const utmParams = getUtmParams();

  return {
    userAgent: ua,
    deviceType: detectDeviceType(),
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    osVersion: parsed.osVersion,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || undefined,
    pageUrl: window.location.href,
    pagePath: window.location.pathname,
    ...utmParams,
    ...existingContext,
  };
}

/**
 * Get basic context without full enrichment
 * Useful for server-side tracking where navigator is not available
 */
export function getBasicContext(
  pageUrl?: string,
  pagePath?: string
): Partial<AnalyticsContext> {
  return {
    pageUrl,
    pagePath,
  };
}

/**
 * Hash IP address for privacy-compliant storage
 * Uses a simple hash - in production, consider using SHA-256
 */
export async function hashIp(ip: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(ip);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    } catch {
      // Fallback for environments without crypto.subtle
    }
  }

  // Simple fallback hash
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
