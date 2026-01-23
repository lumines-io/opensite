import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import type { Where } from 'payload';
import config from '@payload-config';
import { requireVerifiedUser, isAuthError } from '@/lib/auth';

/**
 * GET /api/sponsor/developments
 * Get developments for the current user's organization
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
    const developmentStatus = searchParams.get('developmentStatus');
    const developmentType = searchParams.get('developmentType');

    // Build where clause
    const conditions: Where[] = [
      { organization: { equals: user.organization } },
    ];

    if (approvalStatus) {
      conditions.push({ approvalStatus: { equals: approvalStatus } });
    }
    if (developmentStatus) {
      conditions.push({ developmentStatus: { equals: developmentStatus } });
    }
    if (developmentType) {
      conditions.push({ developmentType: { equals: developmentType } });
    }

    const where: Where = conditions.length > 1 ? { and: conditions } : conditions[0];

    const result = await payload.find({
      collection: 'developments',
      where,
      sort,
      page,
      limit,
      depth: 1, // Include related data like organization
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
    console.error('Sponsor developments GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch developments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sponsor/developments
 * Create a new development for the sponsor's organization
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
      { error: 'Access denied. Only sponsor users can create developments.' },
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

    // Set organization and default approval status
    const developmentData = {
      ...body,
      organization: user.organization,
      approvalStatus: body.approvalStatus || 'draft',
    };

    const result = await payload.create({
      collection: 'developments',
      data: developmentData,
      user,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Sponsor developments POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create development' },
      { status: 500 }
    );
  }
}
