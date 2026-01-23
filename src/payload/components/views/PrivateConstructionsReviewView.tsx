'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { usePayloadAPI } from '@payloadcms/ui';
import { Building2, Clock, FileText } from 'lucide-react';

interface Construction {
  id: string;
  title: string;
  slug: string;
  privateType?: string;
  approvalStatus: string;
  progress: number;
  organization?: {
    id: string;
    name: string;
  };
  review?: {
    submittedAt?: string;
    submittedBy?: {
      name?: string;
      email?: string;
    };
    reviewedAt?: string;
    reviewedBy?: {
      name?: string;
      email?: string;
    };
    reviewNotes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusColors: Record<string, string> = {
    draft: '#6b7280', // gray
    internal_review: '#3b82f6', // blue
    submitted: '#eab308', // yellow
    under_review: '#f97316', // orange
    changes_requested: '#f97316', // orange
    approved: '#22c55e', // green
    rejected: '#ef4444', // red
    published: '#10b981', // emerald
  };

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    internal_review: 'Internal Review',
    submitted: 'Submitted',
    under_review: 'Under Review',
    changes_requested: 'Changes Requested',
    approved: 'Approved',
    rejected: 'Rejected',
    published: 'Published',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: `${statusColors[status]}20`,
        color: statusColors[status],
      }}
    >
      {statusLabels[status] || status}
    </span>
  );
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

export const PrivateConstructionsReviewView: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('submitted,under_review');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Build query params for Payload API
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '10');
    params.set('sort', '-updatedAt');
    params.set('depth', '2');
    params.set('where[constructionCategory][equals]', 'private');

    if (statusFilter) {
      if (statusFilter.includes(',')) {
        // Multiple statuses
        const statuses = statusFilter.split(',');
        statuses.forEach((s, i) => {
          params.set(`where[or][${i}][approvalStatus][equals]`, s);
        });
      } else {
        params.set('where[approvalStatus][equals]', statusFilter);
      }
    }

    return params.toString();
  }, [page, statusFilter]);

  // Use Payload's built-in API hook
  const [{ data, isLoading, isError }, { setParams }] = usePayloadAPI(
    `/api/constructions?${buildQueryString()}`
  );

  // Update params when filters change
  useEffect(() => {
    setParams({});
  }, [page, statusFilter, setParams]);

  const handleWorkflowAction = useCallback(
    async (id: string, action: string) => {
      setActionLoading(id);
      try {
        const response = await fetch(`/api/constructions/${id}/workflow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action, notes: reviewNotes }),
        });
        if (response.ok) {
          setReviewNotes('');
          setSelectedId(null);
          // Trigger refetch
          setParams({});
        } else {
          const error = await response.json();
          alert(error.error || 'Action failed');
        }
      } catch (error) {
        console.error('Failed to execute action:', error);
      } finally {
        setActionLoading(null);
      }
    },
    [reviewNotes, setParams]
  );

  const constructions = (data?.docs ?? []) as Construction[];

  if (isLoading && !data) {
    return (
      <div className="custom-view">
        <div className="custom-view__header">
          <h1>Private Constructions Review</h1>
          <p>Loading constructions...</p>
        </div>
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="custom-view">
        <div className="empty-state">
          <div className="empty-state__title">Failed to load constructions</div>
          <div className="empty-state__description">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-view">
      <div className="custom-view__header">
        <h1>Private Constructions Review</h1>
        <p>Review and approve private construction submissions from sponsors</p>
      </div>

      {data && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--teal">
              <Building2 size={20} />
            </div>
            <div className="stat-card__value">{data.totalDocs}</div>
            <div className="stat-card__label">Total Submissions</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--amber">
              <Clock size={20} />
            </div>
            <div className="stat-card__value">{constructions.length}</div>
            <div className="stat-card__label">On This Page</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--purple">
              <FileText size={20} />
            </div>
            <div className="stat-card__value">
              {data.page} / {data.totalPages}
            </div>
            <div className="stat-card__label">Current Page</div>
          </div>
        </div>
      )}

      <div className="filter-bar">
        <select
          className="filter-bar__select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="submitted,under_review">Needs Review</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="changes_requested">Changes Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="published">Published</option>
        </select>
      </div>

      {constructions.length > 0 ? (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Organization</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {constructions.map((construction) => (
                  <tr key={construction.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{construction.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-300)' }}>
                        {construction.progress}% complete
                      </div>
                    </td>
                    <td>
                      {privateTypeLabels[construction.privateType || ''] || construction.privateType || 'N/A'}
                    </td>
                    <td>{construction.organization?.name || 'N/A'}</td>
                    <td>
                      {construction.review?.submittedAt
                        ? new Date(construction.review.submittedAt).toLocaleDateString()
                        : 'Not submitted'}
                    </td>
                    <td>
                      <StatusBadge status={construction.approvalStatus} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {construction.approvalStatus === 'submitted' && (
                            <button
                              className="action-button action-button--primary"
                              onClick={() => handleWorkflowAction(construction.id, 'start_review')}
                              disabled={actionLoading === construction.id}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Start Review
                            </button>
                          )}
                          {construction.approvalStatus === 'under_review' && (
                            <>
                              <button
                                className="action-button action-button--success"
                                onClick={() => handleWorkflowAction(construction.id, 'approve')}
                                disabled={actionLoading === construction.id}
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                Approve
                              </button>
                              <button
                                className="action-button action-button--warning"
                                onClick={() => {
                                  setSelectedId(construction.id);
                                }}
                                disabled={actionLoading === construction.id}
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                Request Changes
                              </button>
                              <button
                                className="action-button action-button--danger"
                                onClick={() => handleWorkflowAction(construction.id, 'reject')}
                                disabled={actionLoading === construction.id}
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {construction.approvalStatus === 'approved' && (
                            <button
                              className="action-button action-button--success"
                              onClick={() => handleWorkflowAction(construction.id, 'publish')}
                              disabled={actionLoading === construction.id}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Publish
                            </button>
                          )}
                          {construction.approvalStatus === 'published' && (
                            <button
                              className="action-button action-button--danger"
                              onClick={() => handleWorkflowAction(construction.id, 'unpublish')}
                              disabled={actionLoading === construction.id}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Unpublish
                            </button>
                          )}
                          <a
                            href={`/admin/collections/constructions/${construction.id}`}
                            className="action-button action-button--secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                          >
                            View
                          </a>
                        </div>
                        {/* Review notes input for request changes */}
                        {selectedId === construction.id && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <textarea
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder="Enter feedback for the sponsor..."
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid var(--theme-elevation-200)',
                                fontSize: '0.875rem',
                                minHeight: '60px',
                              }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                className="action-button action-button--warning"
                                onClick={() => handleWorkflowAction(construction.id, 'request_changes')}
                                disabled={actionLoading === construction.id}
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                Submit Request
                              </button>
                              <button
                                className="action-button action-button--secondary"
                                onClick={() => {
                                  setSelectedId(null);
                                  setReviewNotes('');
                                }}
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button
                className="action-button action-button--secondary"
                onClick={() => setPage((p) => p - 1)}
                disabled={!data.hasPrevPage}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                Page {data.page} of {data.totalPages}
              </span>
              <button
                className="action-button action-button--secondary"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.hasNextPage}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state__icon">
            <Building2 size={64} />
          </div>
          <div className="empty-state__title">No constructions to review</div>
          <div className="empty-state__description">
            {statusFilter
              ? 'Try adjusting your filters'
              : 'No private constructions have been submitted for review yet'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateConstructionsReviewView;
