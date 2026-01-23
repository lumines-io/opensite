'use client';

import Script from 'next/script';

interface EzoicProviderProps {
  siteId: string;
  enablePlaceholders?: boolean;
}

/**
 * Ezoic Ad Provider Component
 *
 * Loads the Ezoic script for AI-powered ad optimization.
 * Ezoic uses machine learning to optimize ad placements.
 *
 * Requirements:
 * - No minimum traffic requirement (Access Now program)
 * - Site must be approved by Ezoic
 */
export function EzoicProvider({ siteId, enablePlaceholders = true }: EzoicProviderProps) {
  if (!siteId) {
    return null;
  }

  return (
    <>
      {/* Ezoic Ad Script */}
      <Script
        id="ezoic-script"
        src={`//www.ezojs.com/ezoic/sa.min.js`}
        strategy="lazyOnload"
      />
      <Script id="ezoic-init" strategy="lazyOnload">
        {`
          window.ezstandalone = window.ezstandalone || {};
          ezstandalone.cmd = ezstandalone.cmd || [];
          ezstandalone.cmd.push(function() {
            ezstandalone.define(${siteId});
            ${enablePlaceholders ? 'ezstandalone.enable();' : ''}
            ezstandalone.display();
          });
        `}
      </Script>
    </>
  );
}

interface EzoicPlaceholderProps {
  placeholderId: number;
  className?: string;
}

/**
 * Ezoic Placeholder Component
 *
 * Creates a placeholder div where Ezoic will inject an ad.
 * The placeholderId corresponds to the placeholder configured in Ezoic dashboard.
 */
export function EzoicPlaceholder({ placeholderId, className = '' }: EzoicPlaceholderProps) {
  return (
    <div
      id={`ezoic-pub-ad-placeholder-${placeholderId}`}
      className={className}
      data-ez-placeholder-id={placeholderId}
    />
  );
}
