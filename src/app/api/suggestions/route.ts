import { NextRequest, NextResponse } from 'next/server';
import { getPayload, type Where } from 'payload';
import config from '@payload-config';
import { cookies } from 'next/headers';
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';

// Suggestion type validation
const VALID_SUGGESTION_TYPES = ['create', 'update', 'complete', 'correction'] as const;
const VALID_CONSTRUCTION_TYPES = ['road', 'highway', 'metro', 'bridge', 'tunnel', 'interchange', 'station', 'other'] as const;

interface SuggestionInput {
  title: string;
  description?: string;
  suggestionType: (typeof VALID_SUGGESTION_TYPES)[number];
  constructionType?: (typeof VALID_CONSTRUCTION_TYPES)[number];
  construction?: number; // ID for update/complete/correction
  proposedGeometry?: GeoJSON.Geometry | null;
  locationDescription?: string;
  justification?: string;
  evidenceUrls?: { url: string }[];
  proposedData: {
    title?: string;
    description?: string;
    constructionType?: string;
    constructionStatus?: string;
    progress?: number;
    startDate?: string;
    expectedEndDate?: string;
    contractor?: string;
    budget?: number;
    fundingSource?: string;
  };
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validateGeometry(geometry: unknown): geometry is GeoJSON.Geometry {
  if (!geometry || typeof geometry !== 'object') return false;
  const geo = geometry as Record<string, unknown>;
  const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
  return validTypes.includes(geo.type as string) && Array.isArray(geo.coordinates);
}

function validateInput(data: unknown): { valid: true; data: SuggestionInput } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const input = data as Record<string, unknown>;

  // Required: title
  if (!input.title || typeof input.title !== 'string' || input.title.trim().length < 3) {
    return { valid: false, error: 'Title is required and must be at least 3 characters' };
  }

  // Required: suggestionType
  if (!input.suggestionType || !VALID_SUGGESTION_TYPES.includes(input.suggestionType as typeof VALID_SUGGESTION_TYPES[number])) {
    return { valid: false, error: `suggestionType must be one of: ${VALID_SUGGESTION_TYPES.join(', ')}` };
  }

  // For update/complete/correction, construction ID is required
  if (input.suggestionType !== 'create' && !input.construction) {
    return { valid: false, error: 'construction ID is required for update/complete/correction suggestions' };
  }

  // Required: proposedData
  if (!input.proposedData || typeof input.proposedData !== 'object') {
    return { valid: false, error: 'proposedData is required' };
  }

  // Validate proposedGeometry if provided
  if (input.proposedGeometry !== undefined && input.proposedGeometry !== null) {
    if (!validateGeometry(input.proposedGeometry)) {
      return { valid: false, error: 'proposedGeometry must be a valid GeoJSON geometry' };
    }
  }

  // Validate evidenceUrls if provided
  if (input.evidenceUrls) {
    if (!Array.isArray(input.evidenceUrls)) {
      return { valid: false, error: 'evidenceUrls must be an array' };
    }
    for (const item of input.evidenceUrls) {
      if (!item.url || typeof item.url !== 'string' || !validateUrl(item.url)) {
        return { valid: false, error: 'Each evidenceUrl must have a valid URL' };
      }
    }
  }

  // Validate constructionType for new projects
  if (input.suggestionType === 'create') {
    const proposedData = input.proposedData as Record<string, unknown>;
    if (proposedData.constructionType && !VALID_CONSTRUCTION_TYPES.includes(proposedData.constructionType as typeof VALID_CONSTRUCTION_TYPES[number])) {
      return { valid: false, error: `constructionType must be one of: ${VALID_CONSTRUCTION_TYPES.join(', ')}` };
    }
  }

  return {
    valid: true,
    data: {
      title: (input.title as string).trim(),
      description: typeof input.description === 'string' ? input.description.trim() : undefined,
      suggestionType: input.suggestionType as SuggestionInput['suggestionType'],
      construction: typeof input.construction === 'number' ? input.construction : undefined,
      proposedGeometry: input.proposedGeometry as GeoJSON.Geometry | null | undefined,
      locationDescription: typeof input.locationDescription === 'string' ? input.locationDescription.trim() : undefined,
      justification: typeof input.justification === 'string' ? input.justification.trim() : undefined,
      evidenceUrls: input.evidenceUrls as { url: string }[] | undefined,
      proposedData: input.proposedData as SuggestionInput['proposedData'],
    },
  };
}

export async function POST(request: NextRequest) {
  // Check if community suggestions are enabled
  if (!isFeatureEnabled(FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS)) {
    return NextResponse.json(
      {
        error: 'Feature Disabled',
        message: 'Community suggestions are currently disabled. Please try again later.',
      },
      { status: 403 }
    );
  }

  try {
    const payload = await getPayload({ config });

    // Get authenticated user from session
    const cookieStore = await cookies();
    const token = cookieStore.get('payload-token')?.value;

    let user = null;
    if (token) {
      try {
        const authResult = await payload.auth({ headers: request.headers });
        user = authResult.user;
      } catch {
        // Token invalid or expired - continue as anonymous
      }
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const input = validation.data;

    // If referencing an existing construction, verify it exists
    if (input.construction) {
      try {
        await payload.findByID({
          collection: 'constructions',
          id: input.construction,
        });
      } catch {
        return NextResponse.json(
          { error: 'Referenced construction not found' },
          { status: 404 }
        );
      }
    }

    // Create the suggestion
    const suggestion = await payload.create({
      collection: 'suggestions',
      data: {
        title: input.title,
        suggestionType: input.suggestionType,
        construction: input.construction,
        proposedData: input.proposedData,
        proposedGeometry: input.proposedGeometry || undefined,
        locationDescription: input.locationDescription,
        justification: input.justification,
        evidenceUrls: input.evidenceUrls,
        status: 'pending',
        sourceType: 'community',
        submittedBy: user?.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        id: suggestion.id,
        message: 'Suggestion submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Suggestion submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit suggestion' },
      { status: 500 }
    );
  }
}

// GET endpoint - supports both user's own suggestions and moderator queue
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config });

    // Get authenticated user from session
    const cookieStore = await cookies();
    const token = cookieStore.get('payload-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let user = null;
    try {
      const authResult = await payload.auth({ headers: request.headers });
      user = authResult.user;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const status = searchParams.get('status');
    const isModerator = ['admin', 'moderator'].includes(user.role as string);

    // Moderator-specific query params
    const suggestionType = searchParams.get('type');
    const sourceType = searchParams.get('sourceType');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const assignedTo = searchParams.get('assignedTo');

    // Build query conditions
    const conditions: Where[] = [];

    // If not admin/moderator, filter to own suggestions only
    if (!isModerator) {
      conditions.push({ submittedBy: { equals: user.id } });
    }

    // Status filter
    if (status) {
      const validStatuses = ['pending', 'under_review', 'changes_requested', 'approved', 'rejected', 'merged', 'superseded'];
      // Support comma-separated status values (e.g., "pending,under_review")
      const statuses = status.split(',').map((s) => s.trim()).filter(s => validStatuses.includes(s));
      if (statuses.length === 1) {
        conditions.push({ status: { equals: statuses[0] } });
      } else if (statuses.length > 1) {
        conditions.push({ status: { in: statuses } });
      }
    }

    // Moderator-only filters
    if (isModerator) {
      if (suggestionType) {
        conditions.push({ suggestionType: { equals: suggestionType } });
      }

      if (sourceType) {
        conditions.push({ sourceType: { equals: sourceType } });
      }

      if (assignedTo) {
        if (assignedTo === 'unassigned') {
          conditions.push({ assignedTo: { exists: false } });
        } else if (assignedTo === 'me') {
          conditions.push({ assignedTo: { equals: user.id } });
        } else {
          conditions.push({ assignedTo: { equals: assignedTo } });
        }
      }
    }

    const where: Where = conditions.length > 0 ? { and: conditions } : {};

    // Build sort string
    const sort = `${sortOrder === 'desc' ? '-' : ''}${sortBy}`;

    const { docs, totalDocs, totalPages, hasNextPage, hasPrevPage } = await payload.find({
      collection: 'suggestions',
      where,
      page,
      limit,
      sort,
      depth: isModerator ? 2 : 1, // Include more related data for moderators
    });

    // For regular users, return simplified data
    const suggestions = isModerator
      ? docs
      : docs.map((doc) => ({
          id: doc.id,
          title: doc.title,
          suggestionType: doc.suggestionType,
          status: doc.status,
          createdAt: doc.createdAt,
          construction: doc.construction,
        }));

    return NextResponse.json({
      suggestions,
      pagination: {
        page,
        limit,
        totalDocs,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error('Suggestions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
