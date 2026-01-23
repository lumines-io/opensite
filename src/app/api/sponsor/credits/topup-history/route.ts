import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser, isAuthError, isSponsorRole } from '@/lib/auth/api-middleware';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { Where } from 'payload';

/**
 * GET /api/sponsor/credits/topup-history
 * Get Stripe payment history for credit top-ups
 */
export async function GET(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  if (!isSponsorRole(user.role) && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only sponsors can view topup history' },
      { status: 403 }
    );
  }

  if (!user.organization) {
    return NextResponse.json(
      { error: 'You must belong to an organization' },
      { status: 400 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const status = searchParams.get('status'); // Optional filter by status

    const payload = await getPayload({ config });

    const conditions: Where[] = [
      { organization: { equals: String(user.organization) } },
    ];

    if (status) {
      conditions.push({ status: { equals: status } });
    }

    const topupHistory = await payload.find({
      collection: 'credit-topup-history',
      where: conditions.length === 1 ? conditions[0] : { and: conditions },
      page,
      limit,
      sort: '-createdAt',
      depth: 0,
    });

    return NextResponse.json({
      docs: topupHistory.docs,
      totalDocs: topupHistory.totalDocs,
      totalPages: topupHistory.totalPages,
      page: topupHistory.page,
      hasNextPage: topupHistory.hasNextPage,
      hasPrevPage: topupHistory.hasPrevPage,
    });
  } catch (error) {
    console.error('Error getting topup history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get topup history' },
      { status: 500 }
    );
  }
}
