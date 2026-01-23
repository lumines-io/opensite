import { getPayload } from 'payload';
import config from '@/payload.config';
import { getLowBalanceLevel } from '../stripe/client';

interface AlertResult {
  sent: boolean;
  level?: 'critical' | 'low' | 'moderate';
  message?: string;
}

/**
 * Check if low balance alert should be sent and send it
 */
export async function checkAndSendLowBalanceAlert(
  organizationId: string,
  currentBalance: number
): Promise<AlertResult> {
  const payload = await getPayload({ config });

  const org = await payload.findByID({
    collection: 'organizations',
    id: organizationId,
  });

  if (!org) {
    return { sent: false, message: 'Organization not found' };
  }

  // Check if alerts are enabled
  if (!org.billing?.lowBalanceAlertEnabled) {
    return { sent: false, message: 'Low balance alerts disabled' };
  }

  const threshold = org.billing?.lowBalanceAlertThreshold ?? 500000;

  // Check if balance is below threshold
  if (currentBalance >= threshold) {
    return { sent: false, message: 'Balance above threshold' };
  }

  // Check if we already sent an alert recently (within 24 hours)
  const lastAlertAt = org.billing?.lastLowBalanceAlertAt;
  if (lastAlertAt) {
    const lastAlertDate = new Date(lastAlertAt);
    const hoursSinceLastAlert = (Date.now() - lastAlertDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastAlert < 24) {
      return { sent: false, message: 'Alert already sent within 24 hours' };
    }
  }

  const level = getLowBalanceLevel(currentBalance);
  if (!level) {
    return { sent: false, message: 'Balance not low enough for alert' };
  }

  // Get billing email
  const billingEmail = org.billing?.billingEmail || org.contactInfo?.email;
  if (!billingEmail) {
    return { sent: false, message: 'No billing email configured' };
  }

  // Send email alert
  try {
    await payload.sendEmail({
      to: billingEmail,
      subject: `[OpenSite] Low Credit Balance Alert - ${level.toUpperCase()}`,
      html: generateLowBalanceEmailHtml({
        organizationName: typeof org.name === 'string' ? org.name : org.name?.vi || org.name?.en || 'Your Organization',
        currentBalance,
        threshold,
        level,
      }),
    });

    // Update last alert timestamp
    await payload.update({
      collection: 'organizations',
      id: organizationId,
      data: {
        billing: {
          ...org.billing,
          lastLowBalanceAlertAt: new Date().toISOString(),
        },
      },
    });

    return { sent: true, level };
  } catch (error) {
    console.error('Failed to send low balance alert:', error);
    return { sent: false, message: 'Failed to send email' };
  }
}

/**
 * Send promotion expiration reminder
 */
export async function sendPromotionExpirationAlert(
  promotionId: string,
  daysRemaining: number
): Promise<AlertResult> {
  const payload = await getPayload({ config });

  const promotion = await payload.findByID({
    collection: 'promotions',
    id: promotionId,
    depth: 2, // Include related construction and organization
  });

  if (!promotion) {
    return { sent: false, message: 'Promotion not found' };
  }

  // Check if alert already sent
  if (promotion.expirationAlertSent) {
    return { sent: false, message: 'Expiration alert already sent' };
  }

  const org = typeof promotion.organization === 'object' ? promotion.organization : null;
  const construction = typeof promotion.construction === 'object' ? promotion.construction : null;

  if (!org || !construction) {
    return { sent: false, message: 'Missing organization or construction data' };
  }

  const billingEmail = org.billing?.billingEmail || org.contactInfo?.email;
  if (!billingEmail) {
    return { sent: false, message: 'No billing email configured' };
  }

  try {
    await payload.sendEmail({
      to: billingEmail,
      subject: `[OpenSite] Promotion Expiring in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
      html: generateExpirationAlertEmailHtml({
        organizationName: typeof org.name === 'string' ? org.name : org.name?.vi || org.name?.en || 'Your Organization',
        constructionTitle: typeof construction.title === 'string' ? construction.title : construction.title?.vi || construction.title?.en || 'Your Construction',
        daysRemaining,
        autoRenew: promotion.autoRenew ?? false,
        endDate: promotion.endDate,
      }),
    });

    // Mark alert as sent
    await payload.update({
      collection: 'promotions',
      id: promotionId,
      data: {
        expirationAlertSent: true,
      },
    });

    return { sent: true };
  } catch (error) {
    console.error('Failed to send expiration alert:', error);
    return { sent: false, message: 'Failed to send email' };
  }
}

/**
 * Send auto-renewal notification
 */
export async function sendAutoRenewalNotification(
  promotionId: string,
  success: boolean,
  newBalance?: number,
  failureReason?: string
): Promise<AlertResult> {
  const payload = await getPayload({ config });

  const promotion = await payload.findByID({
    collection: 'promotions',
    id: promotionId,
    depth: 2,
  });

  if (!promotion) {
    return { sent: false, message: 'Promotion not found' };
  }

  const org = typeof promotion.organization === 'object' ? promotion.organization : null;
  const construction = typeof promotion.construction === 'object' ? promotion.construction : null;
  const pkg = typeof promotion.package === 'object' ? promotion.package : null;

  if (!org || !construction || !pkg) {
    return { sent: false, message: 'Missing related data' };
  }

  const billingEmail = org.billing?.billingEmail || org.contactInfo?.email;
  if (!billingEmail) {
    return { sent: false, message: 'No billing email configured' };
  }

  try {
    if (success) {
      await payload.sendEmail({
        to: billingEmail,
        subject: '[OpenSite] Promotion Auto-Renewed Successfully',
        html: generateAutoRenewalSuccessEmailHtml({
          organizationName: typeof org.name === 'string' ? org.name : org.name?.vi || org.name?.en || 'Your Organization',
          constructionTitle: typeof construction.title === 'string' ? construction.title : construction.title?.vi || construction.title?.en || 'Your Construction',
          packageName: typeof pkg.name === 'string' ? pkg.name : pkg.name?.vi || pkg.name?.en || 'Promotion Package',
          creditsSpent: promotion.creditsSpent,
          newBalance: newBalance ?? 0,
        }),
      });
    } else {
      await payload.sendEmail({
        to: billingEmail,
        subject: '[OpenSite] Promotion Auto-Renewal Failed',
        html: generateAutoRenewalFailedEmailHtml({
          organizationName: typeof org.name === 'string' ? org.name : org.name?.vi || org.name?.en || 'Your Organization',
          constructionTitle: typeof construction.title === 'string' ? construction.title : construction.title?.vi || construction.title?.en || 'Your Construction',
          reason: failureReason ?? 'Unknown error',
        }),
      });
    }

    return { sent: true };
  } catch (error) {
    console.error('Failed to send auto-renewal notification:', error);
    return { sent: false, message: 'Failed to send email' };
  }
}

// Email HTML generators
function generateLowBalanceEmailHtml(params: {
  organizationName: string;
  currentBalance: number;
  threshold: number;
  level: string;
}): string {
  const { organizationName, currentBalance, threshold, level } = params;
  const levelColors = {
    critical: '#dc2626',
    low: '#f59e0b',
    moderate: '#3b82f6',
  };
  const color = levelColors[level as keyof typeof levelColors] || '#6b7280';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${color};">Low Credit Balance Alert</h2>
      <p>Dear ${organizationName},</p>
      <p>Your OpenSite credit balance is running low:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${color};">
          ${currentBalance.toLocaleString('vi-VN')} VND
        </p>
        <p style="margin: 5px 0 0; color: #6b7280;">Current Balance</p>
      </div>
      <p>Your alert threshold is set to ${threshold.toLocaleString('vi-VN')} VND.</p>
      <p>Top up your credits to ensure your promotions continue running smoothly.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 6px; margin-top: 20px;">
        Top Up Credits
      </a>
      <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
        You can adjust your alert settings in your dashboard.
      </p>
    </div>
  `;
}

function generateExpirationAlertEmailHtml(params: {
  organizationName: string;
  constructionTitle: string;
  daysRemaining: number;
  autoRenew: boolean;
  endDate: string;
}): string {
  const { organizationName, constructionTitle, daysRemaining, autoRenew, endDate } = params;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Promotion Expiring Soon</h2>
      <p>Dear ${organizationName},</p>
      <p>Your promotion for <strong>${constructionTitle}</strong> will expire in <strong>${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</strong>.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;">Expiration Date: <strong>${new Date(endDate).toLocaleDateString('vi-VN')}</strong></p>
        <p style="margin: 10px 0 0;">Auto-Renewal: <strong>${autoRenew ? 'Enabled' : 'Disabled'}</strong></p>
      </div>
      ${autoRenew
        ? '<p>Your promotion will automatically renew if you have sufficient credits.</p>'
        : '<p>Enable auto-renewal or manually renew your promotion to continue benefiting from increased visibility.</p>'
      }
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/promotions"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 6px; margin-top: 20px;">
        Manage Promotions
      </a>
    </div>
  `;
}

function generateAutoRenewalSuccessEmailHtml(params: {
  organizationName: string;
  constructionTitle: string;
  packageName: string;
  creditsSpent: number;
  newBalance: number;
}): string {
  const { organizationName, constructionTitle, packageName, creditsSpent, newBalance } = params;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Promotion Auto-Renewed Successfully</h2>
      <p>Dear ${organizationName},</p>
      <p>Your promotion for <strong>${constructionTitle}</strong> has been automatically renewed.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;">Package: <strong>${packageName}</strong></p>
        <p style="margin: 10px 0 0;">Credits Spent: <strong>${creditsSpent.toLocaleString('vi-VN')} VND</strong></p>
        <p style="margin: 10px 0 0;">New Balance: <strong>${newBalance.toLocaleString('vi-VN')} VND</strong></p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/promotions"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 6px; margin-top: 20px;">
        View Promotion Details
      </a>
    </div>
  `;
}

function generateAutoRenewalFailedEmailHtml(params: {
  organizationName: string;
  constructionTitle: string;
  reason: string;
}): string {
  const { organizationName, constructionTitle, reason } = params;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Promotion Auto-Renewal Failed</h2>
      <p>Dear ${organizationName},</p>
      <p>We were unable to automatically renew your promotion for <strong>${constructionTitle}</strong>.</p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
        <p style="margin: 0; color: #dc2626;"><strong>Reason:</strong> ${reason}</p>
      </div>
      <p>Your promotion has now expired. To continue promoting your construction, please top up your credits and manually renew the promotion.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                text-decoration: none; border-radius: 6px; margin-top: 20px;">
        Top Up Credits
      </a>
    </div>
  `;
}
