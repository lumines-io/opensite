import { BaseScraper } from './base-scraper';
import { ScrapedArticle, ScraperConfig, CONSTRUCTION_KEYWORDS } from './types';
import { scraperLogger } from '@/lib/persistent-logger';

// Government site scraper configuration
const GOVERNMENT_CONFIG: ScraperConfig = {
  source: 'government',
  name: 'HCMC Government Sites',
  baseUrl: 'https://www.hochiminhcity.gov.vn',
  enabled: true,
  keywords: CONSTRUCTION_KEYWORDS,
  maxArticles: 20,
  rateLimitMs: 2000, // 2 seconds between requests (more conservative for gov sites)
};

// Government news sources to scrape
const GOVERNMENT_SOURCES = [
  {
    name: 'HCMC People\'s Committee',
    baseUrl: 'https://www.hochiminhcity.gov.vn',
    newsPath: '/tin-tuc',
    searchPath: '/tim-kiem',
  },
  {
    name: 'Department of Transport',
    baseUrl: 'https://sgtvt.hochiminhcity.gov.vn',
    newsPath: '/tin-tuc',
    searchPath: '/tim-kiem',
  },
  {
    name: 'Department of Construction',
    baseUrl: 'https://sxd.hochiminhcity.gov.vn',
    newsPath: '/tin-tuc',
    searchPath: '/tim-kiem',
  },
  {
    name: 'Department of Planning and Investment',
    baseUrl: 'https://dpi.hochiminhcity.gov.vn',
    newsPath: '/tin-tuc',
    searchPath: '/tim-kiem',
  },
];

export class GovernmentScraper extends BaseScraper {
  constructor(config?: Partial<ScraperConfig>) {
    super({ ...GOVERNMENT_CONFIG, ...config });
  }

  async fetchArticles(): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    // Fetch from each government source
    for (const source of GOVERNMENT_SOURCES) {
      try {
        // Fetch news page
        const newsArticles = await this.fetchNewsPage(source);
        articles.push(...newsArticles);

        // Search for construction-related announcements
        const searchArticles = await this.searchGovernmentSite(source);
        articles.push(...searchArticles);
      } catch (error) {
        scraperLogger.error('Error scraping government source', error instanceof Error ? error : String(error), { sourceName: source.name });
      }

      await this.delay(this.config.rateLimitMs);
    }

    // Deduplicate by URL
    const uniqueArticles = this.deduplicateArticles(articles);

    // Limit to max articles
    return uniqueArticles.slice(0, this.config.maxArticles);
  }

  /**
   * Fetch articles from government news page
   */
  private async fetchNewsPage(source: typeof GOVERNMENT_SOURCES[0]): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    try {
      const newsUrl = `${source.baseUrl}${source.newsPath}`;

      const response = await fetch(newsUrl, {
        headers: {
          'User-Agent': 'OpenSite/1.0 (+https://github.com/opensite)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi,en;q=0.5',
        },
      });

      if (!response.ok) {
        scraperLogger.warn(`Failed to fetch news page`, { newsUrl, status: response.status, source: 'government' });
        return articles;
      }

      const html = await response.text();

      // Extract article links from the news page
      const articleLinks = this.extractArticleLinks(html, source.baseUrl);

      // Fetch each article
      for (const link of articleLinks.slice(0, 5)) {
        try {
          const article = await this.fetchArticle(link, source.name);
          if (article && this.isConstructionRelated(article)) {
            articles.push(article);
          }
        } catch (error) {
          scraperLogger.error('Error fetching article', error instanceof Error ? error : String(error), { link, source: 'government' });
        }

        await this.delay(this.config.rateLimitMs);
      }
    } catch (error) {
      scraperLogger.error('Error fetching news page', error instanceof Error ? error : String(error), { sourceName: source.name, source: 'government' });
    }

    return articles;
  }

  /**
   * Search government site for construction-related announcements
   */
  private async searchGovernmentSite(source: typeof GOVERNMENT_SOURCES[0]): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];
    const searchKeywords = ['xây dựng', 'công trình', 'dự án'];

    for (const keyword of searchKeywords) {
      try {
        const searchUrl = `${source.baseUrl}${source.searchPath}?keyword=${encodeURIComponent(keyword)}`;

        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'OpenSite/1.0 (+https://github.com/opensite)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi,en;q=0.5',
          },
        });

        if (!response.ok) {
          continue;
        }

        const html = await response.text();
        const articleLinks = this.extractArticleLinks(html, source.baseUrl);

        for (const link of articleLinks.slice(0, 3)) {
          try {
            const article = await this.fetchArticle(link, source.name);
            if (article) {
              articles.push(article);
            }
          } catch (error) {
            scraperLogger.error('Error fetching search result', error instanceof Error ? error : String(error), { link, source: 'government' });
          }

          await this.delay(this.config.rateLimitMs);
        }
      } catch (error) {
        scraperLogger.error('Error searching government source', error instanceof Error ? error : String(error), { sourceName: source.name, keyword, source: 'government' });
      }
    }

    return articles;
  }

  /**
   * Fetch and parse a single article
   */
  private async fetchArticle(url: string, _sourceName: string): Promise<ScrapedArticle | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OpenSite/1.0 (+https://github.com/opensite)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi,en;q=0.5',
        },
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();

      // Extract article metadata
      const title = this.extractTitle(html);
      const description = this.extractDescription(html);
      const content = this.extractContent(html);
      const publishedAt = this.extractPublishedDate(html);

      if (!title) {
        return null;
      }

      return {
        source: 'government',
        sourceUrl: url,
        title: this.decodeHtmlEntities(title),
        description: this.decodeHtmlEntities(description || ''),
        content,
        publishedAt: publishedAt || undefined,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      scraperLogger.error('Error fetching article', error instanceof Error ? error : String(error), { url, source: 'government' });
      return null;
    }
  }

  /**
   * Extract article links from HTML page
   */
  private extractArticleLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];

    // Common patterns for Vietnamese government sites
    const patterns = [
      // News article links
      /href="([^"]*\/tin-tuc\/[^"]+\.html?)"/gi,
      /href="([^"]*\/thong-bao\/[^"]+\.html?)"/gi,
      /href="([^"]*\/chi-tiet\/[^"]+\.html?)"/gi,
      /href="([^"]*\/ban-tin\/[^"]+\.html?)"/gi,
      /href="([^"]*\/(van-ban|quyet-dinh|cong-van)\/[^"]+\.html?)"/gi,
      // Generic article ID patterns
      /href="([^"]*\/\d+\/[^"]+\.html?)"/gi,
      /href="([^"]*-\d+\.html?)"/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let link = match[1];

        // Make absolute URL if relative
        if (link.startsWith('/')) {
          link = `${baseUrl}${link}`;
        } else if (!link.startsWith('http')) {
          link = `${baseUrl}/${link}`;
        }

        // Only add unique links from the same domain
        if (!links.includes(link) && link.includes(new URL(baseUrl).hostname)) {
          links.push(link);
        }
      }
    }

    return links;
  }

  /**
   * Extract article title from HTML
   */
  private extractTitle(html: string): string | null {
    // Try meta og:title first
    const ogTitle = this.extractMetaContent(html, 'og:title');
    if (ogTitle) return ogTitle;

    // Try article header patterns
    const headerPatterns = [
      /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
      /<h1[^>]*id="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
      /<h1[^>]*>([\s\S]*?)<\/h1>/i,
      /<div[^>]*class="[^"]*news-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const pattern of headerPatterns) {
      const match = html.match(pattern);
      if (match) {
        return this.stripHtmlTags(match[1]).trim();
      }
    }

    // Fallback to title tag
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return titleMatch ? this.stripHtmlTags(titleMatch[1]).trim() : null;
  }

  /**
   * Extract article description from HTML
   */
  private extractDescription(html: string): string | null {
    // Try meta description
    const ogDesc = this.extractMetaContent(html, 'og:description');
    if (ogDesc) return ogDesc;

    const metaDesc = this.extractMetaContent(html, 'description');
    if (metaDesc) return metaDesc;

    // Try lead/summary patterns
    const leadPatterns = [
      /<div[^>]*class="[^"]*(?:lead|summary|sapo)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<p[^>]*class="[^"]*(?:lead|summary|sapo)[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
    ];

    for (const pattern of leadPatterns) {
      const match = html.match(pattern);
      if (match) {
        return this.stripHtmlTags(match[1]).trim();
      }
    }

    return null;
  }

  /**
   * Extract article content from HTML
   */
  private extractContent(html: string): string {
    // Try common content container patterns
    const contentPatterns = [
      /<div[^>]*class="[^"]*(?:news-content|article-content|detail-content|noi-dung)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*id="[^"]*(?:content|main-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match) {
        const content = this.stripHtmlTags(match[1]).trim();
        if (content.length > 100) {
          return content;
        }
      }
    }

    // Fallback: extract all paragraphs
    const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs: string[] = [];
    let match;

    while ((match = paragraphRegex.exec(html)) !== null) {
      const text = this.stripHtmlTags(match[1]).trim();
      if (text.length > 30) {
        paragraphs.push(text);
      }
    }

    return paragraphs.join(' ');
  }

  /**
   * Extract published date from HTML
   */
  private extractPublishedDate(html: string): string | null {
    // Try meta published time
    const ogDate = this.extractMetaContent(html, 'article:published_time');
    if (ogDate) return ogDate;

    // Common date patterns in Vietnamese government sites
    const datePatterns = [
      /<(?:span|time|div)[^>]*class="[^"]*(?:date|time|ngay)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|time|div)>/i,
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match) {
        if (match[3]) {
          // DD/MM/YYYY or similar
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3];
          return `${year}-${month}-${day}`;
        }
        // Try to parse the date text
        return this.parseDateString(this.stripHtmlTags(match[0] || match[1]));
      }
    }

    return null;
  }

  /**
   * Parse date string to ISO format
   */
  private parseDateString(dateStr: string): string | null {
    // Try standard date patterns
    const patterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const [, a, b, c] = match;
        // Determine order (DD/MM/YYYY vs YYYY/MM/DD)
        if (parseInt(a) > 31) {
          // YYYY/MM/DD
          return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        } else {
          // DD/MM/YYYY
          return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        }
      }
    }

    return null;
  }

  /**
   * Check if article is construction-related
   */
  private isConstructionRelated(article: ScrapedArticle): boolean {
    const fullText = `${article.title} ${article.description || ''} ${article.content}`.toLowerCase();
    return this.config.keywords.some(kw => fullText.includes(kw.toLowerCase()));
  }

  /**
   * Extract meta content from HTML
   */
  private extractMetaContent(html: string, property: string): string | null {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[^;]+;/g, entity => entities[entity] || entity);
  }

  /**
   * Deduplicate articles by URL
   */
  private deduplicateArticles(articles: ScrapedArticle[]): ScrapedArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const normalized = article.sourceUrl.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }
}

// Export singleton instance
export const governmentScraper = new GovernmentScraper();
