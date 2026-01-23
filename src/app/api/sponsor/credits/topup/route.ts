import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser, isAuthError, isSponsorRole } from '@/lib/auth/api-middleware';
import { createTopupCheckoutSession, getTopupPackages } from '@/lib/stripe/checkout';
import { validateTopupAmount } from '@/lib/stripe/client';

/**
 * POST /api/sponsor/credits/topup
 * Create a Stripe Checkout session for credit top-up
 */
export async function POST(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  // Only sponsor_admin can top up credits
  if (user.role !== 'sponsor_admin' && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only organization admins can top up credits' },
      { status: 403 }
    );
  }

  if (!user.organization) {
    return NextResponse.json(
      { error: 'You must belong to an organization to top up credits' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'Amount is required and must be a number' },
        { status: 400 }
      );
    }

    // Validate amount
    const validation = validateTopupAmount(amount);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const result = await createTopupCheckoutSession({
      organizationId: String(user.organization),
      userId: user.id,
      amount,
      successUrl: `${baseUrl}/dashboard/billing?success=true`,
      cancelUrl: `${baseUrl}/dashboard/billing?cancelled=true`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sponsor/credits/topup
 * Get available top-up packages
 */
export async function GET(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  if (!isSponsorRole(user.role) && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only sponsors can view top-up packages' },
      { status: 403 }
    );
  }

  const packages = getTopupPackages();

  return NextResponse.json({ packages });
}
