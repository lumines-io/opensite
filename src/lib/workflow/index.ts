// State Machine
export {
  type SuggestionStatus,
  type WorkflowAction,
  type TransitionResult,
  canTransition,
  getTargetStatus,
  transition,
  getAvailableActions,
  isTerminalState,
  canPerformAction,
  ACTION_LABELS,
  STATUS_LABELS,
  ACTION_PERMISSIONS,
} from './suggestion-state-machine';

// Workflow Actions
export {
  type WorkflowActionResult,
  type WorkflowActionParams,
  executeWorkflowAction,
  startReview,
  approveSuggestion,
  rejectSuggestion,
  requestChanges,
} from './suggestion-workflow-actions';

// Notifications
export {
  type NotificationType,
  type NotificationParams,
  type Notification,
  sendNotification,
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  clearAllNotifications,
} from './notification-service';

// Private Construction Workflow
export {
  APPROVAL_STATES,
  WORKFLOW_ACTIONS as PRIVATE_WORKFLOW_ACTIONS,
  WORKFLOW_TRANSITIONS as PRIVATE_WORKFLOW_TRANSITIONS,
  ACTION_PERMISSIONS as PRIVATE_ACTION_PERMISSIONS,
  canTransition as canPrivateTransition,
  getNextStatus as getPrivateNextStatus,
  getAvailableActions as getPrivateAvailableActions,
  getStatusLabel as getPrivateStatusLabel,
  getActionLabel as getPrivateActionLabel,
  isTerminalStatus as isPrivateTerminalStatus,
  isPubliclyVisible,
  getStatusColor as getPrivateStatusColor,
  type ApprovalStatus,
  type WorkflowAction as PrivateWorkflowAction,
} from './private-construction-workflow';
