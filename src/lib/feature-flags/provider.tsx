'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { FEATURE_FLAGS, FEATURE_FLAG_DEFAULTS, type FeatureFlagValue } from './config';

/**
 * Feature Flags Context
 *
 * Provides feature flag values to client components via React Context.
 * Server components should use isFeatureEnabled() directly.
 */

type FeatureFlagsContextValue = {
  flags: Record<FeatureFlagValue, boolean>;
  isEnabled: (flag: FeatureFlagValue) => boolean;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

interface FeatureFlagsProviderProps {
  children: ReactNode;
  /**
   * Feature flags passed from server component
   * Use getClientFeatureFlags() in server component to get these values
   */
  flags?: Record<FeatureFlagValue, boolean>;
}

/**
 * Feature Flags Provider
 *
 * Wrap your app with this provider to enable useFeatureFlag hook.
 *
 * Usage in layout.tsx:
 * ```tsx
 * import { FeatureFlagsProvider, getClientFeatureFlags } from '@/lib/feature-flags';
 *
 * export default function Layout({ children }) {
 *   const flags = getClientFeatureFlags();
 *   return (
 *     <FeatureFlagsProvider flags={flags}>
 *       {children}
 *     </FeatureFlagsProvider>
 *   );
 * }
 * ```
 */
export function FeatureFlagsProvider({ children, flags }: FeatureFlagsProviderProps) {
  const value = useMemo(() => {
    // Merge provided flags with defaults
    const mergedFlags = { ...FEATURE_FLAG_DEFAULTS, ...flags };

    return {
      flags: mergedFlags,
      isEnabled: (flag: FeatureFlagValue) => mergedFlags[flag] ?? false,
    };
  }, [flags]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flags context
 *
 * @returns Feature flags context value
 * @throws Error if used outside of FeatureFlagsProvider
 */
export function useFeatureFlagsContext(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    throw new Error(
      'useFeatureFlagsContext must be used within a FeatureFlagsProvider. ' +
      'Wrap your app with <FeatureFlagsProvider> in your layout.'
    );
  }

  return context;
}

/**
 * Hook to check if a specific feature flag is enabled
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const isRoutingEnabled = useFeatureFlag('FEATURE_ROUTING');
 *
 *   if (!isRoutingEnabled) {
 *     return null; // or fallback UI
 *   }
 *
 *   return <RoutingPanel />;
 * }
 * ```
 *
 * @param flag - The feature flag to check
 * @returns boolean indicating if the feature is enabled
 */
export function useFeatureFlag(flag: FeatureFlagValue): boolean {
  const context = useContext(FeatureFlagsContext);

  // If context is not available, fall back to defaults
  // This allows components to work even if provider is missing
  if (!context) {
    console.warn(
      `useFeatureFlag called outside FeatureFlagsProvider for flag: ${flag}. ` +
      'Using default value. Consider wrapping your app with FeatureFlagsProvider.'
    );
    return FEATURE_FLAG_DEFAULTS[flag];
  }

  return context.isEnabled(flag);
}

/**
 * Hook to get all feature flags
 *
 * Useful for debugging or displaying feature flag status
 *
 * @returns Record of all feature flags and their current state
 */
export function useFeatureFlags(): Record<FeatureFlagValue, boolean> {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    console.warn(
      'useFeatureFlags called outside FeatureFlagsProvider. Using default values.'
    );
    return FEATURE_FLAG_DEFAULTS;
  }

  return context.flags;
}

/**
 * Component that conditionally renders children based on feature flag
 *
 * Usage:
 * ```tsx
 * <FeatureFlag flag="FEATURE_ROUTING">
 *   <RoutingPanel />
 * </FeatureFlag>
 *
 * // With fallback
 * <FeatureFlag flag="FEATURE_ROUTING" fallback={<div>Routing unavailable</div>}>
 *   <RoutingPanel />
 * </FeatureFlag>
 * ```
 */
interface FeatureFlagProps {
  flag: FeatureFlagValue;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureFlag({ flag, children, fallback = null }: FeatureFlagProps) {
  const isEnabled = useFeatureFlag(flag);

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Re-export FEATURE_FLAGS for convenience
 */
export { FEATURE_FLAGS };
