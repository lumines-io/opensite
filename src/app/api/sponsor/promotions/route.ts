import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser, isAuthError, isSponsorRole } from '@/lib/auth/api-middleware';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { purchasePromotion } from '@/lib/promotions/purchase';
import { InsufficientCreditsError } from '@/lib/credits/balance';
import type { Where } from 'payload';

/**
 * GET /api/sponsor/promotions
 * List promotions for the organization
 */
export async function GET(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  if (!isSponsorRole(user.role) && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only sponsors can view promotions' },
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
    const status = searchParams.get('status');
    const constructionId = searchParams.get('constructionId');

    const payload = await getPayload({ config });

    const conditions: Where[] = [
      { organization: { equals: String(user.organization) } },
    ];

    if (status) {
      conditions.push({ status: { equals: status } });
    }

    if (constructionId) {
      conditions.push({ construction: { equals: constructionId } });
    }

    const promotions = await payload.find({
      collection: 'promotions',
      where: conditions.length === 1 ? conditions[0] : { and: conditions },
      page,
      limit,
      sort: '-createdAt',
      depth: 2, // Include construction and package details
    });

    return NextResponse.json({
      docs: promotions.docs,
      totalDocs: promotions.totalDocs,
      totalPages: promotions.totalPages,
      page: promotions.page,
      hasNextPage: promotions.hasNextPage,
      hasPrevPage: promotions.hasPrevPage,
    });
  } catch (error) {
    console.error('Error getting promotions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get promotions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sponsor/promotions
 * Purchase a promotion for a construction
 */
export async function POST(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  if (!isSponsorRole(user.role) && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only sponsors can purchase promotions' },
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
    const body = await request.json();
    const { constructionId, packageId, autoRenew = false } = body;

    if (!constructionId || !packageId) {
      return NextResponse.json(
        { error: 'constructionId and packageId are required' },
        { status: 400 }
      );
    }

    const result = await purchasePromotion({
      constructionId,
      packageId,
      organizationId: String(user.organization),
      userId: user.id,
      autoRenew,
    });

    return NextResponse.json({
      promotion: result.promotion,
      newBalance: result.newBalance,
      creditsSpent: result.creditsSpent,
    });
  } catch (error) {
    console.error('Error purchasing promotion:', error);

    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: error.required,
          available: error.available,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to purchase promotion' },
      { status: 500 }
    );
  }
}
