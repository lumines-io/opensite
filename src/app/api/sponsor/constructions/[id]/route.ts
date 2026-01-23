import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { requireVerifiedUser, isAuthError } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/sponsor/constructions/[id]
 * Get a specific construction for the current user's organization
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

    const construction = await payload.findByID({
      collection: 'constructions',
      id,
      depth: 2, // Include related data like district, organization, users
    });

    if (!construction) {
      return NextResponse.json({ error: 'Construction not found' }, { status: 404 });
    }

    // Check if the construction belongs to the user's organization
    const constructionOrgId =
      typeof construction.organization === 'object' && construction.organization !== null
        ? construction.organization.id
        : construction.organization;

    if (constructionOrgId !== user.organization) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify it's a private construction
    if (construction.constructionCategory !== 'private') {
      return NextResponse.json(
        { error: 'This is not a private construction' },
        { status: 400 }
      );
    }

    return NextResponse.json(construction);
  } catch (error) {
    console.error('Sponsor construction GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch construction' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sponsor/constructions/[id]
 * Update a construction for the current user's organization
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
      { error: 'Access denied. Only sponsor users can update constructions.' },
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
    const existingConstruction = await payload.findByID({
      collection: 'constructions',
      id,
      depth: 1,
    });

    if (!existingConstruction) {
      return NextResponse.json({ error: 'Construction not found' }, { status: 404 });
    }

    // Check if the construction belongs to the user's organization
    const constructionOrgId =
      typeof existingConstruction.organization === 'object' &&
      existingConstruction.organization !== null
        ? existingConstruction.organization.id
        : existingConstruction.organization;

    if (constructionOrgId !== user.organization) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify it's a private construction
    if (existingConstruction.constructionCategory !== 'private') {
      return NextResponse.json(
        { error: 'This is not a private construction' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Prevent changing certain fields
    const protectedFields = [
      'constructionCategory',
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
      collection: 'constructions',
      id,
      data: updateData,
      user,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Sponsor construction PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update construction' },
      { status: 500 }
    );
  }
}
