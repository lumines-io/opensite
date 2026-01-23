'use client';

import React from 'react';
import Link from 'next/link';
import { usePayloadAPI } from '@payloadcms/ui';
import { ClipboardList, Clock, Building2, Users, BarChart } from 'lucide-react';

interface Suggestion {
  id: string;
  status: string;
  title?: string;
  createdAt: string;
}

interface Construction {
  id: string;
  constructionStatus: string;
}

interface User {
  id: string;
  role: string;
}

interface CronJob {
  id: string;
  enabled: boolean;
  lastRunStatus?: string;
}

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
}> = ({ title, value, icon, colorClass }) => (
  <div className="stat-card">
    <div className={`stat-card__icon stat-card__icon--${colorClass}`}>
      {icon}
    </div>
    <div className="stat-card__value">{value}</div>
    <div className="stat-card__label">{title}</div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusClass = status.replace('_', '-');
  return (
    <span className={`status-badge status-badge--${statusClass}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export const DashboardOverview: React.FC = () => {
  // Fetch all data using Payload's built-in API hook
  const [{ data: suggestionsData, isLoading: loadingSuggestions }] = usePayloadAPI(
    '/api/suggestions?limit=1000&depth=0'
  );

  const [{ data: recentSuggestionsData }] = usePayloadAPI(
    '/api/suggestions?limit=5&sort=-createdAt&depth=0'
  );

  const [{ data: constructionsData, isLoading: loadingConstructions }] = usePayloadAPI(
    '/api/constructions?limit=1000&depth=0'
  );

  const [{ data: usersData, isLoading: loadingUsers }] = usePayloadAPI(
    '/api/users?limit=1000&depth=0'
  );

  const [{ data: cronJobsData, isLoading: loadingCronJobs }] = usePayloadAPI(
    '/api/cron-jobs?limit=100&depth=0'
  );

  const isLoading = loadingSuggestions || loadingConstructions || loadingUsers || loadingCronJobs;

  // Calculate stats from data
  const suggestions = (suggestionsData?.docs ?? []) as Suggestion[];
  const constructions = (constructionsData?.docs ?? []) as Construction[];
  const users = (usersData?.docs ?? []) as User[];
  const cronJobs = (cronJobsData?.docs ?? []) as CronJob[];
  const recentActivity = (recentSuggestionsData?.docs ?? []) as Suggestion[];

  const stats = {
    suggestions: {
      total: suggestions.length,
      pending: suggestions.filter(s => s.status === 'pending').length,
      under_review: suggestions.filter(s => s.status === 'under_review').length,
      approved: suggestions.filter(s => s.status === 'approved').length,
      rejected: suggestions.filter(s => s.status === 'rejected').length,
      merged: suggestions.filter(s => s.status === 'merged').length,
    },
    cronJobs: {
      total: cronJobs.length,
      enabled: cronJobs.filter(j => j.enabled).length,
      failed: cronJobs.filter(j => j.lastRunStatus === 'failed').length,
    },
    constructions: {
      total: constructions.length,
      in_progress: constructions.filter(c => c.constructionStatus === 'in-progress').length,
      completed: constructions.filter(c => c.constructionStatus === 'completed').length,
    },
    users: {
      total: users.length,
      contributors: users.filter(u => u.role === 'contributor').length,
      moderators: users.filter(u => u.role === 'moderator').length,
      admins: users.filter(u => u.role === 'admin').length,
    },
  };

  if (isLoading && !suggestionsData) {
    return (
      <div className="custom-view">
        <div className="custom-view__header">
          <h1>Dashboard Overview</h1>
          <p>Loading dashboard data...</p>
        </div>
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ width: 48, height: 48, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: 80, height: 32, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 120, height: 16 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="custom-view">
      <div className="custom-view__header">
        <h1>Dashboard Overview</h1>
        <p>Monitor system activity and manage content</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          title="Pending Suggestions"
          value={stats.suggestions.pending}
          colorClass="amber"
          icon={<ClipboardList size={24} />}
        />
        <StatCard
          title="Enabled Cron Jobs"
          value={stats.cronJobs.enabled}
          colorClass="green"
          icon={<Clock size={24} />}
        />
        <StatCard
          title="Total Constructions"
          value={stats.constructions.total}
          colorClass="teal"
          icon={<Building2 size={24} />}
        />
        <StatCard
          title="Total Users"
          value={stats.users.total}
          colorClass="purple"
          icon={<Users size={24} />}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div className="custom-view__card">
          <h3>Suggestion Status Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Pending', value: stats.suggestions.pending, colorClass: 'amber' },
              { label: 'Under Review', value: stats.suggestions.under_review, colorClass: 'teal' },
              { label: 'Approved', value: stats.suggestions.approved, colorClass: 'green' },
              { label: 'Rejected', value: stats.suggestions.rejected, colorClass: 'red' },
              { label: 'Merged', value: stats.suggestions.merged, colorClass: 'purple' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 100, fontSize: '0.875rem' }}>{item.label}</div>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div
                    className={`progress-bar__fill progress-bar__fill--${item.colorClass}`}
                    style={{
                      width: `${stats.suggestions.total > 0 ? (item.value / stats.suggestions.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div style={{ width: 40, textAlign: 'right', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="custom-view__card">
          <h3>Recent Suggestions</h3>
          {recentActivity.length > 0 ? (
            <div className="activity-list">
              {recentActivity.map((suggestion) => (
                <div key={suggestion.id} className="activity-list__item">
                  <div className="activity-list__content">
                    <div className="activity-list__title">{suggestion.title || 'Untitled Suggestion'}</div>
                    <div className="activity-list__time">
                      {new Date(suggestion.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <StatusBadge status={suggestion.status} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--theme-elevation-300)', fontSize: '0.875rem' }}>
              No recent suggestions
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 24 }}>
        <div className="custom-view__card">
          <h3>Construction Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem' }}>In Progress</span>
              <span style={{ fontWeight: 600 }}>{stats.constructions.in_progress}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem' }}>Completed</span>
              <span style={{ fontWeight: 600 }}>{stats.constructions.completed}</span>
            </div>
          </div>
        </div>

        <div className="custom-view__card">
          <h3>User Roles</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem' }}>Contributors</span>
              <span style={{ fontWeight: 600 }}>{stats.users.contributors}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem' }}>Moderators</span>
              <span style={{ fontWeight: 600 }}>{stats.users.moderators}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem' }}>Admins</span>
              <span style={{ fontWeight: 600 }}>{stats.users.admins}</span>
            </div>
          </div>
        </div>

        <div className="custom-view__card">
          <h3>Cron Job Health</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem' }}>Total Jobs</span>
              <span style={{ fontWeight: 600 }}>{stats.cronJobs.total}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem' }}>Enabled</span>
              <span style={{ fontWeight: 600, color: '#22c55e' }}>{stats.cronJobs.enabled}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem' }}>Last Run Failed</span>
              <span style={{ fontWeight: 600, color: stats.cronJobs.failed > 0 ? '#ef4444' : 'inherit' }}>{stats.cronJobs.failed}</span>
            </div>
          </div>
        </div>

        <div className="custom-view__card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Quick Links</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link
              href="/admin/suggestions-queue"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: 'var(--theme-elevation-50)',
                borderRadius: 6,
                textDecoration: 'none',
                color: 'inherit',
                fontSize: '0.875rem',
              }}
            >
              <ClipboardList size={16} />
              Suggestions Queue
              {stats.suggestions.pending > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#f59e0b',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  {stats.suggestions.pending}
                </span>
              )}
            </Link>
            <Link
              href="/admin/scrapers"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: 'var(--theme-elevation-50)',
                borderRadius: 6,
                textDecoration: 'none',
                color: 'inherit',
                fontSize: '0.875rem',
              }}
            >
              <Clock size={16} />
              Cron Jobs
            </Link>
            <Link
              href="/admin/analytics"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: 'var(--theme-elevation-50)',
                borderRadius: 6,
                textDecoration: 'none',
                color: 'inherit',
                fontSize: '0.875rem',
              }}
            >
              <BarChart size={16} />
              Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
