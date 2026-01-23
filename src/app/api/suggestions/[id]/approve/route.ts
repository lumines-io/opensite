import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { approveSuggestion } from '@/lib/workflow/suggestion-workflow-actions';

/**
 * POST /api/suggestions/[id]/approve
 *
 * Approve a suggestion that is currently under review.
 * This will automatically merge the suggestion data into the target construction
 * and create a changelog entry.
 *
 * Required: User must be a moderator or admin
 * Required: Suggestion must be in 'under_review' status
 *
 * Request body (optional):
 * {
 *   "reviewNotes": "Optional notes about the approval"
 * }
 *
 * Response:
 * - 200: Success with updated suggestion, construction, and changelog
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

    // Parse request body for optional review notes
    let reviewNotes: string | undefined;
    try {
      const body = await request.json();
      reviewNotes = body.reviewNotes;
    } catch {
      // No body or invalid JSON is fine
    }

    // Execute the approve action
    const result = await approveSuggestion(id, user.id, userRole, reviewNotes);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      message: 'Suggestion approved and merged successfully',
      suggestion: result.suggestion,
      construction: result.construction,
      changelog: result.changelog,
    });
  } catch (error) {
    console.error('Approve suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to approve suggestion' },
      { status: 500 }
    );
  }
}
