'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useFeatureFlag } from '@/lib/feature-flags/provider';
import { FEATURE_FLAGS } from '@/lib/feature-flags/config';
import { useAuth } from '@/components/Auth';
import { AdSenseProvider } from './providers/AdSenseProvider';
import { EzoicProvider } from './providers/EzoicProvider';
import { MediavineProvider } from './providers/MediavineProvider';
import { AdThriveProvider } from './providers/AdThriveProvider';

export type AdProvider = 'none' | 'adsense' | 'ezoic' | 'mediavine' | 'adthrive';

export interface AdSettings {
  enabled: boolean;
  provider: AdProvider;
  consentRequired: boolean;
  lazyLoadAds: boolean;
  adsense?: {
    publisherId?: string;
    autoAds?: boolean;
  };
  ezoic?: {
    siteId?: string;
    useCloudIntegration?: boolean;
    enablePlaceholders?: boolean;
  };
  mediavine?: {
    siteId?: string;
    enableGrowMe?: boolean;
    disableOnMobile?: boolean;
  };
  adthrive?: {
    siteId?: string;
    enableVideoAds?: boolean;
    stickyFooter?: boolean;
  };
  placements?: {
    headerBanner?: boolean;
    sidebarAd?: boolean;
    inContentAd?: boolean;
    footerBanner?: boolean;
    stickyFooterMobile?: boolean;
    searchResultsAd?: boolean;
  };
  analytics?: {
    trackImpressions?: boolean;
    trackClicks?: boolean;
    revenueGoalMonthly?: number;
  };
  exclusions?: {
    excludeHomepage?: boolean;
    excludeAuthPages?: boolean;
    excludeAdminPages?: boolean;
    excludeForLoggedInUsers?: boolean;
    excludedPaths?: { path: string }[];
  };
}

interface AdContextValue {
  /**
   * Whether ads are currently enabled (considering feature flag, settings, and exclusions)
   */
  isEnabled: boolean;
  /**
   * Whether the user has given consent for ads
   */
  hasConsent: boolean;
  /**
   * Set user consent for ads
   */
  setConsent: (consent: boolean) => void;
  /**
   * The current ad provider
   */
  provider: AdProvider;
  /**
   * Full ad settings from PayloadCMS
   */
  settings: AdSettings | null;
  /**
   * Whether settings are still loading
   */
  isLoading: boolean;
}

const AdContext = createContext<AdContextValue | null>(null);

const CONSENT_STORAGE_KEY = 'ad-consent';

interface AdProviderProps {
  children: ReactNode;
  /**
   * Ad settings passed from server component (from PayloadCMS)
   */
  settings?: AdSettings | null;
}

/**
 * Ad Provider Component
 *
 * Provides ad context to the application and manages:
 * - Ad settings from PayloadCMS
 * - User consent state
 * - Path-based exclusions
 * - Provider script loading
 */
export function AdProviderWrapper({ children, settings }: AdProviderProps) {
  const isAdsFeatureEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_ADS);
  const { user } = useAuth();
  const pathname = usePathname();
  // Initialize consent and loading state from localStorage
  const [hasConsent, setHasConsent] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
    }
    return false;
  });
  const [isLoading] = useState(() => {
    // Loading is false once we're on the client
    return typeof window === 'undefined';
  });

  // Handle consent changes
  const setConsent = useCallback((consent: boolean) => {
    setHasConsent(consent);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONSENT_STORAGE_KEY, String(consent));
    }
  }, []);

  // Check if current path is excluded
  const isPathExcluded = useMemo(() => {
    if (!settings?.exclusions) return false;

    const { excludeHomepage, excludeAuthPages, excludeAdminPages, excludedPaths } =
      settings.exclusions;

    // Check homepage
    if (excludeHomepage && pathname === '/') {
      return true;
    }

    // Check auth pages
    if (excludeAuthPages && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
      return true;
    }

    // Check admin pages
    if (excludeAdminPages && (pathname.startsWith('/admin') || pathname.startsWith('/moderator'))) {
      return true;
    }

    // Check custom excluded paths
    if (excludedPaths?.some(({ path }) => pathname.startsWith(path))) {
      return true;
    }

    return false;
  }, [pathname, settings?.exclusions]);

  // Check if user is excluded
  const isUserExcluded = useMemo(() => {
    if (!settings?.exclusions?.excludeForLoggedInUsers) return false;
    return !!user;
  }, [user, settings?.exclusions?.excludeForLoggedInUsers]);

  // Determine if ads are enabled
  const isEnabled = useMemo(() => {
    if (!isAdsFeatureEnabled) return false;
    if (!settings?.enabled) return false;
    if (settings.provider === 'none') return false;
    if (isPathExcluded) return false;
    if (isUserExcluded) return false;
    return true;
  }, [isAdsFeatureEnabled, settings, isPathExcluded, isUserExcluded]);

  const provider = settings?.provider || 'none';

  const contextValue = useMemo<AdContextValue>(
    () => ({
      isEnabled,
      hasConsent,
      setConsent,
      provider,
      settings: settings || null,
      isLoading,
    }),
    [isEnabled, hasConsent, setConsent, provider, settings, isLoading]
  );

  // Render provider scripts
  const renderProviderScript = () => {
    if (!isEnabled || (settings?.consentRequired && !hasConsent)) {
      return null;
    }

    switch (provider) {
      case 'adsense':
        return settings?.adsense?.publisherId ? (
          <AdSenseProvider
            publisherId={settings.adsense.publisherId}
            autoAds={settings.adsense.autoAds}
          />
        ) : null;

      case 'ezoic':
        return settings?.ezoic?.siteId ? (
          <EzoicProvider
            siteId={settings.ezoic.siteId}
            enablePlaceholders={settings.ezoic.enablePlaceholders}
          />
        ) : null;

      case 'mediavine':
        return settings?.mediavine?.siteId ? (
          <MediavineProvider
            siteId={settings.mediavine.siteId}
            enableGrowMe={settings.mediavine.enableGrowMe}
          />
        ) : null;

      case 'adthrive':
        return settings?.adthrive?.siteId ? (
          <AdThriveProvider
            siteId={settings.adthrive.siteId}
            enableVideoAds={settings.adthrive.enableVideoAds}
            stickyFooter={settings.adthrive.stickyFooter}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <AdContext.Provider value={contextValue}>
      {children}
      {renderProviderScript()}
    </AdContext.Provider>
  );
}

/**
 * Hook to access ad context
 *
 * @returns Ad context value
 * @throws Error if used outside of AdProvider
 */
export function useAds(): AdContextValue {
  const context = useContext(AdContext);

  if (!context) {
    // Return safe defaults if context is not available
    return {
      isEnabled: false,
      hasConsent: false,
      setConsent: () => {},
      provider: 'none',
      settings: null,
      isLoading: true,
    };
  }

  return context;
}

/**
 * Hook to check if ads should be shown on current page
 *
 * Convenience hook that checks all conditions for showing ads.
 */
export function useShouldShowAds(): boolean {
  const { isEnabled, hasConsent, settings } = useAds();

  if (!isEnabled) return false;
  if (settings?.consentRequired && !hasConsent) return false;

  return true;
}
