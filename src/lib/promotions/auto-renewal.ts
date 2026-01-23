import { getPayload } from 'payload';
import config from '@/payload.config';
import { deductCredits, getBalance } from '../credits/balance';
import { sendAutoRenewalNotification, checkAndSendLowBalanceAlert } from '../credits/alerts';

// Local type definitions
interface PromotionDoc {
  id: string;
  status: string;
  autoRenew?: boolean;
  package: string | PromotionPackageDoc;
  construction: string | ConstructionDoc;
  organization: string | { id: string };
  creditsSpent: number;
  renewalCount?: number;
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

interface PromotionPackageDoc {
  id: string;
  name: string | { vi?: string; en?: string };
  costInCredits: number;
  durationDays: number;
  [key: string]: unknown;
}

interface ConstructionDoc {
  id: string;
  title: string | { vi?: string; en?: string };
  analytics?: {
    impressions?: number;
    clicks?: number;
  };
  [key: string]: unknown;
}

interface RenewalResult {
  promotionId: string;
  success: boolean;
  newPromotionId?: string;
  error?: string;
}

/**
 * Process auto-renewal for a single promotion
 */
export async function processAutoRenewal(promotionId: string): Promise<RenewalResult> {
  const payload = await getPayload({ config });

  const promotion = await payload.findByID({
    collection: 'promotions',
    id: promotionId,
    depth: 2,
  }) as PromotionDoc | null;

  if (!promotion) {
    return { promotionId, success: false, error: 'Promotion not found' };
  }

  if (!promotion.autoRenew) {
    return { promotionId, success: false, error: 'Auto-renewal not enabled' };
  }

  if (promotion.status !== 'active') {
    return { promotionId, success: false, error: 'Promotion not active' };
  }

  const pkg = typeof promotion.package === 'object' ? promotion.package as PromotionPackageDoc : null;
  const construction = typeof promotion.construction === 'object' ? promotion.construction as ConstructionDoc : null;
  const organizationId = typeof promotion.organization === 'object'
    ? (promotion.organization as { id: string }).id
    : promotion.organization;

  if (!pkg || !construction || !organizationId) {
    return { promotionId, success: false, error: 'Missing required data' };
  }

  const cost = pkg.costInCredits;

  // Check balance
  const { balance } = await getBalance(organizationId);
  if (balance < cost) {
    // Mark original promotion as expired
    await payload.update({
      collection: 'promotions',
      id: promotionId,
      data: {
        status: 'expired',
        autoRenew: false, // Disable auto-renew to prevent repeated failures
      },
    });

    // Send failure notification
    await sendAutoRenewalNotification(promotionId, false, undefined, 'Insufficient credits');

    return {
      promotionId,
      success: false,
      error: `Insufficient credits: need ${cost}, have ${balance}`,
    };
  }

  try {
    // Deduct credits
    const { transaction, newBalance } = await deductCredits({
      organizationId,
      amount: cost,
      type: 'auto_renewal',
      description: `Auto-renewal: ${typeof pkg.name === 'string' ? pkg.name : pkg.name?.vi || pkg.name?.en} for ${typeof construction.title === 'string' ? construction.title : construction.title?.vi || construction.title?.en}`,
      reference: {
        type: 'auto_renewal',
        promotionId,
      },
    });

    // Calculate new dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + pkg.durationDays);

    // Get current analytics for baseline
    const currentImpressions = construction.analytics?.impressions ?? 0;
    const currentClicks = construction.analytics?.clicks ?? 0;

    // Create new promotion
    const newPromotion = await payload.create({
      collection: 'promotions',
      data: {
        construction: construction.id,
        organization: organizationId,
        package: pkg.id,
        status: 'active',
        creditTransaction: transaction.id,
        creditsSpent: cost,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        autoRenew: true, // Carry forward auto-renew setting
        renewalCount: (promotion.renewalCount ?? 0) + 1,
        previousPromotion: promotionId,
        analytics: {
          impressionsAtStart: currentImpressions,
          clicksAtStart: currentClicks,
          impressionsGained: 0,
          clicksGained: 0,
        },
      },
    }) as PromotionDoc;

    // Update original promotion
    await payload.update({
      collection: 'promotions',
      id: promotionId,
      data: {
        status: 'renewed',
        renewedByPromotion: newPromotion.id,
        // Snapshot final analytics
        analytics: {
          ...promotion.analytics,
          impressionsAtEnd: currentImpressions,
          clicksAtEnd: construction.analytics?.clicks ?? 0,
        },
      },
    });

    // Update credit transaction with new promotion reference
    const existingRef = (transaction as { reference?: Record<string, unknown> }).reference ?? {};
    await payload.update({
      collection: 'credit-transactions',
      id: transaction.id,
      data: {
        reference: {
          ...existingRef,
          promotionId: newPromotion.id,
        },
      },
    });

    // Send success notification
    await sendAutoRenewalNotification(promotionId, true, newBalance);

    // Check for low balance alert
    await checkAndSendLowBalanceAlert(organizationId, newBalance);

    return {
      promotionId,
      success: true,
      newPromotionId: newPromotion.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Mark as expired on failure
    await payload.update({
      collection: 'promotions',
      id: promotionId,
      data: {
        status: 'expired',
      },
    });

    // Send failure notification
    await sendAutoRenewalNotification(promotionId, false, undefined, errorMessage);

    return {
      promotionId,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Process all promotions that are due for renewal
 * (promotions expiring within the next hour with auto-renew enabled)
 */
export async function processAllAutoRenewals(): Promise<RenewalResult[]> {
  const payload = await getPayload({ config });

  // Find promotions expiring within the next hour with auto-renew enabled
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const expiring = await payload.find({
    collection: 'promotions',
    where: {
      and: [
        { status: { equals: 'active' } },
        { autoRenew: { equals: true } },
        { endDate: { less_than_equal: oneHourFromNow.toISOString() } },
        { endDate: { greater_than: now.toISOString() } },
      ],
    },
    limit: 100, // Process in batches
  });

  const results: RenewalResult[] = [];

  for (const promotion of expiring.docs) {
    const result = await processAutoRenewal(String(promotion.id));
    results.push(result);
  }

  return results;
}
