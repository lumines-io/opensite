'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthContext';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const t = useTranslations('auth');
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return t('passwordTooShort');
    if (!/[A-Z]/.test(pwd)) return t('passwordNeedsUppercase');
    if (!/[a-z]/.test(pwd)) return t('passwordNeedsLowercase');
    if (!/[0-9]/.test(pwd)) return t('passwordNeedsNumber');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Validate name
    if (name.trim().length < 2) {
      setError(t('nameTooShort'));
      return;
    }

    setIsLoading(true);

    const result = await register(email, password, name);

    if (result.success) {
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } else {
      setError(result.error || t('registerFailed'));
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-heading-xl text-foreground mb-2">{t('checkEmail')}</h2>
        <p className="text-body-md text-muted-foreground mb-4">
          {t.rich('verificationEmailSent', {
            email,
            strong: (chunks) => <strong>{chunks}</strong>
          })}
        </p>
        <Link
          href="/login"
          className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          {t('goToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-label-md text-foreground mb-1">
            {t('name')}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
            placeholder={t('namePlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-label-md text-foreground mb-1">
            {t('email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
            placeholder={t('emailPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-label-md text-foreground mb-1">
            {t('password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
            placeholder={t('passwordPlaceholder')}
          />
          <p className="mt-1 text-caption text-muted-foreground">
            {t('passwordRequirements')}
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-label-md text-foreground mb-1">
            {t('confirmPassword')}
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
            placeholder={t('confirmPasswordPlaceholder')}
          />
        </div>

        {error && (
          <div className="p-3 bg-error-light border border-error/30 rounded-lg">
            <p className="text-body-sm text-error">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isLoading ? t('creatingAccount') : t('createAccount')}
        </button>

        <p className="text-center text-body-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-info hover:underline font-medium">
            {t('signIn')}
          </Link>
        </p>
      </form>
    </div>
  );
}
