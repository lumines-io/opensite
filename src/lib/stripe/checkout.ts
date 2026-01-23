import { stripe, CREDIT_CONFIG, calculateBonus, validateTopupAmount } from './client';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type Stripe from 'stripe';

interface CreateTopupCheckoutParams {
  organizationId: string;
  userId: string;
  amount: number; // VND amount
  successUrl: string;
  cancelUrl: string;
}

interface CreateTopupCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
  creditsToReceive: number;
  bonusCredits: number;
  bonusPercentage: number;
}

/**
 * Create a Stripe Checkout session for credit top-up
 */
export async function createTopupCheckoutSession(
  params: CreateTopupCheckoutParams
): Promise<CreateTopupCheckoutResult> {
  const { organizationId, userId, amount, successUrl, cancelUrl } = params;

  // Validate amount
  const validation = validateTopupAmount(amount);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const payload = await getPayload({ config });

  // Get organization
  const org = await payload.findByID({
    collection: 'organizations',
    id: organizationId,
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  // Get or create Stripe customer
  let stripeCustomerId = org.billing?.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: typeof org.name === 'string' ? org.name : org.name?.vi || org.name?.en || 'Unknown',
      email: org.billing?.billingEmail || org.contactInfo?.email,
      metadata: {
        organizationId,
      },
    });

    stripeCustomerId = customer.id;

    // Save customer ID to organization
    await payload.update({
      collection: 'organizations',
      id: organizationId,
      data: {
        billing: {
          ...org.billing,
          stripeCustomerId,
        },
      },
    });
  }

  // Calculate bonus
  const { bonus, percentage } = calculateBonus(amount);
  const totalCredits = amount + bonus;

  // Create pending topup history record
  const topupHistory = await payload.create({
    collection: 'credit-topup-history',
    data: {
      organization: organizationId,
      user: userId,
      amountPaid: amount,
      creditsReceived: totalCredits,
      bonusCredits: bonus,
      bonusPercentage: percentage,
      status: 'pending',
    },
  });

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: CREDIT_CONFIG.CURRENCY,
          product_data: {
            name: 'OpenSite Credits',
            description: bonus > 0
              ? `${amount.toLocaleString('vi-VN')} VND + ${bonus.toLocaleString('vi-VN')} VND bonus (${percentage}%)`
              : `${amount.toLocaleString('vi-VN')} VND credits`,
          },
          unit_amount: amount, // VND is zero-decimal currency
        },
        quantity: 1,
      },
    ],
    metadata: {
      organizationId,
      userId,
      topupHistoryId: topupHistory.id,
      creditsToAdd: totalCredits.toString(),
      bonusCredits: bonus.toString(),
      bonusPercentage: percentage.toString(),
      type: 'credit_topup',
    },
    success_url: successUrl.includes('?')
      ? `${successUrl}&session_id={CHECKOUT_SESSION_ID}`
      : `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
  });

  // Update topup history with session ID
  await payload.update({
    collection: 'credit-topup-history',
    id: topupHistory.id,
    data: {
      stripeCheckoutSessionId: session.id,
    },
  });

  return {
    checkoutUrl: session.url!,
    sessionId: session.id,
    creditsToReceive: totalCredits,
    bonusCredits: bonus,
    bonusPercentage: percentage,
  };
}

/**
 * Get checkout session details
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Get predefined top-up packages for display
 */
export function getTopupPackages() {
  return [
    { amount: 100_000, label: '100,000 VND', ...calculateBonus(100_000) },
    { amount: 500_000, label: '500,000 VND', ...calculateBonus(500_000) },
    { amount: 1_000_000, label: '1,000,000 VND', ...calculateBonus(1_000_000) },
    { amount: 3_000_000, label: '3,000,000 VND', ...calculateBonus(3_000_000) },
    { amount: 5_000_000, label: '5,000,000 VND', ...calculateBonus(5_000_000) },
    { amount: 10_000_000, label: '10,000,000 VND', ...calculateBonus(10_000_000) },
  ].map((pkg) => ({
    ...pkg,
    total: pkg.amount + pkg.bonus,
    bonusLabel: pkg.percentage > 0 ? `+${pkg.percentage}% bonus` : null,
  }));
}
