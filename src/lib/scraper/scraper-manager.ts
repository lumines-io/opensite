import { vnexpressScraper } from './vnexpress-scraper';
import { tuoitreScraper } from './tuoitre-scraper';
import { governmentScraper } from './government-scraper';
import { BaseScraper } from './base-scraper';
import { ScraperSource, ScraperRun, ScraperResult } from './types';
import { findExistingHashes } from './hash';
import { getPayload, Payload } from 'payload';
import config from '@/payload.config';
import { scraperLogger } from '@/lib/persistent-logger';

// Scraper run history (in-memory, should use Redis/DB in production)
const scraperRunHistory: ScraperRun[] = [];
const MAX_HISTORY_SIZE = 100;

// Scraper instances
const scrapers: Record<ScraperSource, BaseScraper> = {
  vnexpress: vnexpressScraper,
  tuoitre: tuoitreScraper,
  government: governmentScraper,
};

export class ScraperManager {
  private isRunning: Map<ScraperSource, boolean> = new Map();

  /**
   * Run scraper for a specific source
   */
  async runScraper(source: ScraperSource): Promise<ScraperRun> {
    // Check if already running
    if (this.isRunning.get(source)) {
      throw new Error(`Scraper ${source} is already running`);
    }

    this.isRunning.set(source, true);

    try {
      const scraper = scrapers[source];
      if (!scraper) {
        throw new Error(`Unknown scraper source: ${source}`);
      }

      // Run the scraper
      const run = await scraper.scrape();

      // Store in history
      this.addToHistory(run);

      return run;
    } finally {
      this.isRunning.set(source, false);
    }
  }

  /**
   * Run all scrapers sequentially
   */
  async runAllScrapers(): Promise<ScraperRun[]> {
    const runs: ScraperRun[] = [];

    for (const source of Object.keys(scrapers) as ScraperSource[]) {
      try {
        const run = await this.runScraper(source);
        runs.push(run);
      } catch (error) {
        scraperLogger.error(`Error running ${source} scraper`, error instanceof Error ? error : String(error), { source });
        runs.push({
          id: `${source}-${Date.now()}`,
          source,
          status: 'failed',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          articlesFound: 0,
          articlesProcessed: 0,
          suggestionsCreated: 0,
          duplicatesSkipped: 0,
          errors: [String(error)],
        });
      }
    }

    return runs;
  }

  /**
   * Process scraper results and create suggestions
   */
  async processResults(results: ScraperResult[]): Promise<{
    created: number;
    duplicates: number;
    errors: string[];
  }> {
    const payload = await getPayload({ config });

    // Check for existing content hashes
    const hashes = results.map(r => r.contentHash);
    const existingHashes = await findExistingHashes(payload, hashes);

    let created = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const result of results) {
      // Skip duplicates
      if (existingHashes.has(result.contentHash)) {
        duplicates++;
        continue;
      }

      try {
        // Create suggestion from scraper result
        await this.createSuggestion(payload, result);
        created++;
      } catch (error) {
        errors.push(`Error creating suggestion for ${result.sourceUrl}: ${error}`);
      }
    }

    return { created, duplicates, errors };
  }

  /**
   * Create a suggestion from scraper result
   */
  private async createSuggestion(payload: Payload, result: ScraperResult): Promise<void> {
    // Build proposed data from extracted information
    const proposedData: Record<string, unknown> = {
      title: result.title,
      description: result.description || result.rawText.slice(0, 500),
    };

    // Add dates if extracted
    if (result.extractedData.dates.length > 0) {
      const startDate = result.extractedData.dates.find(d => d.type === 'start');
      const endDate = result.extractedData.dates.find(d => d.type === 'end');
      const announcedDate = result.extractedData.dates.find(d => d.type === 'announced');

      if (startDate) proposedData.startDate = startDate.date;
      if (endDate) proposedData.expectedEndDate = endDate.date;
      if (announcedDate) proposedData.announcedDate = announcedDate.date;
    }

    // Add construction type if detected
    if (result.extractedData.constructionType) {
      proposedData.constructionType = result.extractedData.constructionType;
    }

    // Add status if detected
    if (result.extractedData.status) {
      proposedData.constructionStatus = result.extractedData.status;
    }

    // Build proposed geometry from locations
    let proposedGeometry = null;
    const locationWithCoords = result.extractedData.locations.find(l => l.coordinates);
    if (locationWithCoords?.coordinates) {
      proposedGeometry = {
        type: 'Point',
        coordinates: locationWithCoords.coordinates,
      };
    }

    // Create the suggestion
    await payload.create({
      collection: 'suggestions',
      data: {
        suggestionType: 'create',
        status: 'pending',
        sourceType: 'scraper',
        sourceUrl: result.sourceUrl,
        sourceConfidence: result.confidence,
        contentHash: result.contentHash,
        proposedData,
        proposedGeometry,
        moderatorNotes: `Auto-generated from ${result.source} scraper.\n\nExtracted keywords: ${result.extractedData.keywords.join(', ')}\n\nLocations: ${result.extractedData.locations.map(l => l.text).join(', ')}`,
      },
    });
  }

  /**
   * Get scraper status
   */
  getStatus(): {
    scrapers: Array<{
      source: ScraperSource;
      name: string;
      enabled: boolean;
      isRunning: boolean;
    }>;
    recentRuns: ScraperRun[];
  } {
    return {
      scrapers: (Object.entries(scrapers) as [ScraperSource, BaseScraper][]).map(
        ([source, scraper]) => ({
          source,
          name: scraper.getConfig().name,
          enabled: scraper.getConfig().enabled,
          isRunning: this.isRunning.get(source) || false,
        })
      ),
      recentRuns: scraperRunHistory.slice(-20),
    };
  }

  /**
   * Get run history for a specific source
   */
  getRunHistory(source?: ScraperSource, limit: number = 20): ScraperRun[] {
    let runs = scraperRunHistory;

    if (source) {
      runs = runs.filter(r => r.source === source);
    }

    return runs.slice(-limit);
  }

  /**
   * Add run to history
   */
  private addToHistory(run: ScraperRun): void {
    scraperRunHistory.push(run);

    // Limit history size
    while (scraperRunHistory.length > MAX_HISTORY_SIZE) {
      scraperRunHistory.shift();
    }
  }

  /**
   * Check if a scraper is currently running
   */
  isScraperRunning(source: ScraperSource): boolean {
    return this.isRunning.get(source) || false;
  }

  /**
   * Get scraper instance
   */
  getScraper(source: ScraperSource): BaseScraper | undefined {
    return scrapers[source];
  }
}

// Export singleton instance
export const scraperManager = new ScraperManager();
