import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  }),
  length: 0,
  key: vi.fn(),
};

// Must stub window first so isBrowser() check passes
vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', localStorageMock);

import {
  getConsentState,
  setConsentState,
  acceptAllConsent,
  acceptAnalyticsOnly,
  rejectAllConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
  hasConsentChoice,
  clearConsent,
  getConsentTimestamp,
} from '../consent';
import { CONSENT_CONFIG } from '../constants';

describe('Consent Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock storage
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  describe('getConsentState', () => {
    it('should return default consent state when nothing stored', () => {
      const state = getConsentState();

      expect(state).toEqual({
        hasAnalyticsConsent: false,
        hasMarketingConsent: false,
      });
    });

    it('should return stored consent state', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: false,
        consentTimestamp: '2024-01-15T10:00:00.000Z',
      });

      const state = getConsentState();

      expect(state).toEqual({
        hasAnalyticsConsent: true,
        hasMarketingConsent: false,
        consentTimestamp: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should handle corrupted JSON gracefully', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = 'invalid-json{{{';

      const state = getConsentState();

      expect(state).toEqual({
        hasAnalyticsConsent: false,
        hasMarketingConsent: false,
      });
    });

    it('should convert truthy values to booleans', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: 1,
        hasMarketingConsent: 'yes',
      });

      const state = getConsentState();

      expect(state.hasAnalyticsConsent).toBe(true);
      expect(state.hasMarketingConsent).toBe(true);
    });

    it('should convert falsy values to booleans', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: 0,
        hasMarketingConsent: '',
      });

      const state = getConsentState();

      expect(state.hasAnalyticsConsent).toBe(false);
      expect(state.hasMarketingConsent).toBe(false);
    });
  });

  describe('setConsentState', () => {
    it('should update consent state and add timestamp', () => {
      const beforeUpdate = new Date().toISOString();

      const result = setConsentState({
        hasAnalyticsConsent: true,
      });

      expect(result.hasAnalyticsConsent).toBe(true);
      expect(result.hasMarketingConsent).toBe(false);
      expect(result.consentTimestamp).toBeDefined();

      // Verify timestamp is recent
      const timestamp = new Date(result.consentTimestamp!).getTime();
      const beforeTime = new Date(beforeUpdate).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should persist to localStorage', () => {
      setConsentState({
        hasAnalyticsConsent: true,
        hasMarketingConsent: true,
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        CONSENT_CONFIG.STORAGE_KEY,
        expect.any(String)
      );

      const stored = JSON.parse(mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY]);
      expect(stored.hasAnalyticsConsent).toBe(true);
      expect(stored.hasMarketingConsent).toBe(true);
    });

    it('should merge with existing state', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: false,
      });

      const result = setConsentState({
        hasMarketingConsent: true,
      });

      expect(result.hasAnalyticsConsent).toBe(true);
      expect(result.hasMarketingConsent).toBe(true);
    });

    it('should overwrite existing values', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: true,
      });

      const result = setConsentState({
        hasAnalyticsConsent: false,
        hasMarketingConsent: false,
      });

      expect(result.hasAnalyticsConsent).toBe(false);
      expect(result.hasMarketingConsent).toBe(false);
    });
  });

  describe('acceptAllConsent', () => {
    it('should set both consents to true', () => {
      const result = acceptAllConsent();

      expect(result.hasAnalyticsConsent).toBe(true);
      expect(result.hasMarketingConsent).toBe(true);
      expect(result.consentTimestamp).toBeDefined();
    });

    it('should persist to storage', () => {
      acceptAllConsent();

      const stored = JSON.parse(mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY]);
      expect(stored.hasAnalyticsConsent).toBe(true);
      expect(stored.hasMarketingConsent).toBe(true);
    });
  });

  describe('acceptAnalyticsOnly', () => {
    it('should set analytics consent to true and marketing to false', () => {
      // Start with marketing consent enabled
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: false,
        hasMarketingConsent: true,
      });

      const result = acceptAnalyticsOnly();

      expect(result.hasAnalyticsConsent).toBe(true);
      expect(result.hasMarketingConsent).toBe(false);
    });
  });

  describe('rejectAllConsent', () => {
    it('should set both consents to false', () => {
      // Start with all consents enabled
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: true,
      });

      const result = rejectAllConsent();

      expect(result.hasAnalyticsConsent).toBe(false);
      expect(result.hasMarketingConsent).toBe(false);
      expect(result.consentTimestamp).toBeDefined();
    });
  });

  describe('hasAnalyticsConsent', () => {
    it('should return true when analytics consent given', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: false,
      });

      expect(hasAnalyticsConsent()).toBe(true);
    });

    it('should return false when analytics consent not given', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: false,
        hasMarketingConsent: true,
      });

      expect(hasAnalyticsConsent()).toBe(false);
    });

    it('should return false when no consent stored', () => {
      expect(hasAnalyticsConsent()).toBe(false);
    });
  });

  describe('hasMarketingConsent', () => {
    it('should return true when marketing consent given', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: false,
        hasMarketingConsent: true,
      });

      expect(hasMarketingConsent()).toBe(true);
    });

    it('should return false when marketing consent not given', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: false,
      });

      expect(hasMarketingConsent()).toBe(false);
    });

    it('should return false when no consent stored', () => {
      expect(hasMarketingConsent()).toBe(false);
    });
  });

  describe('hasConsentChoice', () => {
    it('should return true when consent has been set', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: false,
        hasMarketingConsent: false,
      });

      expect(hasConsentChoice()).toBe(true);
    });

    it('should return false when no consent stored', () => {
      expect(hasConsentChoice()).toBe(false);
    });
  });

  describe('clearConsent', () => {
    it('should remove consent from localStorage', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: true,
      });

      clearConsent();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(CONSENT_CONFIG.STORAGE_KEY);
    });

    it('should not throw when no consent stored', () => {
      expect(() => clearConsent()).not.toThrow();
    });
  });

  describe('getConsentTimestamp', () => {
    it('should return timestamp when consent has been set', () => {
      const timestamp = '2024-01-15T10:00:00.000Z';
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: true,
        consentTimestamp: timestamp,
      });

      expect(getConsentTimestamp()).toBe(timestamp);
    });

    it('should return undefined when no timestamp stored', () => {
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: true,
      });

      expect(getConsentTimestamp()).toBeUndefined();
    });

    it('should return undefined when no consent stored', () => {
      expect(getConsentTimestamp()).toBeUndefined();
    });
  });

  describe('GDPR compliance scenarios', () => {
    it('should allow user to change their consent', () => {
      // User initially accepts all
      acceptAllConsent();
      expect(hasAnalyticsConsent()).toBe(true);
      expect(hasMarketingConsent()).toBe(true);

      // User later revokes marketing consent
      acceptAnalyticsOnly();
      expect(hasAnalyticsConsent()).toBe(true);
      expect(hasMarketingConsent()).toBe(false);

      // User later revokes all consent
      rejectAllConsent();
      expect(hasAnalyticsConsent()).toBe(false);
      expect(hasMarketingConsent()).toBe(false);
    });

    it('should allow user to clear all consent data (right to be forgotten)', () => {
      acceptAllConsent();
      expect(hasConsentChoice()).toBe(true);

      clearConsent();
      expect(hasConsentChoice()).toBe(false);
      expect(hasAnalyticsConsent()).toBe(false);
      expect(hasMarketingConsent()).toBe(false);
    });

    it('should preserve timestamp history through changes', () => {
      acceptAllConsent();
      const firstTimestamp = getConsentTimestamp();

      // Small delay to ensure different timestamp
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      acceptAnalyticsOnly();
      const secondTimestamp = getConsentTimestamp();

      expect(firstTimestamp).not.toBe(secondTimestamp);

      vi.useRealTimers();
    });
  });
});

describe('Consent Management - Server-side (no window)', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // @ts-expect-error - intentionally removing window
    delete global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('getConsentState should return default state on server', async () => {
    vi.resetModules();
    const { getConsentState: serverGetConsentState } = await import('../consent');

    expect(serverGetConsentState()).toEqual({
      hasAnalyticsConsent: false,
      hasMarketingConsent: false,
    });
  });

  it('hasConsentChoice should return false on server', async () => {
    vi.resetModules();
    const { hasConsentChoice: serverHasConsentChoice } = await import('../consent');

    expect(serverHasConsentChoice()).toBe(false);
  });

  it('setConsentState should work without throwing on server', async () => {
    vi.resetModules();
    const { setConsentState: serverSetConsentState } = await import('../consent');

    const result = serverSetConsentState({ hasAnalyticsConsent: true });
    expect(result.hasAnalyticsConsent).toBe(true);
  });
});
