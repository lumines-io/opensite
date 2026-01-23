import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

/**
 * Public health check response (minimal information)
 */
interface PublicHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}

/**
 * Detailed health check (for internal use only)
 */
interface DetailedHealthCheck extends PublicHealthCheck {
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      // SECURITY: Don't expose error details
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();

  let databaseStatus: 'up' | 'down' = 'down';
  let databaseLatency: number | undefined;
  let memoryUsage = { used: 0, total: 0, percentage: 0 };
  let overallStatus: PublicHealthCheck['status'] = 'healthy';

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const payload = await getPayload({ config });

    // Simple query to test database connection
    await payload.find({
      collection: 'constructions',
      limit: 1,
      depth: 0,
    });

    databaseStatus = 'up';
    databaseLatency = Date.now() - dbStart;
  } catch (error) {
    // SECURITY: Log error internally but don't expose details
    console.error('Health check database error:', error);
    databaseStatus = 'down';
    overallStatus = 'unhealthy';
  }

  // Check memory usage (Node.js)
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    memoryUsage = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    };

    // Mark as degraded if memory usage is high
    if (memoryUsage.percentage > 90) {
      overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  }

  // Check database latency
  if (databaseLatency && databaseLatency > 1000) {
    overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
  }

  // SECURITY: Return minimal public information
  // Detailed diagnostics should only be available to authenticated admins
  const publicResponse: PublicHealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    // SECURITY: Don't expose version information to prevent targeted attacks
    // version: process.env.npm_package_version || '0.1.0',
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(publicResponse, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  });
}
