import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { withApiHandler } from '@/lib/api-utils';

// Helper to validate GeoJSON Point
function isValidPoint(location: unknown): location is GeoJSON.Point {
  if (!location || typeof location !== 'object') return false;
  const loc = location as Record<string, unknown>;
  if (loc.type !== 'Point') return false;
  if (!Array.isArray(loc.coordinates) || loc.coordinates.length !== 2) return false;
  const [lng, lat] = loc.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false;
  return true;
}

interface AddressInput {
  label: string;
  addressText?: string;
  location: GeoJSON.Point;
  note?: string;
  addressList?: string | number;
  construction?: string | number;
  tags?: { tag: string }[];
}

// GET /api/saved-places/addresses - Fetch user's addresses
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

  const { searchParams } = new URL(request.url);
  const listId = searchParams.get('listId');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  // Build where clause
  const conditions: Record<string, unknown>[] = [
    { user: { equals: user.id } },
  ];

  if (listId) {
    conditions.push({ addressList: { equals: listId } });
  }

  if (search) {
    conditions.push({
      or: [
        { label: { contains: search } },
        { addressText: { contains: search } },
        { note: { contains: search } },
      ],
    });
  }

  const { docs: addresses, totalDocs, totalPages, hasNextPage, hasPrevPage } = await payload.find({
    collection: 'addresses',
    where: {
      and: conditions,
    },
    sort: '-createdAt',
    page,
    limit,
    depth: 1, // Include construction and addressList data
  });

  return NextResponse.json({
    addresses,
    pagination: {
      page,
      limit,
      totalDocs,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  });
});

// POST /api/saved-places/addresses - Create new saved address
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
  let body: AddressInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.label || typeof body.label !== 'string' || body.label.trim().length < 1) {
    return NextResponse.json(
      { error: 'Label is required' },
      { status: 400 }
    );
  }

  if (body.label.length > 100) {
    return NextResponse.json(
      { error: 'Label must be 100 characters or less' },
      { status: 400 }
    );
  }

  if (!isValidPoint(body.location)) {
    return NextResponse.json(
      { error: 'Location must be a valid GeoJSON Point with coordinates [lng, lat]' },
      { status: 400 }
    );
  }

  // If addressList is provided, verify it belongs to the user
  let addressListId = body.addressList;
  if (addressListId) {
    const list = await payload.findByID({
      collection: 'address-lists',
      id: addressListId,
      depth: 0,
    });

    if (!list) {
      return NextResponse.json(
        { error: 'Address list not found' },
        { status: 404 }
      );
    }

    const listUserId = typeof list.user === 'object' ? list.user.id : list.user;
    if (user.role !== 'admin' && listUserId !== user.id) {
      return NextResponse.json(
        { error: 'Cannot save to another user\'s list' },
        { status: 403 }
      );
    }
  } else {
    // Find user's default list
    const { docs: defaultLists } = await payload.find({
      collection: 'address-lists',
      where: {
        and: [
          { user: { equals: user.id } },
          { isDefault: { equals: true } },
        ],
      },
      limit: 1,
    });

    if (defaultLists.length === 0) {
      return NextResponse.json(
        { error: 'No default address list found. Please create one first.' },
        { status: 400 }
      );
    }

    addressListId = defaultLists[0].id;
  }

  // Verify construction exists if provided
  if (body.construction) {
    try {
      await payload.findByID({
        collection: 'constructions',
        id: body.construction,
      });
    } catch {
      return NextResponse.json(
        { error: 'Construction not found' },
        { status: 404 }
      );
    }
  }

  // Create the address
  const address = await payload.create({
    collection: 'addresses',
    data: {
      label: body.label.trim(),
      addressText: body.addressText?.trim() || undefined,
      location: body.location,
      note: body.note?.trim() || undefined,
      user: user.id,
      addressList: addressListId,
      construction: body.construction || undefined,
      tags: body.tags || undefined,
    },
  });

  return NextResponse.json(
    {
      success: true,
      address,
    },
    { status: 201 }
  );
});
