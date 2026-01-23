import { track } from '@vercel/analytics';
import { logAnalyticsEvent } from './logger';

// Custom analytics events
export const AnalyticsEvents = {
  // Search events
  SEARCH_NEARBY: 'search_nearby',
  SEARCH_ROUTE: 'search_route',
  SEARCH_MAP_VIEW: 'search_map_view',

  // View events
  VIEW_CONSTRUCTION: 'view_construction',
  VIEW_CHANGELOG: 'view_changelog',
  VIEW_MAP: 'view_map',

  // Interaction events
  FILTER_CONSTRUCTIONS: 'filter_constructions',
  CLICK_MARKER: 'click_marker',
  SHARE_CONSTRUCTION: 'share_construction',

  // User events
  SUBMIT_SUGGESTION: 'submit_suggestion',
  REPORT_ISSUE: 'report_issue',
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// Track an analytics event (works on client and server)
export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
) {
  // Log to Pino for server-side tracking
  logAnalyticsEvent({
    event,
    properties,
  });

  // Track in Vercel Analytics (client-side only)
  if (typeof window !== 'undefined') {
    track(event, properties);
  }
}

// Search analytics helpers
export function trackNearbySearch(params: {
  lat: number;
  lng: number;
  radius: number;
  resultsCount: number;
}) {
  trackEvent(AnalyticsEvents.SEARCH_NEARBY, {
    radius: params.radius,
    results_count: params.resultsCount,
    has_results: params.resultsCount > 0,
  });
}

export function trackRouteSearch(params: {
  bufferMeters: number;
  routePointsCount: number;
  alertsCount: number;
}) {
  trackEvent(AnalyticsEvents.SEARCH_ROUTE, {
    buffer_meters: params.bufferMeters,
    route_points: params.routePointsCount,
    alerts_count: params.alertsCount,
    has_alerts: params.alertsCount > 0,
  });
}

export function trackConstructionView(params: {
  constructionId: string;
  constructionSlug: string;
  constructionType?: string;
  constructionStatus?: string;
}) {
  trackEvent(AnalyticsEvents.VIEW_CONSTRUCTION, {
    construction_id: params.constructionId,
    construction_slug: params.constructionSlug,
    construction_type: params.constructionType || 'unknown',
    construction_status: params.constructionStatus || 'unknown',
  });
}

export function trackMapView(params: {
  constructionsVisible: number;
  zoomLevel?: number;
  bounds?: string;
}) {
  trackEvent(AnalyticsEvents.VIEW_MAP, {
    constructions_visible: params.constructionsVisible,
    zoom_level: params.zoomLevel || 0,
  });
}

export function trackFilter(params: {
  filterType: string;
  filterValue: string;
  resultsCount: number;
}) {
  trackEvent(AnalyticsEvents.FILTER_CONSTRUCTIONS, {
    filter_type: params.filterType,
    filter_value: params.filterValue,
    results_count: params.resultsCount,
  });
}

export function trackSuggestionSubmit(params: {
  suggestionType: string;
  hasGeometry: boolean;
  hasEvidence: boolean;
}) {
  trackEvent(AnalyticsEvents.SUBMIT_SUGGESTION, {
    suggestion_type: params.suggestionType,
    has_geometry: params.hasGeometry,
    has_evidence: params.hasEvidence,
  });
}

// API usage tracking (server-side)
export interface ApiUsageMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
}

let apiUsageBuffer: ApiUsageMetrics[] = [];
const API_USAGE_BUFFER_SIZE = 100;

export function recordApiUsage(metrics: ApiUsageMetrics) {
  apiUsageBuffer.push(metrics);

  // Flush when buffer is full
  if (apiUsageBuffer.length >= API_USAGE_BUFFER_SIZE) {
    flushApiUsageMetrics();
  }
}

export function flushApiUsageMetrics() {
  if (apiUsageBuffer.length === 0) return;

  // Calculate aggregated metrics
  const endpoints = new Map<string, { count: number; totalDuration: number; errors: number }>();

  for (const metric of apiUsageBuffer) {
    const key = `${metric.method} ${metric.endpoint}`;
    const existing = endpoints.get(key) || { count: 0, totalDuration: 0, errors: 0 };

    existing.count++;
    existing.totalDuration += metric.duration;
    if (metric.statusCode >= 400) {
      existing.errors++;
    }

    endpoints.set(key, existing);
  }

  // Log aggregated metrics
  for (const [endpoint, stats] of endpoints) {
    logAnalyticsEvent({
      event: 'api_usage_aggregate',
      properties: {
        endpoint,
        request_count: stats.count,
        avg_duration_ms: Math.round(stats.totalDuration / stats.count),
        error_count: stats.errors,
        error_rate: stats.errors / stats.count,
      },
    });
  }

  // Clear buffer
  apiUsageBuffer = [];
}

// Flush metrics on process exit (Node.js only)
if (typeof process !== 'undefined' && process.on) {
  process.on('beforeExit', flushApiUsageMetrics);
}
