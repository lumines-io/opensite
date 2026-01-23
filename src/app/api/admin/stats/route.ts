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

    // Fetch all stats in parallel
    const [
      suggestionsResult,
      constructionsResult,
      usersResult,
    ] = await Promise.all([
      payload.find({
        collection: 'suggestions',
        limit: 0,
      }),
      payload.find({
        collection: 'constructions',
        limit: 0,
      }),
      payload.find({
        collection: 'users',
        limit: 0,
      }),
    ]);

    // Get suggestion counts by status
    const suggestionsByStatus = await Promise.all([
      payload.find({ collection: 'suggestions', where: { status: { equals: 'pending' } }, limit: 0 }),
      payload.find({ collection: 'suggestions', where: { status: { equals: 'under_review' } }, limit: 0 }),
      payload.find({ collection: 'suggestions', where: { status: { equals: 'approved' } }, limit: 0 }),
      payload.find({ collection: 'suggestions', where: { status: { equals: 'rejected' } }, limit: 0 }),
      payload.find({ collection: 'suggestions', where: { status: { equals: 'merged' } }, limit: 0 }),
    ]);

    // Get construction counts by status
    const constructionsByStatus = await Promise.all([
      payload.find({ collection: 'constructions', where: { constructionStatus: { equals: 'in-progress' } }, limit: 0 }),
      payload.find({ collection: 'constructions', where: { constructionStatus: { equals: 'completed' } }, limit: 0 }),
    ]);

    // Get user counts by role
    const usersByRole = await Promise.all([
      payload.find({ collection: 'users', where: { role: { equals: 'contributor' } }, limit: 0 }),
      payload.find({ collection: 'users', where: { role: { equals: 'moderator' } }, limit: 0 }),
      payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 0 }),
    ]);

    // Get recent activity (recent suggestions)
    const recentSuggestions = await payload.find({
      collection: 'suggestions',
      limit: 5,
      sort: '-createdAt',
    });

    const stats = {
      suggestions: {
        total: suggestionsResult.totalDocs,
        pending: suggestionsByStatus[0].totalDocs,
        under_review: suggestionsByStatus[1].totalDocs,
        approved: suggestionsByStatus[2].totalDocs,
        rejected: suggestionsByStatus[3].totalDocs,
        merged: suggestionsByStatus[4].totalDocs,
      },
      scrapers: {
        total: 3, // Mock data - would come from scraper config
        active: 2,
        errored: 1,
      },
      constructions: {
        total: constructionsResult.totalDocs,
        in_progress: constructionsByStatus[0].totalDocs,
        completed: constructionsByStatus[1].totalDocs,
      },
      users: {
        total: usersResult.totalDocs,
        contributors: usersByRole[0].totalDocs,
        moderators: usersByRole[1].totalDocs,
        admins: usersByRole[2].totalDocs,
      },
      recentActivity: recentSuggestions.docs.map((s) => ({
        id: s.id,
        type: s.status,
        title: s.title,
        timestamp: s.createdAt,
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
