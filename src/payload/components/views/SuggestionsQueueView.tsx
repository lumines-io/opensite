'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { usePayloadAPI } from '@payloadcms/ui';

interface Suggestion {
  id: string;
  suggestionType: string;
  status: string;
  description: string;
  construction?: {
    title: string;
  };
  submitterName?: string;
  submitterEmail?: string;
  createdAt: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusClass = status.replace('_', '-');
  return (
    <span className={`status-badge status-badge--${statusClass}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export const SuggestionsQueueView: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Build query params for Payload API
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '10');
    params.set('sort', '-createdAt');
    params.set('depth', '2');

    if (statusFilter) {
      params.set('where[status][equals]', statusFilter);
    }
    if (typeFilter) {
      params.set('where[suggestionType][equals]', typeFilter);
    }

    return params.toString();
  }, [page, statusFilter, typeFilter]);

  // Use Payload's built-in API hook to fetch suggestions
  const [{ data, isLoading, isError }, { setParams }] = usePayloadAPI(
    `/api/suggestions?${buildQueryString()}`
  );

  // Update params when filters change
  useEffect(() => {
    setParams({});
  }, [page, statusFilter, typeFilter, setParams]);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        // Trigger refetch by updating params
        setParams({});
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setActionLoading(null);
    }
  }, [setParams]);

  // Type-cast the docs array
  const suggestions = (data?.docs ?? []) as Suggestion[];

  if (isLoading && !data) {
    return (
      <div className="custom-view">
        <div className="custom-view__header">
          <h1>Suggestions Queue</h1>
          <p>Loading suggestions...</p>
        </div>
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="custom-view">
        <div className="empty-state">
          <div className="empty-state__title">Failed to load suggestions</div>
          <div className="empty-state__description">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-view">
      <div className="custom-view__header">
        <h1>Suggestions Queue</h1>
        <p>Review and moderate user-submitted suggestions</p>
      </div>

      {data && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--teal">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="stat-card__value">{data.totalDocs}</div>
            <div className="stat-card__label">Total Suggestions</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--amber">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-card__value">{suggestions.length}</div>
            <div className="stat-card__label">On This Page</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--purple">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="stat-card__value">{data.page} / {data.totalPages}</div>
            <div className="stat-card__label">Current Page</div>
          </div>
        </div>
      )}

      <div className="filter-bar">
        <select
          className="filter-bar__select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="merged">Merged</option>
        </select>
        <select
          className="filter-bar__select"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          <option value="new_construction">New Construction</option>
          <option value="update">Update</option>
          <option value="completion">Completion</option>
          <option value="correction">Correction</option>
        </select>
      </div>

      {suggestions.length > 0 ? (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Construction</th>
                  <th>Description</th>
                  <th>Submitted By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((suggestion) => (
                  <tr key={suggestion.id}>
                    <td style={{ textTransform: 'capitalize' }}>
                      {suggestion.suggestionType?.replace('_', ' ') ?? 'N/A'}
                    </td>
                    <td>{suggestion.construction?.title || 'N/A'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {suggestion.description}
                    </td>
                    <td>
                      <div>{suggestion.submitterName || 'Anonymous'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-300)' }}>
                        {suggestion.submitterEmail}
                      </div>
                    </td>
                    <td>{new Date(suggestion.createdAt).toLocaleDateString()}</td>
                    <td><StatusBadge status={suggestion.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {suggestion.status === 'pending' && (
                          <button
                            className="action-button action-button--primary"
                            onClick={() => handleStatusChange(suggestion.id, 'under_review')}
                            disabled={actionLoading === suggestion.id}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Review
                          </button>
                        )}
                        {suggestion.status === 'under_review' && (
                          <>
                            <button
                              className="action-button action-button--success"
                              onClick={() => handleStatusChange(suggestion.id, 'approved')}
                              disabled={actionLoading === suggestion.id}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Approve
                            </button>
                            <button
                              className="action-button action-button--danger"
                              onClick={() => handleStatusChange(suggestion.id, 'rejected')}
                              disabled={actionLoading === suggestion.id}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {suggestion.status === 'approved' && (
                          <button
                            className="action-button action-button--primary"
                            onClick={() => handleStatusChange(suggestion.id, 'merged')}
                            disabled={actionLoading === suggestion.id}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Merge
                          </button>
                        )}
                        <a
                          href={`/admin/collections/suggestions/${suggestion.id}`}
                          className="action-button action-button--secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                        >
                          View
                        </a>
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
                onClick={() => setPage(p => p - 1)}
                disabled={!data.hasPrevPage}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                Page {data.page} of {data.totalPages}
              </span>
              <button
                className="action-button action-button--secondary"
                onClick={() => setPage(p => p + 1)}
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
            <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="empty-state__title">No suggestions found</div>
          <div className="empty-state__description">
            {statusFilter || typeFilter ? 'Try adjusting your filters' : 'No suggestions have been submitted yet'}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionsQueueView;
