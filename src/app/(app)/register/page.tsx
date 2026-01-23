import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AlertTriangle } from 'lucide-react';
import { RegisterForm } from '@/components/Auth';
import { AuthPageTemplate } from '@/components/layout';
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: t('createAccount'),
    description: 'Create an account to contribute to OpenSite',
  };
}

export default async function RegisterPage() {
  const t = await getTranslations('auth');
  const isRegistrationEnabled = isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);

  return (
    <AuthPageTemplate title={t('createAccount')} description={t('createAccountDesc')}>
      {isRegistrationEnabled ? (
        <RegisterForm />
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Registration Currently Unavailable
          </h2>
          <p className="text-muted-foreground mb-6">
            New account registration is temporarily disabled. Please check back later or contact
            support.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      )}
    </AuthPageTemplate>
  );
}
