import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config });

    // Get current user and verify admin/moderator access
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });
    if (!user || !['moderator', 'admin'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch suggestions data
    const [allSuggestions, approvedSuggestions, rejectedSuggestions, pendingSuggestions] =
      await Promise.all([
        payload.find({
          collection: 'suggestions',
          where: {
            createdAt: { greater_than: startDate.toISOString() },
          },
          limit: 0,
        }),
        payload.find({
          collection: 'suggestions',
          where: {
            status: { equals: 'approved' },
            createdAt: { greater_than: startDate.toISOString() },
          },
          limit: 0,
        }),
        payload.find({
          collection: 'suggestions',
          where: {
            status: { equals: 'rejected' },
            createdAt: { greater_than: startDate.toISOString() },
          },
          limit: 0,
        }),
        payload.find({
          collection: 'suggestions',
          where: {
            status: { equals: 'pending' },
          },
          limit: 0,
        }),
      ]);

    // Fetch constructions data
    const constructions = await payload.find({
      collection: 'constructions',
      limit: 1000,
      depth: 1,
    });

    // Calculate constructions by type
    const constructionsByType: Record<string, number> = {};
    const constructionsByStatus: Record<string, number> = {};

    constructions.docs.forEach((c) => {
      // By type
      const type = (c.constructionType as string) || 'other';
      constructionsByType[type] = (constructionsByType[type] || 0) + 1;

      // By status
      const status = (c.constructionStatus as string) || 'unknown';
      constructionsByStatus[status] = (constructionsByStatus[status] || 0) + 1;
    });

    // Fetch source breakdown
    const [communitySources, scraperSources, apiSources] = await Promise.all([
      payload.find({
        collection: 'suggestions',
        where: { sourceType: { equals: 'community' } },
        limit: 0,
      }),
      payload.find({
        collection: 'suggestions',
        where: { sourceType: { equals: 'scraper' } },
        limit: 0,
      }),
      payload.find({
        collection: 'suggestions',
        where: { sourceType: { equals: 'api' } },
        limit: 0,
      }),
    ]);

    // Generate submissions over time (mock daily data)
    const submissionsOverTime = [];
    const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '1y' ? 12 : 30;
    const interval = range === '1y' ? 30 : 1;

    for (let i = days - 1; i >= 0; i -= interval) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Mock data - in production, query actual counts per day
      submissionsOverTime.push({
        date: dateStr,
        count: Math.floor(Math.random() * 10) + 1,
        approved: Math.floor(Math.random() * 5),
        rejected: Math.floor(Math.random() * 3),
      });
    }

    // Generate monthly trends (mock data)
    const monthlyTrends = [];
    const months = range === '1y' ? 12 : 6;

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);

      monthlyTrends.push({
        month: monthStr,
        submissions: Math.floor(Math.random() * 50) + 10,
        constructions: Math.floor(Math.random() * 20) + 5,
      });
    }

    // Calculate approval rate
    const totalDecided = approvedSuggestions.totalDocs + rejectedSuggestions.totalDocs;
    const approvalRate =
      totalDecided > 0 ? (approvedSuggestions.totalDocs / totalDecided) * 100 : 0;

    return NextResponse.json({
      submissionsOverTime,
      approvalRate: {
        total: allSuggestions.totalDocs,
        approved: approvedSuggestions.totalDocs,
        rejected: rejectedSuggestions.totalDocs,
        pending: pendingSuggestions.totalDocs,
        rate: approvalRate,
      },
      constructionsByType: Object.entries(constructionsByType).map(([type, count]) => ({
        type,
        count,
      })),
      constructionsByStatus: Object.entries(constructionsByStatus).map(([status, count]) => ({
        status,
        count,
      })),
      sourceBreakdown: [
        { source: 'Community', count: communitySources.totalDocs },
        { source: 'Scraper', count: scraperSources.totalDocs },
        { source: 'API', count: apiSources.totalDocs },
      ],
      monthlyTrends,
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
