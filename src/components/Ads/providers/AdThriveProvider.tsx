'use client';

import Script from 'next/script';

interface AdThriveProviderProps {
  siteId: string;
  enableVideoAds?: boolean;
  stickyFooter?: boolean;
}

/**
 * AdThrive (Raptive) Ad Provider Component
 *
 * Loads the AdThrive script for premium ad serving.
 *
 * Requirements:
 * - Minimum 100,000 pageviews per month
 * - Majority US traffic preferred
 * - Original, brand-safe content
 */
export function AdThriveProvider({
  siteId,
  enableVideoAds = true,
  stickyFooter = true,
}: AdThriveProviderProps) {
  if (!siteId) {
    return null;
  }

  return (
    <>
      {/* AdThrive Primary Script */}
      <Script
        id="adthrive-script"
        src={`https://ads.adthrive.com/sites/${siteId}/ads.min.js`}
        strategy="lazyOnload"
        data-cfasync="false"
      />
      <Script id="adthrive-init" strategy="lazyOnload">
        {`
          window.adthrive = window.adthrive || {};
          window.adthrive.cmd = window.adthrive.cmd || [];
          window.adthrive.cmd.push(function() {
            window.adthrive.config = {
              enableVideo: ${enableVideoAds},
              stickyFooter: ${stickyFooter},
              lazyLoading: true
            };
          });
        `}
      </Script>
    </>
  );
}

interface AdThriveAdUnitProps {
  type: 'header' | 'sidebar' | 'content' | 'footer' | 'sticky';
  className?: string;
}

/**
 * AdThrive Ad Unit Component
 *
 * Creates a wrapper for AdThrive to inject ads.
 */
export function AdThriveAdUnit({ type, className = '' }: AdThriveAdUnitProps) {
  const getMinHeight = () => {
    switch (type) {
      case 'header':
        return '90px';
      case 'sidebar':
        return '250px';
      case 'content':
        return '280px';
      case 'footer':
        return '90px';
      case 'sticky':
        return '50px';
      default:
        return '250px';
    }
  };

  return (
    <div
      className={`adthrive-ad ${className}`}
      data-adthrive-ad={type}
      style={{ minHeight: getMinHeight() }}
    />
  );
}
