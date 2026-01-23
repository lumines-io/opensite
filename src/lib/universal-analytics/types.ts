/**
 * Universal Analytics - Type Definitions
 *
 * Shared types for the analytics system across all providers.
 */

// =====================================
// EVENT TYPES
// =====================================

export type EventCategory = 'map' | 'construction' | 'suggestion' | 'user' | 'sponsor' | 'system';

export type MapEventName =
  | 'map_loaded'
  | 'map_initial_render'
  | 'map_tile_load'
  | 'map_marker_click'
  | 'map_marker_hover'
  | 'map_filter_toggle'
  | 'map_zoom'
  | 'map_pan'
  | 'map_search'
  | 'map_route_plan'
  | 'map_list_modal_open'
  | 'map_list_item_click'
  | 'map_city_select';

export type ConstructionEventName =
  | 'construction_view'
  | 'construction_cta_click'
  | 'construction_phone_reveal'
  | 'construction_download'
  | 'construction_share'
  | 'construction_gallery_view'
  | 'construction_gallery_image'
  | 'construction_scroll_depth'
  | 'construction_related_click'
  | 'construction_video_play'
  | 'construction_virtual_tour'
  | 'construction_created'
  | 'construction_updated'
  | 'construction_deleted'
  | 'construction_status_change'
  | 'construction_progress_update'
  | 'construction_approval_submit'
  | 'construction_approved'
  | 'construction_rejected'
  | 'construction_published';

export type SuggestionEventName =
  | 'suggestion_submitted'
  | 'suggestion_review_started'
  | 'suggestion_approved'
  | 'suggestion_rejected'
  | 'suggestion_merged'
  | 'suggestion_changes_requested';

export type UserEventName =
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'user_profile_update';

export type SponsorEventName =
  | 'sponsor_impression'
  | 'sponsor_click'
  | 'sponsor_lead_submit';

export type SystemEventName =
  | 'api_call'
  | 'error_occurred'
  | 'page_performance';

export type EventName =
  | MapEventName
  | ConstructionEventName
  | SuggestionEventName
  | UserEventName
  | SponsorEventName
  | SystemEventName;

// =====================================
// EVENT PROPERTIES
// =====================================

export interface MapEventProperties {
  mapZoomLevel?: number;
  mapBounds?: { sw: [number, number]; ne: [number, number] };
  filterType?: 'type' | 'status' | 'category';
  filterValue?: string;
  filterEnabled?: boolean;
  searchQuery?: string;
  searchResultsCount?: number;
  tileLoadCount?: number;
  loadTime?: number;
  renderTime?: number;
  listPosition?: number;
  cityId?: string;
  cityName?: string;
}

export interface ConstructionEventProperties {
  scrollDepthPercent?: 25 | 50 | 75 | 100;
  timeOnPage?: number;
  ctaType?: 'form' | 'phone' | 'download' | 'link' | 'share';
  ctaLabel?: string;
  galleryImageIndex?: number;
  galleryTotalImages?: number;
  shareMethod?: 'copy' | 'twitter' | 'facebook' | 'linkedin' | 'email';
  videoUrl?: string;
  tourUrl?: string;
  targetConstructionId?: string;
  previousStatus?: string;
  newStatus?: string;
  previousProgress?: number;
  newProgress?: number;
  changedFields?: string[];
  constructionType?: string;
  constructionCategory?: 'public' | 'private';
}

export interface SuggestionEventProperties {
  suggestionType?: 'create' | 'update' | 'complete' | 'correction';
  hasGeometry?: boolean;
  hasEvidence?: boolean;
  reviewerId?: string;
  rejectReason?: string;
}

export interface SponsorEventProperties {
  viewportTime?: number;
  isFeatured?: boolean;
  clickTarget?: string;
  formFields?: string[];
}

export interface SystemEventProperties {
  apiEndpoint?: string;
  apiMethod?: string;
  apiStatusCode?: number;
  apiDuration?: number;
  errorMessage?: string;
  errorCode?: string;
  loadTime?: number;
  renderTime?: number;
}

export type EventProperties =
  | MapEventProperties
  | ConstructionEventProperties
  | SuggestionEventProperties
  | SponsorEventProperties
  | SystemEventProperties
  | Record<string, unknown>;

// =====================================
// CONTEXT & SESSION
// =====================================

export interface AnalyticsContext {
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
  ipHash?: string;
  country?: string;
  city?: string;
  referrer?: string;
  pageUrl?: string;
  pagePath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface ConsentState {
  hasAnalyticsConsent: boolean;
  hasMarketingConsent: boolean;
  consentTimestamp?: string;
}

// =====================================
// MAIN EVENT INTERFACE
// =====================================

export interface AnalyticsEvent<T extends EventProperties = EventProperties> {
  eventName: EventName;
  eventCategory: EventCategory;
  timestamp?: string;
  sessionId?: string;
  userId?: string;
  anonymousId?: string;
  constructionId?: string;
  suggestionId?: string;
  organizationId?: string;
  properties?: T;
  context?: AnalyticsContext;
  consent?: ConsentState;
}

// =====================================
// BILLING
// =====================================

export interface BillingInfo {
  isBillable: boolean;
  billableAmount: number;
  billingPeriod: string;
  invoiced?: boolean;
}

export interface AnalyticsEventWithBilling extends AnalyticsEvent<SponsorEventProperties> {
  billing?: BillingInfo;
}

// =====================================
// PROVIDER INTERFACE
// =====================================

export interface AnalyticsProvider {
  name: string;
  isEnabled: () => boolean;
  track: (event: AnalyticsEvent) => Promise<void>;
  identify?: (userId: string, traits?: Record<string, unknown>) => Promise<void>;
  page?: (name: string, properties?: Record<string, unknown>) => Promise<void>;
  flush?: () => Promise<void>;
}

// =====================================
// CONFIGURATION
// =====================================

export interface UniversalAnalyticsConfig {
  /** Enable/disable all analytics */
  enabled: boolean;
  /** Enable debug logging */
  debug: boolean;
  /** Require consent before tracking */
  consentRequired: boolean;
  /** Auto-enrich events with context */
  enrichContext: boolean;
  /** Batch size before auto-flush */
  batchSize: number;
  /** Flush interval in milliseconds */
  flushInterval: number;
  /** Provider-specific configuration */
  providers: {
    vercel: { enabled: boolean };
    ga4: { enabled: boolean; measurementId?: string };
    mixpanel: { enabled: boolean; token?: string };
    payload: { enabled: boolean; endpoint?: string };
  };
}

export const DEFAULT_CONFIG: UniversalAnalyticsConfig = {
  enabled: true,
  debug: process.env.NODE_ENV === 'development',
  consentRequired: true,
  enrichContext: true,
  batchSize: 10,
  flushInterval: 5000,
  providers: {
    vercel: { enabled: true },
    ga4: { enabled: false },
    mixpanel: { enabled: false },
    payload: { enabled: true, endpoint: '/api/analytics/events' },
  },
};
