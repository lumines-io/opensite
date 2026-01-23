/**
 * Feature Flags Module
 *
 * Provides server-side and client-side feature flag utilities.
 *
 * Usage:
 *
 * Server-side (API routes, server components):
 * ```ts
 * import { isFeatureEnabled, getFeatureFlags } from '@/lib/feature-flags';
 *
 * if (!isFeatureEnabled('FEATURE_USER_REGISTRATION')) {
 *   return Response.json({ error: 'Registration disabled' }, { status: 403 });
 * }
 * ```
 *
 * Client-side (React components):
 * ```tsx
 * import { useFeatureFlag } from '@/lib/feature-flags';
 *
 * function MyComponent() {
 *   const isEnabled = useFeatureFlag('FEATURE_ROUTING');
 *   if (!isEnabled) return null;
 *   return <RoutingPanel />;
 * }
 * ```
 */

import {
  FEATURE_FLAGS,
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_METADATA,
  type FeatureFlagKey,
  type FeatureFlagValue,
  type FeatureFlagMetadata,
} from './config';

// Re-export types and constants
export {
  FEATURE_FLAGS,
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_METADATA,
  type FeatureFlagKey,
  type FeatureFlagValue,
  type FeatureFlagMetadata,
};

/**
 * Check if a feature flag is enabled (server-side)
 *
 * Reads from environment variables with fallback to defaults.
 * Environment variable values: 'true', '1', 'yes' = enabled, anything else = disabled
 *
 * @param flag - The feature flag key to check
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlagValue): boolean {
  const envValue = process.env[flag];

  // If not set in environment, use default
  if (envValue === undefined || envValue === '') {
    return FEATURE_FLAG_DEFAULTS[flag];
  }

  // Parse environment variable value
  return ['true', '1', 'yes', 'on'].includes(envValue.toLowerCase());
}

/**
 * Get all feature flags with their current values (server-side)
 *
 * Useful for passing to client components or debugging
 *
 * @returns Record of all feature flags and their current enabled state
 */
export function getFeatureFlags(): Record<FeatureFlagValue, boolean> {
  const flags: Record<string, boolean> = {};

  for (const flag of Object.values(FEATURE_FLAGS)) {
    flags[flag] = isFeatureEnabled(flag);
  }

  return flags as Record<FeatureFlagValue, boolean>;
}

/**
 * Get feature flags that are safe to expose to the client
 *
 * Only includes flags with NEXT_PUBLIC_ prefix or explicitly marked as public
 * For this implementation, all feature flags are considered safe for client exposure
 *
 * @returns Record of client-safe feature flags
 */
export function getClientFeatureFlags(): Record<FeatureFlagValue, boolean> {
  // All feature flags are safe to expose to the client
  // They only indicate what features are available, not sensitive configuration
  return getFeatureFlags();
}

/**
 * Get feature flag metadata for admin/documentation purposes
 *
 * @param flag - Optional specific flag to get metadata for
 * @returns Feature flag metadata or all metadata if no flag specified
 */
export function getFeatureFlagMetadata(flag?: FeatureFlagValue): FeatureFlagMetadata | Record<FeatureFlagValue, FeatureFlagMetadata> {
  if (flag) {
    return FEATURE_FLAG_METADATA[flag];
  }
  return FEATURE_FLAG_METADATA;
}

/**
 * Get feature flags grouped by category
 *
 * @returns Feature flags organized by category
 */
export function getFeatureFlagsByCategory(): Record<string, FeatureFlagMetadata[]> {
  const categories: Record<string, FeatureFlagMetadata[]> = {
    core: [],
    ui: [],
    ops: [],
    external: [],
  };

  for (const metadata of Object.values(FEATURE_FLAG_METADATA)) {
    categories[metadata.category].push(metadata);
  }

  return categories;
}

/**
 * Create a feature flag guard for API routes
 *
 * Returns a Response object if the feature is disabled, null if enabled
 *
 * @param flag - The feature flag to check
 * @param customMessage - Optional custom error message
 * @returns Response object if disabled, null if enabled
 */
export function featureFlagGuard(
  flag: FeatureFlagValue,
  customMessage?: string
): Response | null {
  if (!isFeatureEnabled(flag)) {
    const metadata = FEATURE_FLAG_METADATA[flag];
    const message = customMessage || `${metadata.name} is currently disabled`;

    return Response.json(
      {
        error: 'Feature Disabled',
        message,
        feature: flag,
      },
      {
        status: 403,
        headers: {
          'X-Feature-Flag': flag,
          'X-Feature-Enabled': 'false',
        },
      }
    );
  }
  return null;
}

/**
 * Higher-order function to wrap API handlers with feature flag check
 *
 * @param flag - The feature flag to check
 * @param handler - The API handler function to wrap
 * @returns Wrapped handler that checks feature flag first
 */
export function withFeatureFlag<T extends (...args: unknown[]) => Promise<Response>>(
  flag: FeatureFlagValue,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const guardResponse = featureFlagGuard(flag);
    if (guardResponse) {
      return guardResponse;
    }
    return handler(...args);
  }) as T;
}
