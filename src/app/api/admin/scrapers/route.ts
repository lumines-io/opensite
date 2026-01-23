import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

// Mock scraper data - in production, this would come from a database or scraper service
const mockScrapers = [
  {
    id: 'vnexpress-scraper',
    name: 'VnExpress News',
    type: 'news',
    url: 'https://vnexpress.net/tag/giao-thong',
    status: 'active',
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    lastSuccess: new Date(Date.now() - 3600000).toISOString(),
    nextRun: new Date(Date.now() + 3600000).toISOString(),
    schedule: 'Every hour',
    totalRuns: 1234,
    successRate: 98,
    recentRuns: [
      {
        id: 'run-1',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3540000).toISOString(),
        status: 'completed',
        itemsFound: 15,
        itemsCreated: 3,
        errors: [],
      },
      {
        id: 'run-2',
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 7140000).toISOString(),
        status: 'completed',
        itemsFound: 12,
        itemsCreated: 1,
        errors: [],
      },
    ],
  },
  {
    id: 'tuoitre-scraper',
    name: 'Tuoi Tre Online',
    type: 'news',
    url: 'https://tuoitre.vn/giao-thong.htm',
    status: 'active',
    lastRun: new Date(Date.now() - 7200000).toISOString(),
    lastSuccess: new Date(Date.now() - 7200000).toISOString(),
    nextRun: new Date(Date.now() + 3600000).toISOString(),
    schedule: 'Every 2 hours',
    totalRuns: 876,
    successRate: 95,
    recentRuns: [
      {
        id: 'run-3',
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 7080000).toISOString(),
        status: 'completed',
        itemsFound: 8,
        itemsCreated: 2,
        errors: [],
      },
    ],
  },
  {
    id: 'govt-api',
    name: 'HCMC DOT API',
    type: 'government',
    url: 'https://api.hcmc.gov.vn/transport',
    status: 'error',
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    lastSuccess: new Date(Date.now() - 172800000).toISOString(),
    nextRun: new Date(Date.now() + 3600000).toISOString(),
    schedule: 'Every 6 hours',
    totalRuns: 432,
    successRate: 85,
    lastError: 'Connection timeout after 30000ms',
    recentRuns: [
      {
        id: 'run-4',
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86370000).toISOString(),
        status: 'failed',
        itemsFound: 0,
        itemsCreated: 0,
        errors: ['Connection timeout after 30000ms'],
      },
    ],
  },
];

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config });

    // Get current user and verify admin/moderator access
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });
    if (!user || !['moderator', 'admin'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = {
      total: mockScrapers.length,
      active: mockScrapers.filter((s) => s.status === 'active').length,
      paused: mockScrapers.filter((s) => s.status === 'paused').length,
      error: mockScrapers.filter((s) => s.status === 'error').length,
    };

    return NextResponse.json({
      scrapers: mockScrapers,
      stats,
    });
  } catch (error) {
    console.error('Failed to fetch scrapers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
