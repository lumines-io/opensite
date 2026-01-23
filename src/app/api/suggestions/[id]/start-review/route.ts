import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { startReview } from '@/lib/workflow/suggestion-workflow-actions';

/**
 * POST /api/suggestions/[id]/start-review
 *
 * Start reviewing a pending suggestion.
 * This transitions the suggestion from 'pending' to 'under_review'.
 *
 * Required: User must be a moderator or admin
 * Required: Suggestion must be in 'pending' status
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

    // Execute the start review action
    const result = await startReview(id, user.id, userRole);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    // Also assign the reviewer to the suggestion
    const updatedSuggestion = await payload.update({
      collection: 'suggestions',
      id: id,
      data: {
        assignedTo: user.id,
      },
    });

    return NextResponse.json({
      message: 'Review started',
      suggestion: updatedSuggestion,
    });
  } catch (error) {
    console.error('Start review error:', error);
    return NextResponse.json(
      { error: 'Failed to start review' },
      { status: 500 }
    );
  }
}
