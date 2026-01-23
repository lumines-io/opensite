'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Map } from 'lucide-react';

interface HeaderLogoProps {
  showTagline?: boolean;
}

export function HeaderLogo({ showTagline = false }: HeaderLogoProps) {
  const t = useTranslations('common');

  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <Map className="w-5 h-5 text-white" strokeWidth={2} aria-hidden="true" />
      </div>
      <div>
        <h1 className="font-semibold text-foreground">{t('appName')}</h1>
        {showTagline && (
          <p className="text-xs text-muted-foreground">
            Track construction projects
          </p>
        )}
      </div>
    </Link>
  );
}
