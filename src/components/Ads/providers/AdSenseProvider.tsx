'use client';

import Script from 'next/script';

interface AdSenseProviderProps {
  publisherId: string;
  autoAds?: boolean;
}

/**
 * Google AdSense Provider Component
 *
 * Loads the AdSense script for displaying Google ads.
 * This component should be included once in the layout.
 */
export function AdSenseProvider({ publisherId, autoAds = false }: AdSenseProviderProps) {
  if (!publisherId) {
    return null;
  }

  return (
    <>
      <Script
        id="adsense-script"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
      {autoAds && (
        <Script id="adsense-auto-ads" strategy="lazyOnload">
          {`
            (adsbygoogle = window.adsbygoogle || []).push({
              google_ad_client: "${publisherId}",
              enable_page_level_ads: true
            });
          `}
        </Script>
      )}
    </>
  );
}

interface AdSenseAdUnitProps {
  slotId: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
  className?: string;
}

/**
 * Individual AdSense Ad Unit
 *
 * Renders a single AdSense ad slot.
 */
export function AdSenseAdUnit({
  slotId,
  format = 'auto',
  responsive = true,
  className = '',
}: AdSenseAdUnitProps) {
  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: 'block' }}
      data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
