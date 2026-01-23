'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, Lightbulb } from 'lucide-react';
import { useAuth, ProtectedRoute } from '@/components/Auth';
import { ContentPageTemplate } from '@/components/layout';

interface Suggestion {
  id: string;
  title: string;
  suggestionType: string;
  status: string;
  sourceType: string;
  createdAt: string;
  construction?: {
    title: string;
    slug: string;
  };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  under_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  changes_requested: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  merged: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  superseded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  merged: 'Merged',
  superseded: 'Superseded',
};

const typeLabels: Record<string, string> = {
  create: 'New Project',
  update: 'Update',
  complete: 'Mark Completed',
  correction: 'Correction',
};

function SuggestionsContent() {
  const t = useTranslations('suggestion');
  const { isEmailVerified } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch('/api/suggestions?limit=50&sort=-createdAt', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();
        setSuggestions(data.docs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  const actions = isEmailVerified ? (
    <Link
      href="/suggest"
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
    >
      New Suggestion
    </Link>
  ) : undefined;

  return (
    <ContentPageTemplate
      pageTitle={t('mySuggestions')}
      maxWidth="4xl"
      showFullFooter={false}
      actions={actions}
    >
      {/* Verification warning */}
      {!isEmailVerified && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                Email verification required
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Please verify your email to submit new suggestions. You can still view your existing
                suggestions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
          <p className="mt-4 text-muted-foreground">Loading suggestions...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && suggestions.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('noSuggestions')}</h3>
          <p className="text-muted-foreground mb-4">
            Help improve the construction tracker by submitting suggestions.
          </p>
          {isEmailVerified && (
            <Link
              href="/suggest"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {t('createFirst')}
            </Link>
          )}
        </div>
      )}

      {/* Suggestions list */}
      {!isLoading && !error && suggestions.length > 0 && (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{suggestion.title}</h3>
                  {suggestion.construction && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Related to:{' '}
                      <Link
                        href={`/details/${suggestion.construction.slug}`}
                        className="text-blue-600 hover:underline"
                      >
                        {suggestion.construction.title}
                      </Link>
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(suggestion.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      statusColors[suggestion.status] || statusColors.pending
                    }`}
                  >
                    {statusLabels[suggestion.status] || suggestion.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {typeLabels[suggestion.suggestionType] || suggestion.suggestionType}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ContentPageTemplate>
  );
}

export default function SuggestionsPage() {
  return (
    <ProtectedRoute>
      <SuggestionsContent />
    </ProtectedRoute>
  );
}
