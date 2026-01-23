'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { ContentPageTemplate } from '@/components/layout';
import { Card, Button, Input, Alert, Spinner } from '@/components/ui';

// Types
interface ScraperInfo {
  source: string;
  name: string;
  enabled: boolean;
  isRunning: boolean;
}

interface ScraperRun {
  id: string;
  source: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  articlesFound: number;
  articlesProcessed: number;
  suggestionsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

interface ScraperStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalArticlesFound: number;
  totalArticlesProcessed: number;
  totalSuggestionsCreated: number;
  totalDuplicatesSkipped: number;
}

interface ScraperStatusResponse {
  scrapers: ScraperInfo[];
  runs: ScraperRun[];
  stats: ScraperStats;
  timestamp: string;
}

// API Key from localStorage
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('scraperApiKey') || '';
  }
  return '';
};

// Fetcher with API key
const fetcher = async (url: string) => {
  const apiKey = getApiKey();
  const res = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch');
  }

  return res.json();
};

export default function ScraperAdminPage() {
  const [apiKey, setApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [runningTrigger, setRunningTrigger] = useState(false);

  // Load API key from localStorage
  useEffect(() => {
    const stored = getApiKey();
    if (stored) {
      setApiKey(stored);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch scraper status
  const { data, error, isLoading, mutate } = useSWR<ScraperStatusResponse>(
    isAuthenticated ? '/api/scraper/status' : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
    }
  );

  // Handle API key submission
  const handleAuthenticate = useCallback(() => {
    if (apiKey) {
      localStorage.setItem('scraperApiKey', apiKey);
      setIsAuthenticated(true);
    }
  }, [apiKey]);

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('scraperApiKey');
    setApiKey('');
    setIsAuthenticated(false);
  }, []);

  // Toggle source selection
  const toggleSource = useCallback((source: string) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  }, []);

  // Trigger scraper run
  const triggerRun = useCallback(async () => {
    if (selectedSources.length === 0) {
      alert('Please select at least one source');
      return;
    }

    setRunningTrigger(true);

    try {
      const res = await fetch('/api/scraper/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getApiKey(),
        },
        body: JSON.stringify({
          sources: selectedSources,
          dryRun: false,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to trigger scraper');
      }

      alert(`Started scrapers: ${selectedSources.join(', ')}`);
      setSelectedSources([]);
      mutate();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRunningTrigger(false);
    }
  }, [selectedSources, mutate]);

  // Auth screen
  if (!isAuthenticated) {
    return (
      <ContentPageTemplate
        pageTitle="Scraper Admin"
        pageDescription="Enter your API key to access the scraper admin panel."
        maxWidth="4xl"
        showFullFooter={false}
      >
        <div className="max-w-md mx-auto">
          <Card>
            <div className="space-y-4">
              <Input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Enter API key"
                onKeyDown={e => e.key === 'Enter' && handleAuthenticate()}
              />
              <Button onClick={handleAuthenticate} fullWidth>
                Authenticate
              </Button>
            </div>
          </Card>
        </div>
      </ContentPageTemplate>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <ContentPageTemplate
        pageTitle="Scraper Admin"
        showFullFooter={false}
      >
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </ContentPageTemplate>
    );
  }

  // Error state
  if (error) {
    return (
      <ContentPageTemplate
        pageTitle="Scraper Admin"
        showFullFooter={false}
      >
        <Alert variant="error" title="Error loading scraper status">
          <p>{error.message}</p>
          <button
            onClick={handleLogout}
            className="mt-4 text-sm underline"
          >
            Try different API key
          </button>
        </Alert>
      </ContentPageTemplate>
    );
  }

  const actions = (
    <Button variant="ghost" onClick={handleLogout}>
      Logout
    </Button>
  );

  return (
    <ContentPageTemplate
      pageTitle="Scraper Admin"
      pageDescription="Monitor and manage construction news scrapers"
      showFullFooter={false}
      actions={actions}
    >

      {/* Stats Overview */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Runs"
            value={data.stats.totalRuns}
            color="blue"
          />
          <StatCard
            label="Success Rate"
            value={`${Math.round((data.stats.successfulRuns / Math.max(data.stats.totalRuns, 1)) * 100)}%`}
            color="green"
          />
          <StatCard
            label="Articles Found"
            value={data.stats.totalArticlesFound}
            color="purple"
          />
          <StatCard
            label="Suggestions Created"
            value={data.stats.totalSuggestionsCreated}
            color="amber"
          />
        </div>
      )}

      {/* Scrapers Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Scrapers
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {data?.scrapers.map(scraper => (
              <ScraperCard
                key={scraper.source}
                scraper={scraper}
                selected={selectedSources.includes(scraper.source)}
                onToggle={() => toggleSource(scraper.source)}
              />
            ))}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                if (data?.scrapers) {
                  setSelectedSources(data.scrapers.map(s => s.source));
                }
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedSources([])}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear Selection
            </button>
            <button
              onClick={triggerRun}
              disabled={selectedSources.length === 0 || runningTrigger}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
            >
              {runningTrigger ? 'Starting...' : `Run Selected (${selectedSources.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Runs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Articles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Suggestions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Errors
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data?.runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No runs yet
                  </td>
                </tr>
              ) : (
                data?.runs.slice().reverse().map(run => (
                  <RunRow key={run.id} run={run} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-sm text-muted-foreground text-center">
        Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '-'}
      </div>
    </ContentPageTemplate>
  );
}

// Stat Card Component
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

// Scraper Card Component
function ScraperCard({
  scraper,
  selected,
  onToggle,
}: {
  scraper: ScraperInfo;
  selected: boolean;
  onToggle: () => void;
}) {
  const statusColor = scraper.isRunning
    ? 'text-yellow-500'
    : scraper.enabled
    ? 'text-green-500'
    : 'text-gray-400';

  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-900 dark:text-white capitalize">
          {scraper.source}
        </span>
        <span className={`text-sm ${statusColor}`}>
          {scraper.isRunning ? 'Running' : scraper.enabled ? 'Ready' : 'Disabled'}
        </span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{scraper.name}</div>
    </div>
  );
}

// Run Row Component
function RunRow({ run }: { run: ScraperRun }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    running: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="font-medium text-gray-900 dark:text-white capitalize">
          {run.source}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[run.status]}`}>
          {run.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {new Date(run.startedAt).toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {run.articlesProcessed} / {run.articlesFound}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className="text-green-600 dark:text-green-400">{run.suggestionsCreated}</span>
        {run.duplicatesSkipped > 0 && (
          <span className="text-gray-400 ml-1">({run.duplicatesSkipped} dups)</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {run.errors.length > 0 ? (
          <span className="text-red-500" title={run.errors.join('\n')}>
            {run.errors.length} error{run.errors.length > 1 ? 's' : ''}
          </span>
        ) : (
          '-'
        )}
      </td>
    </tr>
  );
}
