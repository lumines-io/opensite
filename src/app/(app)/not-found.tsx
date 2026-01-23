'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ErrorPageTemplate } from '@/components/layout';

export default function NotFound() {
  const router = useRouter();
  const t = useTranslations('errorPage');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  const customActions = (
    <>
      {/* Countdown */}
      <div className="w-full bg-muted rounded-lg p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          {t('redirecting', { seconds: countdown })}
        </p>
        {/* Progress bar */}
        <div className="mt-3 h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {t('goHome')}
        </Link>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
        >
          {t('goBack')}
        </button>
      </div>
    </>
  );

  return (
    <ErrorPageTemplate
      errorCode="404"
      title={t('404.title')}
      description={t('404.description')}
      actions={customActions}
    />
  );
}
