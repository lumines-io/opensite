import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { scraperManager } from '@/lib/scraper';
import { cronLogger } from '@/lib/persistent-logger';
import { logSecurityEvent, getClientInfo } from '@/lib/security-logger';

/**
 * Vercel Cron Job endpoint for scheduled scraping
 * Configure schedule in vercel.json crons array
 *
 * SECURITY: Authentication is required in ALL environments
 */
export async function GET(request: NextRequest) {
  const clientInfo = getClientInfo(request);

  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // SECURITY: Always require cron secret - no dev mode bypass
  if (!cronSecret) {
    cronLogger.error('CRON_SECRET not configured');
    logSecurityEvent('cron_auth_failure', {
      reason: 'CRON_SECRET not configured',
      endpoint: '/api/cron/scraper',
      ...clientInfo,
    });
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  const expectedAuth = `Bearer ${cronSecret}`;
  let isValidAuth = false;

  if (authHeader && authHeader.length === expectedAuth.length) {
    try {
      isValidAuth = timingSafeEqual(
        Buffer.from(authHeader),
        Buffer.from(expectedAuth)
      );
    } catch {
      isValidAuth = false;
    }
  }

  if (!isValidAuth) {
    logSecurityEvent('cron_auth_failure', {
      reason: 'Invalid or missing authorization',
      endpoint: '/api/cron/scraper',
      ...clientInfo,
    });
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  cronLogger.info('Starting scheduled scraper run');

  try {
    // Run all scrapers
    const runs = await scraperManager.runAllScrapers();

    // Calculate summary
    const summary = {
      totalSources: runs.length,
      successful: runs.filter(r => r.status === 'completed').length,
      failed: runs.filter(r => r.status === 'failed').length,
      articlesFound: runs.reduce((sum, r) => sum + r.articlesFound, 0),
      articlesProcessed: runs.reduce((sum, r) => sum + r.articlesProcessed, 0),
      suggestionsCreated: runs.reduce((sum, r) => sum + r.suggestionsCreated, 0),
      duplicatesSkipped: runs.reduce((sum, r) => sum + r.duplicatesSkipped, 0),
      errors: runs.flatMap(r => r.errors),
    };

    cronLogger.info('Scraper run completed', summary);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      runs,
      summary,
    });
  } catch (error) {
    cronLogger.error('Scraper run failed', error instanceof Error ? error : String(error));
    // SECURITY: Don't expose internal error details to clients
    return NextResponse.json(
      {
        success: false,
        error: 'Scraper run failed. Check server logs for details.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering (with same auth)
export { GET as POST };
