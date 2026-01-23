/**
 * Universal Analytics - Server-Side Analytics
 *
 * Server-side tracking for Payload CMS hooks and API routes.
 * Directly creates records in the AnalyticEvent collection.
 */

import type {
  EventName,
  EventCategory,
  EventProperties,
  AnalyticsContext,
} from './types';
import { EVENT_CATEGORY_MAP, BILLING_RATES } from './constants';

// =====================================
// TYPES
// =====================================

interface ServerTrackOptions {
  eventName: EventName;
  properties?: EventProperties;
  constructionId?: string;
  suggestionId?: string;
  organizationId?: string;
  userId?: string;
  sessionId?: string;
  context?: Partial<AnalyticsContext>;
}

interface ServerTrackResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// =====================================
// CHECK IF ENABLED
// =====================================

/**
 * Check if server-side analytics is enabled
 */
export function isServerAnalyticsEnabled(): boolean {
  return process.env.DISABLE_SERVER_ANALYTICS !== 'true';
}

// =====================================
// MAIN TRACKING FUNCTION
// =====================================

/**
 * Track an event server-side
 *
 * This function creates a record directly in the Payload CMS database.
 * Use this in Payload hooks, API routes, and server actions.
 */
export async function trackServerEvent(
  options: ServerTrackOptions
): Promise<ServerTrackResult> {
  if (!isServerAnalyticsEnabled()) {
    return { success: true };
  }

  try {
    // Dynamically import Payload to avoid circular dependencies
    const { getPayload } = await import('payload');
    const config = await import('@/payload.config');
    const payload = await getPayload({ config: config.default });

    const eventCategory = (EVENT_CATEGORY_MAP[options.eventName] || 'system') as EventCategory;

    // Calculate billing for sponsor events
    let billing = undefined;
    if (eventCategory === 'sponsor') {
      const billableAmount = BILLING_RATES[options.eventName] || 0;
      if (billableAmount > 0) {
        billing = {
          isBillable: true,
          billableAmount,
          billingPeriod: new Date().toISOString().slice(0, 7),
          invoiced: false,
        };
      }
    }

    const event = await payload.create({
      collection: 'analytic-events-v2',
      data: {
        eventName: options.eventName,
        eventCategory,
        timestamp: new Date().toISOString(),
        sessionId: options.sessionId || 'server',
        userId: options.userId,
        constructionId: options.constructionId,
        suggestionId: options.suggestionId,
        organizationId: options.organizationId,
        properties: options.properties ? {
          metadata: options.properties,
        } : undefined,
        context: options.context,
        billing,
      },
    });

    return {
      success: true,
      eventId: event.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Analytics:Server] Failed to track event:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =====================================
// CONVENIENCE FUNCTIONS
// =====================================

/**
 * Track a construction CRUD event
 */
export function trackConstructionCrudEvent(
  eventName: 'construction_created' | 'construction_updated' | 'construction_deleted' | 'construction_status_change' | 'construction_progress_update' | 'construction_published',
  constructionId: string,
  userId?: string,
  properties?: {
    previousStatus?: string;
    newStatus?: string;
    previousProgress?: number;
    newProgress?: number;
    changedFields?: string[];
  }
): Promise<ServerTrackResult> {
  return trackServerEvent({
    eventName,
    constructionId,
    userId,
    properties,
  });
}

/**
 * Track a construction approval workflow event
 */
export function trackConstructionApprovalEvent(
  eventName: 'construction_approval_submit' | 'construction_approved' | 'construction_rejected',
  constructionId: string,
  organizationId: string,
  userId?: string,
  properties?: {
    reviewerId?: string;
    rejectReason?: string;
  }
): Promise<ServerTrackResult> {
  return trackServerEvent({
    eventName,
    constructionId,
    organizationId,
    userId,
    properties,
  });
}

/**
 * Track a suggestion event
 */
export function trackSuggestionServerEvent(
  eventName: 'suggestion_submitted' | 'suggestion_review_started' | 'suggestion_approved' | 'suggestion_rejected' | 'suggestion_merged' | 'suggestion_changes_requested',
  suggestionId: string,
  userId?: string,
  properties?: {
    suggestionType?: string;
    hasGeometry?: boolean;
    hasEvidence?: boolean;
    reviewerId?: string;
    rejectReason?: string;
  }
): Promise<ServerTrackResult> {
  return trackServerEvent({
    eventName,
    suggestionId,
    userId,
    properties,
  });
}

/**
 * Track a user auth event
 */
export function trackUserAuthEvent(
  eventName: 'user_login' | 'user_logout' | 'user_register',
  userId: string,
  context?: Partial<AnalyticsContext>
): Promise<ServerTrackResult> {
  return trackServerEvent({
    eventName,
    userId,
    context,
  });
}

/**
 * Track an API call for cost prediction
 */
export function trackApiCallEvent(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
): Promise<ServerTrackResult> {
  return trackServerEvent({
    eventName: 'api_call',
    properties: {
      apiEndpoint: endpoint,
      apiMethod: method,
      apiStatusCode: statusCode,
      apiDuration: duration,
    },
  });
}

/**
 * Track an error event
 */
export function trackErrorEvent(
  errorMessage: string,
  errorCode?: string,
  context?: Partial<AnalyticsContext>
): Promise<ServerTrackResult> {
  return trackServerEvent({
    eventName: 'error_occurred',
    properties: {
      errorMessage,
      errorCode,
    },
    context,
  });
}
