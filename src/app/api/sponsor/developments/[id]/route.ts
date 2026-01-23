import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { requireVerifiedUser, isAuthError } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/sponsor/developments/[id]
 * Get a specific development for the current user's organization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const authResult = await requireVerifiedUser(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  // Check if user is a sponsor role
  if (!['sponsor_user', 'sponsor_admin'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Access denied. Only sponsor users can access this endpoint.' },
      { status: 403 }
    );
  }

  // Check if user has an organization
  if (!user.organization) {
    return NextResponse.json(
      { error: 'No organization associated with your account.' },
      { status: 400 }
    );
  }

  try {
    const payload = await getPayload({ config });

    const development = await payload.findByID({
      collection: 'developments',
      id,
      depth: 2, // Include related data like organization, users
    });

    if (!development) {
      return NextResponse.json({ error: 'Development not found' }, { status: 404 });
    }

    // Check if the development belongs to the user's organization
    const developmentOrgId =
      typeof development.organization === 'object' && development.organization !== null
        ? development.organization.id
        : development.organization;

    if (developmentOrgId !== user.organization) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(development);
  } catch (error) {
    console.error('Sponsor development GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch development' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sponsor/developments/[id]
 * Update a development for the current user's organization
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const authResult = await requireVerifiedUser(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  // Check if user is a sponsor role
  if (!['sponsor_user', 'sponsor_admin'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Access denied. Only sponsor users can update developments.' },
      { status: 403 }
    );
  }

  // Check if user has an organization
  if (!user.organization) {
    return NextResponse.json(
      { error: 'No organization associated with your account.' },
      { status: 400 }
    );
  }

  try {
    const payload = await getPayload({ config });

    // First, verify ownership
    const existingDevelopment = await payload.findByID({
      collection: 'developments',
      id,
      depth: 1,
    });

    if (!existingDevelopment) {
      return NextResponse.json({ error: 'Development not found' }, { status: 404 });
    }

    // Check if the development belongs to the user's organization
    const developmentOrgId =
      typeof existingDevelopment.organization === 'object' &&
      existingDevelopment.organization !== null
        ? existingDevelopment.organization.id
        : existingDevelopment.organization;

    if (developmentOrgId !== user.organization) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();

    // Prevent changing certain fields
    const protectedFields = [
      'organization',
      'approvalStatus', // Use workflow API to change status
      'analytics',
      'review',
    ];

    const updateData = { ...body };
    protectedFields.forEach((field) => {
      delete updateData[field];
    });

    const result = await payload.update({
      collection: 'developments',
      id,
      data: updateData,
      user,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Sponsor development PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update development' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sponsor/developments/[id]
 * Delete a development (only if in draft status)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const authResult = await requireVerifiedUser(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  // Check if user is a sponsor admin
  if (user.role !== 'sponsor_admin') {
    return NextResponse.json(
      { error: 'Access denied. Only sponsor admins can delete developments.' },
      { status: 403 }
    );
  }

  // Check if user has an organization
  if (!user.organization) {
    return NextResponse.json(
      { error: 'No organization associated with your account.' },
      { status: 400 }
    );
  }

  try {
    const payload = await getPayload({ config });

    // First, verify ownership
    const existingDevelopment = await payload.findByID({
      collection: 'developments',
      id,
      depth: 1,
    });

    if (!existingDevelopment) {
      return NextResponse.json({ error: 'Development not found' }, { status: 404 });
    }

    // Check if the development belongs to the user's organization
    const developmentOrgId =
      typeof existingDevelopment.organization === 'object' &&
      existingDevelopment.organization !== null
        ? existingDevelopment.organization.id
        : existingDevelopment.organization;

    if (developmentOrgId !== user.organization) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only allow deletion of draft developments
    if (existingDevelopment.approvalStatus !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft developments can be deleted. Please withdraw or archive instead.' },
        { status: 400 }
      );
    }

    await payload.delete({
      collection: 'developments',
      id,
      user,
    });

    return NextResponse.json({ success: true, message: 'Development deleted' });
  } catch (error) {
    console.error('Sponsor development DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete development' },
      { status: 500 }
    );
  }
}
