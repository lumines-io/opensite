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
    const { status } = body;

    // In production, this would update the flagged item in a database
    console.log(`Updating moderation item ${id} status to ${status}`);

    return NextResponse.json({
      success: true,
      message: `Flag ${id} status updated to ${status}`,
    });
  } catch (error) {
    console.error('Failed to update moderation item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
