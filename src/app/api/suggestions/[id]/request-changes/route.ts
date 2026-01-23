import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { requestChanges } from '@/lib/workflow/suggestion-workflow-actions';

/**
 * POST /api/suggestions/[id]/request-changes
 *
 * Request changes on a suggestion that is currently under review.
 * The submitter will be notified and can resubmit the suggestion.
 *
 * Required: User must be a moderator or admin
 * Required: Suggestion must be in 'under_review' status
 * Required: reviewNotes must be provided to explain what changes are needed
 *
 * Request body (required):
 * {
 *   "reviewNotes": "Description of required changes"
 * }
 *
 * Response:
 * - 200: Success with updated suggestion
 * - 400: Invalid state transition or missing reviewNotes
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Suggestion not found
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await getPayload({ config });

    // Get current user from Payload auth
    const { user } = await payload.auth({ headers: request.headers });

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userRole = user.role as 'contributor' | 'moderator' | 'admin';

    // Parse request body for review notes (required)
    let reviewNotes: string | undefined;
    try {
      const body = await request.json();
      reviewNotes = body.reviewNotes;
    } catch {
      return NextResponse.json(
        { error: 'Request body is required with reviewNotes' },
        { status: 400 }
      );
    }

    if (!reviewNotes || reviewNotes.trim() === '') {
      return NextResponse.json(
        { error: 'reviewNotes is required when requesting changes' },
        { status: 400 }
      );
    }

    // Execute the request changes action
    const result = await requestChanges(id, user.id, userRole, reviewNotes);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      message: 'Changes requested successfully',
      suggestion: result.suggestion,
    });
  } catch (error) {
    console.error('Request changes error:', error);
    return NextResponse.json(
      { error: 'Failed to request changes' },
      { status: 500 }
    );
  }
}
