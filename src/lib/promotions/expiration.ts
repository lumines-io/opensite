import { getPayload } from 'payload';
import config from '@/payload.config';
import { sendPromotionExpirationAlert } from '../credits/alerts';
import { processAutoRenewal } from './auto-renewal';

// Local type definitions
interface PromotionDoc {
  id: string;
  status: string;
  autoRenew?: boolean;
  construction: string | ConstructionDoc;
  endDate: string;
  expirationAlertSent?: boolean;
  analytics?: {
    impressionsAtStart?: number;
    clicksAtStart?: number;
    impressionsAtEnd?: number;
    clicksAtEnd?: number;
    impressionsGained?: number;
    clicksGained?: number;
  };
  [key: string]: unknown;
}

interface ConstructionDoc {
  id: string;
  analytics?: {
    impressions?: number;
    clicks?: number;
  };
  [key: string]: unknown;
}

interface ExpirationResult {
  expired: number;
  renewed: number;
  alertsSent: number;
  errors: string[];
}

/**
 * Process all expired promotions
 */
export async function processExpiredPromotions(): Promise<ExpirationResult> {
  const payload = await getPayload({ config });
  const now = new Date();

  const result: ExpirationResult = {
    expired: 0,
    renewed: 0,
    alertsSent: 0,
    errors: [],
  };

  // Find all active promotions that have passed their end date
  const expiredPromotions = await payload.find({
    collection: 'promotions',
    where: {
      and: [
        { status: { equals: 'active' } },
        { endDate: { less_than: now.toISOString() } },
      ],
    },
    limit: 100,
  });

  for (const promotion of expiredPromotions.docs) {
    const promoId = String(promotion.id);
    try {
      if (promotion.autoRenew) {
        // Try auto-renewal
        const renewalResult = await processAutoRenewal(promoId);
        if (renewalResult.success) {
          result.renewed++;
        } else {
          result.expired++;
          result.errors.push(`Renewal failed for ${promoId}: ${renewalResult.error}`);
        }
      } else {
        // Just mark as expired
        await expirePromotion(promoId);
        result.expired++;
      }
    } catch (error) {
      result.errors.push(`Error processing ${promoId}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  return result;
}

/**
 * Mark a promotion as expired
 */
async function expirePromotion(promotionId: string): Promise<void> {
  const payload = await getPayload({ config });

  const promotion = await payload.findByID({
    collection: 'promotions',
    id: promotionId,
    depth: 1,
  }) as PromotionDoc | null;

  if (!promotion) {
    throw new Error('Promotion not found');
  }

  const construction = typeof promotion.construction === 'object'
    ? promotion.construction as ConstructionDoc
    : null;

  // Snapshot final analytics
  const finalImpressions = construction?.analytics?.impressions ?? 0;
  const finalClicks = construction?.analytics?.clicks ?? 0;

  await payload.update({
    collection: 'promotions',
    id: promotionId,
    data: {
      status: 'expired',
      analytics: {
        ...promotion.analytics,
        impressionsAtEnd: finalImpressions,
        clicksAtEnd: finalClicks,
        impressionsGained: finalImpressions - (promotion.analytics?.impressionsAtStart ?? 0),
        clicksGained: finalClicks - (promotion.analytics?.clicksAtStart ?? 0),
      },
    },
  });
}

/**
 * Send expiration alerts for promotions expiring soon
 */
export async function sendExpirationAlerts(): Promise<number> {
  const payload = await getPayload({ config });
  const now = new Date();

  // Alert for promotions expiring in 3 days
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringPromotions = await payload.find({
    collection: 'promotions',
    where: {
      and: [
        { status: { equals: 'active' } },
        { expirationAlertSent: { equals: false } },
        { endDate: { less_than_equal: threeDaysFromNow.toISOString() } },
        { endDate: { greater_than: now.toISOString() } },
      ],
    },
    limit: 100,
  });

  let alertsSent = 0;

  for (const promotion of expiringPromotions.docs) {
    const endDate = new Date(promotion.endDate as string);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const result = await sendPromotionExpirationAlert(String(promotion.id), daysRemaining);
    if (result.sent) {
      alertsSent++;
    }
  }

  return alertsSent;
}

/**
 * Main cron job handler for promotion lifecycle
 * Should be run hourly
 */
export async function runPromotionCronJob(): Promise<{
  expiration: ExpirationResult;
  alertsSent: number;
}> {
  // Process expired promotions (including auto-renewals)
  const expiration = await processExpiredPromotions();

  // Send expiration alerts
  const alertsSent = await sendExpirationAlerts();

  return {
    expiration,
    alertsSent,
  };
}
