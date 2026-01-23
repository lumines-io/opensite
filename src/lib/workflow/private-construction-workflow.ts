/**
 * Private Construction Approval Workflow State Machine
 *
 * Workflow states:
 * - draft: Initial state, sponsor is editing
 * - internal_review: Submitted to Sponsor Admin for internal review
 * - submitted: Submitted to platform for approval
 * - under_review: Moderator/Admin is reviewing
 * - changes_requested: Requires changes from sponsor
 * - approved: Approved, ready to publish
 * - rejected: Rejected by moderator/admin
 * - published: Live on the map
 */

export const APPROVAL_STATES = {
  draft: 'draft',
  internal_review: 'internal_review',
  submitted: 'submitted',
  under_review: 'under_review',
  changes_requested: 'changes_requested',
  approved: 'approved',
  rejected: 'rejected',
  published: 'published',
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATES)[keyof typeof APPROVAL_STATES];

export const WORKFLOW_ACTIONS = {
  // Sponsor User actions
  submit_internal: 'submit_internal', // draft -> internal_review
  submit_direct: 'submit_direct', // draft -> submitted (sponsor_admin only)
  resubmit: 'resubmit', // changes_requested/rejected -> submitted

  // Sponsor Admin actions
  approve_internal: 'approve_internal', // internal_review -> submitted
  return_to_draft: 'return_to_draft', // internal_review -> draft
  withdraw: 'withdraw', // submitted/changes_requested -> draft

  // Moderator/Admin actions
  start_review: 'start_review', // submitted -> under_review
  approve: 'approve', // under_review -> approved
  reject: 'reject', // under_review -> rejected
  request_changes: 'request_changes', // under_review -> changes_requested
  publish: 'publish', // approved -> published
  unpublish: 'unpublish', // published -> approved
} as const;

export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[keyof typeof WORKFLOW_ACTIONS];

/**
 * State transitions mapping
 * Maps current state -> action -> next state
 */
export const WORKFLOW_TRANSITIONS: Record<ApprovalStatus, Partial<Record<WorkflowAction, ApprovalStatus>>> = {
  draft: {
    submit_internal: 'internal_review',
    submit_direct: 'submitted',
  },
  internal_review: {
    approve_internal: 'submitted',
    return_to_draft: 'draft',
  },
  submitted: {
    start_review: 'under_review',
    withdraw: 'draft',
  },
  under_review: {
    approve: 'approved',
    reject: 'rejected',
    request_changes: 'changes_requested',
  },
  changes_requested: {
    resubmit: 'submitted',
    withdraw: 'draft',
  },
  approved: {
    publish: 'published',
  },
  rejected: {
    resubmit: 'submitted',
  },
  published: {
    unpublish: 'approved',
  },
};

/**
 * Action permissions mapping
 * Maps action -> allowed roles
 */
export const ACTION_PERMISSIONS: Record<WorkflowAction, string[]> = {
  // Sponsor User can submit for internal review
  submit_internal: ['sponsor_user'],

  // Sponsor Admin can submit directly or approve internal
  submit_direct: ['sponsor_admin'],
  approve_internal: ['sponsor_admin'],
  return_to_draft: ['sponsor_admin'],
  withdraw: ['sponsor_admin'],

  // Both sponsor roles can resubmit
  resubmit: ['sponsor_user', 'sponsor_admin'],

  // Only Moderator/Admin can review
  start_review: ['moderator', 'admin'],
  approve: ['moderator', 'admin'],
  reject: ['moderator', 'admin'],
  request_changes: ['moderator', 'admin'],
  publish: ['moderator', 'admin'],
  unpublish: ['moderator', 'admin'],
};

/**
 * Check if a transition is valid
 */
export function canTransition(
  currentStatus: ApprovalStatus,
  action: WorkflowAction,
  userRole: string
): boolean {
  // Check if action is allowed for this role
  const allowedRoles = ACTION_PERMISSIONS[action];
  if (!allowedRoles || !allowedRoles.includes(userRole)) {
    return false;
  }

  // Check if transition is valid from current state
  const transitions = WORKFLOW_TRANSITIONS[currentStatus];
  if (!transitions || !(action in transitions)) {
    return false;
  }

  return true;
}

/**
 * Get the next status after an action
 */
export function getNextStatus(
  currentStatus: ApprovalStatus,
  action: WorkflowAction
): ApprovalStatus | null {
  const transitions = WORKFLOW_TRANSITIONS[currentStatus];
  if (!transitions) return null;

  return transitions[action] || null;
}

/**
 * Get available actions for a user given the current status
 */
export function getAvailableActions(
  currentStatus: ApprovalStatus,
  userRole: string
): WorkflowAction[] {
  const transitions = WORKFLOW_TRANSITIONS[currentStatus];
  if (!transitions) return [];

  const availableActions: WorkflowAction[] = [];

  for (const action of Object.keys(transitions) as WorkflowAction[]) {
    const allowedRoles = ACTION_PERMISSIONS[action];
    if (allowedRoles && allowedRoles.includes(userRole)) {
      availableActions.push(action);
    }
  }

  return availableActions;
}

/**
 * Get human-readable label for a status
 */
export function getStatusLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    draft: 'Draft',
    internal_review: 'Internal Review',
    submitted: 'Submitted for Review',
    under_review: 'Under Review',
    changes_requested: 'Changes Requested',
    approved: 'Approved',
    rejected: 'Rejected',
    published: 'Published',
  };
  return labels[status] || status;
}

/**
 * Get human-readable label for an action
 */
export function getActionLabel(action: WorkflowAction): string {
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

/**
 * Check if a status is a terminal/final state
 */
export function isTerminalStatus(status: ApprovalStatus): boolean {
  // Rejected is somewhat terminal but allows resubmission
  return status === 'published';
}

/**
 * Check if a status is publicly visible on the map
 */
export function isPubliclyVisible(status: ApprovalStatus): boolean {
  return status === 'published';
}

/**
 * Get the status color for UI display
 */
export function getStatusColor(status: ApprovalStatus): string {
  const colors: Record<ApprovalStatus, string> = {
    draft: 'gray',
    internal_review: 'blue',
    submitted: 'yellow',
    under_review: 'orange',
    changes_requested: 'purple',
    approved: 'green',
    rejected: 'red',
    published: 'emerald',
  };
  return colors[status] || 'gray';
}
