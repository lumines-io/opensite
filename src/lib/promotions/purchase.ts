import { getPayload } from 'payload';
import config from '@/payload.config';
import { deductCredits, getBalance } from '../credits/balance';
import { checkAndSendLowBalanceAlert } from '../credits/alerts';

// Local type definitions
interface PromotionDoc {
  id: string;
  status: string;
  creditsSpent: number;
  organization: string | { id: string };
  startDate: string;
  endDate: string;
  [key: string]: unknown;
}

interface ConstructionDoc {
  id: string;
  title: string | { vi?: string; en?: string };
  organization?: string | { id: string };
  constructionCategory?: string;
  approvalStatus?: string;
  analytics?: {
    impressions?: number;
    clicks?: number;
  };
  [key: string]: unknown;
}

interface PromotionPackageDoc {
  id: string;
  name: string | { vi?: string; en?: string };
  isActive?: boolean;
  costInCredits: number;
  durationDays: number;
  [key: string]: unknown;
}

interface PurchasePromotionParams {
  constructionId: string;
  packageId: string;
  organizationId: string;
  userId: string;
  autoRenew?: boolean;
}

interface PurchasePromotionResult {
  promotion: PromotionDoc;
  newBalance: number;
  creditsSpent: number;
}

/**
 * Purchase a promotion for a construction using credits
 */
export async function purchasePromotion(
  params: PurchasePromotionParams
): Promise<PurchasePromotionResult> {
  const { constructionId, packageId, organizationId, userId, autoRenew = false } = params;

  const payload = await getPayload({ config });

  // Get promotion package
  const pkg = await payload.findByID({
    collection: 'promotion-packages',
    id: packageId,
  }) as PromotionPackageDoc | null;

  if (!pkg) {
    throw new Error('Promotion package not found');
  }

  if (!pkg.isActive) {
    throw new Error('This promotion package is not available');
  }

  // Get construction
  const construction = await payload.findByID({
    collection: 'constructions',
    id: constructionId,
  }) as ConstructionDoc | null;

  if (!construction) {
    throw new Error('Construction not found');
  }

  // Verify construction belongs to organization
  const constructionOrgId = typeof construction.organization === 'object'
    ? construction.organization?.id
    : construction.organization;

  if (constructionOrgId !== organizationId) {
    throw new Error('Construction does not belong to your organization');
  }

  // Verify construction is private
  if (construction.constructionCategory !== 'private') {
    throw new Error('Only private constructions can be promoted');
  }

  // Verify construction is published
  if (construction.approvalStatus !== 'published') {
    throw new Error('Construction must be published before it can be promoted');
  }

  // Check for existing active promotion
  const existingPromotions = await payload.find({
    collection: 'promotions',
    where: {
      and: [
        { construction: { equals: constructionId } },
        { status: { equals: 'active' } },
      ],
    },
    limit: 1,
  });

  if (existingPromotions.docs.length > 0) {
    throw new Error('This construction already has an active promotion');
  }

  const cost = pkg.costInCredits;

  // Get package and construction names
  const pkgName = typeof pkg.name === 'string' ? pkg.name : (pkg.name?.vi || pkg.name?.en || 'Package');
  const constructionTitle = typeof construction.title === 'string' ? construction.title : (construction.title?.vi || construction.title?.en || 'Construction');

  // Deduct credits
  const { transaction, newBalance } = await deductCredits({
    organizationId,
    amount: cost,
    type: 'promotion',
    description: `Promotion purchase: ${pkgName} for ${constructionTitle}`,
    performedById: userId,
    reference: {
      type: 'promotion',
    },
  });

  // Calculate dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + pkg.durationDays);

  // Get current analytics for baseline
  const currentImpressions = construction.analytics?.impressions ?? 0;
  const currentClicks = construction.analytics?.clicks ?? 0;

  // Create promotion
  const promotion = await payload.create({
    collection: 'promotions',
    data: {
      construction: constructionId,
      organization: organizationId,
      package: packageId,
      status: 'active',
      creditTransaction: transaction.id,
      creditsSpent: cost,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      autoRenew,
      analytics: {
        impressionsAtStart: currentImpressions,
        clicksAtStart: currentClicks,
        impressionsGained: 0,
        clicksGained: 0,
      },
    },
  }) as PromotionDoc;

  // Update credit transaction with promotion reference
  await payload.update({
    collection: 'credit-transactions',
    id: transaction.id,
    data: {
      reference: {
        type: 'promotion',
        promotionId: promotion.id,
      },
    },
  });

  // Check if low balance alert needed
  await checkAndSendLowBalanceAlert(organizationId, newBalance);

  return {
    promotion,
    newBalance,
    creditsSpent: cost,
  };
}

/**
 * Cancel a promotion and refund prorated credits
 */
export async function cancelPromotion(
  promotionId: string,
  userId: string,
  reason?: string
): Promise<{
  creditsRefunded: number;
  newBalance: number;
}> {
  const payload = await getPayload({ config });

  const promotion = await payload.findByID({
    collection: 'promotions',
    id: promotionId,
  }) as PromotionDoc | null;

  if (!promotion) {
    throw new Error('Promotion not found');
  }

  if (promotion.status !== 'active') {
    throw new Error('Only active promotions can be cancelled');
  }

  const organizationId = typeof promotion.organization === 'object'
    ? promotion.organization.id
    : promotion.organization;

  // Calculate prorated refund
  const startDate = new Date(promotion.startDate);
  const endDate = new Date(promotion.endDate);
  const now = new Date();

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysUsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysUsed);

  // No refund if less than 1 day remaining
  let refundAmount = 0;
  if (daysRemaining > 0 && daysUsed > 0) {
    refundAmount = Math.floor((daysRemaining / totalDays) * promotion.creditsSpent);
  }

  let newBalance = (await getBalance(organizationId)).balance;
  let refundTransaction = null;

  // Add refund credits if applicable
  if (refundAmount > 0) {
    const { addCredits } = await import('../credits/balance');
    const result = await addCredits({
      organizationId,
      amount: refundAmount,
      type: 'refund',
      description: `Promotion cancellation refund (${daysRemaining} days remaining)`,
      performedById: userId,
      reference: {
        type: 'promotion',
        promotionId,
      },
    });
    newBalance = result.newBalance;
    refundTransaction = result.transaction;
  }

  // Update promotion status
  await payload.update({
    collection: 'promotions',
    id: promotionId,
    data: {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId,
      cancellationReason: reason,
      creditsRefunded: refundAmount,
      refundTransaction: refundTransaction?.id,
    },
  });

  return {
    creditsRefunded: refundAmount,
    newBalance,
  };
}

/**
 * Update auto-renewal setting for a promotion
 */
export async function updateAutoRenewal(
  promotionId: string,
  autoRenew: boolean
): Promise<void> {
  const payload = await getPayload({ config });

  await payload.update({
    collection: 'promotions',
    id: promotionId,
    data: {
      autoRenew,
    },
  });
}
