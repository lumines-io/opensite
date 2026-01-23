'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { usePayloadAPI } from '@payloadcms/ui';
import { Clock, Check, PauseCircle, AlertTriangle } from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  enabled: boolean;
  schedule: string;
  endpoint: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'running';
  config?: Record<string, unknown>;
}

const StatusBadge: React.FC<{ status?: string; enabled: boolean }> = ({ status, enabled }) => {
  if (!enabled) {
    return (
      <span className="status-badge status-badge--inactive">
        Disabled
      </span>
    );
  }
  const statusClass = status === 'success' ? 'active' : status === 'failed' ? 'error' : status === 'running' ? 'pending' : 'inactive';
  return (
    <span className={`status-badge status-badge--${statusClass}`}>
      {status || 'Never Run'}
    </span>
  );
};

export const ScraperManagementView: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());

  // Build query params for Payload API
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', '50');
    params.set('sort', 'name');

    if (statusFilter === 'enabled') {
      params.set('where[enabled][equals]', 'true');
    } else if (statusFilter === 'disabled') {
      params.set('where[enabled][equals]', 'false');
    }

    return params.toString();
  }, [statusFilter]);

  // Use Payload's built-in API hook to fetch cron jobs
  const [{ data, isLoading, isError }, { setParams }] = usePayloadAPI(
    `/api/cron-jobs?${buildQueryString()}`
  );

  // Update params when filters change
  useEffect(() => {
    setParams({});
  }, [statusFilter, setParams]);

  const handleToggleStatus = useCallback(async (id: string, currentEnabled: boolean) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/cron-jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (response.ok) {
        setParams({});
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    } finally {
      setActionLoading(null);
    }
  }, [setParams]);

  const handleTriggerRun = useCallback(async (job: CronJob) => {
    setRunningJobs(prev => new Set(prev).add(job.id));
    try {
      const response = await fetch(job.endpoint, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        // Refresh after a short delay to show updated lastRunAt
        setTimeout(() => setParams({}), 2000);
      }
    } catch (error) {
      console.error('Failed to trigger cron job:', error);
    } finally {
      setTimeout(() => {
        setRunningJobs(prev => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      }, 5000);
    }
  }, [setParams]);

  // Calculate stats from data
  const cronJobs = (data?.docs ?? []) as CronJob[];
  const stats = {
    total: data?.totalDocs ?? 0,
    enabled: cronJobs.filter(j => j.enabled).length,
    disabled: cronJobs.filter(j => !j.enabled).length,
    failed: cronJobs.filter(j => j.lastRunStatus === 'failed').length,
  };

  if (isLoading && !data) {
    return (
      <div className="custom-view">
        <div className="custom-view__header">
          <h1>Cron Job Management</h1>
          <p>Loading cron jobs...</p>
        </div>
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="custom-view">
        <div className="empty-state">
          <div className="empty-state__title">Failed to load cron jobs</div>
          <div className="empty-state__description">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-view">
      <div className="custom-view__header">
        <h1>Cron Job Management</h1>
        <p>Monitor and control scheduled cron jobs</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <Clock size={20} />
          </div>
          <div className="stat-card__value">{stats.total}</div>
          <div className="stat-card__label">Total Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <Check size={20} />
          </div>
          <div className="stat-card__value">{stats.enabled}</div>
          <div className="stat-card__label">Enabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <PauseCircle size={20} />
          </div>
          <div className="stat-card__value">{stats.disabled}</div>
          <div className="stat-card__label">Disabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-card__value">{stats.failed}</div>
          <div className="stat-card__label">Last Run Failed</div>
        </div>
      </div>

      <div className="filter-bar">
        <select
          className="filter-bar__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Jobs</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {cronJobs.length > 0 ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {cronJobs.map((job) => (
            <div key={job.id} className="custom-view__card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ margin: 0 }}>{job.displayName}</h3>
                    <StatusBadge status={job.lastRunStatus} enabled={job.enabled} />
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--theme-elevation-300)', marginBottom: 4 }}>
                    {job.description || 'No description'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-250)' }}>
                    <code style={{ background: 'var(--theme-elevation-100)', padding: '2px 6px', borderRadius: 4 }}>
                      {job.endpoint}
                    </code>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`action-button ${job.enabled ? 'action-button--secondary' : 'action-button--success'}`}
                    onClick={() => handleToggleStatus(job.id, job.enabled)}
                    disabled={actionLoading === job.id}
                  >
                    {job.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className="action-button action-button--primary"
                    onClick={() => handleTriggerRun(job)}
                    disabled={runningJobs.has(job.id) || !job.enabled}
                  >
                    {runningJobs.has(job.id) ? 'Running...' : 'Run Now'}
                  </button>
                  <a
                    href={`/admin/collections/cron-jobs/${job.id}`}
                    className="action-button action-button--secondary"
                    style={{ textDecoration: 'none' }}
                  >
                    Edit
                  </a>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-300)', marginBottom: 4 }}>Schedule</div>
                  <div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{job.schedule}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-300)', marginBottom: 4 }}>Last Run</div>
                  <div style={{ fontWeight: 500 }}>
                    {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-300)', marginBottom: 4 }}>Job ID</div>
                  <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>{job.name}</div>
                </div>
              </div>

              {job.lastRunStatus === 'failed' && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 8,
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>
                    Last run failed
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#fca5a5' }}>
                    Check the cron job logs for more details
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state__icon">
            <Clock size={64} />
          </div>
          <div className="empty-state__title">No cron jobs found</div>
          <div className="empty-state__description">
            {statusFilter ? 'Try adjusting your filters' : 'No cron jobs have been configured yet'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScraperManagementView;
