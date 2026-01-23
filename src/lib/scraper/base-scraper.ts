import {
  ScraperConfig,
  ScrapedArticle,
  ScraperResult,
  ScraperRun,
  ExtractedLocation,
  ExtractedDate,
  CONSTRUCTION_KEYWORDS,
  HCMC_DISTRICTS,
  CONSTRUCTION_TYPE_KEYWORDS,
  STATUS_KEYWORDS,
} from './types';
import { ConstructionType, ConstructionStatus } from '../validation';
import { generateContentHash } from './hash';
import { geocodeLocation } from './geocoding';

// Base abstract class for all scrapers
export abstract class BaseScraper {
  protected config: ScraperConfig;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  // Abstract method - each scraper implements its own fetching logic
  abstract fetchArticles(): Promise<ScrapedArticle[]>;

  // Main scraping workflow
  async scrape(): Promise<ScraperRun> {
    const run: ScraperRun = {
      id: `${this.config.source}-${Date.now()}`,
      source: this.config.source,
      status: 'running',
      startedAt: new Date().toISOString(),
      articlesFound: 0,
      articlesProcessed: 0,
      suggestionsCreated: 0,
      duplicatesSkipped: 0,
      errors: [],
    };

    try {
      // Fetch articles
      const articles = await this.fetchArticles();
      run.articlesFound = articles.length;

      // Process each article
      const results: ScraperResult[] = [];
      for (const article of articles) {
        try {
          const result = await this.processArticle(article);
          if (result) {
            results.push(result);
            run.articlesProcessed++;
          }
        } catch (error) {
          run.errors.push(`Error processing article: ${article.sourceUrl} - ${error}`);
        }

        // Rate limiting between processing
        await this.delay(this.config.rateLimitMs);
      }

      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      return run;
    } catch (error) {
      run.status = 'failed';
      run.completedAt = new Date().toISOString();
      run.errors.push(`Scraper failed: ${error}`);
      return run;
    }
  }

  // Process a single article
  async processArticle(article: ScrapedArticle): Promise<ScraperResult | null> {
    // Check if article is relevant
    if (!this.isRelevant(article)) {
      return null;
    }

    const fullText = `${article.title} ${article.description || ''} ${article.content}`;

    // Extract data
    const dates = this.extractDates(fullText);
    const locations = await this.extractLocations(fullText);
    const constructionType = this.detectConstructionType(fullText);
    const status = this.detectStatus(fullText);
    const keywords = this.extractKeywords(fullText);

    // Calculate confidence score
    const confidence = this.calculateConfidence({
      hasTitle: !!article.title,
      hasDescription: !!article.description,
      hasDates: dates.length > 0,
      hasLocations: locations.length > 0,
      hasType: !!constructionType,
      hasStatus: !!status,
      hasCoordinates: locations.some(l => l.coordinates),
    });

    // Generate content hash for deduplication
    const contentHash = generateContentHash(article.sourceUrl, article.title);

    return {
      source: this.config.source,
      sourceUrl: article.sourceUrl,
      contentHash,
      title: article.title,
      description: article.description,
      rawText: fullText.slice(0, 50000), // Limit text size
      extractedData: {
        dates,
        locations,
        constructionType,
        status,
        keywords,
      },
      confidence,
      scrapedAt: article.scrapedAt,
    };
  }

  // Check if article is relevant to construction
  protected isRelevant(article: ScrapedArticle): boolean {
    const text = `${article.title} ${article.description || ''} ${article.content}`.toLowerCase();

    // Must contain at least one construction keyword
    const hasKeyword = this.config.keywords.some(kw => text.includes(kw.toLowerCase()));

    // Must mention HCMC or a district
    const hasLocation = text.includes('hồ chí minh') ||
                        text.includes('tp.hcm') ||
                        text.includes('sài gòn') ||
                        HCMC_DISTRICTS.some(d => text.includes(d.toLowerCase()));

    return hasKeyword && hasLocation;
  }

  // Extract dates from text
  protected extractDates(text: string): ExtractedDate[] {
    const dates: ExtractedDate[] = [];

    // Vietnamese date patterns
    const patterns = [
      // DD/MM/YYYY or DD-MM-YYYY
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
      // tháng MM/YYYY
      /tháng\s+(\d{1,2})[\/\-](\d{4})/gi,
      // năm YYYY
      /năm\s+(\d{4})/gi,
      // quý Q/YYYY
      /quý\s+(\d)[\/\-](\d{4})/gi,
    ];

    // Start date indicators
    const startIndicators = ['khởi công', 'bắt đầu', 'triển khai từ', 'thi công từ'];
    const endIndicators = ['hoàn thành', 'kết thúc', 'dự kiến hoàn thành', 'hoàn thành vào'];
    const announcedIndicators = ['công bố', 'thông báo', 'quyết định'];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const dateStr = match[0];
        const position = match.index;
        const contextBefore = text.slice(Math.max(0, position - 50), position).toLowerCase();

        let type: ExtractedDate['type'] = 'mentioned';
        let confidence = 0.5;

        // Determine date type based on context
        if (startIndicators.some(ind => contextBefore.includes(ind))) {
          type = 'start';
          confidence = 0.8;
        } else if (endIndicators.some(ind => contextBefore.includes(ind))) {
          type = 'end';
          confidence = 0.8;
        } else if (announcedIndicators.some(ind => contextBefore.includes(ind))) {
          type = 'announced';
          confidence = 0.7;
        }

        // Try to parse the date
        const parsedDate = this.parseVietnameseDate(dateStr);
        if (parsedDate) {
          dates.push({
            type,
            date: parsedDate,
            confidence,
          });
        }
      }
    }

    return dates;
  }

  // Parse Vietnamese date formats
  protected parseVietnameseDate(dateStr: string): string | null {
    try {
      // DD/MM/YYYY or DD-MM-YYYY
      const fullMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (fullMatch) {
        const [, day, month, year] = fullMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }

      // tháng MM/YYYY
      const monthMatch = dateStr.match(/tháng\s+(\d{1,2})[\/\-](\d{4})/i);
      if (monthMatch) {
        const [, month, year] = monthMatch;
        return `${year}-${month.padStart(2, '0')}-01`;
      }

      // năm YYYY
      const yearMatch = dateStr.match(/năm\s+(\d{4})/i);
      if (yearMatch) {
        return `${yearMatch[1]}-01-01`;
      }

      // quý Q/YYYY
      const quarterMatch = dateStr.match(/quý\s+(\d)[\/\-](\d{4})/i);
      if (quarterMatch) {
        const [, quarter, year] = quarterMatch;
        const month = (parseInt(quarter) - 1) * 3 + 1;
        return `${year}-${month.toString().padStart(2, '0')}-01`;
      }

      return null;
    } catch {
      return null;
    }
  }

  // Extract locations from text
  protected async extractLocations(text: string): Promise<ExtractedLocation[]> {
    const locations: ExtractedLocation[] = [];
    const textLower = text.toLowerCase();

    // Find district mentions
    for (const district of HCMC_DISTRICTS) {
      if (textLower.includes(district.toLowerCase())) {
        const location: ExtractedLocation = {
          text: district,
          confidence: 0.7,
          district,
        };

        // Try to geocode the district
        const coords = await geocodeLocation(district, 'Ho Chi Minh City');
        if (coords) {
          location.coordinates = coords;
          location.confidence = 0.8;
        }

        locations.push(location);
      }
    }

    // Find street names (common patterns)
    // SECURITY: Using bounded quantifiers {1,50} to prevent ReDoS attacks
    const streetPatterns = [
      /đường\s{1,5}([A-ZĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ\s]{1,50})/gi,
      /phố\s{1,5}([A-ZĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ\s]{1,50})/gi,
    ];

    for (const pattern of streetPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const streetName = match[1].trim();
        if (streetName.length > 2 && streetName.length < 50) {
          const location: ExtractedLocation = {
            text: `đường ${streetName}`,
            confidence: 0.5,
          };

          // Try geocoding
          const coords = await geocodeLocation(`${streetName} street`, 'Ho Chi Minh City');
          if (coords) {
            location.coordinates = coords;
            location.confidence = 0.7;
          }

          locations.push(location);
        }
      }
    }

    return locations;
  }

  // Detect construction type from text
  protected detectConstructionType(text: string): ConstructionType | undefined {
    const textLower = text.toLowerCase();
    let bestMatch: ConstructionType | undefined;
    let bestCount = 0;

    for (const [type, keywords] of Object.entries(CONSTRUCTION_TYPE_KEYWORDS)) {
      const count = keywords.filter(kw => textLower.includes(kw)).length;
      if (count > bestCount) {
        bestCount = count;
        bestMatch = type as ConstructionType;
      }
    }

    return bestMatch;
  }

  // Detect construction status from text
  protected detectStatus(text: string): ConstructionStatus | undefined {
    const textLower = text.toLowerCase();

    for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
      if (keywords.some(kw => textLower.includes(kw))) {
        return status as ConstructionStatus;
      }
    }

    return undefined;
  }

  // Extract relevant keywords from text
  protected extractKeywords(text: string): string[] {
    const textLower = text.toLowerCase();
    return CONSTRUCTION_KEYWORDS.filter(kw => textLower.includes(kw.toLowerCase()));
  }

  // Calculate confidence score based on extracted data
  protected calculateConfidence(data: {
    hasTitle: boolean;
    hasDescription: boolean;
    hasDates: boolean;
    hasLocations: boolean;
    hasType: boolean;
    hasStatus: boolean;
    hasCoordinates: boolean;
  }): number {
    let score = 0;
    const weights = {
      hasTitle: 0.15,
      hasDescription: 0.10,
      hasDates: 0.15,
      hasLocations: 0.20,
      hasType: 0.10,
      hasStatus: 0.10,
      hasCoordinates: 0.20,
    };

    for (const [key, weight] of Object.entries(weights)) {
      if (data[key as keyof typeof data]) {
        score += weight;
      }
    }

    return Math.round(score * 100) / 100;
  }

  // Utility: delay between requests
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get scraper configuration
  getConfig(): ScraperConfig {
    return this.config;
  }
}
