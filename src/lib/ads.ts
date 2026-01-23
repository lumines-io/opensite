import { getPayload } from 'payload';
import config from '@/payload.config';
import type { AdSettings } from '@/components/Ads';

/**
 * Fetch ad settings from PayloadCMS
 *
 * This function is meant to be called from server components.
 * It fetches the ad-settings global from PayloadCMS.
 *
 * @returns Ad settings or null if not configured
 */
export async function getAdSettings(): Promise<AdSettings | null> {
  try {
    const payload = await getPayload({ config });

    const settings = await payload.findGlobal({
      slug: 'ad-settings',
    });

    if (!settings) {
      return null;
    }

    // Transform PayloadCMS data to AdSettings type
    return {
      enabled: settings.enabled ?? false,
      provider: (settings.provider as AdSettings['provider']) ?? 'none',
      consentRequired: settings.consentRequired ?? true,
      lazyLoadAds: settings.lazyLoadAds ?? true,
      adsense: settings.adsense
        ? {
            publisherId: settings.adsense.publisherId ?? undefined,
            autoAds: settings.adsense.autoAds ?? false,
          }
        : undefined,
      ezoic: settings.ezoic
        ? {
            siteId: settings.ezoic.siteId ?? undefined,
            useCloudIntegration: settings.ezoic.useCloudIntegration ?? false,
            enablePlaceholders: settings.ezoic.enablePlaceholders ?? true,
          }
        : undefined,
      mediavine: settings.mediavine
        ? {
            siteId: settings.mediavine.siteId ?? undefined,
            enableGrowMe: settings.mediavine.enableGrowMe ?? true,
            disableOnMobile: settings.mediavine.disableOnMobile ?? false,
          }
        : undefined,
      adthrive: settings.adthrive
        ? {
            siteId: settings.adthrive.siteId ?? undefined,
            enableVideoAds: settings.adthrive.enableVideoAds ?? true,
            stickyFooter: settings.adthrive.stickyFooter ?? true,
          }
        : undefined,
      placements: settings.placements
        ? {
            headerBanner: settings.placements.headerBanner ?? false,
            sidebarAd: settings.placements.sidebarAd ?? true,
            inContentAd: settings.placements.inContentAd ?? true,
            footerBanner: settings.placements.footerBanner ?? false,
            stickyFooterMobile: settings.placements.stickyFooterMobile ?? false,
            searchResultsAd: settings.placements.searchResultsAd ?? false,
          }
        : undefined,
      analytics: settings.analytics
        ? {
            trackImpressions: settings.analytics.trackImpressions ?? true,
            trackClicks: settings.analytics.trackClicks ?? true,
            revenueGoalMonthly: settings.analytics.revenueGoalMonthly ?? 0,
          }
        : undefined,
      exclusions: settings.exclusions
        ? {
            excludeHomepage: settings.exclusions.excludeHomepage ?? true,
            excludeAuthPages: settings.exclusions.excludeAuthPages ?? true,
            excludeAdminPages: settings.exclusions.excludeAdminPages ?? true,
            excludeForLoggedInUsers: settings.exclusions.excludeForLoggedInUsers ?? false,
            excludedPaths: (settings.exclusions.excludedPaths as { path: string }[]) ?? [],
          }
        : undefined,
    };
  } catch (error) {
    console.error('Failed to fetch ad settings:', error);
    return null;
  }
}

/**
 * Check if ads should be shown for a given path
 *
 * Server-side utility to check path exclusions.
 *
 * @param settings - Ad settings
 * @param pathname - Current pathname
 * @returns Whether ads should be shown
 */
export function shouldShowAdsForPath(settings: AdSettings | null, pathname: string): boolean {
  if (!settings?.enabled) return false;
  if (settings.provider === 'none') return false;

  const exclusions = settings.exclusions;
  if (!exclusions) return true;

  if (exclusions.excludeHomepage && pathname === '/') {
    return false;
  }

  if (exclusions.excludeAuthPages && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return false;
  }

  if (exclusions.excludeAdminPages && (pathname.startsWith('/admin') || pathname.startsWith('/moderator'))) {
    return false;
  }

  if (exclusions.excludedPaths?.some(({ path }) => pathname.startsWith(path))) {
    return false;
  }

  return true;
}
