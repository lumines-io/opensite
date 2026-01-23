'use client';

import React, { useState, useMemo } from 'react';
import { usePayloadAPI } from '@payloadcms/ui';

interface Suggestion {
  id: string;
  status: string;
  suggestionType?: string;
  createdAt: string;
}

interface Construction {
  id: string;
  constructionStatus: string;
  constructionType?: string;
  createdAt: string;
  completedAt?: string;
}

interface User {
  id: string;
  createdAt: string;
}

const SimpleBarChart: React.FC<{ data: Array<{ label: string; value: number }>; maxValue: number }> = ({ data, maxValue }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {data.map((item) => (
      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 80, fontSize: '0.75rem', textAlign: 'right' }}>{item.label}</div>
        <div className="progress-bar" style={{ flex: 1, height: 24 }}>
          <div
            className="progress-bar__fill progress-bar__fill--teal"
            style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}
          >
            {item.value > 0 && <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 500 }}>{item.value}</span>}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const DonutChart: React.FC<{ segments: Array<{ label: string; value: number; color: string }> }> = ({ segments }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const segmentsWithPercent = segments.reduce<Array<{ label: string; value: number; color: string; percent: number; offset: number }>>((acc, seg) => {
    const percent = total > 0 ? (seg.value / total) * 100 : 0;
    const prevCumulative = acc.length > 0 ? acc.reduce((sum, s) => sum + s.percent, 0) : 0;
    const offset = 100 - prevCumulative;
    return [...acc, { ...seg, percent, offset }];
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width="120" height="120" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--theme-elevation-100)" strokeWidth="3" />
        {segmentsWithPercent.map((seg, i) => (
          <circle
            key={i}
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            stroke={seg.color}
            strokeWidth="3"
            strokeDasharray={`${seg.percent} ${100 - seg.percent}`}
            strokeDashoffset={seg.offset}
            transform="rotate(-90 18 18)"
          />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: seg.color }} />
            <span style={{ fontSize: '0.875rem' }}>{seg.label}: {seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AnalyticsView: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30');

  // Calculate date range
  const startDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - parseInt(timeRange));
    return date.toISOString();
  }, [timeRange]);

  // Fetch data using Payload's built-in API hook
  const [{ data: suggestionsData, isLoading: loadingSuggestions }] = usePayloadAPI(
    `/api/suggestions?limit=1000&depth=0&where[createdAt][greater_than_equal]=${startDate}`
  );

  const [{ data: allSuggestionsData }] = usePayloadAPI(
    '/api/suggestions?limit=1000&depth=0'
  );

  const [{ data: constructionsData, isLoading: loadingConstructions }] = usePayloadAPI(
    `/api/constructions?limit=1000&depth=1&where[createdAt][greater_than_equal]=${startDate}`
  );

  const [{ data: allConstructionsData }] = usePayloadAPI(
    '/api/constructions?limit=1000&depth=1'
  );

  const [{ data: usersData, isLoading: loadingUsers }] = usePayloadAPI(
    `/api/users?limit=1000&depth=0&where[createdAt][greater_than_equal]=${startDate}`
  );

  const isLoading = loadingSuggestions || loadingConstructions || loadingUsers;

  // Compute analytics from data
  const analytics = useMemo(() => {
    const suggestions = (suggestionsData?.docs ?? []) as Suggestion[];
    const allSuggestions = (allSuggestionsData?.docs ?? []) as Suggestion[];
    const constructions = (constructionsData?.docs ?? []) as Construction[];
    const allConstructions = (allConstructionsData?.docs ?? []) as Construction[];
    const users = (usersData?.docs ?? []) as User[];

    // Submission trend (group by date)
    const submissionsByDate = suggestions.reduce<Record<string, number>>((acc, s) => {
      const date = new Date(s.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const submissionTrend = Object.entries(submissionsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Approval rate (based on all suggestions)
    const approved = allSuggestions.filter(s => s.status === 'approved' || s.status === 'merged').length;
    const rejected = allSuggestions.filter(s => s.status === 'rejected').length;
    const pending = allSuggestions.filter(s => s.status === 'pending' || s.status === 'under_review').length;
    const total = approved + rejected;
    const rate = total > 0 ? (approved / total) * 100 : 0;

    // Construction types
    const typeCounts = allConstructions.reduce<Record<string, number>>((acc, c) => {
      const type = c.constructionType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const constructionTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, count }));

    // Monthly stats (within time range)
    const newConstructions = constructions.length;
    const completedConstructions = constructions.filter(c => c.constructionStatus === 'completed').length;
    const newSuggestions = suggestions.length;
    const newUsers = users.length;

    return {
      submissionTrend,
      approvalRate: { approved, rejected, pending, rate },
      constructionTypes,
      monthlyStats: { newConstructions, completedConstructions, newSuggestions, newUsers },
    };
  }, [suggestionsData, allSuggestionsData, constructionsData, allConstructionsData, usersData]);

  if (isLoading && !suggestionsData) {
    return (
      <div className="custom-view">
        <div className="custom-view__header">
          <h1>Analytics Dashboard</h1>
          <p>Loading analytics data...</p>
        </div>
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  const maxSubmission = Math.max(...analytics.submissionTrend.map(d => d.count), 1);

  return (
    <div className="custom-view">
      <div className="custom-view__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Track platform performance and trends</p>
        </div>
        <select
          className="filter-bar__select"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="stat-card__value">{analytics.monthlyStats.newConstructions}</div>
          <div className="stat-card__label">New Constructions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="stat-card__value">{analytics.monthlyStats.completedConstructions}</div>
          <div className="stat-card__label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="stat-card__value">{analytics.monthlyStats.newSuggestions}</div>
          <div className="stat-card__label">New Suggestions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="stat-card__value">{analytics.monthlyStats.newUsers}</div>
          <div className="stat-card__label">New Users</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div className="custom-view__card">
          <h3>Submissions Over Time</h3>
          {analytics.submissionTrend.length > 0 ? (
            <SimpleBarChart
              data={analytics.submissionTrend.slice(-10).map(d => ({
                label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: d.count,
              }))}
              maxValue={maxSubmission}
            />
          ) : (
            <p style={{ color: 'var(--theme-elevation-300)', fontSize: '0.875rem' }}>
              No submissions in this time period
            </p>
          )}
        </div>

        <div className="custom-view__card">
          <h3>Approval Rate</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <DonutChart
              segments={[
                { label: 'Approved', value: analytics.approvalRate.approved, color: '#22c55e' },
                { label: 'Rejected', value: analytics.approvalRate.rejected, color: '#ef4444' },
                { label: 'Pending', value: analytics.approvalRate.pending, color: '#f59e0b' },
              ]}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#14b8a6' }}>
                {analytics.approvalRate.rate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--theme-elevation-300)' }}>
                Approval Rate
              </div>
            </div>
          </div>
        </div>

        <div className="custom-view__card">
          <h3>Construction Types</h3>
          {analytics.constructionTypes.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {analytics.constructionTypes.map((type) => (
                <div
                  key={type.type}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--theme-elevation-50)',
                    borderRadius: 8,
                    flex: '1 1 auto',
                    minWidth: 120,
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{type.count}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-300)', textTransform: 'capitalize' }}>
                    {type.type.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--theme-elevation-300)', fontSize: '0.875rem' }}>
              No construction type data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
