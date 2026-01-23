'use client';

import Script from 'next/script';

interface GoogleAnalyticsProps {
  measurementId: string | undefined;
}

/**
 * Google Analytics 4 (GA4) Component
 *
 * Loads the Google Analytics script and initializes tracking.
 * Only renders if a valid measurement ID is provided.
 *
 * Usage:
 * ```tsx
 * <GoogleAnalytics measurementId="G-XXXXXXXXXX" />
 * ```
 */
export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}

/**
 * Track a custom event in Google Analytics
 *
 * @param action - The event action (e.g., 'click', 'view')
 * @param category - The event category (e.g., 'engagement', 'ads')
 * @param label - Optional event label
 * @param value - Optional numeric value
 */
export function trackGAEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as Window & { gtag: (...args: unknown[]) => void }).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

/**
 * Track a pageview in Google Analytics
 *
 * @param url - The page URL to track
 * @param title - Optional page title
 */
export function trackGAPageview(url: string, title?: string) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as Window & { gtag: (...args: unknown[]) => void }).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', {
      page_path: url,
      page_title: title,
    });
  }
}
