import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "../globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PageTransitionProvider, TransitionOverlay } from "@/components/PageTransition";
import { AuthProvider } from "@/components/Auth";
import { FeatureFlagsProvider } from "@/lib/feature-flags/provider";
import { getClientFeatureFlags, isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@/components/Analytics";
import { AdProviderWrapper, CookieConsent } from "@/components/Ads";
import { getAdSettings } from "@/lib/ads";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: {
    default: "OpenSite - Track Construction Projects",
    template: "%s | OpenSite",
  },
  description:
    "Track road construction, metro lines, and infrastructure projects in your city. Real-time updates from community and news sources.",
  keywords: [
    "construction",
    "road construction",
    "metro",
    "infrastructure",
    "traffic",
    "công trình",
    "xây dựng",
    "opensite",
  ],
  authors: [{ name: "OpenSite" }],
  openGraph: {
    title: "OpenSite",
    description:
      "Track road construction and infrastructure projects in your city",
    locale: "vi_VN",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const featureFlags = getClientFeatureFlags();

  // Fetch ad settings from PayloadCMS (only if ads feature is enabled)
  const adSettings = isFeatureEnabled(FEATURE_FLAGS.FEATURE_ADS)
    ? await getAdSettings()
    : null;

  // Check if Google Analytics is enabled
  const isGAEnabled = isFeatureEnabled(FEATURE_FLAGS.FEATURE_GOOGLE_ANALYTICS);
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <FeatureFlagsProvider flags={featureFlags}>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider>
              <AuthProvider>
                <AdProviderWrapper settings={adSettings}>
                  <PageTransitionProvider>
                    {children}
                    <TransitionOverlay />
                  </PageTransitionProvider>
                  <CookieConsent />
                </AdProviderWrapper>
              </AuthProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </FeatureFlagsProvider>
        <Analytics />
        <SpeedInsights />
        {isGAEnabled && <GoogleAnalytics measurementId={gaMeasurementId} />}
      </body>
    </html>
  );
}
