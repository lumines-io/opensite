import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser, isAuthError, isSponsorRole } from '@/lib/auth/api-middleware';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { updateAutoRenewal } from '@/lib/promotions/purchase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/sponsor/promotions/[id]
 * Get promotion details
 */
export async function GET(request: NextRequest, context: RouteContext) {
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
    const { id } = await context.params;
    const payload = await getPayload({ config });

    const promotion = await payload.findByID({
      collection: 'promotions',
      id,
      depth: 2,
    });

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const promotionOrgId = typeof promotion.organization === 'object'
      ? promotion.organization.id
      : promotion.organization;

    if (promotionOrgId !== String(user.organization) && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    // Calculate performance metrics
    const construction = typeof promotion.construction === 'object' ? promotion.construction : null;
    const currentImpressions = construction?.analytics?.impressions ?? 0;
    const currentClicks = construction?.analytics?.clicks ?? 0;

    const performance = {
      impressionsGained: currentImpressions - (promotion.analytics?.impressionsAtStart ?? 0),
      clicksGained: currentClicks - (promotion.analytics?.clicksAtStart ?? 0),
      clickThroughRate: currentImpressions > 0
        ? ((currentClicks - (promotion.analytics?.clicksAtStart ?? 0)) / (currentImpressions - (promotion.analytics?.impressionsAtStart ?? 1))) * 100
        : 0,
    };

    return NextResponse.json({
      promotion,
      performance,
    });
  } catch (error) {
    console.error('Error getting promotion:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get promotion' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sponsor/promotions/[id]
 * Update promotion settings (e.g., auto-renewal)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  if (!isSponsorRole(user.role) && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only sponsors can update promotions' },
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
    const body = await request.json();
    const { autoRenew } = body;

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

    // Only allow updating active promotions
    if (promotion.status !== 'active') {
      return NextResponse.json(
        { error: 'Can only update active promotions' },
        { status: 400 }
      );
    }

    if (typeof autoRenew === 'boolean') {
      await updateAutoRenewal(id, autoRenew);
    }

    return NextResponse.json({
      success: true,
      autoRenew,
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update promotion' },
      { status: 500 }
    );
  }
}
