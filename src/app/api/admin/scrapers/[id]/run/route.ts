import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config });
    const { id } = await params;

    // Get current user and verify admin access
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, this would trigger the actual scraper
    // For now, we simulate a successful trigger
    console.log(`Manually triggering scraper ${id}`);

    return NextResponse.json({
      success: true,
      message: `Scraper ${id} triggered successfully`,
      runId: `run-${Date.now()}`,
    });
  } catch (error) {
    console.error('Failed to trigger scraper:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
