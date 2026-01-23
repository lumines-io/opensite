import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { scraperManager, ScraperSource } from '@/lib/scraper';
import { scraperRunRequestSchema, validateBody } from '@/lib/validation';
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';
import { logSecurityEvent, getClientInfo } from '@/lib/security-logger';

/**
 * Scraper API key validation
 * SECURITY: Uses timing-safe comparison and requires key in all environments
 */
const validateApiKey = (request: NextRequest): boolean => {
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.SCRAPER_API_KEY;

  // SECURITY: Always require API key - no dev mode bypass
  if (!validKey) {
    console.warn('SCRAPER_API_KEY not configured - all requests will be rejected');
    return false;
  }

  if (!apiKey) {
    return false;
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  try {
    // Ensure both strings are the same length for timing-safe comparison
    if (apiKey.length !== validKey.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(apiKey), Buffer.from(validKey));
  } catch {
    return false;
  }
};

/**
 * POST /api/scraper/run
 * Manually trigger scraper run
 * Requires API key authentication
 */
export async function POST(request: NextRequest) {
  // Check if scraper feature is enabled
  if (!isFeatureEnabled(FEATURE_FLAGS.FEATURE_SCRAPER)) {
    return NextResponse.json(
      {
        error: 'Feature Disabled',
        message: 'Web scraper is currently disabled. Please try again later.',
      },
      { status: 403 }
    );
  }

  // Validate API key
  if (!validateApiKey(request)) {
    logSecurityEvent('api_auth_failure', {
      reason: 'Invalid or missing API key',
      endpoint: '/api/scraper/run',
      method: 'POST',
      ...getClientInfo(request),
    });
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Validate request body
    const validation = await validateBody(scraperRunRequestSchema, body);
    if ('error' in validation) {
      return NextResponse.json(
        { error: 'Bad Request', message: validation.error },
        { status: 400 }
      );
    }

    const { sources, dryRun } = validation;

    // Check if any scraper is already running
    const runningScrapers = sources.filter((source: ScraperSource) =>
      scraperManager.isScraperRunning(source)
    );

    if (runningScrapers.length > 0) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: `Scrapers already running: ${runningScrapers.join(', ')}`,
        },
        { status: 409 }
      );
    }

    if (dryRun) {
      // Dry run - just return what would be run
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `Would run scrapers: ${sources.join(', ')}`,
        sources,
      });
    }

    // Run scrapers (async, don't await)
    const runPromises = sources.map((source: ScraperSource) =>
      scraperManager.runScraper(source)
    );

    // Return immediately, runs will continue in background
    Promise.all(runPromises).catch(error => {
      console.error('Scraper run error:', error);
    });

    return NextResponse.json({
      success: true,
      message: `Started scrapers: ${sources.join(', ')}`,
      sources,
    });
  } catch (error) {
    console.error('Error in scraper run endpoint:', error);
    // SECURITY: Don't expose internal error details to clients
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scraper/run
 * Get current scraper run status
 */
export async function GET(request: NextRequest) {
  // Validate API key for status too
  if (!validateApiKey(request)) {
    logSecurityEvent('api_auth_failure', {
      reason: 'Invalid or missing API key',
      endpoint: '/api/scraper/run',
      method: 'GET',
      ...getClientInfo(request),
    });
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') as ScraperSource | null;

    const status = scraperManager.getStatus();

    if (source) {
      const scraperStatus = status.scrapers.find(s => s.source === source);
      const runs = scraperManager.getRunHistory(source, 10);

      return NextResponse.json({
        scraper: scraperStatus || null,
        runs,
      });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting scraper status:', error);
    // SECURITY: Don't expose internal error details to clients
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
