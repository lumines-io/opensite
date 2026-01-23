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

    // Get current user and verify admin/moderator access
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });
    if (!user || !['moderator', 'admin'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, reviewNotes, assignedTo } = body;

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      // Set reviewedBy and reviewedAt for status changes to approved/rejected
      if (['approved', 'rejected'].includes(status)) {
        updateData.reviewedBy = user.id;
        updateData.reviewedAt = new Date().toISOString();
      }
    }
    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes;
    }
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }

    const result = await payload.update({
      collection: 'suggestions',
      id,
      data: updateData,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update suggestion:', error);
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
      collection: 'suggestions',
      id,
      depth: 2,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch suggestion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
