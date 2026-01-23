'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  constructionCategory: string;
  constructionStatus: string;
  approvalStatus: ApprovalStatus;
  privateType?: string;
  progress: number;
  description?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  announcedDate?: string;
  geometry?: Record<string, unknown>;
  centroid?: [number, number];
  organization?: {
    id: string;
    name: string;
  };
  details?: {
    contractor?: string;
    budget?: number;
    fundingSource?: string;
  };
  marketing?: {
    headline?: string;
    keyFeatures?: Array<{ feature: string; icon?: string }>;
    priceRange?: {
      min?: number;
      max?: number;
      pricePerSqm?: number;
      displayText?: string;
    };
    videoUrl?: string;
    virtualTourUrl?: string;
  };
  cta?: {
    primaryButton?: {
      text?: string;
      url?: string;
      action?: string;
    };
    contactPhone?: string;
    contactEmail?: string;
    salesOffice?: string;
  };
  displayOptions?: {
    featured?: boolean;
    priority?: number;
    showSponsoredBadge?: boolean;
    useCustomMarker?: boolean;
  };
  review?: {
    submittedAt?: string;
    submittedBy?: { name: string; email: string };
    reviewedAt?: string;
    reviewedBy?: { name: string; email: string };
    reviewNotes?: string;
  };
  analytics?: {
    impressions?: number;
    clicks?: number;
    ctaClicks?: number;
    inquiries?: number;
  };
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

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('sponsor');
  const { user, isSponsor, isSponsorAdmin } = useAuth();
  const [construction, setConstruction] = useState<Construction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchConstruction = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sponsor/constructions/${params.id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Project not found.');
          return;
        }
        if (response.status === 403) {
          setError('You do not have access to this project.');
          return;
        }
        throw new Error('Failed to fetch project');
      }

      const data = await response.json();
      setConstruction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (isSponsor && params.id) {
      fetchConstruction();
    }
  }, [fetchConstruction, isSponsor, params.id]);

  // Check if user is a sponsor
  if (!isSponsor) {
    return (
      <ContentPageTemplate pageTitle="Project Details" showFullFooter={false}>
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

  const handleWorkflowAction = async (action: WorkflowAction, notes?: string) => {
    if (!construction) return;
    setActionLoading(action);

    try {
      const response = await fetch(`/api/constructions/${construction.id}/workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action, notes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to execute action');
      }

      // Refresh the construction data
      fetchConstruction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <ContentPageTemplate pageTitle="Loading..." showFullFooter={false}>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-muted rounded" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </div>
      </ContentPageTemplate>
    );
  }

  if (error || !construction) {
    return (
      <ContentPageTemplate pageTitle="Error" showFullFooter={false}>
        <Alert variant="error" title="Error">
          <p>{error || 'Project not found'}</p>
          <div className="mt-4">
            <Button as="link" href="/sponsor/projects" variant="primary">
              Back to Projects
            </Button>
          </div>
        </Alert>
      </ContentPageTemplate>
    );
  }

  const approvalColor = getStatusColor(construction.approvalStatus);
  const availableActions = getAvailableActions(
    construction.approvalStatus,
    user?.role || 'contributor'
  );

  const actions = (
    <div className="flex items-center gap-3">
      <span
        className={`text-sm px-3 py-1 rounded-full font-medium ${
          statusColorMap[approvalColor] || statusColorMap.gray
        }`}
      >
        {getStatusLabel(construction.approvalStatus)}
      </span>
      <Button as="link" href={`/admin/collections/constructions/${construction.id}`} variant="secondary" size="sm">
        Edit in Admin
      </Button>
    </div>
  );

  return (
    <ContentPageTemplate
      pageTitle={construction.title}
      showFullFooter={false}
      actions={actions}
    >
      {/* Review notes banner */}
      {construction.review?.reviewNotes && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                Reviewer Feedback
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {construction.review.reviewNotes}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Project Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">
                  {privateTypeLabels[construction.privateType || ''] || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Construction Status</p>
                <p className="font-medium">
                  {constructionStatusLabels[construction.constructionStatus]}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${construction.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{construction.progress}%</span>
                </div>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Timeline</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Announced</p>
                <p className="font-medium">
                  {construction.announcedDate
                    ? new Date(construction.announcedDate).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {construction.startDate
                    ? new Date(construction.startDate).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected End</p>
                <p className="font-medium">
                  {construction.expectedEndDate
                    ? new Date(construction.expectedEndDate).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual End</p>
                <p className="font-medium">
                  {construction.actualEndDate
                    ? new Date(construction.actualEndDate).toLocaleDateString()
                    : '-'}
                </p>
              </div>
            </div>
          </section>

          {/* Marketing Info */}
          {construction.marketing && (
            <section className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Marketing Information</h2>
              {construction.marketing.headline && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Headline</p>
                  <p className="font-medium text-lg">{construction.marketing.headline}</p>
                </div>
              )}
              {construction.marketing.keyFeatures && construction.marketing.keyFeatures.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Key Features</p>
                  <ul className="list-disc list-inside space-y-1">
                    {construction.marketing.keyFeatures.map((f, i) => (
                      <li key={i} className="text-foreground">
                        {f.feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {construction.marketing.priceRange && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {construction.marketing.priceRange.min && (
                    <div>
                      <p className="text-sm text-muted-foreground">Min Price</p>
                      <p className="font-medium">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(construction.marketing.priceRange.min)}
                      </p>
                    </div>
                  )}
                  {construction.marketing.priceRange.max && (
                    <div>
                      <p className="text-sm text-muted-foreground">Max Price</p>
                      <p className="font-medium">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(construction.marketing.priceRange.max)}
                      </p>
                    </div>
                  )}
                  {construction.marketing.priceRange.pricePerSqm && (
                    <div>
                      <p className="text-sm text-muted-foreground">Price/m²</p>
                      <p className="font-medium">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(construction.marketing.priceRange.pricePerSqm)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Contact Info */}
          {construction.cta && (
            <section className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {construction.cta.contactPhone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{construction.cta.contactPhone}</p>
                  </div>
                )}
                {construction.cta.contactEmail && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{construction.cta.contactEmail}</p>
                  </div>
                )}
                {construction.cta.salesOffice && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Sales Office</p>
                    <p className="font-medium">{construction.cta.salesOffice}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow Actions */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Actions</h2>
            <div className="space-y-3">
              {availableActions.length > 0 ? (
                availableActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleWorkflowAction(action)}
                    disabled={actionLoading !== null}
                    className="w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 disabled:opacity-50"
                  >
                    {actionLoading === action ? 'Processing...' : getActionLabel(action)}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No actions available for the current status.
                </p>
              )}
              <hr className="border-border my-3" />
              <Button
                as="link"
                href="/sponsor/projects"
                variant="ghost"
                className="w-full"
              >
                Back to Projects
              </Button>
            </div>
          </section>

          {/* Analytics (if published) */}
          {construction.approvalStatus === 'published' && construction.analytics && (
            <section className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Analytics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {construction.analytics.impressions || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Impressions</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {construction.analytics.clicks || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {construction.analytics.ctaClicks || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">CTA Clicks</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {construction.analytics.inquiries || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Inquiries</p>
                </div>
              </div>
            </section>
          )}

          {/* Review Status */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Review Status</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Current Status</p>
                <p className="font-medium">{getStatusLabel(construction.approvalStatus)}</p>
              </div>
              {construction.review?.submittedAt && (
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {new Date(construction.review.submittedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {construction.review?.reviewedAt && (
                <div>
                  <p className="text-muted-foreground">Last Reviewed</p>
                  <p className="font-medium">
                    {new Date(construction.review.reviewedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Display Options */}
          {construction.displayOptions && (
            <section className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Display Options</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Featured</span>
                  <span className={construction.displayOptions.featured ? 'text-green-600' : 'text-muted-foreground'}>
                    {construction.displayOptions.featured ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Show Sponsored Badge</span>
                  <span className={construction.displayOptions.showSponsoredBadge ? 'text-green-600' : 'text-muted-foreground'}>
                    {construction.displayOptions.showSponsoredBadge ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <span>{construction.displayOptions.priority || 0}</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </ContentPageTemplate>
  );
}

export default function ProjectDetailPage() {
  return (
    <ProtectedRoute>
      <ProjectDetailContent />
    </ProtectedRoute>
  );
}
