import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global objects
vi.stubGlobal('window', {
  gtag: vi.fn(),
  mixpanel: {
    track: vi.fn(),
    identify: vi.fn(),
    people: { set: vi.fn() },
    reset: vi.fn(),
  },
  addEventListener: vi.fn(),
  location: {
    href: 'https://example.com/page',
    pathname: '/page',
  },
});

vi.stubGlobal('document', {
  addEventListener: vi.fn(),
  visibilityState: 'visible',
});

vi.stubGlobal('navigator', {
  sendBeacon: vi.fn().mockReturnValue(true),
});

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ received: 1, succeeded: 1, failed: 0 }),
});
vi.stubGlobal('fetch', mockFetch);

// Mock @vercel/analytics
const mockVercelTrack = vi.fn();
vi.mock('@vercel/analytics', () => ({
  track: mockVercelTrack,
}));

// Mock environment variables
const originalEnv = process.env;

describe('Provider Adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe('Vercel Provider', () => {
    it('should be enabled by default', async () => {
      const { vercelProvider } = await import('../providers/vercel');

      expect(vercelProvider.name).toBe('vercel');
      expect(vercelProvider.isEnabled()).toBe(true);
    });

    it('should track events using @vercel/analytics', async () => {
      const { vercelProvider } = await import('../providers/vercel');

      await vercelProvider.track({
        eventName: 'map_loaded',
        eventCategory: 'map',
        properties: { loadTime: 1500 },
      });

      expect(mockVercelTrack).toHaveBeenCalledWith('map_loaded', expect.objectContaining({
        category: 'map',
        loadTime: 1500,
      }));
    });

    it('should include construction ID in properties', async () => {
      const { vercelProvider } = await import('../providers/vercel');

      await vercelProvider.track({
        eventName: 'construction_view',
        eventCategory: 'construction',
        constructionId: 'test-123',
      });

      expect(mockVercelTrack).toHaveBeenCalledWith('construction_view', expect.objectContaining({
        construction_id: 'test-123',
      }));
    });

    it('should flatten nested properties', async () => {
      const { vercelProvider } = await import('../providers/vercel');

      await vercelProvider.track({
        eventName: 'map_search',
        eventCategory: 'map',
        properties: {
          query: 'test',
          results: 10,
          filters: { type: 'metro' },
        },
      });

      expect(mockVercelTrack).toHaveBeenCalled();
      const callArgs = mockVercelTrack.mock.calls[0];
      expect(callArgs[1].query).toBe('test');
      expect(callArgs[1].results).toBe(10);
      // Nested objects should be stringified
      expect(typeof callArgs[1].filters).toBe('string');
    });

    it('should handle tracking errors gracefully', async () => {
      mockVercelTrack.mockRejectedValueOnce(new Error('Tracking failed'));
      const { vercelProvider } = await import('../providers/vercel');

      // Should not throw
      await expect(
        vercelProvider.track({
          eventName: 'map_loaded',
          eventCategory: 'map',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('GA4 Provider', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
    });

    it('should be enabled when measurement ID is set', async () => {
      vi.resetModules();
      const { ga4Provider } = await import('../providers/ga4');

      expect(ga4Provider.name).toBe('ga4');
      expect(ga4Provider.isEnabled()).toBe(true);
    });

    it('should be disabled when measurement ID is not set', async () => {
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      vi.resetModules();
      const { ga4Provider } = await import('../providers/ga4');

      expect(ga4Provider.isEnabled()).toBe(false);
    });

    it('should track events using gtag', async () => {
      vi.resetModules();
      const { ga4Provider } = await import('../providers/ga4');

      await ga4Provider.track({
        eventName: 'construction_view',
        eventCategory: 'construction',
        constructionId: 'test-123',
        properties: { timeOnPage: 30 },
      });

      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'construction_view',
        expect.objectContaining({
          event_category: 'construction',
          construction_id: 'test-123',
          time_on_page: 30,
        })
      );
    });

    it('should convert camelCase properties to snake_case', async () => {
      vi.resetModules();
      const { ga4Provider } = await import('../providers/ga4');

      await ga4Provider.track({
        eventName: 'map_loaded',
        eventCategory: 'map',
        properties: {
          loadTime: 1500,
          tileLoadCount: 42,
        },
      });

      const callArgs = (window.gtag as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        load_time: 1500,
        tile_load_count: 42,
      });
    });

    it('should support identify method', async () => {
      vi.resetModules();
      const { ga4Provider } = await import('../providers/ga4');

      await ga4Provider.identify?.('user-123', { name: 'Test User' });

      expect(window.gtag).toHaveBeenCalledWith(
        'config',
        expect.any(String),
        expect.objectContaining({
          user_id: 'user-123',
          name: 'Test User',
        })
      );
    });

    it('should support page tracking', async () => {
      vi.resetModules();
      const { ga4Provider } = await import('../providers/ga4');

      await ga4Provider.page?.('Construction Details', { path: '/details/test' });

      expect(window.gtag).toHaveBeenCalledWith(
        'config',
        expect.any(String),
        expect.objectContaining({
          page_title: 'Construction Details',
          page_path: '/details/test',
        })
      );
    });
  });

  describe('Mixpanel Provider', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_MIXPANEL_TOKEN = 'mp-test-token';
    });

    it('should be enabled when token is set', async () => {
      vi.resetModules();
      const { mixpanelProvider } = await import('../providers/mixpanel');

      expect(mixpanelProvider.name).toBe('mixpanel');
      expect(mixpanelProvider.isEnabled()).toBe(true);
    });

    it('should be disabled when token is not set', async () => {
      delete process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
      vi.resetModules();
      const { mixpanelProvider } = await import('../providers/mixpanel');

      expect(mixpanelProvider.isEnabled()).toBe(false);
    });

    it('should track events using mixpanel.track', async () => {
      vi.resetModules();
      const { mixpanelProvider } = await import('../providers/mixpanel');

      await mixpanelProvider.track({
        eventName: 'sponsor_click',
        eventCategory: 'sponsor',
        constructionId: 'construction-123',
        organizationId: 'org-456',
        sessionId: 'session-789',
        properties: { clickTarget: 'cta_button' },
      });

      expect(window.mixpanel?.track).toHaveBeenCalledWith(
        'sponsor_click',
        expect.objectContaining({
          category: 'sponsor',
          construction_id: 'construction-123',
          organization_id: 'org-456',
          session_id: 'session-789',
          clickTarget: 'cta_button',
        })
      );
    });

    it('should support identify method', async () => {
      vi.resetModules();
      const { mixpanelProvider } = await import('../providers/mixpanel');

      await mixpanelProvider.identify?.('user-123', { email: 'test@example.com' });

      expect(window.mixpanel?.identify).toHaveBeenCalledWith('user-123');
      expect(window.mixpanel?.people.set).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should support page tracking', async () => {
      vi.resetModules();
      const { mixpanelProvider } = await import('../providers/mixpanel');

      await mixpanelProvider.page?.('Map View', { region: 'hcmc' });

      expect(window.mixpanel?.track).toHaveBeenCalledWith(
        '$mp_web_page_view',
        expect.objectContaining({
          page_name: 'Map View',
          region: 'hcmc',
        })
      );
    });
  });

  describe('Payload Provider', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_DISABLE_PAYLOAD_ANALYTICS;
    });

    it('should be enabled by default', async () => {
      vi.resetModules();
      const { payloadProvider } = await import('../providers/payload');

      expect(payloadProvider.name).toBe('payload');
      expect(payloadProvider.isEnabled()).toBe(true);
    });

    it('should be disabled when env variable is set', async () => {
      process.env.NEXT_PUBLIC_DISABLE_PAYLOAD_ANALYTICS = 'true';
      vi.resetModules();
      const { payloadProvider } = await import('../providers/payload');

      expect(payloadProvider.isEnabled()).toBe(false);
    });

    it('should send events to API endpoint', async () => {
      vi.resetModules();
      const { payloadProvider, flushQueue } = await import('../providers/payload');

      await payloadProvider.track({
        eventName: 'construction_created',
        eventCategory: 'construction',
        constructionId: 'new-construction-123',
        userId: 'admin-user',
      });

      // Force flush
      await flushQueue();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/events',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should batch multiple events', async () => {
      vi.resetModules();
      const { payloadProvider, flushQueue } = await import('../providers/payload');

      await payloadProvider.track({ eventName: 'map_loaded', eventCategory: 'map' });
      await payloadProvider.track({ eventName: 'map_marker_click', eventCategory: 'map' });
      await payloadProvider.track({ eventName: 'map_zoom', eventCategory: 'map' });

      await flushQueue();

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.events.length).toBe(3);
    });

    it('should calculate billing for sponsor events', async () => {
      vi.resetModules();
      const { payloadProvider, flushQueue } = await import('../providers/payload');

      await payloadProvider.track({
        eventName: 'sponsor_impression',
        eventCategory: 'sponsor',
        constructionId: 'construction-123',
        organizationId: 'org-456',
      });

      await flushQueue();

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.events[0].billing).toBeDefined();
      expect(body.events[0].billing.isBillable).toBe(true);
      expect(body.events[0].billing.billableAmount).toBe(10); // 10 VND for impression
    });

    it('should use sendBeacon on page unload', async () => {
      vi.resetModules();
      const { sendBeaconToPayload } = await import('../providers/payload');

      const events = [
        { eventName: 'map_loaded', eventCategory: 'map', sessionId: 'test' },
      ];

      const result = sendBeaconToPayload(events as Parameters<typeof sendBeaconToPayload>[0]);

      expect(navigator.sendBeacon).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      vi.resetModules();
      const { payloadProvider, flushQueue } = await import('../providers/payload');

      await payloadProvider.track({ eventName: 'map_loaded', eventCategory: 'map' });

      // Should not throw
      await expect(flushQueue()).resolves.not.toThrow();
    });

    it('should include consent state', async () => {
      vi.resetModules();
      const { payloadProvider, flushQueue } = await import('../providers/payload');

      await payloadProvider.track({
        eventName: 'map_loaded',
        eventCategory: 'map',
        consent: {
          hasAnalyticsConsent: true,
          hasMarketingConsent: false,
        },
      });

      await flushQueue();

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.events[0].consent).toEqual({
        hasAnalyticsConsent: true,
        hasMarketingConsent: false,
      });
    });
  });

  describe('Provider error isolation', () => {
    it('should not affect other providers when one fails', async () => {
      // Mock Vercel to fail
      mockVercelTrack.mockRejectedValueOnce(new Error('Vercel failed'));

      vi.resetModules();
      const { vercelProvider } = await import('../providers/vercel');
      const { payloadProvider, flushQueue } = await import('../providers/payload');

      // Track with both providers
      await vercelProvider.track({ eventName: 'map_loaded', eventCategory: 'map' });
      await payloadProvider.track({ eventName: 'map_loaded', eventCategory: 'map' });
      await flushQueue();

      // Payload should still work
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
