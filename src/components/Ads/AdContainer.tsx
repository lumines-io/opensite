'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAds } from './AdProvider';
import { trackGAEvent } from '../Analytics';

export type AdPlacement =
  | 'header-banner'
  | 'sidebar'
  | 'in-content'
  | 'footer-banner'
  | 'sticky-footer-mobile'
  | 'search-results';

export type AdSize = '728x90' | '300x250' | '336x280' | '300x600' | '320x50' | 'responsive';

interface AdContainerProps {
  placement: AdPlacement;
  size?: AdSize;
  className?: string;
  /**
   * Fallback content to show when ads are disabled or loading
   */
  fallback?: ReactNode;
  /**
   * Optional ID for tracking purposes
   */
  trackingId?: string;
}

/**
 * Ad Container Component
 *
 * A lazy-loading container for displaying ads based on the configured provider.
 * Features:
 * - Lazy loading with Intersection Observer
 * - Consent-aware (won't load until consent given)
 * - Provider-agnostic (works with any configured provider)
 * - Tracks impressions and viewability
 */
export function AdContainer({
  placement,
  size = 'responsive',
  className = '',
  fallback = null,
  trackingId,
}: AdContainerProps) {
  const { isEnabled, hasConsent, settings, provider, isLoading } = useAds();
  const containerRef = useRef<HTMLDivElement>(null);
  // Initialize isInView to true if lazy loading is disabled
  const [isInView, setIsInView] = useState(() => !settings?.lazyLoadAds);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

  // Check if this placement is enabled
  const isPlacementEnabled = (() => {
    if (!settings?.placements) return false;
    switch (placement) {
      case 'header-banner':
        return settings.placements.headerBanner;
      case 'sidebar':
        return settings.placements.sidebarAd;
      case 'in-content':
        return settings.placements.inContentAd;
      case 'footer-banner':
        return settings.placements.footerBanner;
      case 'sticky-footer-mobile':
        return settings.placements.stickyFooterMobile;
      case 'search-results':
        return settings.placements.searchResultsAd;
      default:
        return false;
    }
  })();

  // Lazy load using Intersection Observer
  useEffect(() => {
    if (!settings?.lazyLoadAds) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [settings?.lazyLoadAds]);

  // Track impression when ad becomes visible
  useEffect(() => {
    if (!isInView || hasTrackedImpression || !settings?.analytics?.trackImpressions) {
      return;
    }

    const impressionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Track impression (50% viewability)
            trackGAEvent('ad_impression', 'ads', placement, undefined);
            setHasTrackedImpression(true);
            impressionObserver.disconnect();
          }
        });
      },
      {
        threshold: 0.5, // 50% viewability
      }
    );

    if (containerRef.current) {
      impressionObserver.observe(containerRef.current);
    }

    return () => impressionObserver.disconnect();
  }, [isInView, hasTrackedImpression, placement, settings?.analytics?.trackImpressions]);

  // Don't render if ads are disabled, loading, or consent not given
  if (!isEnabled || isLoading) {
    return fallback ? <>{fallback}</> : null;
  }

  if (settings?.consentRequired && !hasConsent) {
    return fallback ? <>{fallback}</> : null;
  }

  if (!isPlacementEnabled) {
    return fallback ? <>{fallback}</> : null;
  }

  // Get size styles
  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case '728x90':
        return { width: '728px', height: '90px', maxWidth: '100%' };
      case '300x250':
        return { width: '300px', height: '250px' };
      case '336x280':
        return { width: '336px', height: '280px' };
      case '300x600':
        return { width: '300px', height: '600px' };
      case '320x50':
        return { width: '320px', height: '50px' };
      case 'responsive':
      default:
        return { width: '100%', minHeight: '90px' };
    }
  };

  // Render placeholder until in view (for lazy loading)
  if (!isInView) {
    return (
      <div
        ref={containerRef}
        className={`ad-container ad-placeholder ${className}`}
        style={getSizeStyles()}
        data-ad-placement={placement}
        data-ad-size={size}
        data-tracking-id={trackingId}
      />
    );
  }

  // Render the appropriate ad unit based on provider
  const renderAdUnit = () => {
    switch (provider) {
      case 'adsense':
        return (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', ...getSizeStyles() }}
            data-ad-format={size === 'responsive' ? 'auto' : undefined}
            data-full-width-responsive={size === 'responsive' ? 'true' : undefined}
          />
        );

      case 'ezoic':
        return (
          <div
            id={`ezoic-pub-ad-placeholder-${placement}`}
            className="ezoic-ad"
            style={getSizeStyles()}
          />
        );

      case 'mediavine':
        return (
          <div
            className="mediavine-ad"
            data-mediavine-ad={placement}
            style={getSizeStyles()}
          />
        );

      case 'adthrive':
        return (
          <div
            className="adthrive-ad"
            data-adthrive-ad={placement}
            style={getSizeStyles()}
          />
        );

      default:
        return fallback;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`ad-container ad-loaded ${className}`}
      style={getSizeStyles()}
      data-ad-placement={placement}
      data-ad-size={size}
      data-ad-provider={provider}
      data-tracking-id={trackingId}
    >
      {renderAdUnit()}
    </div>
  );
}

/**
 * Sidebar Ad Component
 *
 * Pre-configured ad container for sidebar placement.
 */
export function SidebarAd({ className = '' }: { className?: string }) {
  return (
    <AdContainer
      placement="sidebar"
      size="300x250"
      className={`sidebar-ad ${className}`}
    />
  );
}

/**
 * In-Content Ad Component
 *
 * Pre-configured ad container for in-content placement.
 */
export function InContentAd({ className = '' }: { className?: string }) {
  return (
    <AdContainer
      placement="in-content"
      size="responsive"
      className={`in-content-ad ${className}`}
    />
  );
}

/**
 * Header Banner Ad Component
 *
 * Pre-configured ad container for header banner placement.
 */
export function HeaderBannerAd({ className = '' }: { className?: string }) {
  return (
    <AdContainer
      placement="header-banner"
      size="728x90"
      className={`header-banner-ad ${className}`}
    />
  );
}

/**
 * Footer Banner Ad Component
 *
 * Pre-configured ad container for footer banner placement.
 */
export function FooterBannerAd({ className = '' }: { className?: string }) {
  return (
    <AdContainer
      placement="footer-banner"
      size="728x90"
      className={`footer-banner-ad ${className}`}
    />
  );
}
