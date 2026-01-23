import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';

/**
 * Moderation API endpoint
 *
 * NOTE: This feature is under development. The moderation queue functionality
 * requires a FlaggedItems collection to be implemented in Payload CMS.
 *
 * For now, this endpoint returns an empty result with a message indicating
 * the feature is not yet available.
 */
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config });

    // Get current user and verify admin/moderator access
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });
    if (!user || !['moderator', 'admin'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Return empty results instead of mock data
    // This endpoint will be functional when the FlaggedItems collection is implemented
    return NextResponse.json({
      flaggedItems: [],
      totalCount: 0,
      stats: {
        pending: 0,
        reviewed: 0,
        resolved: 0,
        dismissed: 0,
      },
      message: 'Moderation queue feature is under development. No items to display.',
    });
  } catch (error) {
    console.error('Failed to fetch moderation data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
