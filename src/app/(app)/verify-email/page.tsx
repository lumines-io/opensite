'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { AuthPageTemplate } from '@/components/layout';

function VerifyEmailContent() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'No verification token provided');

  useEffect(() => {
    if (!token) {
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || t('emailVerified'));
        } else {
          setStatus('error');
          setMessage(data.error || t('emailVerificationFailed'));
        }
      } catch {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    verifyEmail();
  }, [token, t]);

  return (
    <AuthPageTemplate>
      <div className="text-center py-4">
        {status === 'loading' && (
          <>
            <div className="mb-4">
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('verifying')}</h2>
            <p className="text-muted-foreground">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('emailVerified')}</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Link
              href="/login"
              className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {t('signIn')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4">
              <AlertTriangle className="w-16 h-16 mx-auto text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t('emailVerificationFailed')}
            </h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="space-x-4">
              <Link
                href="/login"
                className="inline-block py-2 px-4 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
              >
                {t('signIn')}
              </Link>
              <Link
                href="/register"
                className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                {t('signUp')}
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthPageTemplate>
  );
}

function LoadingState() {
  return (
    <AuthPageTemplate>
      <div className="text-center py-4">
        <div className="mb-4">
          <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Loading...</h2>
      </div>
    </AuthPageTemplate>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
