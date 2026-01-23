import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Payload
const mockCreate = vi.fn();
vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({
    create: mockCreate,
  }),
}));

// Mock Payload config
vi.mock('@payload-config', () => ({
  default: {},
}));

// Save original env
const originalEnv = process.env;

describe('Analytics Events API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockCreate.mockResolvedValue({ id: 'created-event-id' });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Helper to create mock Request
  const createRequest = (body: unknown) =>
    new Request('http://localhost/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  describe('POST /api/analytics/events', () => {
    it('should process valid events successfully', async () => {
      const { POST } = await import('../route');

      const response = await POST(
        createRequest({
          events: [
            {
              eventName: 'map_loaded',
              sessionId: 'session-123',
              properties: { loadTime: 1500 },
            },
          ],
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(1);
      expect(data.succeeded).toBe(1);
      expect(data.failed).toBe(0);
    });

    it('should handle multiple events', async () => {
      const { POST } = await import('../route');

      const response = await POST(
        createRequest({
          events: [
            { eventName: 'map_loaded', sessionId: 'session-123' },
            { eventName: 'map_marker_click', sessionId: 'session-123' },
            { eventName: 'construction_view', sessionId: 'session-123' },
          ],
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(3);
      expect(data.succeeded).toBe(3);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should return 400 for missing events array', async () => {
      const { POST } = await import('../route');

      const response = await POST(createRequest({}));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request: events array required');
    });

    it('should return 400 for non-array events', async () => {
      const { POST } = await import('../route');

      const response = await POST(createRequest({ events: 'not-an-array' }));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request: events array required');
    });

    it('should return success for empty events array', async () => {
      const { POST } = await import('../route');

      const response = await POST(createRequest({ events: [] }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(0);
      expect(data.succeeded).toBe(0);
      expect(data.failed).toBe(0);
    });

    it('should validate events and report validation errors', async () => {
      const { POST } = await import('../route');

      const response = await POST(
        createRequest({
          events: [
            { eventName: 'map_loaded' }, // Missing sessionId
            { sessionId: 'session-123' }, // Missing eventName
            { eventName: 'valid_event', sessionId: 'session-123' }, // Valid
          ],
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(3);
      expect(data.succeeded).toBe(1);
      expect(data.validationErrors).toContain('Event 0: Missing sessionId');
      expect(data.validationErrors).toContain('Event 1: Missing eventName');
    });

    it('should return 400 when all events fail validation', async () => {
      const { POST } = await import('../route');

      const response = await POST(
        createRequest({
          events: [
            { eventName: 'map_loaded' }, // Missing sessionId
            { sessionId: 'session-123' }, // Missing eventName
          ],
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('All events failed validation');
      expect(data.details).toBeDefined();
    });

    it('should limit batch size to 100 events', async () => {
      const { POST } = await import('../route');

      const events = Array(150)
        .fill(null)
        .map((_, i) => ({
          eventName: 'map_loaded',
          sessionId: `session-${i}`,
        }));

      const response = await POST(createRequest({ events }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(100); // Limited to 100
      expect(mockCreate).toHaveBeenCalledTimes(100);
    });

    it('should add default event category from EVENT_CATEGORY_MAP', async () => {
      const { POST } = await import('../route');

      await POST(
        createRequest({
          events: [{ eventName: 'map_loaded', sessionId: 'session-123' }],
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventCategory: 'map',
          }),
        })
      );
    });

    it('should use provided event category over default', async () => {
      const { POST } = await import('../route');

      await POST(
        createRequest({
          events: [
            {
              eventName: 'map_loaded',
              eventCategory: 'custom',
              sessionId: 'session-123',
            },
          ],
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventCategory: 'custom',
          }),
        })
      );
    });

    it('should add timestamp if not provided', async () => {
      const { POST } = await import('../route');
      const beforeTime = new Date().toISOString();

      await POST(
        createRequest({
          events: [{ eventName: 'map_loaded', sessionId: 'session-123' }],
        })
      );

      const callData = mockCreate.mock.calls[0][0].data;
      const eventTimestamp = new Date(callData.timestamp).getTime();
      const beforeTimestamp = new Date(beforeTime).getTime();

      expect(eventTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    });

    it('should preserve provided timestamp', async () => {
      const { POST } = await import('../route');
      const customTimestamp = '2024-01-15T10:00:00.000Z';

      await POST(
        createRequest({
          events: [
            {
              eventName: 'map_loaded',
              sessionId: 'session-123',
              timestamp: customTimestamp,
            },
          ],
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timestamp: customTimestamp,
          }),
        })
      );
    });

    it('should include optional relationship fields', async () => {
      const { POST } = await import('../route');

      await POST(
        createRequest({
          events: [
            {
              eventName: 'construction_view',
              sessionId: 'session-123',
              userId: 'user-456',
              constructionId: 'construction-789',
              suggestionId: 'suggestion-012',
              organizationId: 'org-345',
            },
          ],
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-456',
            constructionId: 'construction-789',
            suggestionId: 'suggestion-012',
            organizationId: 'org-345',
          }),
        })
      );
    });

    it('should include properties when provided', async () => {
      const { POST } = await import('../route');

      await POST(
        createRequest({
          events: [
            {
              eventName: 'map_loaded',
              sessionId: 'session-123',
              properties: { loadTime: 1500, tileCount: 42 },
            },
          ],
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            properties: { loadTime: 1500, tileCount: 42 },
          }),
        })
      );
    });

    it('should include context when provided', async () => {
      const { POST } = await import('../route');

      await POST(
        createRequest({
          events: [
            {
              eventName: 'map_loaded',
              sessionId: 'session-123',
              context: {
                userAgent: 'Test Agent',
                language: 'en-US',
              },
            },
          ],
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            context: {
              userAgent: 'Test Agent',
              language: 'en-US',
            },
          }),
        })
      );
    });

    it('should include consent when provided', async () => {
      const { POST } = await import('../route');

      await POST(
        createRequest({
          events: [
            {
              eventName: 'map_loaded',
              sessionId: 'session-123',
              consent: {
                hasAnalyticsConsent: true,
                hasMarketingConsent: false,
              },
            },
          ],
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            consent: {
              hasAnalyticsConsent: true,
              hasMarketingConsent: false,
            },
          }),
        })
      );
    });

    describe('Billing calculation for sponsor events', () => {
      it('should add billing for sponsor_impression events', async () => {
        const { POST } = await import('../route');

        await POST(
          createRequest({
            events: [
              {
                eventName: 'sponsor_impression',
                sessionId: 'session-123',
                eventCategory: 'sponsor',
              },
            ],
          })
        );

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              billing: {
                isBillable: true,
                billableAmount: 10, // 10 VND
                billingPeriod: expect.stringMatching(/^\d{4}-\d{2}$/),
                invoiced: false,
              },
            }),
          })
        );
      });

      it('should add billing for sponsor_click events', async () => {
        const { POST } = await import('../route');

        await POST(
          createRequest({
            events: [
              {
                eventName: 'sponsor_click',
                sessionId: 'session-123',
                eventCategory: 'sponsor',
              },
            ],
          })
        );

        const callData = mockCreate.mock.calls[0][0].data;
        expect(callData.billing.billableAmount).toBe(100); // 100 VND
      });

      it('should add billing for sponsor_lead_submit events', async () => {
        const { POST } = await import('../route');

        await POST(
          createRequest({
            events: [
              {
                eventName: 'sponsor_lead_submit',
                sessionId: 'session-123',
                eventCategory: 'sponsor',
              },
            ],
          })
        );

        const callData = mockCreate.mock.calls[0][0].data;
        expect(callData.billing.billableAmount).toBe(5000); // 5000 VND
      });

      it('should not add billing for non-sponsor events', async () => {
        const { POST } = await import('../route');

        await POST(
          createRequest({
            events: [
              {
                eventName: 'map_loaded',
                sessionId: 'session-123',
              },
            ],
          })
        );

        const callData = mockCreate.mock.calls[0][0].data;
        expect(callData.billing).toBeUndefined();
      });
    });

    it('should handle Payload create failures gracefully', async () => {
      mockCreate
        .mockResolvedValueOnce({ id: 'success-1' })
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ id: 'success-2' });

      const { POST } = await import('../route');

      const response = await POST(
        createRequest({
          events: [
            { eventName: 'event_1', sessionId: 'session-1' },
            { eventName: 'event_2', sessionId: 'session-2' },
            { eventName: 'event_3', sessionId: 'session-3' },
          ],
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.succeeded).toBe(2);
      expect(data.failed).toBe(1);
    });

    it('should return 500 for unexpected errors', async () => {
      const { POST } = await import('../route');

      // Create a request that will throw during JSON parsing
      const badRequest = new Request('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      });

      const response = await POST(badRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to process analytics events');
    });

    it('should return empty response when API is disabled', async () => {
      process.env.DISABLE_ANALYTICS_API = 'true';
      vi.resetModules();

      const { POST } = await import('../route');

      const response = await POST(
        createRequest({
          events: [{ eventName: 'map_loaded', sessionId: 'session-123' }],
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(0);
      expect(data.succeeded).toBe(0);
      expect(data.failed).toBe(0);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('OPTIONS /api/analytics/events', () => {
    it('should return CORS headers', async () => {
      const { OPTIONS } = await import('../route');

      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });
});
