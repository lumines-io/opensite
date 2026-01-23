import { stripe } from './client';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { addCredits } from '../credits/balance';
import { checkAndSendLowBalanceAlert } from '../credits/alerts';
import { kv } from '@vercel/kv';
import type Stripe from 'stripe';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.warn('STRIPE_WEBHOOK_SECRET not set - webhooks will not be verified');
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
}

/**
 * Check if webhook event has already been processed (idempotency)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const processed = await kv.get(`stripe_event:${eventId}`);
    return processed === true;
  } catch {
    // If KV is not available, proceed without idempotency check
    return false;
  }
}

/**
 * Mark webhook event as processed
 */
async function markEventProcessed(eventId: string): Promise<void> {
  try {
    await kv.set(`stripe_event:${eventId}`, true, { ex: 86400 * 7 }); // 7 days TTL
  } catch {
    // Log but don't fail if KV is not available
    console.warn('Failed to mark event as processed in KV');
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata;

  if (!metadata || metadata.type !== 'credit_topup') {
    return; // Not a credit top-up session
  }

  const {
    organizationId,
    userId,
    topupHistoryId,
    creditsToAdd,
    bonusCredits,
  } = metadata;

  if (!organizationId || !topupHistoryId || !creditsToAdd) {
    throw new Error('Missing required metadata in checkout session');
  }

  const payload = await getPayload({ config });

  // Check if topup already processed
  const topupHistory = await payload.findByID({
    collection: 'credit-topup-history',
    id: topupHistoryId,
  });

  if (!topupHistory) {
    throw new Error(`Topup history not found: ${topupHistoryId}`);
  }

  if (topupHistory.status === 'completed') {
    console.log(`Topup ${topupHistoryId} already completed, skipping`);
    return;
  }

  const creditsAmount = parseInt(creditsToAdd, 10);
  const bonusAmount = parseInt(bonusCredits || '0', 10);

  // Add credits to organization
  const { transaction, newBalance } = await addCredits({
    organizationId,
    amount: creditsAmount,
    type: 'topup',
    description: bonusAmount > 0
      ? `Credit top-up: ${(creditsAmount - bonusAmount).toLocaleString('vi-VN')} VND + ${bonusAmount.toLocaleString('vi-VN')} VND bonus`
      : `Credit top-up: ${creditsAmount.toLocaleString('vi-VN')} VND`,
    performedById: userId,
    reference: {
      type: 'stripe_payment',
      stripePaymentIntentId: session.payment_intent as string,
      stripeCheckoutSessionId: session.id,
      topupHistoryId,
    },
  });

  // Update topup history
  await payload.update({
    collection: 'credit-topup-history',
    id: topupHistoryId,
    data: {
      status: 'completed',
      stripePaymentIntentId: session.payment_intent as string,
      stripeReceiptUrl: (session as { receipt_url?: string }).receipt_url || undefined,
      creditTransaction: transaction.id,
    },
  });

  // Check if we need to send low balance alert (in case balance is still low after topup)
  await checkAndSendLowBalanceAlert(organizationId, newBalance);

  console.log(`Credit topup completed: ${creditsAmount} credits added to org ${organizationId}`);
}

/**
 * Handle checkout.session.expired event
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata;

  if (!metadata || metadata.type !== 'credit_topup') {
    return;
  }

  const { topupHistoryId } = metadata;

  if (!topupHistoryId) {
    return;
  }

  const payload = await getPayload({ config });

  // Update topup history to expired
  await payload.update({
    collection: 'credit-topup-history',
    id: topupHistoryId,
    data: {
      status: 'expired',
    },
  });

  console.log(`Checkout session expired: ${session.id}`);
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const payload = await getPayload({ config });

  // Find topup history by payment intent
  const topupHistories = await payload.find({
    collection: 'credit-topup-history',
    where: {
      stripePaymentIntentId: { equals: paymentIntent.id },
    },
    limit: 1,
  });

  if (topupHistories.docs.length === 0) {
    return;
  }

  const topupHistory = topupHistories.docs[0];

  await payload.update({
    collection: 'credit-topup-history',
    id: topupHistory.id,
    data: {
      status: 'failed',
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
    },
  });

  console.log(`Payment failed for topup: ${topupHistory.id}`);
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const payload = await getPayload({ config });

  // Find topup history by payment intent
  const topupHistories = await payload.find({
    collection: 'credit-topup-history',
    where: {
      stripePaymentIntentId: { equals: charge.payment_intent as string },
    },
    limit: 1,
  });

  if (topupHistories.docs.length === 0) {
    return;
  }

  const topupHistory = topupHistories.docs[0];

  // Only process if not already refunded
  if (topupHistory.status === 'refunded') {
    return;
  }

  // Deduct the refunded credits from organization
  // Note: This should be handled carefully - may need manual intervention
  await payload.update({
    collection: 'credit-topup-history',
    id: topupHistory.id,
    data: {
      status: 'refunded',
      refundedAt: new Date().toISOString(),
      refundReason: 'Stripe refund processed',
    },
  });

  console.log(`Charge refunded for topup: ${topupHistory.id}`);
}

/**
 * Main webhook handler
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  // Check idempotency
  if (await isEventProcessed(event.id)) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark as processed
    await markEventProcessed(event.id);
  } catch (error) {
    console.error(`Error processing webhook event ${event.id}:`, error);
    throw error;
  }
}
