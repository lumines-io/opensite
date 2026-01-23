import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { rejectSuggestion } from '@/lib/workflow/suggestion-workflow-actions';

/**
 * POST /api/suggestions/[id]/reject
 *
 * Reject a suggestion that is currently under review.
 *
 * Required: User must be a moderator or admin
 * Required: Suggestion must be in 'under_review', 'changes_requested', or 'approved' status
 *
 * Request body (recommended):
 * {
 *   "reviewNotes": "Reason for rejection"
 * }
 *
 * Response:
 * - 200: Success with updated suggestion
 * - 400: Invalid state transition
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

    // Parse request body for review notes
    let reviewNotes: string | undefined;
    try {
      const body = await request.json();
      reviewNotes = body.reviewNotes;
    } catch {
      // No body or invalid JSON is fine
    }

    // Execute the reject action
    const result = await rejectSuggestion(id, user.id, userRole, reviewNotes);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      message: 'Suggestion rejected',
      suggestion: result.suggestion,
    });
  } catch (error) {
    console.error('Reject suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to reject suggestion' },
      { status: 500 }
    );
  }
}
