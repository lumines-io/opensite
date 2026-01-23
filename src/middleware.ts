import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, createRateLimitErrorResponse, createRateLimitHeaders, RateLimitTier } from './lib/rate-limit';

// Routes that require authentication
const protectedRoutes = [
  '/profile',
  '/suggestions',
];

/**
 * Security headers to add to all responses
 * Following OWASP recommendations
 */
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // XSS protection (legacy, but still useful for older browsers)
  'X-XSS-Protection': '1; mode=block',
  // Referrer policy - send referrer only to same origin
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions policy - restrict browser features
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
};

/**
 * Content Security Policy
 * Strict CSP to prevent XSS attacks
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com",
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
  "img-src 'self' data: blob: https://*.mapbox.com https://*.googleapis.com",
  "font-src 'self'",
  "connect-src 'self' https://*.mapbox.com https://api.mapbox.com https://events.mapbox.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

/**
 * Add security headers to a response
 */
function addSecurityHeaders(response: NextResponse, isProduction: boolean): void {
  // Add all security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Add CSP header
  response.headers.set('Content-Security-Policy', CSP_DIRECTIVES.join('; '));

  // Add HSTS header in production
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

// Map API routes to rate limit tiers
const getApiRateLimitTier = (pathname: string): RateLimitTier | null => {
  // Cron endpoints - no rate limiting (authenticated by secret)
  if (pathname.startsWith('/api/cron')) {
    return null;
  }
  // Scraper endpoints - most restrictive
  if (pathname.startsWith('/api/scraper')) {
    return 'scraper';
  }
  // Admin API endpoints
  if (pathname.startsWith('/api/admin')) {
    return 'admin';
  }
  // Search endpoints
  if (pathname.startsWith('/api/search')) {
    return 'search';
  }
  // Map data endpoints
  if (pathname.startsWith('/api/map')) {
    return 'map';
  }
  // Route alerts endpoint
  if (pathname.startsWith('/api/route')) {
    return 'search';
  }
  // All other API endpoints
  if (pathname.startsWith('/api/')) {
    return 'standard';
  }
  // Non-API routes don't need rate limiting
  return null;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProduction = process.env.NODE_ENV === 'production';

  // Allow static files and Next.js internals
  const isStaticOrInternal =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/media') ||
    pathname.includes('.');

  if (isStaticOrInternal) {
    return NextResponse.next();
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api')) {
    const rateLimitTier = getApiRateLimitTier(pathname);
    if (rateLimitTier) {
      try {
        const result = await checkRateLimit(request, rateLimitTier);

        if (!result.success) {
          return createRateLimitErrorResponse(result);
        }

        // Continue with rate limit headers and security headers
        const response = NextResponse.next();
        const headers = createRateLimitHeaders(result);
        headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
        addSecurityHeaders(response, isProduction);
        return response;
      } catch (error) {
        // If rate limiting fails, log and continue without blocking
        console.error('Rate limiting middleware error:', error);
      }
    }
    // API request without rate limiting tier - still add security headers
    const apiResponse = NextResponse.next();
    addSecurityHeaders(apiResponse, isProduction);
    return apiResponse;
  }

  // Allow Payload admin routes (they handle their own auth)
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Get the auth token
  const token = request.cookies.get('payload-token')?.value;
  const isAuthenticated = !!token;

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to home if accessing login/register while authenticated
  if ((pathname === '/login' || pathname === '/register') && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // For role-protected routes, we can't check the role in middleware
  // (would need to decode JWT or make a database call)
  // So we'll handle role checks in the page components

  // Add security headers to all responses
  const response = NextResponse.next();
  addSecurityHeaders(response, isProduction);
  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
