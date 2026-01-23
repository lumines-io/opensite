import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config });
    const { id } = await params;

    // Get current user and verify admin access (only admins can change roles)
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { role, reputation } = body;

    const updateData: Record<string, unknown> = {};

    if (role) {
      // Validate role
      if (!['contributor', 'moderator', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;
    }

    if (reputation !== undefined) {
      updateData.reputation = reputation;
    }

    const result = await payload.update({
      collection: 'users',
      id,
      data: updateData,
    });

    return NextResponse.json({
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
      reputation: result.reputation,
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config });
    const { id } = await params;

    // Get current user and verify admin/moderator access
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });
    if (!user || !['moderator', 'admin'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await payload.findByID({
      collection: 'users',
      id,
    });

    // Get user's suggestion stats
    const [totalSuggestions, approvedSuggestions] = await Promise.all([
      payload.find({
        collection: 'suggestions',
        where: { submittedBy: { equals: id } },
        limit: 0,
      }),
      payload.find({
        collection: 'suggestions',
        where: {
          and: [
            { submittedBy: { equals: id } },
            { status: { equals: 'approved' } },
          ],
        },
        limit: 0,
      }),
    ]);

    return NextResponse.json({
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
      reputation: result.reputation,
      createdAt: result.createdAt,
      stats: {
        suggestions: totalSuggestions.totalDocs,
        approvedSuggestions: approvedSuggestions.totalDocs,
      },
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
