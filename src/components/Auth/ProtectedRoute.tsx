'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserRole } from './AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requireVerified?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Component to protect routes based on authentication status, role, and email verification.
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute>
 *   <MyComponent /> // Requires authentication
 * </ProtectedRoute>
 *
 * <ProtectedRoute requireVerified>
 *   <MyComponent /> // Requires authentication + verified email
 * </ProtectedRoute>
 *
 * <ProtectedRoute requiredRole="moderator" requireVerified>
 *   <MyComponent /> // Requires authentication + verified email + moderator role
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requireVerified = false,
  fallback,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isEmailVerified, hasRole } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const currentPath = window.location.pathname;
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (requireVerified && !isEmailVerified) {
      // User is logged in but not verified - show verification prompt instead of redirecting
      return;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      // User doesn't have required role - redirect to home
      router.push('/');
      return;
    }
  }, [isLoading, isAuthenticated, isEmailVerified, requiredRole, requireVerified, hasRole, router, redirectTo]);

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto text-blue-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // Email not verified but required
  if (requireVerified && !isEmailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Email Verification Required
            </h2>
            <p className="text-muted-foreground mb-6">
              Please verify your email address to access this feature. Check your inbox for the
              verification link.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Signed in as <strong>{user?.email}</strong>
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full py-2 px-4 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Role not sufficient
  if (requiredRole && !hasRole(requiredRole)) {
    return null; // Will redirect in useEffect
  }

  // All checks passed
  return <>{children}</>;
}

/**
 * Hook to check if user can perform public tasks (requires verified email)
 */
export function useCanPerformPublicTasks(): { canPerform: boolean; isLoading: boolean; reason?: string } {
  const { user, isLoading, isAuthenticated, isEmailVerified } = useAuth();

  if (isLoading) {
    return { canPerform: false, isLoading: true };
  }

  if (!isAuthenticated) {
    return { canPerform: false, isLoading: false, reason: 'Please sign in to continue' };
  }

  if (!isEmailVerified) {
    return { canPerform: false, isLoading: false, reason: 'Please verify your email to continue' };
  }

  return { canPerform: true, isLoading: false };
}
