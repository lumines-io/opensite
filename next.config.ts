import { withPayload } from '@payloadcms/next/withPayload';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: false,
    // Disable webpack build worker to prevent Jest worker crashes in dev
    webpackBuildWorker: false,
  },
  images: {
    // SECURITY: Restrict remote image patterns to trusted domains only
    // This prevents attackers from using your server as an image proxy
    remotePatterns: [
      // Mapbox tiles and static images
      {
        protocol: 'https',
        hostname: '*.mapbox.com',
      },
      {
        protocol: 'https',
        hostname: 'api.mapbox.com',
      },
      // Google Maps (for street view, etc.)
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.gstatic.com',
      },
      // Local media uploads (Payload CMS)
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SERVER_URL?.replace(/^https?:\/\//, '') || 'localhost',
      },
      // Allow localhost in development
      ...(process.env.NODE_ENV === 'development'
        ? [
            {
              protocol: 'http' as const,
              hostname: 'localhost',
            },
          ]
        : []),
    ],
  },
  // SECURITY: Add request body size limit
  // This helps prevent DoS attacks via large payloads
  // Default is 4mb, we'll keep it for API routes
};

export default withPayload(withNextIntl(nextConfig));
