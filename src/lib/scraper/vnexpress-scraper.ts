import { BaseScraper } from './base-scraper';
import { ScrapedArticle, ScraperConfig, CONSTRUCTION_KEYWORDS } from './types';
import { scraperLogger } from '@/lib/persistent-logger';

// VnExpress scraper configuration
const VNEXPRESS_CONFIG: ScraperConfig = {
  source: 'vnexpress',
  name: 'VnExpress News',
  baseUrl: 'https://vnexpress.net',
  enabled: true,
  keywords: CONSTRUCTION_KEYWORDS,
  maxArticles: 20,
  rateLimitMs: 1000, // 1 second between requests
};

// RSS feed URLs for relevant categories
const RSS_FEEDS = [
  'https://vnexpress.net/rss/thoi-su.rss', // Current affairs
  'https://vnexpress.net/rss/kinh-doanh.rss', // Business
  'https://vnexpress.net/rss/bat-dong-san.rss', // Real estate
];

// Search URL for keyword-based search
const SEARCH_URL = 'https://vnexpress.net/microservice/sheet/type/search_all_2';

export class VnExpressScraper extends BaseScraper {
  constructor(config?: Partial<ScraperConfig>) {
    super({ ...VNEXPRESS_CONFIG, ...config });
  }

  async fetchArticles(): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    // Method 1: Fetch from RSS feeds
    for (const feedUrl of RSS_FEEDS) {
      try {
        const feedArticles = await this.fetchRssFeed(feedUrl);
        articles.push(...feedArticles);
      } catch (error) {
        scraperLogger.error('Error fetching RSS feed', error instanceof Error ? error : String(error), { feedUrl, source: 'vnexpress' });
      }

      await this.delay(this.config.rateLimitMs);
    }

    // Method 2: Search for construction keywords
    for (const keyword of ['xây dựng TP.HCM', 'công trình Sài Gòn', 'metro TP.HCM']) {
      try {
        const searchArticles = await this.searchArticles(keyword);
        articles.push(...searchArticles);
      } catch (error) {
        scraperLogger.error('Error searching for keyword', error instanceof Error ? error : String(error), { keyword, source: 'vnexpress' });
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
                       fullText.includes('hồ chí minh') ||
                       fullText.includes('sài gòn') ||
                       fullText.includes('sgv') ||
                       fullText.includes('thành phố');

        if (isHcmc) {
          // Fetch full article content
          const content = await this.fetchArticleContent(item.link);

          articles.push({
            source: 'vnexpress',
            sourceUrl: item.link,
            title: item.title,
            description: item.description,
            content,
            publishedAt: item.pubDate,
            scrapedAt: new Date().toISOString(),
          });

          await this.delay(this.config.rateLimitMs);
        }
      }
    } catch (error) {
      scraperLogger.error('RSS parsing error', error instanceof Error ? error : String(error), { feedUrl, source: 'vnexpress' });
    }

    return articles;
  }

  /**
   * Search for articles using VnExpress search API
   */
  private async searchArticles(keyword: string): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    try {
      const url = `${SEARCH_URL}?q=${encodeURIComponent(keyword)}&limit=10`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OpenSite/1.0 (+https://github.com/opensite)',
        },
      });

      if (!response.ok) {
        throw new Error(`Search API failed: ${response.status}`);
      }

      const data = await response.json();

      // Process search results
      if (data.data && Array.isArray(data.data)) {
        for (const item of data.data.slice(0, 5)) {
          const content = await this.fetchArticleContent(item.share_url || item.url);

          articles.push({
            source: 'vnexpress',
            sourceUrl: item.share_url || item.url,
            title: item.title,
            description: item.lead || item.description,
            content,
            publishedAt: item.publish_time ? new Date(item.publish_time * 1000).toISOString() : undefined,
            scrapedAt: new Date().toISOString(),
          });

          await this.delay(this.config.rateLimitMs);
        }
      }
    } catch (error) {
      scraperLogger.error('Search error', error instanceof Error ? error : String(error), { keyword, source: 'vnexpress' });
    }

    return articles;
  }

  /**
   * Fetch full article content from URL
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
      scraperLogger.error('Error fetching article content', error instanceof Error ? error : String(error), { url, source: 'vnexpress' });
      return '';
    }
  }

  /**
   * Parse RSS XML to extract items
   */
  private parseRss(xml: string): Array<{ title: string; link: string; description: string; pubDate?: string }> {
    const items: Array<{ title: string; link: string; description: string; pubDate?: string }> = [];

    // Simple XML parsing (no external dependency)
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
   * Extract article content from HTML
   */
  private extractContent(html: string): string {
    // Extract main article content
    const articleRegex = /<article[^>]*class="[^"]*fck_detail[^"]*"[^>]*>([\s\S]*?)<\/article>/i;
    const articleMatch = html.match(articleRegex);

    if (articleMatch) {
      return this.stripHtmlTags(articleMatch[1]);
    }

    // Fallback: extract from paragraph tags within specific divs
    const contentRegex = /<p[^>]*class="[^"]*Normal[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs: string[] = [];
    let match;

    while ((match = contentRegex.exec(html)) !== null) {
      paragraphs.push(this.stripHtmlTags(match[1]));
    }

    return paragraphs.join(' ');
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
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
export const vnexpressScraper = new VnExpressScraper();
