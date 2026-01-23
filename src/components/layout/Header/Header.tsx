'use client';

import { HeaderLogo } from './HeaderLogo';
import { HeaderNav } from './HeaderNav';
import { UserMenu } from '@/components/Auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useFeatureFlag, FEATURE_FLAGS } from '@/lib/feature-flags/provider';

export interface HeaderProps {
  /**
   * Header variant:
   * - 'full': Shows navigation, user menu, theme toggle, and language switcher
   * - 'minimal': Shows only logo and language switcher
   */
  variant?: 'full' | 'minimal';
  /**
   * Whether the header should be sticky at the top
   */
  sticky?: boolean;
  /**
   * Whether to show the tagline under the logo
   */
  showTagline?: boolean;
  /**
   * Custom className for the header container
   */
  className?: string;
}

export function Header({
  variant = 'full',
  sticky = true,
  showTagline = false,
  className = '',
}: HeaderProps) {
  const isThemeToggleEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_THEME_TOGGLE);
  const isI18nEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_I18N);

  const isMinimal = variant === 'minimal';

  return (
    <header
      className={`bg-card border-b border-border px-4 py-3 ${
        sticky ? 'sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60' : ''
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <HeaderLogo showTagline={showTagline} />
          {!isMinimal && <HeaderNav />}
        </div>

        <div className="flex items-center gap-2">
          {isI18nEnabled && <LanguageSwitcher />}
          {!isMinimal && isThemeToggleEnabled && <ThemeToggle />}
          {!isMinimal && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
