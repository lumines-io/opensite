import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { withApiHandler } from '@/lib/api-utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

// GET /api/saved-places/addresses/[id] - Get single address
export const GET = withApiHandler(async (request: NextRequest, context: RouteContext) => {
  const payload = await getPayload({ config });
  const { id } = await context.params;

  // Authenticate user
  const authResult = await payload.auth({ headers: request.headers });
  const user = authResult.user;

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Find the address
  const address = await payload.findByID({
    collection: 'addresses',
    id,
    depth: 2, // Include addressList and construction data
  });

  if (!address) {
    return NextResponse.json(
      { error: 'Address not found' },
      { status: 404 }
    );
  }

  // Check ownership (unless admin)
  const addressUserId = typeof address.user === 'object' ? address.user.id : address.user;
  if (user.role !== 'admin' && addressUserId !== user.id) {
    return NextResponse.json(
      { error: 'Address not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    address,
  });
});

// PATCH /api/saved-places/addresses/[id] - Update address
export const PATCH = withApiHandler(async (request: NextRequest, context: RouteContext) => {
  const payload = await getPayload({ config });
  const { id } = await context.params;

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

  // Find the address
  const address = await payload.findByID({
    collection: 'addresses',
    id,
    depth: 0,
  });

  if (!address) {
    return NextResponse.json(
      { error: 'Address not found' },
      { status: 404 }
    );
  }

  // Check ownership (unless admin)
  const addressUserId = typeof address.user === 'object' ? address.user.id : address.user;
  if (user.role !== 'admin' && addressUserId !== user.id) {
    return NextResponse.json(
      { error: 'Address not found' },
      { status: 404 }
    );
  }

  // Parse request body
  let body: {
    label?: string;
    addressText?: string;
    location?: GeoJSON.Point;
    note?: string;
    addressList?: string | number;
    construction?: string | number | null;
    tags?: { tag: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate input
  if (body.label !== undefined) {
    if (typeof body.label !== 'string' || body.label.trim().length < 1) {
      return NextResponse.json(
        { error: 'Label cannot be empty' },
        { status: 400 }
      );
    }
    if (body.label.length > 100) {
      return NextResponse.json(
        { error: 'Label must be 100 characters or less' },
        { status: 400 }
      );
    }
  }

  if (body.location !== undefined && !isValidPoint(body.location)) {
    return NextResponse.json(
      { error: 'Location must be a valid GeoJSON Point' },
      { status: 400 }
    );
  }

  // If changing addressList, verify it belongs to the user
  if (body.addressList !== undefined) {
    const list = await payload.findByID({
      collection: 'address-lists',
      id: body.addressList,
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
        { error: 'Cannot move to another user\'s list' },
        { status: 403 }
      );
    }
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

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (body.label !== undefined) updateData.label = body.label.trim();
  if (body.addressText !== undefined) updateData.addressText = body.addressText.trim();
  if (body.location !== undefined) updateData.location = body.location;
  if (body.note !== undefined) updateData.note = body.note.trim();
  if (body.addressList !== undefined) updateData.addressList = body.addressList;
  if (body.construction !== undefined) updateData.construction = body.construction;
  if (body.tags !== undefined) updateData.tags = body.tags;

  // Update the address
  const updatedAddress = await payload.update({
    collection: 'addresses',
    id,
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    address: updatedAddress,
  });
});

// DELETE /api/saved-places/addresses/[id] - Delete address
export const DELETE = withApiHandler(async (request: NextRequest, context: RouteContext) => {
  const payload = await getPayload({ config });
  const { id } = await context.params;

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

  // Find the address
  const address = await payload.findByID({
    collection: 'addresses',
    id,
    depth: 0,
  });

  if (!address) {
    return NextResponse.json(
      { error: 'Address not found' },
      { status: 404 }
    );
  }

  // Check ownership (unless admin)
  const addressUserId = typeof address.user === 'object' ? address.user.id : address.user;
  if (user.role !== 'admin' && addressUserId !== user.id) {
    return NextResponse.json(
      { error: 'Address not found' },
      { status: 404 }
    );
  }

  // Delete the address
  await payload.delete({
    collection: 'addresses',
    id,
  });

  return NextResponse.json({
    success: true,
    message: 'Address deleted successfully',
  });
});
