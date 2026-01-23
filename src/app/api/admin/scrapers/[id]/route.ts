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

    // Get current user and verify admin access (only admins can modify scrapers)
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    // In production, this would update the scraper configuration in a database
    // For now, we just return a success response
    console.log(`Updating scraper ${id} status to ${status}`);

    return NextResponse.json({
      success: true,
      message: `Scraper ${id} status updated to ${status}`,
    });
  } catch (error) {
    console.error('Failed to update scraper:', error);
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

    // In production, fetch from database
    // For now, return mock data
    return NextResponse.json({
      id,
      name: 'Mock Scraper',
      type: 'news',
      status: 'active',
    });
  } catch (error) {
    console.error('Failed to fetch scraper:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
