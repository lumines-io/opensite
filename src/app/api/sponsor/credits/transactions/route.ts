import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser, isAuthError, isSponsorRole } from '@/lib/auth/api-middleware';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { Where } from 'payload';

/**
 * GET /api/sponsor/credits/transactions
 * Get credit transaction history
 */
export async function GET(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  if (!isSponsorRole(user.role) && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only sponsors can view transactions' },
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
    const type = searchParams.get('type'); // Optional filter by type

    const payload = await getPayload({ config });

    const conditions: Where[] = [
      { organization: { equals: String(user.organization) } },
    ];

    if (type) {
      conditions.push({ type: { equals: type } });
    }

    const transactions = await payload.find({
      collection: 'credit-transactions',
      where: conditions.length === 1 ? conditions[0] : { and: conditions },
      page,
      limit,
      sort: '-createdAt',
      depth: 0,
    });

    return NextResponse.json({
      docs: transactions.docs,
      totalDocs: transactions.totalDocs,
      totalPages: transactions.totalPages,
      page: transactions.page,
      hasNextPage: transactions.hasNextPage,
      hasPrevPage: transactions.hasPrevPage,
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get transactions' },
      { status: 500 }
    );
  }
}
