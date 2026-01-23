'use client';

/**
 * Universal Analytics - Session Management
 *
 * Handles session ID generation and anonymous user identification.
 * Sessions expire after 30 minutes of inactivity.
 */

import { SESSION_CONFIG } from './constants';

/**
 * Generate a unique ID
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

/**
 * Get or create a session ID
 *
 * Sessions expire after 30 minutes of inactivity.
 * A new session ID is generated on expiration.
 */
export function getSessionId(): string {
  if (!isBrowser()) {
    return '';
  }

  try {
    const lastActivity = sessionStorage.getItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);
    const currentSession = sessionStorage.getItem(SESSION_CONFIG.SESSION_KEY);
    const now = Date.now();

    // Check if session is expired
    if (lastActivity && currentSession) {
      const timeSinceLastActivity = now - parseInt(lastActivity, 10);
      if (timeSinceLastActivity > SESSION_CONFIG.TIMEOUT) {
        // Session expired, create new one
        const newSession = generateId();
        sessionStorage.setItem(SESSION_CONFIG.SESSION_KEY, newSession);
        sessionStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, now.toString());
        return newSession;
      }
    }

    // Update last activity timestamp
    sessionStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, now.toString());

    // Return existing session or create new one
    if (currentSession) {
      return currentSession;
    }

    const sessionId = generateId();
    sessionStorage.setItem(SESSION_CONFIG.SESSION_KEY, sessionId);
    return sessionId;
  } catch {
    // sessionStorage might be unavailable (private browsing, etc.)
    return generateId();
  }
}

/**
 * Get or create a persistent anonymous ID
 *
 * This ID persists across sessions in localStorage.
 * Used to identify returning visitors who aren't logged in.
 */
export function getAnonymousId(): string {
  if (!isBrowser()) {
    return '';
  }

  try {
    let anonymousId = localStorage.getItem(SESSION_CONFIG.ANONYMOUS_KEY);
    if (!anonymousId) {
      anonymousId = generateId();
      localStorage.setItem(SESSION_CONFIG.ANONYMOUS_KEY, anonymousId);
    }
    return anonymousId;
  } catch {
    // localStorage might be unavailable
    return generateId();
  }
}

/**
 * Clear the current session
 *
 * Used when user logs out or for testing.
 */
export function clearSession(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    sessionStorage.removeItem(SESSION_CONFIG.SESSION_KEY);
    sessionStorage.removeItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear the anonymous ID
 *
 * Used when user requests data deletion (GDPR).
 */
export function clearAnonymousId(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.removeItem(SESSION_CONFIG.ANONYMOUS_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Update session activity timestamp
 *
 * Call this on user interactions to extend session.
 */
export function touchSession(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    sessionStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {
    // Ignore errors
  }
}

/**
 * Check if the session is still active
 */
export function isSessionActive(): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    const lastActivity = sessionStorage.getItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);
    if (!lastActivity) {
      return false;
    }

    const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
    return timeSinceLastActivity <= SESSION_CONFIG.TIMEOUT;
  } catch {
    return false;
  }
}

/**
 * Get session start time
 */
export function getSessionStartTime(): number | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const sessionId = sessionStorage.getItem(SESSION_CONFIG.SESSION_KEY);
    if (!sessionId) {
      return null;
    }

    // Session ID format: timestamp-random
    const timestampPart = sessionId.split('-')[0];
    return parseInt(timestampPart, 36);
  } catch {
    return null;
  }
}
