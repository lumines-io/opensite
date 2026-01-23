'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '../Header';
import { Footer } from '../Footer';

export interface ErrorPageTemplateProps {
  /**
   * The error code to display (e.g., "404", "500")
   */
  errorCode?: string;
  /**
   * The error title
   */
  title: string;
  /**
   * The error description/message
   */
  description: string;
  /**
   * Custom icon to display (defaults to warning icon)
   */
  icon?: ReactNode;
  /**
   * Custom action buttons
   */
  actions?: ReactNode;
  /**
   * Whether to show the default "Go Home" button
   * @default true
   */
  showHomeButton?: boolean;
  /**
   * Whether to show the default "Go Back" button
   * @default true
   */
  showBackButton?: boolean;
  /**
   * Custom label for the home button
   */
  homeButtonLabel?: string;
  /**
   * Custom label for the back button
   */
  backButtonLabel?: string;
}

function DefaultIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-12 h-12 text-muted-foreground"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

export function ErrorPageTemplate({
  errorCode,
  title,
  description,
  icon,
  actions,
  showHomeButton = true,
  showBackButton = true,
  homeButtonLabel = 'Go Home',
  backButtonLabel = 'Go Back',
}: ErrorPageTemplateProps) {
  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header variant="minimal" sticky={false} />

      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-md"
        >
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
            {icon || <DefaultIcon />}
          </div>

          {/* Error Code */}
          {errorCode && (
            <h2 className="text-4xl font-bold text-foreground mb-2">{errorCode}</h2>
          )}

          {/* Title */}
          <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>

          {/* Description */}
          <p className="text-muted-foreground mb-8">{description}</p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {actions}
            {!actions && (
              <>
                {showHomeButton && (
                  <Link
                    href="/"
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors font-medium"
                  >
                    {homeButtonLabel}
                  </Link>
                )}
                {showBackButton && (
                  <button
                    onClick={handleGoBack}
                    className="px-6 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
                  >
                    {backButtonLabel}
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </main>

      <Footer variant="minimal" />
    </div>
  );
}
