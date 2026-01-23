import { getPayload } from 'payload';
import config from '@payload-config';
import {
  SuggestionStatus,
  WorkflowAction,
  transition,
  canPerformAction,
} from './suggestion-state-machine';
import { sendNotification, NotificationType } from './notification-service';

export interface WorkflowActionResult {
  success: boolean;
  suggestion?: Record<string, unknown>;
  construction?: Record<string, unknown>;
  changelog?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}

export interface WorkflowActionParams {
  suggestionId: string | number;
  action: WorkflowAction;
  userId: string | number;
  userRole: 'contributor' | 'moderator' | 'admin';
  reviewNotes?: string;
}

/**
 * Execute a workflow action on a suggestion
 */
export async function executeWorkflowAction(
  params: WorkflowActionParams
): Promise<WorkflowActionResult> {
  const { suggestionId, action, userId, userRole, reviewNotes } = params;

  // Check role permission
  if (!canPerformAction(userRole, action)) {
    return {
      success: false,
      error: `Insufficient permissions to ${action}`,
      statusCode: 403,
    };
  }

  const payload = await getPayload({ config });

  // Fetch the suggestion
  let suggestion;
  try {
    suggestion = await payload.findByID({
      collection: 'suggestions',
      id: suggestionId,
      depth: 2,
    });
  } catch {
    return {
      success: false,
      error: 'Suggestion not found',
      statusCode: 404,
    };
  }

  if (!suggestion) {
    return {
      success: false,
      error: 'Suggestion not found',
      statusCode: 404,
    };
  }

  const currentStatus = suggestion.status as SuggestionStatus;

  // For resubmit action, verify the user is the original submitter or a moderator/admin
  if (action === 'resubmit') {
    const submitterId =
      typeof suggestion.submittedBy === 'object'
        ? suggestion.submittedBy?.id
        : suggestion.submittedBy;
    if (userRole === 'contributor' && submitterId !== userId) {
      return {
        success: false,
        error: 'Only the original submitter can resubmit this suggestion',
        statusCode: 403,
      };
    }
  }

  // Attempt state transition
  const transitionResult = transition(currentStatus, action);
  if (!transitionResult.success || !transitionResult.newStatus) {
    return {
      success: false,
      error: transitionResult.error,
      statusCode: 400,
    };
  }

  const newStatus = transitionResult.newStatus;

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status: newStatus,
  };

  // Set reviewer info on approval/rejection/changes_requested
  if (['approved', 'rejected', 'changes_requested'].includes(newStatus)) {
    updateData.reviewedBy = userId;
    updateData.reviewedAt = new Date().toISOString();
  }

  // Add review notes if provided
  if (reviewNotes) {
    updateData.reviewNotes = reviewNotes;
  }

  // Update the suggestion
  const updatedSuggestion = await payload.update({
    collection: 'suggestions',
    id: suggestionId,
    data: updateData,
  });

  const result: WorkflowActionResult = {
    success: true,
    suggestion: updatedSuggestion,
  };

  // Send notification about status change
  const submitterId =
    typeof suggestion.submittedBy === 'object'
      ? suggestion.submittedBy?.id
      : suggestion.submittedBy;

  if (submitterId) {
    await sendNotification({
      type: getNotificationType(newStatus),
      recipientId: submitterId,
      suggestionId: suggestionId,
      suggestionTitle: suggestion.title as string,
      reviewNotes,
      reviewerId: userId,
    });
  }

  // If approved, merge into construction
  if (newStatus === 'approved') {
    const mergeResult = await mergeSuggestionIntoConstruction(
      suggestionId,
      suggestion,
      userId,
      payload
    );
    if (mergeResult.success) {
      result.construction = mergeResult.construction;
      result.changelog = mergeResult.changelog;
      result.suggestion = mergeResult.suggestion;
    } else {
      // Rollback status on merge failure
      await payload.update({
        collection: 'suggestions',
        id: suggestionId,
        data: { status: currentStatus },
      });
      return {
        success: false,
        error: `Approval succeeded but merge failed: ${mergeResult.error}`,
        statusCode: 500,
      };
    }
  }

  return result;
}

function getNotificationType(status: SuggestionStatus): NotificationType {
  switch (status) {
    case 'under_review':
      return 'review_started';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'changes_requested':
      return 'changes_requested';
    case 'merged':
      return 'merged';
    default:
      return 'status_changed';
  }
}

/**
 * Merge suggestion data into target construction and create changelog
 */
async function mergeSuggestionIntoConstruction(
  suggestionId: string | number,
  suggestion: Record<string, unknown>,
  userId: string | number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
): Promise<WorkflowActionResult> {
  const suggestionType = suggestion.suggestionType as string;
  const proposedData = suggestion.proposedData as Record<string, unknown>;
  const proposedGeometry = suggestion.proposedGeometry as Record<string, unknown> | null;

  let constructionId = suggestion.construction;
  if (typeof constructionId === 'object' && constructionId !== null) {
    constructionId = (constructionId as Record<string, unknown>).id;
  }

  let construction;
  let changelog;

  try {
    if (suggestionType === 'create') {
      // Create new construction
      const newConstructionData: Record<string, unknown> = {
        ...proposedData,
        _status: 'published',
      };

      if (proposedGeometry) {
        newConstructionData.geometry = proposedGeometry;
      }

      construction = await payload.create({
        collection: 'constructions',
        data: newConstructionData,
      });

      // Create changelog entry for new construction
      changelog = await payload.create({
        collection: 'construction-changelog',
        data: {
          title: `New project created from suggestion: ${suggestion.title}`,
          construction: construction.id,
          changeType: 'other',
          description: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'text',
                      text: `This project was created from a community suggestion. ${suggestion.justification || ''}`,
                    },
                  ],
                },
              ],
            },
          },
          eventDate: new Date().toISOString(),
          author: userId,
          source: {
            url:
              (suggestion.evidenceUrls as Array<{ url: string }> | undefined)?.[0]?.url || null,
            title: 'Community Suggestion',
          },
        },
      });

      // Update suggestion with the new construction reference
      constructionId = construction.id;
    } else if (constructionId) {
      // Fetch existing construction
      const existingConstruction = await payload.findByID({
        collection: 'constructions',
        id: constructionId,
      });

      if (!existingConstruction) {
        return {
          success: false,
          error: 'Target construction not found',
        };
      }

      // Determine what's changing for the changelog
      const changelogData = determineChangelogEntry(
        existingConstruction,
        proposedData,
        suggestionType,
        suggestion
      );

      // Update construction
      const updatePayload: Record<string, unknown> = { ...proposedData };
      if (proposedGeometry) {
        updatePayload.geometry = proposedGeometry;
      }

      construction = await payload.update({
        collection: 'constructions',
        id: constructionId,
        data: updatePayload,
      });

      // Create changelog entry
      changelog = await payload.create({
        collection: 'construction-changelog',
        data: {
          ...changelogData,
          construction: constructionId,
          eventDate: new Date().toISOString(),
          author: userId,
          source: {
            url:
              (suggestion.evidenceUrls as Array<{ url: string }> | undefined)?.[0]?.url || null,
            title: 'Community Suggestion',
          },
        },
      });
    }

    // Update suggestion to merged status with merge info
    const updatedSuggestion = await payload.update({
      collection: 'suggestions',
      id: suggestionId,
      data: {
        status: 'merged',
        mergedAt: new Date().toISOString(),
        mergedVersion: construction?.currentVersion || 1,
        construction: constructionId,
      },
    });

    // Send merge notification
    const submitterId =
      typeof suggestion.submittedBy === 'object'
        ? (suggestion.submittedBy as Record<string, unknown>)?.id
        : suggestion.submittedBy;

    if (submitterId) {
      await sendNotification({
        type: 'merged',
        recipientId: submitterId as string | number,
        suggestionId: suggestionId,
        suggestionTitle: suggestion.title as string,
        constructionId: constructionId as string | number,
        constructionTitle: construction?.title as string,
      });
    }

    return {
      success: true,
      construction,
      changelog,
      suggestion: updatedSuggestion,
    };
  } catch (error) {
    console.error('Merge error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown merge error',
    };
  }
}

/**
 * Determine the appropriate changelog entry based on what changed
 */
function determineChangelogEntry(
  existingConstruction: Record<string, unknown>,
  proposedData: Record<string, unknown>,
  suggestionType: string,
  suggestion: Record<string, unknown>
): Record<string, unknown> {
  const changelogEntry: Record<string, unknown> = {
    title: `Updated from suggestion: ${suggestion.title}`,
    changeType: 'other',
  };

  // Check for status changes
  if (
    proposedData.constructionStatus &&
    proposedData.constructionStatus !== existingConstruction.constructionStatus
  ) {
    changelogEntry.changeType = 'status';
    changelogEntry.statusChange = {
      previousStatus: existingConstruction.constructionStatus,
      newStatus: proposedData.constructionStatus,
    };
    changelogEntry.title = `Status changed to ${proposedData.constructionStatus}`;
  }
  // Check for progress changes
  else if (
    proposedData.progress !== undefined &&
    proposedData.progress !== existingConstruction.progress
  ) {
    changelogEntry.changeType = 'progress';
    changelogEntry.progressChange = {
      previousProgress: existingConstruction.progress,
      newProgress: proposedData.progress,
    };
    changelogEntry.title = `Progress updated to ${proposedData.progress}%`;
  }
  // Check for timeline changes
  else if (proposedData.expectedEndDate || proposedData.startDate || proposedData.actualEndDate) {
    changelogEntry.changeType = 'timeline';
    if (
      proposedData.expectedEndDate &&
      proposedData.expectedEndDate !== existingConstruction.expectedEndDate
    ) {
      changelogEntry.timelineChange = {
        field: 'expectedEndDate',
        previousDate: existingConstruction.expectedEndDate,
        newDate: proposedData.expectedEndDate,
      };
      changelogEntry.title = 'Expected end date updated';
    } else if (proposedData.startDate && proposedData.startDate !== existingConstruction.startDate) {
      changelogEntry.timelineChange = {
        field: 'startDate',
        previousDate: existingConstruction.startDate,
        newDate: proposedData.startDate,
      };
      changelogEntry.title = 'Start date updated';
    }
  }
  // Completion suggestion
  else if (suggestionType === 'complete') {
    changelogEntry.changeType = 'milestone';
    changelogEntry.milestone = {
      milestoneName: 'Project Completed',
      milestoneDate: new Date().toISOString(),
    };
    changelogEntry.title = 'Project marked as completed';
  }

  // Add description from justification
  if (suggestion.justification) {
    changelogEntry.description = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: suggestion.justification as string,
              },
            ],
          },
        ],
      },
    };
  }

  return changelogEntry;
}

/**
 * Helper to start a review
 */
export async function startReview(
  suggestionId: string | number,
  userId: string | number,
  userRole: 'contributor' | 'moderator' | 'admin'
): Promise<WorkflowActionResult> {
  return executeWorkflowAction({
    suggestionId,
    action: 'start_review',
    userId,
    userRole,
  });
}

/**
 * Helper to approve a suggestion (automatically merges)
 */
export async function approveSuggestion(
  suggestionId: string | number,
  userId: string | number,
  userRole: 'contributor' | 'moderator' | 'admin',
  reviewNotes?: string
): Promise<WorkflowActionResult> {
  return executeWorkflowAction({
    suggestionId,
    action: 'approve',
    userId,
    userRole,
    reviewNotes,
  });
}

/**
 * Helper to reject a suggestion
 */
export async function rejectSuggestion(
  suggestionId: string | number,
  userId: string | number,
  userRole: 'contributor' | 'moderator' | 'admin',
  reviewNotes?: string
): Promise<WorkflowActionResult> {
  return executeWorkflowAction({
    suggestionId,
    action: 'reject',
    userId,
    userRole,
    reviewNotes,
  });
}

/**
 * Helper to request changes
 */
export async function requestChanges(
  suggestionId: string | number,
  userId: string | number,
  userRole: 'contributor' | 'moderator' | 'admin',
  reviewNotes: string
): Promise<WorkflowActionResult> {
  if (!reviewNotes) {
    return {
      success: false,
      error: 'Review notes are required when requesting changes',
      statusCode: 400,
    };
  }
  return executeWorkflowAction({
    suggestionId,
    action: 'request_changes',
    userId,
    userRole,
    reviewNotes,
  });
}
