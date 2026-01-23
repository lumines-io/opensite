import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import {
  checkBruteForce,
  recordFailedAttempt,
  clearAttempts,
} from '@/lib/brute-force-protection';
import { logSecurityEvent, getClientInfo, maskEmail } from '@/lib/security-logger';

export async function POST(request: NextRequest) {
  const clientInfo = getClientInfo(request);

  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // SECURITY: Check brute force protection before attempting login
    const bruteForceCheck = checkBruteForce(email, clientInfo.ip);
    if (!bruteForceCheck.allowed) {
      logSecurityEvent('auth_brute_force_attempt', {
        email: maskEmail(email),
        reason: bruteForceCheck.reason,
        retryAfter: bruteForceCheck.retryAfter,
        ...clientInfo,
      });

      return NextResponse.json(
        {
          error: 'Too many failed attempts. Please try again later.',
          retryAfter: bruteForceCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(bruteForceCheck.retryAfter || 900),
          },
        }
      );
    }

    const payload = await getPayload({ config });

    // Attempt login
    const result = await payload.login({
      collection: 'users',
      data: {
        email: email.toLowerCase(),
        password,
      },
    });

    if (!result.token || !result.user) {
      // Record failed attempt
      recordFailedAttempt(email, clientInfo.ip);
      logSecurityEvent('auth_login_failure', {
        email: maskEmail(email),
        reason: 'Invalid credentials',
        ...clientInfo,
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Clear brute force attempts on successful login
    clearAttempts(email, clientInfo.ip);

    // Log successful login
    logSecurityEvent('auth_login_success', {
      userId: String(result.user.id),
      email: maskEmail(email),
      ...clientInfo,
    });

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        _verified: result.user._verified,
        reputation: result.user.reputation,
      },
      message: result.user._verified
        ? 'Login successful'
        : 'Login successful. Please verify your email to access all features.',
    });

    // SECURITY: Set the auth cookie with secure settings
    response.cookies.set('payload-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // SECURITY: Changed from 'lax' to 'strict' for better CSRF protection
      path: '/',
      maxAge: 60 * 60 * 2, // 2 hours (matches tokenExpiration)
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    // Payload throws specific error for invalid credentials
    if (error instanceof Error && error.message.includes('credentials')) {
      // Record failed attempt for credential errors too
      const body = await request.clone().json().catch(() => ({}));
      if (body.email) {
        recordFailedAttempt(body.email, clientInfo.ip);
        logSecurityEvent('auth_login_failure', {
          email: maskEmail(body.email),
          reason: 'Invalid credentials (exception)',
          ...clientInfo,
        });
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
