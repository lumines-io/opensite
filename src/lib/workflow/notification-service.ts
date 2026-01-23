import { getPayload } from 'payload';
import config from '@payload-config';
import { workflowLogger } from '@/lib/persistent-logger';

export type NotificationType =
  | 'review_started'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'merged'
  | 'status_changed';

export interface NotificationParams {
  type: NotificationType;
  recipientId: string | number;
  suggestionId: string | number;
  suggestionTitle: string;
  reviewNotes?: string;
  reviewerId?: string | number;
  constructionId?: string | number;
  constructionTitle?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  suggestionId: string | number;
  constructionId?: string | number;
  recipientId: string | number;
  reviewerId?: string | number;
  createdAt: string;
  read: boolean;
}

const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  { title: string; message: (params: NotificationParams) => string }
> = {
  review_started: {
    title: 'Review Started',
    message: (p) => `Your suggestion "${p.suggestionTitle}" is now being reviewed.`,
  },
  approved: {
    title: 'Suggestion Approved',
    message: (p) =>
      `Your suggestion "${p.suggestionTitle}" has been approved!${p.reviewNotes ? ` Note: ${p.reviewNotes}` : ''}`,
  },
  rejected: {
    title: 'Suggestion Rejected',
    message: (p) =>
      `Your suggestion "${p.suggestionTitle}" was not approved.${p.reviewNotes ? ` Reason: ${p.reviewNotes}` : ''}`,
  },
  changes_requested: {
    title: 'Changes Requested',
    message: (p) =>
      `Changes have been requested for your suggestion "${p.suggestionTitle}".${p.reviewNotes ? ` Details: ${p.reviewNotes}` : ''}`,
  },
  merged: {
    title: 'Suggestion Merged',
    message: (p) =>
      `Your suggestion "${p.suggestionTitle}" has been merged into ${p.constructionTitle || 'the construction project'}!`,
  },
  status_changed: {
    title: 'Status Update',
    message: (p) => `The status of your suggestion "${p.suggestionTitle}" has been updated.`,
  },
};

/**
 * In-memory notification store for development
 * In production, this should be replaced with a database collection or external service
 */
const notificationStore: Notification[] = [];

/**
 * Send a notification to a user
 */
export async function sendNotification(params: NotificationParams): Promise<Notification> {
  const template = NOTIFICATION_TEMPLATES[params.type];

  const notification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: params.type,
    title: template.title,
    message: template.message(params),
    suggestionId: params.suggestionId,
    constructionId: params.constructionId,
    recipientId: params.recipientId,
    reviewerId: params.reviewerId,
    createdAt: new Date().toISOString(),
    read: false,
  };

  // Store notification
  notificationStore.push(notification);

  // Log notification
  workflowLogger.info('Notification sent', {
    recipient: params.recipientId,
    type: params.type,
    title: notification.title,
    message: notification.message,
  });

  // Try to send email notification if user has email
  await sendEmailNotification(params, notification);

  return notification;
}

/**
 * Send email notification (placeholder for email service integration)
 */
async function sendEmailNotification(
  params: NotificationParams,
  notification: Notification
): Promise<void> {
  try {
    const payload = await getPayload({ config });

    // Fetch recipient user to get their email
    const user = await payload.findByID({
      collection: 'users',
      id: params.recipientId,
    });

    if (user?.email) {
      // In production, integrate with an email service like SendGrid, Resend, etc.
      // For now, just log the email that would be sent
      workflowLogger.info('Email notification queued', {
        to: user.email,
        subject: notification.title,
        body: notification.message,
      });

      // Example integration point for email service:
      // await emailService.send({
      //   to: user.email,
      //   subject: notification.title,
      //   html: generateEmailTemplate(notification),
      // });
    }
  } catch (error) {
    // Don't fail the main operation if email fails
    workflowLogger.error('Failed to send email notification', error instanceof Error ? error : String(error), { recipientId: params.recipientId });
  }
}

/**
 * Get notifications for a user
 */
export function getNotificationsForUser(
  userId: string | number,
  options?: { unreadOnly?: boolean; limit?: number }
): Notification[] {
  let notifications = notificationStore.filter(
    (n) => n.recipientId === userId || n.recipientId.toString() === userId.toString()
  );

  if (options?.unreadOnly) {
    notifications = notifications.filter((n) => !n.read);
  }

  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (options?.limit) {
    notifications = notifications.slice(0, options.limit);
  }

  return notifications;
}

/**
 * Mark a notification as read
 */
export function markNotificationAsRead(notificationId: string): boolean {
  const notification = notificationStore.find((n) => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return true;
  }
  return false;
}

/**
 * Mark all notifications as read for a user
 */
export function markAllNotificationsAsRead(userId: string | number): number {
  let count = 0;
  notificationStore.forEach((n) => {
    if (
      (n.recipientId === userId || n.recipientId.toString() === userId.toString()) &&
      !n.read
    ) {
      n.read = true;
      count++;
    }
  });
  return count;
}

/**
 * Get unread notification count for a user
 */
export function getUnreadNotificationCount(userId: string | number): number {
  return notificationStore.filter(
    (n) =>
      (n.recipientId === userId || n.recipientId.toString() === userId.toString()) && !n.read
  ).length;
}

/**
 * Clear all notifications (for testing)
 */
export function clearAllNotifications(): void {
  notificationStore.length = 0;
}
