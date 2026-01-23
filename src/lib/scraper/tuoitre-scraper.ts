import { BaseScraper } from './base-scraper';
import { ScrapedArticle, ScraperConfig, CONSTRUCTION_KEYWORDS } from './types';
import { scraperLogger } from '@/lib/persistent-logger';

// Tuoi Tre scraper configuration
const TUOITRE_CONFIG: ScraperConfig = {
  source: 'tuoitre',
  name: 'Tuổi Trẻ Online',
  baseUrl: 'https://tuoitre.vn',
  enabled: true,
  keywords: CONSTRUCTION_KEYWORDS,
  maxArticles: 20,
  rateLimitMs: 1000, // 1 second between requests
};

// RSS feed URLs for relevant categories
const RSS_FEEDS = [
  'https://tuoitre.vn/rss/thoi-su.rss', // Current affairs
  'https://tuoitre.vn/rss/kinh-doanh.rss', // Business
  'https://tuoitre.vn/rss/bat-dong-san.rss', // Real estate
  'https://tuoitre.vn/rss/xe.rss', // Transportation
];

export class TuoiTreScraper extends BaseScraper {
  constructor(config?: Partial<ScraperConfig>) {
    super({ ...TUOITRE_CONFIG, ...config });
  }

  async fetchArticles(): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    // Fetch from RSS feeds
    for (const feedUrl of RSS_FEEDS) {
      try {
        const feedArticles = await this.fetchRssFeed(feedUrl);
        articles.push(...feedArticles);
      } catch (error) {
        scraperLogger.error('Error fetching Tuoi Tre RSS feed', error instanceof Error ? error : String(error), { feedUrl, source: 'tuoitre' });
      }

      await this.delay(this.config.rateLimitMs);
    }

    // Search for construction keywords
    for (const keyword of ['xây dựng TPHCM', 'công trình giao thông', 'metro Sài Gòn']) {
      try {
        const searchArticles = await this.searchArticles(keyword);
        articles.push(...searchArticles);
      } catch (error) {
        scraperLogger.error('Error searching Tuoi Tre', error instanceof Error ? error : String(error), { keyword, source: 'tuoitre' });
      }

      await this.delay(this.config.rateLimitMs);
    }

    // Deduplicate by URL
    const uniqueArticles = this.deduplicateArticles(articles);

    // Limit to max articles
    return uniqueArticles.slice(0, this.config.maxArticles);
  }

  /**
   * Fetch articles from RSS feed
   */
  private async fetchRssFeed(feedUrl: string): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'OpenSite/1.0 (+https://github.com/opensite)',
        },
      });

      if (!response.ok) {
        throw new Error(`RSS fetch failed: ${response.status}`);
      }

      const xml = await response.text();
      const items = this.parseRss(xml);

      for (const item of items) {
        // Filter for HCMC-related articles
        const fullText = `${item.title} ${item.description}`.toLowerCase();
        const isHcmc = fullText.includes('tp.hcm') ||
                       fullText.includes('tphcm') ||
                       fullText.includes('hồ chí minh') ||
                       fullText.includes('sài gòn') ||
                       fullText.includes('thành phố');

        if (isHcmc) {
          // Fetch full article content
          const content = await this.fetchArticleContent(item.link);

          articles.push({
            source: 'tuoitre',
            sourceUrl: item.link,
            title: item.title,
            description: item.description,
            content,
            publishedAt: item.pubDate ? this.parseDate(item.pubDate) : undefined,
            scrapedAt: new Date().toISOString(),
          });

          await this.delay(this.config.rateLimitMs);
        }
      }
    } catch (error) {
      scraperLogger.error('RSS parsing error', error instanceof Error ? error : String(error), { feedUrl, source: 'tuoitre' });
    }

    return articles;
  }

  /**
   * Search for articles using Tuoi Tre website search
   */
  private async searchArticles(keyword: string): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    try {
      // Tuoi Tre search URL pattern
      const searchUrl = `https://tuoitre.vn/tim-kiem.htm?keywords=${encodeURIComponent(keyword)}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'OpenSite/1.0 (+https://github.com/opensite)',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();

      // Extract article links from search results
      const articleLinks = this.extractSearchResults(html);

      for (const link of articleLinks.slice(0, 5)) {
        try {
          const articleData = await this.fetchArticleWithMetadata(link);
          if (articleData) {
            articles.push(articleData);
          }
        } catch (error) {
          scraperLogger.error('Error fetching article', error instanceof Error ? error : String(error), { link, source: 'tuoitre' });
        }

        await this.delay(this.config.rateLimitMs);
      }
    } catch (error) {
      scraperLogger.error('Search error', error instanceof Error ? error : String(error), { keyword, source: 'tuoitre' });
    }

    return articles;
  }

  /**
   * Extract article links from search results HTML
   */
  private extractSearchResults(html: string): string[] {
    const links: string[] = [];

    // Match article links in search results
    const linkRegex = /<a[^>]+href="(https:\/\/tuoitre\.vn\/[^"]+\.htm)"[^>]*class="[^"]*link-title[^"]*"/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      if (!links.includes(match[1])) {
        links.push(match[1]);
      }
    }

    // Fallback: match any article links
    if (links.length === 0) {
      const fallbackRegex = /href="(https:\/\/tuoitre\.vn\/[a-z0-9-]+-\d+\.htm)"/gi;
      while ((match = fallbackRegex.exec(html)) !== null) {
        if (!links.includes(match[1])) {
          links.push(match[1]);
        }
      }
    }

    return links;
  }

  /**
   * Fetch full article with metadata
   */
  private async fetchArticleWithMetadata(url: string): Promise<ScrapedArticle | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OpenSite/1.0 (+https://github.com/opensite)',
        },
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();

      // Extract metadata
      const title = this.extractMetaContent(html, 'og:title') ||
                    this.extractHtmlTag(html, 'title') ||
                    '';
      const description = this.extractMetaContent(html, 'og:description') ||
                          this.extractMetaContent(html, 'description') ||
                          '';
      const publishedAt = this.extractMetaContent(html, 'article:published_time');

      // Extract content
      const content = this.extractContent(html);

      if (!title) {
        return null;
      }

      return {
        source: 'tuoitre',
        sourceUrl: url,
        title: this.decodeHtmlEntities(title),
        description: this.decodeHtmlEntities(description),
        content,
        publishedAt: publishedAt || undefined,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      scraperLogger.error('Error fetching article', error instanceof Error ? error : String(error), { url, source: 'tuoitre' });
      return null;
    }
  }

  /**
   * Fetch just the article content
   */
  private async fetchArticleContent(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OpenSite/1.0 (+https://github.com/opensite)',
        },
      });

      if (!response.ok) {
        return '';
      }

      const html = await response.text();
      return this.extractContent(html);
    } catch (error) {
      scraperLogger.error('Error fetching article content', error instanceof Error ? error : String(error), { url, source: 'tuoitre' });
      return '';
    }
  }

  /**
   * Parse RSS XML to extract items
   */
  private parseRss(xml: string): Array<{ title: string; link: string; description: string; pubDate?: string }> {
    const items: Array<{ title: string; link: string; description: string; pubDate?: string }> = [];

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = this.extractXmlTag(itemXml, 'title');
      const link = this.extractXmlTag(itemXml, 'link');
      const description = this.extractXmlTag(itemXml, 'description');
      const pubDate = this.extractXmlTag(itemXml, 'pubDate');

      if (title && link) {
        items.push({
          title: this.decodeHtmlEntities(title),
          link,
          description: this.decodeHtmlEntities(description || ''),
          pubDate: pubDate || undefined,
        });
      }
    }

    return items;
  }

  /**
   * Extract value from XML tag
   */
  private extractXmlTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? (match[1] || match[2] || '').trim() : null;
  }

  /**
   * Extract meta content from HTML
   */
  private extractMetaContent(html: string, property: string): string | null {
    // Try og: property
    let regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
    let match = html.match(regex);
    if (match) return match[1];

    // Try name attribute
    regex = new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
    match = html.match(regex);
    if (match) return match[1];

    // Try reversed order
    regex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
    match = html.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Extract content from <title> tag
   */
  private extractHtmlTag(html: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract article content from HTML
   */
  private extractContent(html: string): string {
    // Try to find article body
    const articleRegex = /<div[^>]*class="[^"]*detail-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
    const articleMatch = html.match(articleRegex);

    if (articleMatch) {
      return this.stripHtmlTags(articleMatch[1]);
    }

    // Fallback: find main content area
    const mainRegex = /<div[^>]*id="main-detail"[^>]*>([\s\S]*?)<\/div>/i;
    const mainMatch = html.match(mainRegex);

    if (mainMatch) {
      return this.stripHtmlTags(mainMatch[1]);
    }

    // Last fallback: extract all paragraphs
    const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs: string[] = [];
    let match;

    while ((match = paragraphRegex.exec(html)) !== null) {
      const text = this.stripHtmlTags(match[1]).trim();
      if (text.length > 50) { // Only substantial paragraphs
        paragraphs.push(text);
      }
    }

    return paragraphs.join(' ');
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
      '&#x27;': "'",
      '&#x2F;': '/',
    };

    return text.replace(/&[^;]+;/g, entity => entities[entity] || entity);
  }

  /**
   * Parse date string to ISO format
   */
  private parseDate(dateStr: string): string | undefined {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Ignore parse errors
    }
    return undefined;
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
export const tuoitreScraper = new TuoiTreScraper();
