import { NextRequest, NextResponse } from 'next/server';
import { scraperManager } from '@/lib/scraper';
import { scraperStatusSchema, validateSearchParams } from '@/lib/validation';

// API key validation (same as run endpoint)
const validateApiKey = (request: NextRequest): boolean => {
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.SCRAPER_API_KEY;

  if (process.env.NODE_ENV === 'development' && !validKey) {
    return true;
  }

  return apiKey === validKey;
};

/**
 * GET /api/scraper/status
 * Get scraper status and recent run history
 */
export async function GET(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validation = validateSearchParams(scraperStatusSchema, searchParams);
    if ('error' in validation) {
      return NextResponse.json(
        { error: 'Bad Request', message: validation.error },
        { status: 400 }
      );
    }

    const { source, limit } = validation;

    // Get overall status
    const status = scraperManager.getStatus();

    // Filter by source if specified
    let scrapers = status.scrapers;
    let runs = status.recentRuns;

    if (source && source !== 'all') {
      scrapers = scrapers.filter(s => s.source === source);
      runs = runs.filter(r => r.source === source);
    }

    // Apply limit to runs
    runs = runs.slice(-limit);

    // Calculate summary statistics
    const stats = {
      totalRuns: runs.length,
      successfulRuns: runs.filter(r => r.status === 'completed').length,
      failedRuns: runs.filter(r => r.status === 'failed').length,
      totalArticlesFound: runs.reduce((sum, r) => sum + r.articlesFound, 0),
      totalArticlesProcessed: runs.reduce((sum, r) => sum + r.articlesProcessed, 0),
      totalSuggestionsCreated: runs.reduce((sum, r) => sum + r.suggestionsCreated, 0),
      totalDuplicatesSkipped: runs.reduce((sum, r) => sum + r.duplicatesSkipped, 0),
    };

    return NextResponse.json({
      scrapers,
      runs,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting scraper status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(error) },
      { status: 500 }
    );
  }
}
