'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth, ProtectedRoute } from '@/components/Auth';
import { ContentPageTemplate } from '@/components/layout';
import { Badge, Button, Alert } from '@/components/ui';
import {
  type ApprovalStatus,
  getStatusLabel,
  getStatusColor,
  getAvailableActions,
  getActionLabel,
  type WorkflowAction,
} from '@/lib/workflow/private-construction-workflow';

interface Construction {
  id: string;
  title: string;
  slug: string;
  constructionStatus: string;
  approvalStatus: ApprovalStatus;
  privateType?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  district?: {
    name: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  review?: {
    submittedAt?: string;
    reviewedAt?: string;
    reviewNotes?: string;
  };
}

interface PaginatedResponse {
  docs: Construction[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const statusColorMap: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const constructionStatusLabels: Record<string, string> = {
  planned: 'Planned',
  'in-progress': 'In Progress',
  completed: 'Completed',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

const privateTypeLabels: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  office: 'Office',
  mixed_use: 'Mixed-Use',
  industrial: 'Industrial',
  hospitality: 'Hospitality',
  retail: 'Retail',
  healthcare: 'Healthcare',
  educational: 'Educational',
  other: 'Other',
};

function SponsorProjectsContent() {
  const t = useTranslations('sponsor');
  const router = useRouter();
  const { user, isSponsor, isSponsorAdmin } = useAuth();
  const [constructions, setConstructions] = useState<Construction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalDocs: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchConstructions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sort: '-updatedAt',
      });

      if (statusFilter) {
        params.set('approvalStatus', statusFilter);
      }

      const response = await fetch(`/api/sponsor/constructions?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have access to this page. Only sponsor users can access their projects.');
          return;
        }
        throw new Error('Failed to fetch constructions');
      }

      const data: PaginatedResponse = await response.json();
      setConstructions(data.docs || []);
      setPagination({
        totalDocs: data.totalDocs,
        totalPages: data.totalPages,
        hasNextPage: data.hasNextPage,
        hasPrevPage: data.hasPrevPage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (isSponsor) {
      fetchConstructions();
    }
  }, [fetchConstructions, isSponsor]);

  // Check if user is a sponsor
  if (!isSponsor) {
    return (
      <ContentPageTemplate pageTitle={t('projects.title')} showFullFooter={false}>
        <Alert variant="error" title="Access Denied">
          <p>This page is only accessible to sponsor users.</p>
          <div className="mt-4">
            <Button as="link" href="/" variant="primary">
              Return to Home
            </Button>
          </div>
        </Alert>
      </ContentPageTemplate>
    );
  }

  const handleWorkflowAction = async (constructionId: string, action: WorkflowAction) => {
    try {
      const response = await fetch(`/api/constructions/${constructionId}/workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to execute action');
      }

      // Refresh the list
      fetchConstructions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const actions = (
    <div className="flex items-center gap-3">
      <Badge variant="info" size="lg">
        {pagination.totalDocs} projects
      </Badge>
      <Button as="link" href="/sponsor/projects/new" variant="primary">
        New Project
      </Button>
    </div>
  );

  return (
    <ContentPageTemplate
      pageTitle={t('projects.title')}
      pageDescription={t('projects.description')}
      showFullFooter={false}
      actions={actions}
    >
      {/* Filters */}
      <div className="border-b border-border bg-card/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Approval Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="internal_review">Internal Review</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchConstructions}
            disabled={isLoading}
            className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="error" title="Error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded w-20" />
                    <div className="h-6 bg-muted rounded w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && constructions.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <svg
            className="w-16 h-16 mx-auto text-muted-foreground mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by creating your first construction project.
          </p>
          <Button as="link" href="/sponsor/projects/new" variant="primary">
            Create Project
          </Button>
        </div>
      )}

      {/* Projects list */}
      {!isLoading && !error && constructions.length > 0 && (
        <div className="space-y-4">
          {constructions.map((construction) => {
            const approvalColor = getStatusColor(construction.approvalStatus);
            const availableActions = getAvailableActions(
              construction.approvalStatus,
              user?.role || 'contributor'
            );

            return (
              <div
                key={construction.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/sponsor/projects/${construction.id}`}
                        className="font-medium text-foreground hover:text-blue-600 truncate"
                      >
                        {construction.title}
                      </Link>
                      {construction.privateType && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {privateTypeLabels[construction.privateType] || construction.privateType}
                        </span>
                      )}
                    </div>
                    {construction.district && (
                      <p className="text-sm text-muted-foreground">
                        {construction.district.name}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span>
                        Updated:{' '}
                        {new Date(construction.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${construction.progress}%` }}
                          />
                        </div>
                        <span className="text-xs">{construction.progress}%</span>
                      </span>
                    </div>
                    {/* Review notes if any */}
                    {construction.review?.reviewNotes && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Reviewer note:</strong> {construction.review.reviewNotes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {/* Approval status badge */}
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        statusColorMap[approvalColor] || statusColorMap.gray
                      }`}
                    >
                      {getStatusLabel(construction.approvalStatus)}
                    </span>
                    {/* Construction status badge */}
                    <span className="text-xs text-muted-foreground">
                      {constructionStatusLabels[construction.constructionStatus] ||
                        construction.constructionStatus}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Button
                      as="link"
                      href={`/sponsor/projects/${construction.id}`}
                      variant="secondary"
                      size="sm"
                    >
                      View / Edit
                    </Button>
                    {construction.approvalStatus === 'published' && (
                      <Button
                        as="link"
                        href={`/details/${construction.slug}`}
                        variant="ghost"
                        size="sm"
                      >
                        View Public Page
                      </Button>
                    )}
                  </div>
                  {/* Workflow actions */}
                  {availableActions.length > 0 && (
                    <div className="flex items-center gap-2">
                      {availableActions.slice(0, 2).map((action) => (
                        <button
                          key={action}
                          onClick={() => handleWorkflowAction(construction.id, action)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                        >
                          {getActionLabel(action)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrevPage}
            className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-1.5 text-sm text-muted-foreground">
            Page {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNextPage}
            className="px-3 py-1.5 border border-border rounded-lg bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </ContentPageTemplate>
  );
}

export default function SponsorProjectsPage() {
  return (
    <ProtectedRoute>
      <SponsorProjectsContent />
    </ProtectedRoute>
  );
}
