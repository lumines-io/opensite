import type { CollectionConfig, PayloadRequest } from 'payload';

/**
 * AnalyticEvent Collection
 *
 * Comprehensive event tracking for all user interactions across the platform.
 * Supports multiple analytics providers and monetization tracking.
 */
export const AnalyticEvent: CollectionConfig = {
  slug: 'analytic-events-v2',
  admin: {
    useAsTitle: 'eventName',
    defaultColumns: ['eventName', 'eventCategory', 'constructionId', 'sessionId', 'timestamp'],
    group: 'Analytics',
    description: 'Comprehensive event tracking for user interactions, monetization, and cost prediction',
  },
  access: {
    read: ({ req }: { req: PayloadRequest }) => ['moderator', 'admin'].includes(req.user?.role as string),
    create: () => true, // Allow server-side and API creation
    update: ({ req }: { req: PayloadRequest }) => req.user?.role === 'admin',
    delete: ({ req }: { req: PayloadRequest }) => req.user?.role === 'admin',
  },
  indexes: [
    { name: 'timestamp_idx', fields: ['timestamp'] },
    { name: 'event_name_idx', fields: ['eventName'] },
    { name: 'session_idx', fields: ['sessionId'] },
    { name: 'construction_idx', fields: ['constructionId'] },
    { name: 'user_idx', fields: ['userId'] },
    { name: 'org_idx', fields: ['organizationId'] },
    { name: 'category_timestamp_idx', fields: ['eventCategory', 'timestamp'] },
  ],
  fields: [
    // =====================================
    // CORE EVENT FIELDS
    // =====================================
    {
      name: 'eventName',
      type: 'select',
      required: true,
      options: [
        // Map Interactions
        { label: 'Map Loaded', value: 'map_loaded' },
        { label: 'Map Initial Render', value: 'map_initial_render' },
        { label: 'Map Tile Load', value: 'map_tile_load' },
        { label: 'Map Marker Click', value: 'map_marker_click' },
        { label: 'Map Marker Hover', value: 'map_marker_hover' },
        { label: 'Map Filter Toggle', value: 'map_filter_toggle' },
        { label: 'Map Zoom', value: 'map_zoom' },
        { label: 'Map Pan', value: 'map_pan' },
        { label: 'Map Search', value: 'map_search' },
        { label: 'Map Route Plan', value: 'map_route_plan' },
        { label: 'Map List Modal Open', value: 'map_list_modal_open' },
        { label: 'Map List Item Click', value: 'map_list_item_click' },
        { label: 'Map City Select', value: 'map_city_select' },

        // Construction Page Events
        { label: 'Construction View', value: 'construction_view' },
        { label: 'Construction CTA Click', value: 'construction_cta_click' },
        { label: 'Construction Phone Reveal', value: 'construction_phone_reveal' },
        { label: 'Construction Download', value: 'construction_download' },
        { label: 'Construction Share', value: 'construction_share' },
        { label: 'Construction Gallery View', value: 'construction_gallery_view' },
        { label: 'Construction Gallery Image', value: 'construction_gallery_image' },
        { label: 'Construction Scroll Depth', value: 'construction_scroll_depth' },
        { label: 'Construction Related Click', value: 'construction_related_click' },
        { label: 'Construction Video Play', value: 'construction_video_play' },
        { label: 'Construction Virtual Tour', value: 'construction_virtual_tour' },

        // Construction CRUD Events
        { label: 'Construction Created', value: 'construction_created' },
        { label: 'Construction Updated', value: 'construction_updated' },
        { label: 'Construction Deleted', value: 'construction_deleted' },
        { label: 'Construction Status Change', value: 'construction_status_change' },
        { label: 'Construction Progress Update', value: 'construction_progress_update' },
        { label: 'Construction Approval Submit', value: 'construction_approval_submit' },
        { label: 'Construction Approved', value: 'construction_approved' },
        { label: 'Construction Rejected', value: 'construction_rejected' },
        { label: 'Construction Published', value: 'construction_published' },

        // Suggestion Events
        { label: 'Suggestion Submitted', value: 'suggestion_submitted' },
        { label: 'Suggestion Review Started', value: 'suggestion_review_started' },
        { label: 'Suggestion Approved', value: 'suggestion_approved' },
        { label: 'Suggestion Rejected', value: 'suggestion_rejected' },
        { label: 'Suggestion Merged', value: 'suggestion_merged' },
        { label: 'Suggestion Changes Requested', value: 'suggestion_changes_requested' },

        // User Events
        { label: 'User Login', value: 'user_login' },
        { label: 'User Logout', value: 'user_logout' },
        { label: 'User Register', value: 'user_register' },
        { label: 'User Profile Update', value: 'user_profile_update' },

        // Sponsor Events
        { label: 'Sponsor Impression', value: 'sponsor_impression' },
        { label: 'Sponsor Click', value: 'sponsor_click' },
        { label: 'Sponsor Lead Submit', value: 'sponsor_lead_submit' },

        // System Events
        { label: 'API Call', value: 'api_call' },
        { label: 'Error Occurred', value: 'error_occurred' },
        { label: 'Page Performance', value: 'page_performance' },
      ],
      index: true,
    },
    {
      name: 'eventCategory',
      type: 'select',
      required: true,
      options: [
        { label: 'Map', value: 'map' },
        { label: 'Construction', value: 'construction' },
        { label: 'Suggestion', value: 'suggestion' },
        { label: 'User', value: 'user' },
        { label: 'Sponsor', value: 'sponsor' },
        { label: 'System', value: 'system' },
      ],
      index: true,
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },

    // =====================================
    // SESSION & USER IDENTIFICATION
    // =====================================
    {
      name: 'sessionId',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'Unique session identifier' },
    },
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Authenticated user (if logged in)' },
    },
    {
      name: 'anonymousId',
      type: 'text',
      admin: { description: 'Persistent anonymous identifier for non-logged-in users' },
    },

    // =====================================
    // ENTITY REFERENCES
    // =====================================
    {
      name: 'constructionId',
      type: 'relationship',
      relationTo: 'constructions',
      admin: { description: 'Related construction (if applicable)' },
    },
    {
      name: 'suggestionId',
      type: 'relationship',
      relationTo: 'suggestions',
      admin: { description: 'Related suggestion (if applicable)' },
    },
    {
      name: 'organizationId',
      type: 'relationship',
      relationTo: 'organizations',
      index: true,
      admin: { description: 'Sponsor organization (for billing)' },
    },

    // =====================================
    // EVENT-SPECIFIC PROPERTIES
    // =====================================
    {
      name: 'properties',
      type: 'group',
      fields: [
        // Map properties
        {
          name: 'mapZoomLevel',
          type: 'number',
          admin: { description: 'Current map zoom level' },
        },
        {
          name: 'mapBounds',
          type: 'json',
          admin: { description: 'Visible map bounds [sw, ne]' },
        },
        {
          name: 'filterType',
          type: 'text',
          admin: { description: 'Filter type toggled (type, status, category)' },
        },
        {
          name: 'filterValue',
          type: 'text',
          admin: { description: 'Filter value toggled' },
        },
        {
          name: 'searchQuery',
          type: 'text',
          admin: { description: 'Search query string' },
        },
        {
          name: 'searchResultsCount',
          type: 'number',
          admin: { description: 'Number of search results' },
        },

        // Page/scroll properties
        {
          name: 'scrollDepthPercent',
          type: 'number',
          min: 0,
          max: 100,
          admin: { description: 'Scroll depth percentage (25, 50, 75, 100)' },
        },
        {
          name: 'timeOnPage',
          type: 'number',
          admin: { description: 'Time on page in seconds' },
        },

        // CTA properties
        {
          name: 'ctaType',
          type: 'select',
          options: [
            { label: 'Contact Form', value: 'form' },
            { label: 'Phone Call', value: 'phone' },
            { label: 'Download', value: 'download' },
            { label: 'External Link', value: 'link' },
            { label: 'Share', value: 'share' },
          ],
        },
        {
          name: 'ctaLabel',
          type: 'text',
          admin: { description: 'CTA button text' },
        },

        // Gallery properties
        {
          name: 'galleryImageIndex',
          type: 'number',
        },
        {
          name: 'galleryTotalImages',
          type: 'number',
        },

        // Performance properties
        {
          name: 'loadTime',
          type: 'number',
          admin: { description: 'Load time in milliseconds' },
        },
        {
          name: 'renderTime',
          type: 'number',
          admin: { description: 'Render time in milliseconds' },
        },
        {
          name: 'tileLoadCount',
          type: 'number',
          admin: { description: 'Number of map tiles loaded' },
        },

        // CRUD properties
        {
          name: 'previousStatus',
          type: 'text',
        },
        {
          name: 'newStatus',
          type: 'text',
        },
        {
          name: 'previousProgress',
          type: 'number',
        },
        {
          name: 'newProgress',
          type: 'number',
        },
        {
          name: 'changedFields',
          type: 'json',
          admin: { description: 'Array of field names that changed' },
        },

        // API properties
        {
          name: 'apiEndpoint',
          type: 'text',
        },
        {
          name: 'apiMethod',
          type: 'text',
        },
        {
          name: 'apiStatusCode',
          type: 'number',
        },
        {
          name: 'apiDuration',
          type: 'number',
        },

        // Error properties
        {
          name: 'errorMessage',
          type: 'text',
        },
        {
          name: 'errorCode',
          type: 'text',
        },

        // Additional metadata
        {
          name: 'metadata',
          type: 'json',
          admin: { description: 'Additional event-specific data' },
        },
      ],
    },

    // =====================================
    // DEVICE & CONTEXT
    // =====================================
    {
      name: 'context',
      type: 'group',
      fields: [
        {
          name: 'userAgent',
          type: 'text',
        },
        {
          name: 'deviceType',
          type: 'select',
          options: [
            { label: 'Desktop', value: 'desktop' },
            { label: 'Mobile', value: 'mobile' },
            { label: 'Tablet', value: 'tablet' },
          ],
        },
        {
          name: 'browser',
          type: 'text',
        },
        {
          name: 'browserVersion',
          type: 'text',
        },
        {
          name: 'os',
          type: 'text',
        },
        {
          name: 'osVersion',
          type: 'text',
        },
        {
          name: 'screenWidth',
          type: 'number',
        },
        {
          name: 'screenHeight',
          type: 'number',
        },
        {
          name: 'language',
          type: 'text',
        },
        {
          name: 'timezone',
          type: 'text',
        },
        {
          name: 'ipHash',
          type: 'text',
          admin: { description: 'Hashed IP for geo lookup (privacy compliant)' },
        },
        {
          name: 'country',
          type: 'text',
        },
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'referrer',
          type: 'text',
        },
        {
          name: 'pageUrl',
          type: 'text',
        },
        {
          name: 'pagePath',
          type: 'text',
        },
        {
          name: 'utmSource',
          type: 'text',
        },
        {
          name: 'utmMedium',
          type: 'text',
        },
        {
          name: 'utmCampaign',
          type: 'text',
        },
        {
          name: 'utmTerm',
          type: 'text',
        },
        {
          name: 'utmContent',
          type: 'text',
        },
      ],
    },

    // =====================================
    // CONSENT & PRIVACY
    // =====================================
    {
      name: 'consent',
      type: 'group',
      fields: [
        {
          name: 'hasAnalyticsConsent',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'hasMarketingConsent',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'consentTimestamp',
          type: 'date',
        },
      ],
    },

    // =====================================
    // MONETIZATION FIELDS
    // =====================================
    {
      name: 'billing',
      type: 'group',
      admin: {
        description: 'Fields for sponsor billing calculations',
        condition: (data: Record<string, unknown> | undefined) => data?.eventCategory === 'sponsor',
      },
      fields: [
        {
          name: 'isBillable',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Whether this event counts for billing' },
        },
        {
          name: 'billableAmount',
          type: 'number',
          admin: { description: 'Cost in VND for this event' },
        },
        {
          name: 'billingPeriod',
          type: 'text',
          admin: { description: 'YYYY-MM billing period' },
        },
        {
          name: 'invoiced',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data }: { data: Record<string, unknown> }) => {
        // Auto-set billing period for billable events
        const billing = data?.billing as Record<string, unknown> | undefined;
        if (billing?.isBillable && !billing?.billingPeriod) {
          billing.billingPeriod = new Date().toISOString().slice(0, 7);
        }
        return data;
      },
    ],
  },
};
