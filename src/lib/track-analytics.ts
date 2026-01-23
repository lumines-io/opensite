import type { Payload } from 'payload';

export type AnalyticsEventType =
  | 'changelog_created'
  | 'changelog_updated'
  | 'changelog_deleted'
  | 'suggestion_submitted'
  | 'suggestion_reviewed'
  | 'suggestion_approved'
  | 'suggestion_rejected'
  | 'suggestion_merged'
  | 'construction_created'
  | 'construction_updated'
  | 'construction_published'
  | 'user_login'
  | 'user_registered';

export type EntityType = 'changelog' | 'suggestion' | 'construction' | 'user';

export interface TrackEventParams {
  payload: Payload;
  eventType: AnalyticsEventType;
  entityType: EntityType;
  entityId: string | number;
  userId?: string | number;
  metadata?: Record<string, unknown>;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

export async function trackAnalyticsEvent({
  payload,
  eventType,
  entityType,
  entityId,
  userId,
  metadata,
  previousValue,
  newValue,
}: TrackEventParams) {
  try {
    // Check if analytics tracking is enabled
    const settings = await payload.findGlobal({
      slug: 'settings',
    });

    const analyticsSettings = settings?.analytics as
      | { trackChangelogs?: boolean; trackSuggestions?: boolean }
      | undefined;

    // Check if we should track this event type
    if (entityType === 'changelog' && analyticsSettings?.trackChangelogs === false) {
      return null;
    }
    if (entityType === 'suggestion' && analyticsSettings?.trackSuggestions === false) {
      return null;
    }

    const event = await payload.create({
      collection: 'analytics-events',
      data: {
        eventType,
        entityType,
        entityId: String(entityId),
        userId: userId ? String(userId) : undefined,
        metadata,
        previousValue,
        newValue,
        timestamp: new Date().toISOString(),
      },
    });

    return event;
  } catch (error) {
    // Don't throw - analytics shouldn't break the main operation
    console.error('Failed to track analytics event:', error);
    return null;
  }
}

// Helper to extract changed fields between two objects
export function getChangedFields(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): string[] {
  const changed: string[] = [];

  for (const key of Object.keys(current)) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      changed.push(key);
    }
  }

  return changed;
}
