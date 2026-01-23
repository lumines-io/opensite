import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock storage
const mockSessionStorage: Record<string, string> = {};
const mockLocalStorage: Record<string, string> = {};

const createStorageMock = (storage: Record<string, string>) => ({
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
  length: 0,
  key: vi.fn(),
});

vi.stubGlobal('sessionStorage', createStorageMock(mockSessionStorage));
vi.stubGlobal('localStorage', createStorageMock(mockLocalStorage));

// Mock window
vi.stubGlobal('window', {
  innerWidth: 1920,
  location: {
    href: 'https://example.com/page',
    pathname: '/page',
    search: '',
  },
  screen: { width: 1920, height: 1080 },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

vi.stubGlobal('document', {
  referrer: '',
  addEventListener: vi.fn(),
  visibilityState: 'visible',
});

vi.stubGlobal('navigator', {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
  language: 'en-US',
  sendBeacon: vi.fn().mockReturnValue(true),
});

// Mock Intl.DateTimeFormat - must be callable with or without `new`
function MockDateTimeFormat() {
  // @ts-expect-error - this is intentional to mimic Intl.DateTimeFormat behavior
  if (!(this instanceof MockDateTimeFormat)) {
    // @ts-expect-error - this is intentional
    return new MockDateTimeFormat();
  }
}
MockDateTimeFormat.prototype.resolvedOptions = function () {
  return { timeZone: 'America/New_York' };
};

vi.stubGlobal('Intl', {
  ...Intl,
  DateTimeFormat: MockDateTimeFormat,
});

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ received: 1, succeeded: 1, failed: 0 }),
});
vi.stubGlobal('fetch', mockFetch);

// Mock @vercel/analytics
vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

import { DEFAULT_CONFIG } from '../types';
import { CONSENT_CONFIG } from '../constants';

describe('Analytics Client', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Clear storage
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('configureAnalytics', () => {
    it('should update configuration', async () => {
      const { configureAnalytics, getAnalyticsConfig } = await import('../analytics-client');

      configureAnalytics({
        enabled: false,
        debug: true,
      });

      const config = getAnalyticsConfig();

      expect(config.enabled).toBe(false);
      expect(config.debug).toBe(true);
    });

    it('should merge with existing configuration', async () => {
      const { configureAnalytics, getAnalyticsConfig } = await import('../analytics-client');

      configureAnalytics({ debug: true });
      configureAnalytics({ batchSize: 20 });

      const config = getAnalyticsConfig();

      expect(config.debug).toBe(true);
      expect(config.batchSize).toBe(20);
    });

    it('should preserve default values for unset properties', async () => {
      const { configureAnalytics, getAnalyticsConfig } = await import('../analytics-client');

      configureAnalytics({ debug: true });

      const config = getAnalyticsConfig();

      expect(config.flushInterval).toBe(DEFAULT_CONFIG.flushInterval);
      expect(config.providers).toBeDefined();
    });
  });

  describe('getAnalyticsConfig', () => {
    it('should return a copy of the configuration', async () => {
      const { getAnalyticsConfig } = await import('../analytics-client');

      const config1 = getAnalyticsConfig();
      const config2 = getAnalyticsConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe('trackEvent', () => {
    it('should not track when analytics is disabled', async () => {
      const { trackEvent, configureAnalytics } = await import('../analytics-client');

      configureAnalytics({ enabled: false, consentRequired: false });

      await trackEvent('map_loaded');

      // Since analytics is disabled, no events should be sent
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not track without consent when required', async () => {
      const { trackEvent, configureAnalytics } = await import('../analytics-client');

      configureAnalytics({ consentRequired: true, enabled: true });
      // No consent stored

      await trackEvent('map_loaded');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should log debug info when debug mode enabled', async () => {
      const { trackEvent, configureAnalytics } = await import('../analytics-client');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      configureAnalytics({ debug: true, enabled: true, consentRequired: false });

      await trackEvent('map_loaded');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Analytics] Tracking event:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('trackMapEvent', () => {
    it('should be a function', async () => {
      const { trackMapEvent } = await import('../analytics-client');
      expect(typeof trackMapEvent).toBe('function');
    });
  });

  describe('trackConstructionEvent', () => {
    it('should be a function', async () => {
      const { trackConstructionEvent } = await import('../analytics-client');
      expect(typeof trackConstructionEvent).toBe('function');
    });
  });

  describe('trackSponsorEvent', () => {
    it('should be a function', async () => {
      const { trackSponsorEvent } = await import('../analytics-client');
      expect(typeof trackSponsorEvent).toBe('function');
    });
  });

  describe('trackSuggestionEvent', () => {
    it('should be a function', async () => {
      const { trackSuggestionEvent } = await import('../analytics-client');
      expect(typeof trackSuggestionEvent).toBe('function');
    });
  });

  describe('trackUserEvent', () => {
    it('should be a function', async () => {
      const { trackUserEvent } = await import('../analytics-client');
      expect(typeof trackUserEvent).toBe('function');
    });
  });

  describe('flushAnalytics', () => {
    it('should be a function', async () => {
      const { flushAnalytics } = await import('../analytics-client');
      expect(typeof flushAnalytics).toBe('function');
    });

    it('should not throw when called', async () => {
      const { flushAnalytics } = await import('../analytics-client');
      await expect(flushAnalytics()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const { trackEvent, configureAnalytics, flushAnalytics } = await import('../analytics-client');

      configureAnalytics({ enabled: true, consentRequired: false });

      // Should not throw
      await expect(trackEvent('map_loaded')).resolves.not.toThrow();
      await expect(flushAnalytics()).resolves.not.toThrow();
    });
  });

  describe('consent integration', () => {
    it('should use consent from storage when available', async () => {
      // Set consent in storage
      mockLocalStorage[CONSENT_CONFIG.STORAGE_KEY] = JSON.stringify({
        hasAnalyticsConsent: true,
        hasMarketingConsent: false,
      });

      const { hasAnalyticsConsent, getConsentState } = await import('../analytics-client');

      expect(hasAnalyticsConsent()).toBe(true);
      expect(getConsentState().hasMarketingConsent).toBe(false);
    });
  });
});
