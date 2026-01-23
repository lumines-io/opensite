import { NextRequest, NextResponse } from 'next/server';
import { runPromotionCronJob } from '@/lib/promotions/expiration';

/**
 * GET /api/cron/promotions
 * Process promotion expirations and auto-renewals
 *
 * This endpoint should be called by Vercel Cron or a similar scheduler.
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/promotions",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await runPromotionCronJob();

    console.log('Promotion cron job completed:', {
      expired: result.expiration.expired,
      renewed: result.expiration.renewed,
      alertsSent: result.alertsSent,
      errors: result.expiration.errors.length,
    });

    return NextResponse.json({
      success: true,
      expired: result.expiration.expired,
      renewed: result.expiration.renewed,
      alertsSent: result.alertsSent,
      errors: result.expiration.errors,
    });
  } catch (error) {
    console.error('Promotion cron job failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
