'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Map, Github } from 'lucide-react';

export interface FooterProps {
  /**
   * Footer variant:
   * - 'full': Shows all footer sections including links and social
   * - 'minimal': Shows only copyright and essential info
   */
  variant?: 'full' | 'minimal';
  /**
   * Custom className for the footer container
   */
  className?: string;
}

export function Footer({ variant = 'full', className = '' }: FooterProps) {
  const t = useTranslations('footer');
  const tCommon = useTranslations('common');

  const currentYear = new Date().getFullYear();
  const isMinimal = variant === 'minimal';

  if (isMinimal) {
    return (
      <footer className={`py-4 text-center border-t border-border bg-card ${className}`}>
        <p className="text-sm text-muted-foreground">
          {tCommon('appName')} &copy; {currentYear}
        </p>
      </footer>
    );
  }

  return (
    <footer className={`border-t border-border bg-card ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Map className="w-5 h-5 text-white" strokeWidth={2} aria-hidden="true" />
              </div>
              <span className="font-semibold text-foreground">{tCommon('appName')}</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              {t('tagline')}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">{t('quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link
                  href="/suggest"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('suggestProject')}
                </Link>
              </li>
              <li>
                <Link
                  href="/status"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('status')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">{t('legal')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('terms')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {tCommon('appName')}. {t('allRightsReserved')}
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
