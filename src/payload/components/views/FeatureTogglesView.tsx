'use client';

import React, { useState } from 'react';
import { usePayloadAPI } from '@payloadcms/ui';

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: 'core' | 'ui' | 'ops' | 'external';
  impact: 'high' | 'medium' | 'low';
  enabled: boolean;
  affectedRoutes: string[];
  affectedComponents: string[];
}

interface FeatureFlagsResponse {
  flags: FeatureFlag[];
  categories: {
    core: FeatureFlag[];
    ui: FeatureFlag[];
    ops: FeatureFlag[];
    external: FeatureFlag[];
  };
  summary: {
    total: number;
    enabled: number;
    disabled: number;
    byCategory: {
      core: number;
      ui: number;
      ops: number;
      external: number;
    };
  };
}

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  core: {
    label: 'Core Features',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  ui: {
    label: 'User Interface',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  ops: {
    label: 'Operations',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  external: {
    label: 'External Services',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
};

const ImpactBadge: React.FC<{ impact: 'high' | 'medium' | 'low' }> = ({ impact }) => {
  const colorClass = impact === 'high' ? 'red' : impact === 'medium' ? 'amber' : 'teal';
  const colors: Record<string, { bg: string; text: string }> = {
    red: { bg: '#fee2e2', text: '#b91c1c' },
    amber: { bg: '#fef3c7', text: '#92400e' },
    teal: { bg: '#ccfbf1', text: '#0f766e' },
  };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 9999,
      fontSize: '0.625rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      background: colors[colorClass].bg,
      color: colors[colorClass].text,
    }}>
      {impact}
    </span>
  );
};

const ToggleSwitch: React.FC<{
  enabled: boolean;
  disabled?: boolean;
}> = ({ enabled, disabled }) => (
  <div
    style={{
      width: 44,
      height: 24,
      borderRadius: 12,
      background: enabled ? '#14b8a6' : 'var(--theme-elevation-200)',
      position: 'relative',
      transition: 'background 0.2s ease',
      cursor: disabled ? 'not-allowed' : 'default',
      opacity: disabled ? 0.6 : 1,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 2,
        left: enabled ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        background: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'left 0.2s ease',
      }}
    />
  </div>
);

export const FeatureTogglesView: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('core');

  // Use Payload's built-in API hook to fetch feature flags
  // Note: This calls the custom admin API endpoint, not a Payload collection
  const [{ data: rawData, isLoading, isError }] = usePayloadAPI(
    '/api/admin/feature-flags'
  );
  const data = rawData as FeatureFlagsResponse | undefined;

  if (isLoading) {
    return (
      <div className="custom-view">
        <div className="custom-view__header">
          <h1>Feature Toggles</h1>
          <p>Loading feature flags...</p>
        </div>
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="custom-view">
        <div className="empty-state">
          <div className="empty-state__title">Failed to load feature flags</div>
          <div className="empty-state__description">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  const enabledCount = data.flags.filter(f => f.enabled).length;
  const disabledCount = data.flags.filter(f => !f.enabled).length;
  const highImpactDisabled = data.flags.filter(f => !f.enabled && f.impact === 'high').length;

  return (
    <div className="custom-view">
      <div className="custom-view__header">
        <h1>Feature Toggles</h1>
        <p>View and monitor feature flag status. Configuration is done via environment variables.</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="stat-card__value">{enabledCount}</div>
          <div className="stat-card__label">Enabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="stat-card__value">{disabledCount}</div>
          <div className="stat-card__label">Disabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="stat-card__value">{highImpactDisabled}</div>
          <div className="stat-card__label">High Impact Disabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="stat-card__value">{data.flags.length}</div>
          <div className="stat-card__label">Total Flags</div>
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Configuration Note</div>
          <div style={{ fontSize: '0.875rem', color: '#b45309' }}>
            Feature flags are controlled via environment variables. To change a flag, update the corresponding
            environment variable (e.g., <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: 4 }}>FEATURE_USER_REGISTRATION=false</code>)
            and restart the application.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(categoryLabels).map(([category, { label, icon }]) => {
          const flags = data.categories[category as keyof typeof data.categories] ?? [];
          const enabledInCategory = flags.filter(f => f.enabled).length;
          const isExpanded = expandedCategory === category;

          return (
            <div key={category} className="custom-view__card" style={{ padding: 0 }}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                style={{
                  width: '100%',
                  padding: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#14b8a6' }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-300)' }}>
                      {enabledInCategory} of {flags.length} enabled
                    </div>
                  </div>
                </div>
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    color: 'var(--theme-elevation-300)',
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--theme-elevation-100)' }}>
                  {flags.map((flag) => (
                    <div
                      key={flag.key}
                      style={{
                        padding: 20,
                        borderBottom: '1px solid var(--theme-elevation-100)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{flag.name}</span>
                          <ImpactBadge impact={flag.impact} />
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--theme-elevation-300)', margin: '4px 0 8px' }}>
                          {flag.description}
                        </p>
                        <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-250)' }}>
                          <code style={{ background: 'var(--theme-elevation-100)', padding: '2px 6px', borderRadius: 4 }}>
                            {flag.key}
                          </code>
                        </div>
                        {flag.affectedRoutes?.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-300)', marginTop: 8 }}>
                            <strong>Affected routes:</strong> {flag.affectedRoutes.join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: flag.enabled ? '#22c55e' : 'var(--theme-elevation-300)',
                        }}>
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <ToggleSwitch enabled={flag.enabled} disabled />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureTogglesView;
