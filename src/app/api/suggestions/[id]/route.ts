import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await getPayload({ config });

    // Get current user for authorization
    const { user } = await payload.auth({ headers: request.headers });

    // Only moderators and admins can access this endpoint
    if (!user || !['moderator', 'admin'].includes(user.role as string)) {
      return NextResponse.json(
        { error: 'Unauthorized. Moderator or admin role required.' },
        { status: 403 }
      );
    }

    const suggestion = await payload.findByID({
      collection: 'suggestions',
      id,
      depth: 2,
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('Suggestion fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestion' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await getPayload({ config });

    // Get current user for authorization
    const { user } = await payload.auth({ headers: request.headers });

    // Only moderators and admins can update suggestions
    if (!user || !['moderator', 'admin'].includes(user.role as string)) {
      return NextResponse.json(
        { error: 'Unauthorized. Moderator or admin role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate allowed fields for update
    const allowedFields = [
      'status',
      'reviewNotes',
      'assignedTo',
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const suggestion = await payload.update({
      collection: 'suggestions',
      id,
      data: updateData,
      user,
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('Suggestion update error:', error);
    return NextResponse.json(
      { error: 'Failed to update suggestion' },
      { status: 500 }
    );
  }
}
