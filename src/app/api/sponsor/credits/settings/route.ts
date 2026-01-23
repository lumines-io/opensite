import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser, isAuthError, isSponsorRole } from '@/lib/auth/api-middleware';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * GET /api/sponsor/credits/settings
 * Get credit alert settings
 */
export async function GET(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  if (!isSponsorRole(user.role) && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only sponsors can view settings' },
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
    const payload = await getPayload({ config });
    const org = await payload.findByID({
      collection: 'organizations',
      id: String(user.organization),
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      lowBalanceAlertEnabled: org.billing?.lowBalanceAlertEnabled ?? true,
      lowBalanceAlertThreshold: org.billing?.lowBalanceAlertThreshold ?? 500000,
      billingEmail: org.billing?.billingEmail || org.contactInfo?.email,
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sponsor/credits/settings
 * Update credit alert settings
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  // Only sponsor_admin can update settings
  if (user.role !== 'sponsor_admin' && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only organization admins can update settings' },
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
    const { lowBalanceAlertEnabled, lowBalanceAlertThreshold, billingEmail } = body;

    const payload = await getPayload({ config });
    const org = await payload.findByID({
      collection: 'organizations',
      id: String(user.organization),
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (typeof lowBalanceAlertEnabled === 'boolean') {
      updates.lowBalanceAlertEnabled = lowBalanceAlertEnabled;
    }

    if (typeof lowBalanceAlertThreshold === 'number' && lowBalanceAlertThreshold >= 0) {
      updates.lowBalanceAlertThreshold = lowBalanceAlertThreshold;
    }

    if (typeof billingEmail === 'string') {
      updates.billingEmail = billingEmail;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    await payload.update({
      collection: 'organizations',
      id: String(user.organization),
      data: {
        billing: {
          ...org.billing,
          ...updates,
        },
      },
    });

    return NextResponse.json({
      success: true,
      ...updates,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}
