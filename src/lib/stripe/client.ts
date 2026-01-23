import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Credit system configuration
export const CREDIT_CONFIG = {
  MIN_TOPUP: 100_000, // 100,000 VND
  MAX_TOPUP: 10_000_000, // 10,000,000 VND
  CURRENCY: 'vnd' as const,

  // Bonus tiers: amount threshold -> bonus percentage
  BONUS_TIERS: [
    { threshold: 10_000_000, percentage: 25 },
    { threshold: 5_000_000, percentage: 20 },
    { threshold: 3_000_000, percentage: 15 },
    { threshold: 1_000_000, percentage: 10 },
    { threshold: 500_000, percentage: 5 },
  ] as const,

  // Low balance alert thresholds
  LOW_BALANCE_THRESHOLDS: [
    { threshold: 100_000, name: 'critical' },
    { threshold: 500_000, name: 'low' },
    { threshold: 1_000_000, name: 'moderate' },
  ] as const,
};

/**
 * Calculate bonus credits based on top-up amount
 */
export function calculateBonus(amount: number): { bonus: number; percentage: number } {
  for (const tier of CREDIT_CONFIG.BONUS_TIERS) {
    if (amount >= tier.threshold) {
      return {
        bonus: Math.floor(amount * (tier.percentage / 100)),
        percentage: tier.percentage,
      };
    }
  }
  return { bonus: 0, percentage: 0 };
}

/**
 * Validate top-up amount
 */
export function validateTopupAmount(amount: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(amount)) {
    return { valid: false, error: 'Amount must be a whole number' };
  }
  if (amount < CREDIT_CONFIG.MIN_TOPUP) {
    return {
      valid: false,
      error: `Minimum top-up amount is ${CREDIT_CONFIG.MIN_TOPUP.toLocaleString('vi-VN')} VND`
    };
  }
  if (amount > CREDIT_CONFIG.MAX_TOPUP) {
    return {
      valid: false,
      error: `Maximum top-up amount is ${CREDIT_CONFIG.MAX_TOPUP.toLocaleString('vi-VN')} VND`
    };
  }
  return { valid: true };
}

/**
 * Get low balance alert level
 */
export function getLowBalanceLevel(balance: number): 'critical' | 'low' | 'moderate' | null {
  for (const { threshold, name } of CREDIT_CONFIG.LOW_BALANCE_THRESHOLDS) {
    if (balance <= threshold) {
      return name as 'critical' | 'low' | 'moderate';
    }
  }
  return null;
}
