import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { withApiHandler } from '@/lib/api-utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/saved-places/lists/[id] - Get single list with addresses
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

  // Find the list
  const list = await payload.findByID({
    collection: 'address-lists',
    id,
    depth: 0,
  });

  if (!list) {
    return NextResponse.json(
      { error: 'List not found' },
      { status: 404 }
    );
  }

  // Check ownership (unless admin)
  const listUserId = typeof list.user === 'object' ? list.user.id : list.user;
  if (user.role !== 'admin' && listUserId !== user.id) {
    return NextResponse.json(
      { error: 'List not found' },
      { status: 404 }
    );
  }

  // Get addresses in this list
  const { docs: addresses } = await payload.find({
    collection: 'addresses',
    where: {
      addressList: { equals: list.id },
    },
    sort: '-createdAt',
    depth: 1, // Include construction data
  });

  return NextResponse.json({
    list,
    addresses,
  });
});

// PATCH /api/saved-places/lists/[id] - Update list
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

  // Find the list
  const list = await payload.findByID({
    collection: 'address-lists',
    id,
    depth: 0,
  });

  if (!list) {
    return NextResponse.json(
      { error: 'List not found' },
      { status: 404 }
    );
  }

  // Check ownership (unless admin)
  const listUserId = typeof list.user === 'object' ? list.user.id : list.user;
  if (user.role !== 'admin' && listUserId !== user.id) {
    return NextResponse.json(
      { error: 'List not found' },
      { status: 404 }
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
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 1) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }
    if (body.name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be 100 characters or less' },
        { status: 400 }
      );
    }
  }

  // Build update data
  const updateData: { name?: string; description?: string; isDefault?: boolean } = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.description !== undefined) updateData.description = body.description.trim();
  if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;

  // Update the list
  const updatedList = await payload.update({
    collection: 'address-lists',
    id,
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    list: updatedList,
  });
});

// DELETE /api/saved-places/lists/[id] - Delete list
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

  // Find the list
  const list = await payload.findByID({
    collection: 'address-lists',
    id,
    depth: 0,
  });

  if (!list) {
    return NextResponse.json(
      { error: 'List not found' },
      { status: 404 }
    );
  }

  // Check ownership (unless admin)
  const listUserId = typeof list.user === 'object' ? list.user.id : list.user;
  if (user.role !== 'admin' && listUserId !== user.id) {
    return NextResponse.json(
      { error: 'List not found' },
      { status: 404 }
    );
  }

  // Check if this is the default list with addresses
  if (list.isDefault) {
    const { totalDocs } = await payload.count({
      collection: 'addresses',
      where: {
        addressList: { equals: id },
      },
    });

    if (totalDocs > 0) {
      return NextResponse.json(
        { error: 'Cannot delete the default list while it contains addresses. Move or delete addresses first, or set another list as default.' },
        { status: 400 }
      );
    }
  }

  // Delete all addresses in this list first
  await payload.delete({
    collection: 'addresses',
    where: {
      addressList: { equals: id },
    },
  });

  // Delete the list
  await payload.delete({
    collection: 'address-lists',
    id,
  });

  return NextResponse.json({
    success: true,
    message: 'List deleted successfully',
  });
});
