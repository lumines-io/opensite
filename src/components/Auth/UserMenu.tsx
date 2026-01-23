'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { User, Lightbulb, ClipboardCheck, Settings, LogOut } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useFeatureFlag, FEATURE_FLAGS } from '@/lib/feature-flags/provider';

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className = '' }: UserMenuProps) {
  const t = useTranslations('nav');
  const tProfile = useTranslations('profile');
  const { user, isLoading, isAuthenticated, isEmailVerified, logout, hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Feature flags
  const isSuggestionsEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS);
  const isModeratorDashboardEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_MODERATOR_DASHBOARD);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    window.location.href = '/';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-8 h-8 bg-muted rounded-full animate-pulse ${className}`} />
    );
  }

  // Not authenticated - show account icon which navigate to login page
  if (!isAuthenticated) {
    return (
      <div className={`relative ${className}`} ref={menuRef}>
        <a
          href="/login"
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Account menu"
        >
          <User className="w-5 h-5" strokeWidth={2} />
        </a>

        {/* Dropdown menu for unauthenticated users */}
        {/* {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
            <div className="py-1">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-body-sm text-foreground hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign In
                </div>
              </Link>
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-body-sm text-foreground hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Create Account
                </div>
              </Link>
            </div>
          </div>
        )} */}
      </div>
    );
  }

  // Authenticated - show user menu
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || 'User avatar'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-white text-label-md">{initials}</span>
          )}
        </div>
        {/* Verification badge */}
        {!isEmailVerified && (
          <span className="w-2 h-2 bg-yellow-500 rounded-full absolute top-0 right-0" title="Email not verified" />
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <p className="font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-body-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-caption px-2 py-0.5 rounded-full ${
                  user?.role === 'admin'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : user?.role === 'moderator'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {user?.role}
              </span>
              {!isEmailVerified && (
                <span className="text-caption px-2 py-0.5 rounded-full bg-warning-light text-warning dark:bg-warning-light dark:text-warning">
                  {tProfile('role.contributor')}
                </span>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-body-sm text-foreground hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" strokeWidth={2} />
                {t('profile')}
              </div>
            </Link>

            {isSuggestionsEnabled && (
              <Link
                href="/suggestions"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-body-sm text-foreground hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" strokeWidth={2} />
                  {t('suggestions')}
                </div>
              </Link>
            )}

            {hasRole('moderator') && (
              <>
                {isModeratorDashboardEnabled && (
                  <Link
                    href="/moderator/suggestions"
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-2 text-body-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4" strokeWidth={2} />
                      {t('moderator')}
                    </div>
                  </Link>
                )}
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-body-sm text-foreground hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" strokeWidth={2} />
                    {t('admin')}
                  </div>
                </Link>
              </>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-border py-1">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-body-sm text-left text-error hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4" strokeWidth={2} />
                {t('logout')}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
