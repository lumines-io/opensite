'use client';

import React, { useState } from 'react';
import { usePayloadAPI } from '@payloadcms/ui';
import { Settings, Palette, Server, Globe, Check, Ban, AlertTriangle, ClipboardList, Info, ChevronDown } from 'lucide-react';

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
    icon: <Settings size={20} />,
  },
  ui: {
    label: 'User Interface',
    icon: <Palette size={20} />,
  },
  ops: {
    label: 'Operations',
    icon: <Server size={20} />,
  },
  external: {
    label: 'External Services',
    icon: <Globe size={20} />,
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
            <Check size={20} />
          </div>
          <div className="stat-card__value">{enabledCount}</div>
          <div className="stat-card__label">Enabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <Ban size={20} />
          </div>
          <div className="stat-card__value">{disabledCount}</div>
          <div className="stat-card__label">Disabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-card__value">{highImpactDisabled}</div>
          <div className="stat-card__label">High Impact Disabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--teal">
            <ClipboardList size={20} />
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
        <Info size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
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
                <ChevronDown
                  size={20}
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    color: 'var(--theme-elevation-300)',
                  }}
                />
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
