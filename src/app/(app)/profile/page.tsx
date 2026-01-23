'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { useAuth, ProtectedRoute } from '@/components/Auth';
import { ContentPageTemplate } from '@/components/layout';

function ProfileContent() {
  const t = useTranslations('profile');
  const tAuth = useTranslations('auth');
  const { user, updateProfile, isEmailVerified } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    const result = await updateProfile({ name, bio });

    if (result.success) {
      setMessage({ type: 'success', text: t('updateSuccess') });
      setIsEditing(false);
    } else {
      setMessage({ type: 'error', text: result.error || t('updateError') });
    }

    setIsSaving(false);
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setBio(user?.bio || '');
    setIsEditing(false);
    setMessage(null);
  };

  return (
    <ContentPageTemplate pageTitle={t('title')} maxWidth="4xl" showFullFooter={false}>
      {/* Verification warning */}
      {!isEmailVerified && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                Email not verified
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Please verify your email to access all features. Check your inbox for the
                verification link.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        {/* Avatar and basic info */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User avatar'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-xl font-medium">
                {user?.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || '?'}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{user?.name}</h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  user?.role === 'admin'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : user?.role === 'moderator'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <p className="text-muted-foreground">{user?.email}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('reputation')}: {user?.reputation || 0} points
            </p>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              {tAuth('name')}
            </label>
            {isEditing ? (
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
              />
            ) : (
              <p className="text-foreground">{user?.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-1">
              {t('bio')}
            </label>
            {isEditing ? (
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground resize-none"
                placeholder={t('bioPlaceholder')}
              />
            ) : (
              <p className="text-foreground">{user?.bio || 'No bio yet'}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
            >
              {t('editProfile')}
            </button>
          )}
        </div>
      </div>

      {/* Account info */}
      <div className="mt-6 bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">Account Information</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{tAuth('email')}</dt>
            <dd className="text-foreground">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email Status</dt>
            <dd>
              {isEmailVerified ? (
                <span className="text-green-600 dark:text-green-400">Verified</span>
              ) : (
                <span className="text-yellow-600 dark:text-yellow-400">Not verified</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-foreground capitalize">{user?.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('joined')}</dt>
            <dd className="text-foreground">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Unknown'}
            </dd>
          </div>
        </dl>
      </div>
    </ContentPageTemplate>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
