/**
 * CSRF Protection
 *
 * Implements double-submit cookie pattern for CSRF protection.
 * - Generates a random token stored in a cookie
 * - Validates that the token is sent in a header (X-CSRF-Token)
 * - The cookie and header must match for state-changing operations
 */

import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent, getClientInfo } from './security-logger';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // 256 bits
const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Get the CSRF token from the request cookie
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Get the CSRF token from the request header
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * Validate CSRF token
 * Returns true if valid, false otherwise
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  // Both must be present
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Tokens must match (timing-safe comparison would be ideal but
  // since both tokens are from the same request it's less critical)
  return cookieToken === headerToken;
}

/**
 * Set CSRF token cookie on a response
 */
export function setCsrfTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript to send in header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_COOKIE_MAX_AGE,
  });
}

/**
 * Middleware to ensure CSRF token is set
 */
export function ensureCsrfToken(request: NextRequest, response: NextResponse): NextResponse {
  const existingToken = getCsrfTokenFromCookie(request);

  if (!existingToken) {
    const newToken = generateCsrfToken();
    setCsrfTokenCookie(response, newToken);
  }

  return response;
}

/**
 * Validate CSRF for state-changing requests
 * Returns null if valid, or an error response if invalid
 */
export function requireCsrfToken(request: NextRequest): NextResponse | null {
  // Skip CSRF validation for safe methods
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (safeMethod) {
    return null;
  }

  // Validate token
  if (!validateCsrfToken(request)) {
    const clientInfo = getClientInfo(request);
    logSecurityEvent('csrf_failure', {
      method: request.method,
      path: request.nextUrl.pathname,
      hasCookie: !!getCsrfTokenFromCookie(request),
      hasHeader: !!getCsrfTokenFromHeader(request),
      ...clientInfo,
    });

    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * API routes that should be exempt from CSRF protection
 * (e.g., webhook endpoints, cron jobs that use their own auth)
 */
const CSRF_EXEMPT_ROUTES = [
  '/api/cron/',
  '/api/webhook/',
  '/api/health',
  '/api/locale',
];

/**
 * Check if a route is exempt from CSRF protection
 */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route));
}
