/**
 * Suggestion Approval Workflow State Machine
 *
 * States:
 * - pending: Initial state when suggestion is submitted
 * - under_review: A moderator has started reviewing the suggestion
 * - changes_requested: Reviewer wants changes before approval
 * - approved: Suggestion approved and ready for merge
 * - rejected: Suggestion declined
 * - merged: Suggestion data has been applied to construction
 * - superseded: Another suggestion has replaced this one
 */

export type SuggestionStatus =
  | 'pending'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'merged'
  | 'superseded';

export type WorkflowAction =
  | 'start_review'
  | 'approve'
  | 'reject'
  | 'request_changes'
  | 'resubmit'
  | 'merge'
  | 'supersede';

export interface TransitionResult {
  success: boolean;
  newStatus?: SuggestionStatus;
  error?: string;
}

/**
 * Valid state transitions map
 * Key: current status
 * Value: Map of action to target status
 */
const STATE_TRANSITIONS: Record<
  SuggestionStatus,
  Partial<Record<WorkflowAction, SuggestionStatus>>
> = {
  pending: {
    start_review: 'under_review',
  },
  under_review: {
    approve: 'approved',
    reject: 'rejected',
    request_changes: 'changes_requested',
  },
  changes_requested: {
    resubmit: 'under_review',
    reject: 'rejected',
    supersede: 'superseded',
  },
  approved: {
    merge: 'merged',
    reject: 'rejected', // Can still reject before merge if needed
  },
  rejected: {
    // Terminal state - no transitions out
  },
  merged: {
    // Terminal state - no transitions out
  },
  superseded: {
    // Terminal state - no transitions out
  },
};

/**
 * Human-readable action labels
 */
export const ACTION_LABELS: Record<WorkflowAction, string> = {
  start_review: 'Start Review',
  approve: 'Approve',
  reject: 'Reject',
  request_changes: 'Request Changes',
  resubmit: 'Resubmit',
  merge: 'Merge',
  supersede: 'Supersede',
};

/**
 * Human-readable status labels
 */
export const STATUS_LABELS: Record<SuggestionStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  merged: 'Merged',
  superseded: 'Superseded',
};

/**
 * Check if a transition is valid
 */
export function canTransition(
  currentStatus: SuggestionStatus,
  action: WorkflowAction
): boolean {
  const transitions = STATE_TRANSITIONS[currentStatus];
  return transitions !== undefined && action in transitions;
}

/**
 * Get the target status for a transition
 */
export function getTargetStatus(
  currentStatus: SuggestionStatus,
  action: WorkflowAction
): SuggestionStatus | null {
  const transitions = STATE_TRANSITIONS[currentStatus];
  if (!transitions || !(action in transitions)) {
    return null;
  }
  return transitions[action] || null;
}

/**
 * Attempt a state transition
 */
export function transition(
  currentStatus: SuggestionStatus,
  action: WorkflowAction
): TransitionResult {
  const targetStatus = getTargetStatus(currentStatus, action);

  if (!targetStatus) {
    return {
      success: false,
      error: `Invalid transition: cannot ${ACTION_LABELS[action].toLowerCase()} a suggestion in '${STATUS_LABELS[currentStatus]}' status`,
    };
  }

  return {
    success: true,
    newStatus: targetStatus,
  };
}

/**
 * Get available actions for a given status
 */
export function getAvailableActions(status: SuggestionStatus): WorkflowAction[] {
  const transitions = STATE_TRANSITIONS[status];
  if (!transitions) {
    return [];
  }
  return Object.keys(transitions) as WorkflowAction[];
}

/**
 * Check if a status is a terminal state (no further transitions)
 */
export function isTerminalState(status: SuggestionStatus): boolean {
  return getAvailableActions(status).length === 0;
}

/**
 * Role-based action permissions
 */
export const ACTION_PERMISSIONS: Record<WorkflowAction, ('contributor' | 'moderator' | 'admin')[]> = {
  start_review: ['moderator', 'admin'],
  approve: ['moderator', 'admin'],
  reject: ['moderator', 'admin'],
  request_changes: ['moderator', 'admin'],
  resubmit: ['contributor', 'moderator', 'admin'], // Original submitter can resubmit
  merge: ['moderator', 'admin'],
  supersede: ['moderator', 'admin'],
};

/**
 * Check if a user role can perform an action
 */
export function canPerformAction(
  role: 'contributor' | 'moderator' | 'admin' | undefined,
  action: WorkflowAction
): boolean {
  if (!role) return false;
  return ACTION_PERMISSIONS[action].includes(role);
}
