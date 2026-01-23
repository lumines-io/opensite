/**
 * Universal Analytics - Constants
 *
 * Event names, categories, and configuration constants.
 */

// =====================================
// EVENT NAMES
// =====================================

export const EVENT_NAMES = {
  // Map Events
  MAP_LOADED: 'map_loaded',
  MAP_INITIAL_RENDER: 'map_initial_render',
  MAP_TILE_LOAD: 'map_tile_load',
  MAP_MARKER_CLICK: 'map_marker_click',
  MAP_MARKER_HOVER: 'map_marker_hover',
  MAP_FILTER_TOGGLE: 'map_filter_toggle',
  MAP_ZOOM: 'map_zoom',
  MAP_PAN: 'map_pan',
  MAP_SEARCH: 'map_search',
  MAP_ROUTE_PLAN: 'map_route_plan',
  MAP_LIST_MODAL_OPEN: 'map_list_modal_open',
  MAP_LIST_ITEM_CLICK: 'map_list_item_click',
  MAP_CITY_SELECT: 'map_city_select',

  // Construction Page Events
  CONSTRUCTION_VIEW: 'construction_view',
  CONSTRUCTION_CTA_CLICK: 'construction_cta_click',
  CONSTRUCTION_PHONE_REVEAL: 'construction_phone_reveal',
  CONSTRUCTION_DOWNLOAD: 'construction_download',
  CONSTRUCTION_SHARE: 'construction_share',
  CONSTRUCTION_GALLERY_VIEW: 'construction_gallery_view',
  CONSTRUCTION_GALLERY_IMAGE: 'construction_gallery_image',
  CONSTRUCTION_SCROLL_DEPTH: 'construction_scroll_depth',
  CONSTRUCTION_RELATED_CLICK: 'construction_related_click',
  CONSTRUCTION_VIDEO_PLAY: 'construction_video_play',
  CONSTRUCTION_VIRTUAL_TOUR: 'construction_virtual_tour',

  // Construction CRUD Events
  CONSTRUCTION_CREATED: 'construction_created',
  CONSTRUCTION_UPDATED: 'construction_updated',
  CONSTRUCTION_DELETED: 'construction_deleted',
  CONSTRUCTION_STATUS_CHANGE: 'construction_status_change',
  CONSTRUCTION_PROGRESS_UPDATE: 'construction_progress_update',
  CONSTRUCTION_APPROVAL_SUBMIT: 'construction_approval_submit',
  CONSTRUCTION_APPROVED: 'construction_approved',
  CONSTRUCTION_REJECTED: 'construction_rejected',
  CONSTRUCTION_PUBLISHED: 'construction_published',

  // Suggestion Events
  SUGGESTION_SUBMITTED: 'suggestion_submitted',
  SUGGESTION_REVIEW_STARTED: 'suggestion_review_started',
  SUGGESTION_APPROVED: 'suggestion_approved',
  SUGGESTION_REJECTED: 'suggestion_rejected',
  SUGGESTION_MERGED: 'suggestion_merged',
  SUGGESTION_CHANGES_REQUESTED: 'suggestion_changes_requested',

  // User Events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  USER_PROFILE_UPDATE: 'user_profile_update',

  // Sponsor Events
  SPONSOR_IMPRESSION: 'sponsor_impression',
  SPONSOR_CLICK: 'sponsor_click',
  SPONSOR_LEAD_SUBMIT: 'sponsor_lead_submit',

  // System Events
  API_CALL: 'api_call',
  ERROR_OCCURRED: 'error_occurred',
  PAGE_PERFORMANCE: 'page_performance',
} as const;

// =====================================
// EVENT CATEGORIES
// =====================================

export const EVENT_CATEGORIES = {
  MAP: 'map',
  CONSTRUCTION: 'construction',
  SUGGESTION: 'suggestion',
  USER: 'user',
  SPONSOR: 'sponsor',
  SYSTEM: 'system',
} as const;

// =====================================
// MAP EVENT TO CATEGORY
// =====================================

export const EVENT_CATEGORY_MAP: Record<string, string> = {
  // Map events
  map_loaded: 'map',
  map_initial_render: 'map',
  map_tile_load: 'map',
  map_marker_click: 'map',
  map_marker_hover: 'map',
  map_filter_toggle: 'map',
  map_zoom: 'map',
  map_pan: 'map',
  map_search: 'map',
  map_route_plan: 'map',
  map_list_modal_open: 'map',
  map_list_item_click: 'map',
  map_city_select: 'map',

  // Construction events
  construction_view: 'construction',
  construction_cta_click: 'construction',
  construction_phone_reveal: 'construction',
  construction_download: 'construction',
  construction_share: 'construction',
  construction_gallery_view: 'construction',
  construction_gallery_image: 'construction',
  construction_scroll_depth: 'construction',
  construction_related_click: 'construction',
  construction_video_play: 'construction',
  construction_virtual_tour: 'construction',
  construction_created: 'construction',
  construction_updated: 'construction',
  construction_deleted: 'construction',
  construction_status_change: 'construction',
  construction_progress_update: 'construction',
  construction_approval_submit: 'construction',
  construction_approved: 'construction',
  construction_rejected: 'construction',
  construction_published: 'construction',

  // Suggestion events
  suggestion_submitted: 'suggestion',
  suggestion_review_started: 'suggestion',
  suggestion_approved: 'suggestion',
  suggestion_rejected: 'suggestion',
  suggestion_merged: 'suggestion',
  suggestion_changes_requested: 'suggestion',

  // User events
  user_login: 'user',
  user_logout: 'user',
  user_register: 'user',
  user_profile_update: 'user',

  // Sponsor events
  sponsor_impression: 'sponsor',
  sponsor_click: 'sponsor',
  sponsor_lead_submit: 'sponsor',

  // System events
  api_call: 'system',
  error_occurred: 'system',
  page_performance: 'system',
};

// =====================================
// BILLING RATES (VND)
// =====================================

export const BILLING_RATES: Record<string, number> = {
  sponsor_impression: 10, // 10 VND per impression
  sponsor_click: 100, // 100 VND per click
  sponsor_lead_submit: 5000, // 5,000 VND per lead
};

// =====================================
// SESSION CONFIGURATION
// =====================================

export const SESSION_CONFIG = {
  /** Session timeout in milliseconds (30 minutes) */
  TIMEOUT: 30 * 60 * 1000,
  /** Session storage key */
  SESSION_KEY: 'ua_session_id',
  /** Last activity storage key */
  LAST_ACTIVITY_KEY: 'ua_last_activity',
  /** Anonymous ID storage key */
  ANONYMOUS_KEY: 'ua_anonymous_id',
};

// =====================================
// CONSENT CONFIGURATION
// =====================================

export const CONSENT_CONFIG = {
  /** Consent storage key */
  STORAGE_KEY: 'ua_consent',
};

// =====================================
// SCROLL DEPTH THRESHOLDS
// =====================================

export const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const;

// =====================================
// DEBOUNCE INTERVALS (ms)
// =====================================

export const DEBOUNCE_INTERVALS = {
  HOVER: 500,
  ZOOM: 300,
  PAN: 500,
  SCROLL: 200,
};
