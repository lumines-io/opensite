'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../Header';
import { Footer } from '../Footer';

export interface ContentPageTemplateProps {
  /**
   * The main page content
   */
  children: ReactNode;
  /**
   * The page title displayed in the page header section
   */
  pageTitle?: string;
  /**
   * The page description displayed below the title
   */
  pageDescription?: string;
  /**
   * Optional sidebar content (renders on the right side)
   */
  sidebar?: ReactNode;
  /**
   * Optional action buttons displayed in the page header
   */
  actions?: ReactNode;
  /**
   * Maximum width of the content area
   * @default '7xl' (max-w-7xl)
   */
  maxWidth?: '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  /**
   * Whether to show the full footer
   * @default true
   */
  showFullFooter?: boolean;
  /**
   * Custom className for the main content area
   */
  className?: string;
}

const maxWidthClasses = {
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function ContentPageTemplate({
  children,
  pageTitle,
  pageDescription,
  sidebar,
  actions,
  maxWidth = '7xl',
  showFullFooter = true,
  className = '',
}: ContentPageTemplateProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header variant="full" sticky />

      <main className="flex-1">
        {/* Page Header */}
        {(pageTitle || actions) && (
          <div className="border-b border-border bg-muted/50">
            <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  {pageTitle && (
                    <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
                  )}
                  {pageDescription && (
                    <p className="mt-1 text-muted-foreground">{pageDescription}</p>
                  )}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={sidebar ? 'grid grid-cols-1 lg:grid-cols-3 gap-8' : className}
          >
            <div className={sidebar ? 'lg:col-span-2' : ''}>{children}</div>
            {sidebar && (
              <aside className="lg:col-span-1">
                <div className="sticky top-24">{sidebar}</div>
              </aside>
            )}
          </motion.div>
        </div>
      </main>

      <Footer variant={showFullFooter ? 'full' : 'minimal'} />
    </div>
  );
}
