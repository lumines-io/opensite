import { cookies } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { Media } from '@/payload-types';

// Re-export API middleware utilities
export {
  getAuthenticatedUser,
  requireAuth,
  requireVerifiedUser,
  requireRole,
  requireVerifiedRole,
  isAuthError,
  ROLE_LEVELS,
  isSponsorRole,
  canManagePrivateConstructions,
  canApprovePrivateConstructions,
  canContributeToPublicConstructions,
  type AuthenticatedUser,
} from './api-middleware';

export type UserRole = 'contributor' | 'sponsor_user' | 'sponsor_admin' | 'moderator' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  _verified: boolean;
  reputation: number;
  bio?: string | null;
  avatar?: string | null;
  organization?: string | number | null;
}

// Helper to safely extract user properties from Payload's auth response
function extractUserData(user: unknown): AuthUser | null {
  if (!user || typeof user !== 'object') return null;

  const u = user as Record<string, unknown>;
  const avatar = u.avatar;
  let avatarUrl: string | null = null;

  if (avatar && typeof avatar === 'object') {
    avatarUrl = (avatar as Media).url || null;
  }

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
    bio: u.bio as string | null | undefined,
    avatar: avatarUrl,
    organization: organizationId,
  };
}

/**
 * Get the current authenticated user from the request
 * This should be used in Server Components and API routes
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const payload = await getPayload({ config });
    const cookieStore = await cookies();
    const token = cookieStore.get('payload-token')?.value;

    if (!token) {
      return null;
    }

    const { user } = await payload.auth({ headers: new Headers({ Cookie: `payload-token=${token}` }) });

    if (!user) {
      return null;
    }

    return extractUserData(user);
  } catch {
    return null;
  }
}

/**
 * Check if the user has a specific role or higher
 */
export function hasRole(user: AuthUser | null, requiredRole: UserRole): boolean {
  if (!user) return false;

  const roleHierarchy: Record<UserRole, number> = {
    contributor: 1,
    sponsor_user: 2,
    sponsor_admin: 2.5,
    moderator: 3,
    admin: 4,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Check if the user's email is verified
 */
export function isEmailVerified(user: AuthUser | null): boolean {
  return user?._verified ?? false;
}

/**
 * Check if user can perform public tasks (requires verification)
 */
export function canPerformPublicTasks(user: AuthUser | null): boolean {
  return user !== null && isEmailVerified(user);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Common passwords list (top 100 most common)
 * SECURITY: Prevents users from using easily guessable passwords
 */
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  'qwerty', 'abc123', '111111', '1234567', 'iloveyou', 'adobe123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'login',
  'princess', 'qwertyuiop', 'solo', 'passw0rd', 'starwars', 'dragon',
  'master', 'hello', 'freedom', 'whatever', 'trustno1', 'superman',
  'michael', 'football', 'batman', 'sunshine', 'password!', 'shadow',
  'ashley', 'bailey', 'qazwsx', 'ninja', 'mustang', 'charlie',
  'donald', 'qwerty123', 'baseball', 'football1', 'password1!',
]);

/**
 * Validate password strength
 * SECURITY: Enforces stronger password requirements
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  // SECURITY: Minimum 12 characters (upgraded from 8)
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters long' };
  }

  // Maximum length to prevent DoS via long passwords
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  // SECURITY: Require at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*...)' };
  }

  // SECURITY: Check against common passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowerPassword)) {
    return { valid: false, message: 'This password is too common. Please choose a more unique password.' };
  }

  // Check for common patterns that indicate weak passwords
  if (/^(.)\1+$/.test(password)) {
    return { valid: false, message: 'Password cannot consist of repeated characters' };
  }

  // Check for sequential characters (e.g., "abcdef", "123456")
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    return { valid: false, message: 'Password should not contain sequential characters' };
  }

  return { valid: true };
}

/**
 * Get password strength score (0-100)
 * Useful for showing password strength indicator
 */
export function getPasswordStrength(password: string): number {
  let score = 0;

  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;

  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score += 15;

  // Deduct for common patterns
  if (/^(.)\1+$/.test(password)) score -= 30;
  if (COMMON_PASSWORDS.has(password.toLowerCase())) score -= 50;

  return Math.max(0, Math.min(100, score));
}
