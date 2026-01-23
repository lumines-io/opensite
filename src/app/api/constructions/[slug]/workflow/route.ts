import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { requireVerifiedUser, isAuthError } from '@/lib/auth';
import {
  canTransition,
  getNextStatus,
  getAvailableActions,
  type ApprovalStatus,
  type WorkflowAction,
  WORKFLOW_ACTIONS,
} from '@/lib/workflow/private-construction-workflow';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/constructions/[slug]/workflow
 * Get available workflow actions for the current user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug: id } = await params;

  const authResult = await requireVerifiedUser(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const payload = await getPayload({ config });

    const construction = await payload.findByID({
      collection: 'constructions',
      id,
      depth: 1,
    });

    if (!construction) {
      return NextResponse.json({ error: 'Construction not found' }, { status: 404 });
    }

    // Only private constructions have workflow
    if (construction.constructionCategory !== 'private') {
      return NextResponse.json({
        error: 'Workflow only applies to private constructions',
      }, { status: 400 });
    }

    // Check if user has access to this construction's workflow
    const hasAccess = checkWorkflowAccess(construction, user);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const currentStatus = construction.approvalStatus as ApprovalStatus;
    const availableActions = getAvailableActions(currentStatus, user.role);

    return NextResponse.json({
      constructionId: id,
      currentStatus,
      availableActions: availableActions.map((action) => ({
        action,
        label: getActionLabel(action),
      })),
    });
  } catch (error) {
    console.error('Workflow GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get workflow status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/constructions/[slug]/workflow
 * Execute a workflow action
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug: id } = await params;

  const authResult = await requireVerifiedUser(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { action, notes } = body as { action: WorkflowAction; notes?: string };

    if (!action || !Object.values(WORKFLOW_ACTIONS).includes(action)) {
      return NextResponse.json(
        { error: 'Invalid workflow action' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    const construction = await payload.findByID({
      collection: 'constructions',
      id,
      depth: 1,
    });

    if (!construction) {
      return NextResponse.json({ error: 'Construction not found' }, { status: 404 });
    }

    // Only private constructions have workflow
    if (construction.constructionCategory !== 'private') {
      return NextResponse.json({
        error: 'Workflow only applies to private constructions',
      }, { status: 400 });
    }

    // Check if user has access to this construction's workflow
    const hasAccess = checkWorkflowAccess(construction, user);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const currentStatus = construction.approvalStatus as ApprovalStatus;

    // Check if transition is valid
    if (!canTransition(currentStatus, action, user.role)) {
      return NextResponse.json(
        {
          error: `Cannot perform action '${action}' on construction with status '${currentStatus}'`,
          currentStatus,
          userRole: user.role,
        },
        { status: 400 }
      );
    }

    const nextStatus = getNextStatus(currentStatus, action);
    if (!nextStatus) {
      return NextResponse.json(
        { error: 'Invalid transition' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      approvalStatus: nextStatus,
    };

    // Update review metadata based on action
    const review = (construction.review as Record<string, unknown>) || {};

    if (['submit_direct', 'approve_internal', 'resubmit'].includes(action)) {
      // Submission actions
      updateData.review = {
        ...review,
        submittedAt: new Date().toISOString(),
        submittedBy: user.id,
      };
    }

    if (['approve', 'reject', 'request_changes'].includes(action)) {
      // Review actions
      updateData.review = {
        ...review,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.id,
        reviewNotes: notes || review.reviewNotes,
      };

      if (action === 'reject' && notes) {
        updateData.review = {
          ...(updateData.review as Record<string, unknown>),
          internalNotes: notes,
        };
      }
    }

    if (notes && ['return_to_draft', 'request_changes', 'reject'].includes(action)) {
      updateData.review = {
        ...(updateData.review as Record<string, unknown> || review),
        internalNotes: notes,
      };
    }

    // Perform the update
    const updatedConstruction = await payload.update({
      collection: 'constructions',
      id,
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      constructionId: id,
      previousStatus: currentStatus,
      currentStatus: nextStatus,
      action,
      updatedAt: updatedConstruction.updatedAt,
    });
  } catch (error) {
    console.error('Workflow POST error:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow action' },
      { status: 500 }
    );
  }
}

/**
 * Check if a user has access to the workflow for a construction
 */
function checkWorkflowAccess(
  construction: Record<string, unknown>,
  user: { id: string; role: string; organization?: string | number | null }
): boolean {
  // Admin and moderator have full access
  if (['admin', 'moderator'].includes(user.role)) {
    return true;
  }

  // Sponsor users can only access their own org's constructions
  if (['sponsor_admin', 'sponsor_user'].includes(user.role)) {
    const constructionOrg = construction.organization;
    const userOrg = user.organization;

    if (!userOrg) return false;

    // Handle if organization is an object or just an ID
    const constructionOrgId =
      typeof constructionOrg === 'object' && constructionOrg !== null
        ? (constructionOrg as Record<string, unknown>).id
        : constructionOrg;

    return constructionOrgId === userOrg;
  }

  return false;
}

/**
 * Get human-readable label for an action
 */
function getActionLabel(action: WorkflowAction): string {
  const labels: Record<WorkflowAction, string> = {
    submit_internal: 'Submit for Internal Review',
    submit_direct: 'Submit for Platform Review',
    approve_internal: 'Approve for Platform Review',
    return_to_draft: 'Return to Draft',
    withdraw: 'Withdraw Submission',
    resubmit: 'Resubmit for Review',
    start_review: 'Start Review',
    approve: 'Approve',
    reject: 'Reject',
    request_changes: 'Request Changes',
    publish: 'Publish to Map',
    unpublish: 'Unpublish from Map',
  };
  return labels[action] || action;
}
