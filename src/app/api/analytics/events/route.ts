import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { BILLING_RATES, EVENT_CATEGORY_MAP } from '@/lib/universal-analytics/constants';

/**
 * Analytics Events API
 *
 * POST /api/analytics/events
 *
 * Receives batched analytics events from the client and stores them in Payload CMS.
 * Handles billing calculations for sponsor events.
 */

interface EventPayload {
  eventName: string;
  eventCategory?: string;
  timestamp?: string;
  sessionId: string;
  anonymousId?: string;
  userId?: string;
  constructionId?: string;
  suggestionId?: string;
  organizationId?: string;
  properties?: Record<string, unknown>;
  context?: Record<string, unknown>;
  consent?: {
    hasAnalyticsConsent?: boolean;
    hasMarketingConsent?: boolean;
    consentTimestamp?: string;
  };
}

interface RequestBody {
  events: EventPayload[];
}

/**
 * Calculate billing amount for sponsor events
 */
function calculateBillingAmount(eventName: string): number {
  return BILLING_RATES[eventName] || 0;
}

/**
 * Validate event data
 */
function validateEvent(event: EventPayload): string | null {
  if (!event.eventName) {
    return 'Missing eventName';
  }
  if (!event.sessionId) {
    return 'Missing sessionId';
  }
  return null;
}

/**
 * Format event for Payload collection
 */
function formatEventForPayload(event: EventPayload): Record<string, unknown> {
  const eventCategory = event.eventCategory || EVENT_CATEGORY_MAP[event.eventName] || 'system';

  const payload: Record<string, unknown> = {
    eventName: event.eventName,
    eventCategory,
    timestamp: event.timestamp || new Date().toISOString(),
    sessionId: event.sessionId,
    anonymousId: event.anonymousId,
  };

  // Add optional relationship fields
  if (event.userId) payload.userId = event.userId;
  if (event.constructionId) payload.constructionId = event.constructionId;
  if (event.suggestionId) payload.suggestionId = event.suggestionId;
  if (event.organizationId) payload.organizationId = event.organizationId;

  // Add properties
  if (event.properties && Object.keys(event.properties).length > 0) {
    payload.properties = event.properties;
  }

  // Add context
  if (event.context && Object.keys(event.context).length > 0) {
    payload.context = event.context;
  }

  // Add consent
  if (event.consent) {
    payload.consent = event.consent;
  }

  // Add billing for sponsor events
  if (eventCategory === 'sponsor') {
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

export async function POST(request: Request) {
  try {
    // Check if analytics is disabled
    if (process.env.DISABLE_ANALYTICS_API === 'true') {
      return NextResponse.json({ received: 0, succeeded: 0, failed: 0 });
    }

    const body = (await request.json()) as RequestBody;

    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json(
        { error: 'Invalid request: events array required' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    const maxBatchSize = 100;
    const events = body.events.slice(0, maxBatchSize);

    if (events.length === 0) {
      return NextResponse.json({ received: 0, succeeded: 0, failed: 0 });
    }

    // Validate events
    const validEvents: EventPayload[] = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < events.length; i++) {
      const error = validateEvent(events[i]);
      if (error) {
        validationErrors.push(`Event ${i}: ${error}`);
      } else {
        validEvents.push(events[i]);
      }
    }

    if (validEvents.length === 0) {
      return NextResponse.json(
        {
          error: 'All events failed validation',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Get Payload instance
    const payload = await getPayload({ config });

    // Process events in batch
    const results = await Promise.allSettled(
      validEvents.map((event) =>
        payload.create({
          collection: 'analytic-events-v2',
          data: formatEventForPayload(event),
        })
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log failures in development
    if (process.env.NODE_ENV === 'development' && failed > 0) {
      const failures = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason);
      console.error('[Analytics API] Failed events:', failures);
    }

    return NextResponse.json({
      received: events.length,
      succeeded,
      failed,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    });
  } catch (error) {
    console.error('[Analytics API] Error processing events:', error);

    // Don't expose internal errors
    return NextResponse.json(
      { error: 'Failed to process analytics events' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
