import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export type UserRole = 'contributor' | 'sponsor_user' | 'sponsor_admin' | 'moderator' | 'admin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  _verified: boolean;
  reputation: number;
  organization?: string | number | null;
}

// Role levels for hierarchy comparison
export const ROLE_LEVELS: Record<UserRole, number> = {
  contributor: 1,
  sponsor_user: 2,
  sponsor_admin: 2.5,
  moderator: 3,
  admin: 4,
} as const;

/**
 * Check if a role is a sponsor role
 */
export const isSponsorRole = (role: string): boolean =>
  ['sponsor_user', 'sponsor_admin'].includes(role);

/**
 * Check if a role can manage private constructions (create/edit)
 */
export const canManagePrivateConstructions = (role: string): boolean =>
  ['admin', 'moderator', 'sponsor_admin', 'sponsor_user'].includes(role);

/**
 * Check if a role can approve private constructions
 */
export const canApprovePrivateConstructions = (role: string): boolean =>
  ['admin', 'moderator'].includes(role);

/**
 * Check if a role can contribute to public constructions
 */
export const canContributeToPublicConstructions = (role: string): boolean =>
  ['admin', 'moderator', 'contributor'].includes(role);

interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
}

// Helper to safely extract user properties from Payload's auth response
function extractUserData(user: unknown): AuthenticatedUser | null {
  if (!user || typeof user !== 'object') return null;

  const u = user as Record<string, unknown>;

  // Extract organization ID (could be an object with id or just the id)
  let organizationId: string | number | null = null;
  if (u.organization) {
    if (typeof u.organization === 'object' && u.organization !== null) {
      organizationId = (u.organization as Record<string, unknown>).id as string | number;
    } else {
      organizationId = u.organization as string | number;
    }
  }

  return {
    id: String(u.id || ''),
    email: String(u.email || ''),
    name: String(u.name || ''),
    role: (u.role as UserRole) || 'contributor',
    _verified: Boolean(u._verified),
    reputation: Number(u.reputation) || 0,
    organization: organizationId,
  };
}

/**
 * Get the authenticated user from an API request
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  try {
    const token = request.cookies.get('payload-token')?.value;

    if (!token) {
      return { user: null, error: 'Not authenticated' };
    }

    const payload = await getPayload({ config });
    const { user } = await payload.auth({
      headers: new Headers({ Cookie: `payload-token=${token}` }),
    });

    if (!user) {
      return { user: null, error: 'Invalid or expired token' };
    }

    const extractedUser = extractUserData(user);

    if (!extractedUser) {
      return { user: null, error: 'Failed to extract user data' };
    }

    return { user: extractedUser };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { user: null, error: 'Authentication failed' };
  }
}

/**
 * Require authentication for an API route
 * Returns the user if authenticated, or a 401 response
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const { user, error } = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: error || 'Not authenticated' }, { status: 401 });
  }

  return { user };
}

/**
 * Require email verification for an API route
 * Returns the user if authenticated and verified, or appropriate error response
 */
export async function requireVerifiedUser(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const result = await requireAuth(request);

  if (result instanceof NextResponse) {
    return result;
  }

  if (!result.user._verified) {
    return NextResponse.json(
      { error: 'Email verification required. Please verify your email to perform this action.' },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Require a specific role for an API route
 * Returns the user if authenticated and has the required role, or appropriate error response
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: UserRole
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const result = await requireAuth(request);

  if (result instanceof NextResponse) {
    return result;
  }

  if (ROLE_LEVELS[result.user.role] < ROLE_LEVELS[requiredRole]) {
    return NextResponse.json(
      { error: `This action requires ${requiredRole} role or higher` },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Require verified user with a specific role
 */
export async function requireVerifiedRole(
  request: NextRequest,
  requiredRole: UserRole
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const verifiedResult = await requireVerifiedUser(request);

  if (verifiedResult instanceof NextResponse) {
    return verifiedResult;
  }

  if (ROLE_LEVELS[verifiedResult.user.role] < ROLE_LEVELS[requiredRole]) {
    return NextResponse.json(
      { error: `This action requires ${requiredRole} role or higher` },
      { status: 403 }
    );
  }

  return verifiedResult;
}

/**
 * Type guard to check if result is a NextResponse (error)
 */
export function isAuthError(
  result: { user: AuthenticatedUser } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
