import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { Where } from 'payload';

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config });

    // Get current user and verify admin/moderator access
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });
    if (!user || !['moderator', 'admin'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const where: Where = {};

    if (role) {
      where.role = { equals: role };
    }

    if (search) {
      where.or = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const result = await payload.find({
      collection: 'users',
      page,
      limit,
      where,
      sort: '-createdAt',
    });

    // Get user stats
    const [totalContributors, totalModerators, totalAdmins] = await Promise.all([
      payload.find({ collection: 'users', where: { role: { equals: 'contributor' } }, limit: 0 }),
      payload.find({ collection: 'users', where: { role: { equals: 'moderator' } }, limit: 0 }),
      payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 0 }),
    ]);

    // Get suggestion counts for each user
    const usersWithStats = await Promise.all(
      result.docs.map(async (u) => {
        const [totalSuggestions, approvedSuggestions] = await Promise.all([
          payload.find({
            collection: 'suggestions',
            where: { submittedBy: { equals: u.id } },
            limit: 0,
          }),
          payload.find({
            collection: 'suggestions',
            where: {
              and: [
                { submittedBy: { equals: u.id } },
                { status: { equals: 'approved' } },
              ],
            },
            limit: 0,
          }),
        ]);

        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          reputation: u.reputation || 0,
          createdAt: u.createdAt,
          stats: {
            suggestions: totalSuggestions.totalDocs,
            approvedSuggestions: approvedSuggestions.totalDocs,
          },
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      totalDocs: result.totalDocs,
      page: result.page,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      stats: {
        total: result.totalDocs,
        contributors: totalContributors.totalDocs,
        moderators: totalModerators.totalDocs,
        admins: totalAdmins.totalDocs,
      },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
