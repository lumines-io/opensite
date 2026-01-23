'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth, type UserRole } from '@/components/Auth';
import { useFeatureFlag, FEATURE_FLAGS } from '@/lib/feature-flags/provider';

interface NavItem {
  href: string;
  label: string;
  requiresAuth?: boolean;
  requiresRole?: string[];
  featureFlag?: string;
}

export function HeaderNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { isAuthenticated, hasRole } = useAuth();

  const isSuggestionsEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS);
  const isModeratorDashboardEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_MODERATOR_DASHBOARD);

  const navItems: NavItem[] = [
    {
      href: '/suggestions',
      label: t('suggestions'),
      requiresAuth: true,
      featureFlag: FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS,
    },
    {
      href: '/sponsor/projects',
      label: 'My Projects',
      requiresAuth: true,
      requiresRole: ['sponsor_user', 'sponsor_admin'],
    },
    {
      href: '/moderator/suggestions',
      label: t('moderator'),
      requiresAuth: true,
      requiresRole: ['moderator', 'admin'],
      featureFlag: FEATURE_FLAGS.FEATURE_MODERATOR_DASHBOARD,
    },
  ];

  const isFeatureEnabled = (flag?: string): boolean => {
    if (!flag) return true;
    if (flag === FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS) return isSuggestionsEnabled;
    if (flag === FEATURE_FLAGS.FEATURE_MODERATOR_DASHBOARD) return isModeratorDashboardEnabled;
    return true;
  };

  const filteredItems = navItems.filter((item) => {
    if (item.featureFlag && !isFeatureEnabled(item.featureFlag)) return false;
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.requiresRole && !item.requiresRole.some((role) => hasRole(role as UserRole))) return false;
    return true;
  });

  if (filteredItems.length === 0) return null;

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
