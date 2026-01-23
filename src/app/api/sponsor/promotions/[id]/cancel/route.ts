import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser, isAuthError, isSponsorRole } from '@/lib/auth/api-middleware';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { cancelPromotion } from '@/lib/promotions/purchase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/sponsor/promotions/[id]/cancel
 * Cancel a promotion and get prorated refund
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  if (!isSponsorRole(user.role) && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only sponsors can cancel promotions' },
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
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const payload = await getPayload({ config });

    // Verify ownership
    const promotion = await payload.findByID({
      collection: 'promotions',
      id,
    });

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    const promotionOrgId = typeof promotion.organization === 'object'
      ? promotion.organization.id
      : promotion.organization;

    if (promotionOrgId !== String(user.organization) && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    // Cancel the promotion
    const result = await cancelPromotion(id, user.id, reason);

    return NextResponse.json({
      success: true,
      creditsRefunded: result.creditsRefunded,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error('Error cancelling promotion:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel promotion' },
      { status: 500 }
    );
  }
}
