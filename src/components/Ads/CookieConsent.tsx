'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAds } from './AdProvider';
import { useTranslations } from 'next-intl';

const CONSENT_DISMISSED_KEY = 'cookie-consent-dismissed';

/**
 * Cookie Consent Banner Component
 *
 * Displays a GDPR-compliant cookie consent banner for ad tracking.
 * Only shows when:
 * - Ads are enabled
 * - Consent is required (per settings)
 * - User hasn't already given or declined consent
 */
export function CookieConsent() {
  const { isEnabled, hasConsent, setConsent, settings } = useAds();
  // Initialize dismissed state from localStorage
  const [isDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CONSENT_DISMISSED_KEY) === 'true';
    }
    return true; // Default to dismissed on server to prevent flash
  });
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations('cookieConsent');

  // Show banner after a short delay for better UX
  useEffect(() => {
    if (!isDismissed && isEnabled && settings?.consentRequired && !hasConsent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isDismissed, isEnabled, settings?.consentRequired, hasConsent]);

  const handleAccept = useCallback(() => {
    setConsent(true);
    setIsVisible(false);
    localStorage.setItem(CONSENT_DISMISSED_KEY, 'true');
  }, [setConsent]);

  const handleDecline = useCallback(() => {
    setConsent(false);
    setIsVisible(false);
    localStorage.setItem(CONSENT_DISMISSED_KEY, 'true');
  }, [setConsent]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(CONSENT_DISMISSED_KEY, 'true');
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h2
            id="cookie-consent-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {t('title', { defaultValue: 'Cookie Consent' })}
          </h2>
          <p
            id="cookie-consent-description"
            className="mt-1 text-sm text-gray-600 dark:text-gray-300"
          >
            {t('description', {
              defaultValue:
                'We use cookies and similar technologies to show personalized ads, analyze traffic, and improve your experience. By clicking "Accept", you consent to our use of cookies.',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t('decline', { defaultValue: 'Decline' })}
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            {t('accept', { defaultValue: 'Accept' })}
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label={t('dismiss', { defaultValue: 'Dismiss' })}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Cookie Settings Link Component
 *
 * A small link to allow users to change their cookie preferences.
 * Useful in footer or privacy policy page.
 */
export function CookieSettingsLink({ className = '' }: { className?: string }) {
  const { setConsent } = useAds();
  const t = useTranslations('cookieConsent');

  const handleOpenSettings = () => {
    // Clear the dismissed flag to show the banner again
    localStorage.removeItem(CONSENT_DISMISSED_KEY);
    // Clear consent to trigger banner
    setConsent(false);
    // Force a re-render
    window.location.reload();
  };

  return (
    <button
      onClick={handleOpenSettings}
      className={`text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline ${className}`}
    >
      {t('managePreferences', { defaultValue: 'Manage Cookie Preferences' })}
    </button>
  );
}
