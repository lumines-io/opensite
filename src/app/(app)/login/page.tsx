import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/components/Auth';
import { AuthPageTemplate } from '@/components/layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: t('signIn'),
    description: 'Sign in to your OpenSite account',
  };
}

export default async function LoginPage() {
  const t = await getTranslations('auth');

  return (
    <AuthPageTemplate title={t('welcomeBack')} description={t('signInToContinue')}>
      <LoginForm />
    </AuthPageTemplate>
  );
}
