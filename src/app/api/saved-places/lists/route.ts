import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { withApiHandler } from '@/lib/api-utils';

// GET /api/saved-places/lists - Fetch user's address lists
export const GET = withApiHandler(async (request: NextRequest) => {
  const payload = await getPayload({ config });

  // Authenticate user
  const authResult = await payload.auth({ headers: request.headers });
  const user = authResult.user;

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Fetch user's address lists
  const { docs: lists } = await payload.find({
    collection: 'address-lists',
    where: {
      user: { equals: user.id },
    },
    sort: '-isDefault,-createdAt',
    depth: 0,
  });

  // Get address counts for each list
  const listsWithCounts = await Promise.all(
    lists.map(async (list) => {
      const { totalDocs } = await payload.count({
        collection: 'addresses',
        where: {
          addressList: { equals: list.id },
        },
      });
      return {
        ...list,
        addressCount: totalDocs,
      };
    })
  );

  return NextResponse.json({
    lists: listsWithCounts,
  });
});

// POST /api/saved-places/lists - Create new address list
export const POST = withApiHandler(async (request: NextRequest) => {
  const payload = await getPayload({ config });

  // Authenticate user
  const authResult = await payload.auth({ headers: request.headers });
  const user = authResult.user;

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!user._verified) {
    return NextResponse.json(
      { error: 'Email verification required' },
      { status: 403 }
    );
  }

  // Parse request body
  let body: { name?: string; description?: string; isDefault?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate input
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 1) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    );
  }

  if (body.name.length > 100) {
    return NextResponse.json(
      { error: 'Name must be 100 characters or less' },
      { status: 400 }
    );
  }

  // Create the list
  const list = await payload.create({
    collection: 'address-lists',
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || undefined,
      user: user.id,
      isDefault: body.isDefault || false,
    },
  });

  return NextResponse.json(
    {
      success: true,
      list,
    },
    { status: 201 }
  );
});
