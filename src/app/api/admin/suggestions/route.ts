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
    const status = searchParams.get('status');
    const suggestionType = searchParams.get('suggestionType');
    const sourceType = searchParams.get('sourceType');

    const where: Where = {};

    if (status) {
      where.status = { equals: status };
    }
    if (suggestionType) {
      where.suggestionType = { equals: suggestionType };
    }
    if (sourceType) {
      where.sourceType = { equals: sourceType };
    }

    const result = await payload.find({
      collection: 'suggestions',
      page,
      limit,
      where,
      sort: '-createdAt',
      depth: 2,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
