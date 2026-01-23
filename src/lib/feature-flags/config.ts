/**
 * Feature Flag Configuration
 *
 * This file defines all available feature flags and their default values.
 * Feature flags can be overridden via environment variables.
 */

export const FEATURE_FLAGS = {
  /**
   * User Registration
   * Controls: /register page, /api/auth/register endpoint
   * When OFF: New users cannot create accounts, useful for closed beta or maintenance
   */
  FEATURE_USER_REGISTRATION: 'FEATURE_USER_REGISTRATION',

  /**
   * Community Suggestions
   * Controls: /suggest, /details/[slug]/suggest, /suggestions pages, suggestion APIs
   * When OFF: Users cannot submit suggestions, "Suggest" buttons hidden
   */
  FEATURE_COMMUNITY_SUGGESTIONS: 'FEATURE_COMMUNITY_SUGGESTIONS',

  /**
   * A-to-B Routing
   * Controls: MapRoutingPanel component, /api/route/* endpoints
   * When OFF: Routing panel hidden, reduces Mapbox Directions API costs
   */
  FEATURE_ROUTING: 'FEATURE_ROUTING',

  /**
   * Web Scraper System
   * Controls: /api/scraper/*, /api/cron/scraper, admin scraper panel
   * When OFF: No automated news scraping, cron jobs skip scraper execution
   */
  FEATURE_SCRAPER: 'FEATURE_SCRAPER',

  /**
   * Advanced Search & Filtering
   * Controls: FilterSearchOverlay advanced filters, complex search queries
   * When OFF: Only basic text search available, filter parameters ignored
   */
  FEATURE_ADVANCED_SEARCH: 'FEATURE_ADVANCED_SEARCH',

  /**
   * Rate Limiting
   * Controls: Request rate limiting per IP/user in middleware
   * When OFF: No request limits enforced (use for development/testing)
   */
  FEATURE_RATE_LIMITING: 'FEATURE_RATE_LIMITING',

  /**
   * Caching
   * Controls: Response caching for map data, searches, construction details
   * When OFF: All requests hit database directly (fresh data, higher load)
   */
  FEATURE_CACHING: 'FEATURE_CACHING',

  /**
   * Email Notifications
   * Controls: Email verification, password reset, suggestion notifications
   * When OFF: Emails not sent, verification may be skipped
   */
  FEATURE_EMAIL_NOTIFICATIONS: 'FEATURE_EMAIL_NOTIFICATIONS',

  /**
   * Internationalization (i18n)
   * Controls: Language switcher, URL-based locale routing
   * When OFF: Default language only, language switcher hidden
   */
  FEATURE_I18N: 'FEATURE_I18N',

  /**
   * Theme Toggle (Dark/Light Mode)
   * Controls: ThemeToggle button, theme switching capability
   * When OFF: Default theme only, toggle button hidden
   */
  FEATURE_THEME_TOGGLE: 'FEATURE_THEME_TOGGLE',

  /**
   * Moderator Dashboard
   * Controls: /moderator/* routes, suggestion review workflows
   * When OFF: Moderator routes inaccessible, suggestions cannot be processed
   */
  FEATURE_MODERATOR_DASHBOARD: 'FEATURE_MODERATOR_DASHBOARD',

  /**
   * Map Animations
   * Controls: Animated pulse effects, smooth transitions on map
   * When OFF: Static markers, better performance on low-power devices
   */
  FEATURE_MAP_ANIMATIONS: 'FEATURE_MAP_ANIMATIONS',

  /**
   * Advertisements
   * Controls: Ad components, ad provider scripts, ad placements
   * When OFF: No ads displayed, ad scripts not loaded
   * Note: This is a master switch - individual placements can be configured in PayloadCMS
   */
  FEATURE_ADS: 'FEATURE_ADS',

  /**
   * Google Analytics
   * Controls: GA4 tracking script, pageview tracking, custom events
   * When OFF: Google Analytics not loaded, only Vercel Analytics active
   */
  FEATURE_GOOGLE_ANALYTICS: 'FEATURE_GOOGLE_ANALYTICS',
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export type FeatureFlagValue = (typeof FEATURE_FLAGS)[FeatureFlagKey];

/**
 * Default values for all feature flags
 * These are used when environment variables are not set
 */
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagValue, boolean> = {
  [FEATURE_FLAGS.FEATURE_USER_REGISTRATION]: true,
  [FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS]: true,
  [FEATURE_FLAGS.FEATURE_ROUTING]: true,
  [FEATURE_FLAGS.FEATURE_SCRAPER]: true,
  [FEATURE_FLAGS.FEATURE_ADVANCED_SEARCH]: true,
  [FEATURE_FLAGS.FEATURE_RATE_LIMITING]: true,
  [FEATURE_FLAGS.FEATURE_CACHING]: true,
  [FEATURE_FLAGS.FEATURE_EMAIL_NOTIFICATIONS]: true,
  [FEATURE_FLAGS.FEATURE_I18N]: true,
  [FEATURE_FLAGS.FEATURE_THEME_TOGGLE]: true,
  [FEATURE_FLAGS.FEATURE_MODERATOR_DASHBOARD]: true,
  [FEATURE_FLAGS.FEATURE_MAP_ANIMATIONS]: true,
  [FEATURE_FLAGS.FEATURE_ADS]: false, // Disabled by default until traffic warrants
  [FEATURE_FLAGS.FEATURE_GOOGLE_ANALYTICS]: false, // Requires GA4 measurement ID
};

/**
 * Feature flag metadata for documentation and admin UI
 */
export interface FeatureFlagMetadata {
  key: FeatureFlagValue;
  name: string;
  description: string;
  category: 'core' | 'ui' | 'ops' | 'external';
  impact: 'high' | 'medium' | 'low';
  affectedRoutes: string[];
  affectedComponents: string[];
}

export const FEATURE_FLAG_METADATA: Record<FeatureFlagValue, FeatureFlagMetadata> = {
  [FEATURE_FLAGS.FEATURE_USER_REGISTRATION]: {
    key: FEATURE_FLAGS.FEATURE_USER_REGISTRATION,
    name: 'User Registration',
    description: 'Allow new users to create accounts',
    category: 'core',
    impact: 'high',
    affectedRoutes: ['/register', '/api/auth/register'],
    affectedComponents: ['RegisterForm', 'UserMenu'],
  },
  [FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS]: {
    key: FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS,
    name: 'Community Suggestions',
    description: 'Allow users to submit construction suggestions and edits',
    category: 'core',
    impact: 'high',
    affectedRoutes: ['/suggest', '/suggestions', '/details/[slug]/suggest', '/api/suggestions/*'],
    affectedComponents: ['SuggestionForm', 'ConstructionPopup'],
  },
  [FEATURE_FLAGS.FEATURE_ROUTING]: {
    key: FEATURE_FLAGS.FEATURE_ROUTING,
    name: 'A-to-B Routing',
    description: 'Route calculation with construction alerts',
    category: 'external',
    impact: 'medium',
    affectedRoutes: ['/api/route/*'],
    affectedComponents: ['MapRoutingPanel', 'RoutingOverlay'],
  },
  [FEATURE_FLAGS.FEATURE_SCRAPER]: {
    key: FEATURE_FLAGS.FEATURE_SCRAPER,
    name: 'Web Scraper',
    description: 'Automated news scraping from VNExpress, Tuoi Tre, government sources',
    category: 'ops',
    impact: 'high',
    affectedRoutes: ['/api/scraper/*', '/api/cron/scraper', '/admin/scraper'],
    affectedComponents: ['ScraperDashboard'],
  },
  [FEATURE_FLAGS.FEATURE_ADVANCED_SEARCH]: {
    key: FEATURE_FLAGS.FEATURE_ADVANCED_SEARCH,
    name: 'Advanced Search',
    description: 'Advanced filtering by type, status, district, date range',
    category: 'ui',
    impact: 'low',
    affectedRoutes: ['/api/search'],
    affectedComponents: ['FilterSearchOverlay'],
  },
  [FEATURE_FLAGS.FEATURE_RATE_LIMITING]: {
    key: FEATURE_FLAGS.FEATURE_RATE_LIMITING,
    name: 'Rate Limiting',
    description: 'Request rate limiting per IP/user',
    category: 'ops',
    impact: 'medium',
    affectedRoutes: ['/api/*'],
    affectedComponents: [],
  },
  [FEATURE_FLAGS.FEATURE_CACHING]: {
    key: FEATURE_FLAGS.FEATURE_CACHING,
    name: 'Caching',
    description: 'Response caching for map data, searches, construction details',
    category: 'ops',
    impact: 'medium',
    affectedRoutes: ['/api/map/*', '/api/search', '/api/constructions/*'],
    affectedComponents: [],
  },
  [FEATURE_FLAGS.FEATURE_EMAIL_NOTIFICATIONS]: {
    key: FEATURE_FLAGS.FEATURE_EMAIL_NOTIFICATIONS,
    name: 'Email Notifications',
    description: 'Email verification, password reset, suggestion notifications',
    category: 'external',
    impact: 'medium',
    affectedRoutes: ['/api/auth/*'],
    affectedComponents: ['RegisterForm', 'ForgotPasswordForm'],
  },
  [FEATURE_FLAGS.FEATURE_I18N]: {
    key: FEATURE_FLAGS.FEATURE_I18N,
    name: 'Internationalization',
    description: 'Multi-language support (Vietnamese, English)',
    category: 'ui',
    impact: 'low',
    affectedRoutes: ['/*'],
    affectedComponents: ['LanguageSwitcher'],
  },
  [FEATURE_FLAGS.FEATURE_THEME_TOGGLE]: {
    key: FEATURE_FLAGS.FEATURE_THEME_TOGGLE,
    name: 'Theme Toggle',
    description: 'Dark/Light mode switching',
    category: 'ui',
    impact: 'low',
    affectedRoutes: [],
    affectedComponents: ['ThemeToggle', 'ThemeProvider'],
  },
  [FEATURE_FLAGS.FEATURE_MODERATOR_DASHBOARD]: {
    key: FEATURE_FLAGS.FEATURE_MODERATOR_DASHBOARD,
    name: 'Moderator Dashboard',
    description: 'Suggestion review and approval workflows',
    category: 'core',
    impact: 'high',
    affectedRoutes: ['/moderator/*', '/api/suggestions/*/approve', '/api/suggestions/*/reject'],
    affectedComponents: ['ModeratorQueue'],
  },
  [FEATURE_FLAGS.FEATURE_MAP_ANIMATIONS]: {
    key: FEATURE_FLAGS.FEATURE_MAP_ANIMATIONS,
    name: 'Map Animations',
    description: 'Animated markers and smooth map transitions',
    category: 'ui',
    impact: 'low',
    affectedRoutes: [],
    affectedComponents: ['ConstructionMap'],
  },
  [FEATURE_FLAGS.FEATURE_ADS]: {
    key: FEATURE_FLAGS.FEATURE_ADS,
    name: 'Advertisements',
    description: 'Display ads from configured ad provider (Ezoic, Mediavine, AdThrive)',
    category: 'external',
    impact: 'medium',
    affectedRoutes: [],
    affectedComponents: ['AdContainer', 'AdProvider', 'CookieConsent'],
  },
  [FEATURE_FLAGS.FEATURE_GOOGLE_ANALYTICS]: {
    key: FEATURE_FLAGS.FEATURE_GOOGLE_ANALYTICS,
    name: 'Google Analytics',
    description: 'Google Analytics 4 tracking for pageviews and events',
    category: 'external',
    impact: 'low',
    affectedRoutes: [],
    affectedComponents: ['GoogleAnalytics'],
  },
};
