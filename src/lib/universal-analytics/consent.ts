'use client';

/**
 * Universal Analytics - Consent Management
 *
 * GDPR-compliant consent management for analytics tracking.
 * Tracks user consent preferences for analytics and marketing.
 */

import { CONSENT_CONFIG } from './constants';
import type { ConsentState } from './types';

const DEFAULT_CONSENT: ConsentState = {
  hasAnalyticsConsent: false,
  hasMarketingConsent: false,
};

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Get the current consent state
 */
export function getConsentState(): ConsentState {
  if (!isBrowser()) {
    return DEFAULT_CONSENT;
  }

  try {
    const stored = localStorage.getItem(CONSENT_CONFIG.STORAGE_KEY);
    if (!stored) {
      return DEFAULT_CONSENT;
    }

    const parsed = JSON.parse(stored);
    return {
      hasAnalyticsConsent: Boolean(parsed.hasAnalyticsConsent),
      hasMarketingConsent: Boolean(parsed.hasMarketingConsent),
      consentTimestamp: parsed.consentTimestamp,
    };
  } catch {
    return DEFAULT_CONSENT;
  }
}

/**
 * Update consent state
 *
 * @param consent - Partial consent state to merge with current state
 * @returns Updated consent state
 */
export function setConsentState(consent: Partial<ConsentState>): ConsentState {
  const current = getConsentState();
  const updated: ConsentState = {
    ...current,
    ...consent,
    consentTimestamp: new Date().toISOString(),
  };

  if (isBrowser()) {
    try {
      localStorage.setItem(CONSENT_CONFIG.STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  return updated;
}

/**
 * Accept all consent
 */
export function acceptAllConsent(): ConsentState {
  return setConsentState({
    hasAnalyticsConsent: true,
    hasMarketingConsent: true,
  });
}

/**
 * Accept only analytics consent (reject marketing)
 */
export function acceptAnalyticsOnly(): ConsentState {
  return setConsentState({
    hasAnalyticsConsent: true,
    hasMarketingConsent: false,
  });
}

/**
 * Reject all consent
 */
export function rejectAllConsent(): ConsentState {
  return setConsentState({
    hasAnalyticsConsent: false,
    hasMarketingConsent: false,
  });
}

/**
 * Check if user has given analytics consent
 */
export function hasAnalyticsConsent(): boolean {
  return getConsentState().hasAnalyticsConsent;
}

/**
 * Check if user has given marketing consent
 */
export function hasMarketingConsent(): boolean {
  return getConsentState().hasMarketingConsent;
}

/**
 * Check if user has made a consent choice
 */
export function hasConsentChoice(): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    return localStorage.getItem(CONSENT_CONFIG.STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Clear consent data
 *
 * Used when user requests data deletion (GDPR).
 */
export function clearConsent(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.removeItem(CONSENT_CONFIG.STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Get the timestamp when consent was given
 */
export function getConsentTimestamp(): string | undefined {
  return getConsentState().consentTimestamp;
}
