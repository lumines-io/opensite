import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import type { Where } from 'payload';
import config from '@payload-config';
import { requireVerifiedUser, isAuthError } from '@/lib/auth';

/**
 * GET /api/sponsor/constructions
 * Get constructions for the current user's organization
 * Only accessible to sponsor_user and sponsor_admin roles
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const sort = searchParams.get('sort') || '-updatedAt';
    const approvalStatus = searchParams.get('approvalStatus');

    // Build where clause
    const where: Where = {
      and: [
        { constructionCategory: { equals: 'private' } },
        { organization: { equals: user.organization } },
        ...(approvalStatus ? [{ approvalStatus: { equals: approvalStatus } }] : []),
      ],
    };

    const result = await payload.find({
      collection: 'constructions',
      where,
      sort,
      page,
      limit,
      depth: 1, // Include related data like district
    });

    return NextResponse.json({
      docs: result.docs,
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      page: result.page,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    });
  } catch (error) {
    console.error('Sponsor constructions GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch constructions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sponsor/constructions
 * Create a new private construction for the sponsor's organization
 */
export async function POST(request: NextRequest) {
  const authResult = await requireVerifiedUser(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  // Check if user is a sponsor role
  if (!['sponsor_user', 'sponsor_admin'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Access denied. Only sponsor users can create constructions.' },
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
    const body = await request.json();

    // Force private category and set organization
    const constructionData = {
      ...body,
      constructionCategory: 'private',
      organization: user.organization,
      approvalStatus: body.approvalStatus || 'draft',
    };

    const result = await payload.create({
      collection: 'constructions',
      data: constructionData,
      user,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Sponsor constructions POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create construction' },
      { status: 500 }
    );
  }
}
