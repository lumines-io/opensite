import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { withApiHandler, createErrorResponse } from '@/lib/api-utils';

type RouteContext = { params: Promise<{ slug: string }> };

export const GET = withApiHandler<RouteContext>(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { slug } = await context.params;
  const payload = await getPayload({ config });

  // First find the construction by slug
  const { docs: constructions } = await payload.find({
    collection: 'constructions',
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
  });

  if (constructions.length === 0) {
    return createErrorResponse('Construction not found', 404, { code: 'NOT_FOUND' });
  }

  const construction = constructions[0];

  // Fetch changelog entries for this construction
  const { docs: changelog } = await payload.find({
    collection: 'construction-changelog',
    where: {
      construction: {
        equals: construction.id,
      },
    },
    sort: '-eventDate',
    limit: 50,
    depth: 1, // Include related data
  });

  // Format the response
  const formattedChangelog = changelog.map((entry) => {
    // Extract author info if available
    const author = entry.author && typeof entry.author === 'object'
      ? {
          id: entry.author.id,
          name: entry.author.name || entry.author.email?.split('@')[0] || 'Unknown'
        }
      : null;

    return {
      id: entry.id,
      title: entry.title,
      changeType: entry.changeType,
      description: entry.description,
      eventDate: entry.eventDate,
      createdAt: entry.createdAt,
      statusChange: entry.statusChange,
      progressChange: entry.progressChange,
      timelineChange: entry.timelineChange,
      milestone: entry.milestone,
      source: entry.source,
      images: entry.images,
      author,
    };
  });

  // Create response with cache headers
  const response = NextResponse.json({
    construction: {
      id: construction.id,
      title: construction.title,
      slug: construction.slug,
      constructionStatus: construction.constructionStatus,
      progress: construction.progress,
    },
    changelog: formattedChangelog,
    total: formattedChangelog.length,
  });

  // Public cache for CDN/browser caching
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=120, stale-while-revalidate=300'
  );

  return response;
});
