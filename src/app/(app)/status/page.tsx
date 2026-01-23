import type { Metadata } from 'next';
import { ContentPageTemplate } from '@/components/layout';
import { Badge, Card, CardHeader, CardContent } from '@/components/ui';

export const metadata: Metadata = {
  title: 'System Status',
  description: 'OpenSite system status and health information',
};

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
  };
}

async function getHealthStatus(): Promise<HealthResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/health`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch {
    return null;
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}

function StatusBadge({ status }: { status: string }) {
  const variant = {
    healthy: 'success' as const,
    up: 'success' as const,
    degraded: 'warning' as const,
    unhealthy: 'error' as const,
    down: 'error' as const,
  }[status] || 'error' as const;

  return (
    <Badge variant={variant} size="lg">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default async function StatusPage() {
  const health = await getHealthStatus();

  return (
    <ContentPageTemplate
      pageTitle="System Status"
      pageDescription="OpenSite operational status"
      maxWidth="4xl"
      showFullFooter={false}
    >
      {!health ? (
        <Card className="bg-error-light border-error/30">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-error mb-2">
              Unable to fetch status
            </h2>
            <p className="text-error/80">
              The health check endpoint is not responding.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overall Status */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Overall Status
                </h2>
                <p className="text-sm text-muted-foreground">
                  Last checked: {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
              <StatusBadge status={health.status} />
            </div>
          </Card>

          {/* Service Checks */}
          <Card padding={false}>
            <CardHeader title="Service Checks" className="px-6 pt-6" />
            <CardContent className="mt-0 px-0">
              <div className="divide-y divide-border">
                {/* Database */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      Database
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {health.checks.database.status === 'up'
                        ? `Latency: ${health.checks.database.latency}ms`
                        : health.checks.database.error || 'Connection failed'}
                    </p>
                  </div>
                  <StatusBadge status={health.checks.database.status} />
                </div>

                {/* Memory */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      Memory Usage
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {health.checks.memory.used}MB / {health.checks.memory.total}MB (
                      {health.checks.memory.percentage}%)
                    </p>
                  </div>
                  <StatusBadge
                    status={
                      health.checks.memory.percentage > 90
                        ? 'degraded'
                        : health.checks.memory.percentage > 75
                          ? 'degraded'
                          : 'healthy'
                    }
                  />
                </div>

                {/* Uptime */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      Uptime
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatUptime(health.checks.uptime)}
                    </p>
                  </div>
                  <StatusBadge status="healthy" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Version Info */}
          <Card>
            <CardHeader title="System Information" />
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Version</dt>
                  <dd className="font-medium text-foreground">
                    {health.version}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Environment</dt>
                  <dd className="font-medium text-foreground">
                    {process.env.NODE_ENV || 'development'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          For incidents or issues, please contact support or check our{' '}
          <a
            href="https://github.com/your-org/opensite/issues"
            className="text-primary hover:underline"
          >
            issue tracker
          </a>
          .
        </p>
      </div>
    </ContentPageTemplate>
  );
}
