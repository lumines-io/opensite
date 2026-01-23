import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser, isAuthError, isSponsorRole } from '@/lib/auth/api-middleware';
import { getBalance } from '@/lib/credits/balance';
import { getLowBalanceLevel } from '@/lib/stripe/client';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * GET /api/sponsor/credits/balance
 * Get organization's credit balance
 */
export async function GET(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  if (!isSponsorRole(user.role) && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only sponsors can view credit balance' },
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
    const organizationId = String(user.organization);
    const { balance, totalLoaded, totalSpent } = await getBalance(organizationId);

    // Get organization for alert settings
    const payload = await getPayload({ config });
    const org = await payload.findByID({
      collection: 'organizations',
      id: organizationId,
    });

    const alertThreshold = org?.billing?.lowBalanceAlertThreshold ?? 500000;
    const alertLevel = getLowBalanceLevel(balance);

    return NextResponse.json({
      balance,
      totalLoaded,
      totalSpent,
      alertThreshold,
      alertLevel,
      alertEnabled: org?.billing?.lowBalanceAlertEnabled ?? true,
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get balance' },
      { status: 500 }
    );
  }
}
