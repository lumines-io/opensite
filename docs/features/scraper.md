# Automated Data Scraping

## Overview

The Automated Data Scraping feature collects construction project information from Vietnamese news sources and government websites, automatically creating suggestions for review. This keeps the database current with minimal manual effort.

## Scraper Architecture

### Supported Sources

| Source | Type | Schedule | Content |
|--------|------|----------|---------|
| TuoiTre | News | Every 6 hours | Construction articles |
| VNExpress | News | Every 6 hours | Infrastructure news |
| Government | Official | Daily | Official announcements |

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│ News Source │ ──► │   Scraper   │ ──► │ Content Parser  │
└─────────────┘     └─────────────┘     └────────┬────────┘
                                                  │
                    ┌─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ Deduplication Check     │ ──► │ Location Geocoding      │
│ (Content Hash)          │     │ (Extract coordinates)   │
└─────────────────────────┘     └────────────┬────────────┘
                                              │
                                              ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ Confidence Scoring      │ ◄── │ Data Extraction         │
│                         │     │ (Title, dates, etc.)    │
└───────────┬─────────────┘     └─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Create Suggestion       │
│ (sourceType: scraper)   │
└─────────────────────────┘
```

## Scraper Components

### Base Scraper

```typescript
interface Scraper {
  name: string;
  sourceUrl: string;
  schedule: string;  // Cron expression

  fetch(): Promise<RawArticle[]>;
  parse(article: RawArticle): ParsedData;
  deduplicate(data: ParsedData): boolean;
  geocode(data: ParsedData): Coordinates | null;
  score(data: ParsedData): number;
  createSuggestion(data: ParsedData): Suggestion;
}
```

### TuoiTre Scraper

- Scrapes construction-related articles
- Extracts location mentions
- Parses Vietnamese date formats
- Handles article pagination

### VNExpress Scraper

- Infrastructure category focus
- RSS feed parsing
- Full article extraction
- Image URL extraction

### Government Scraper

- Official announcement pages
- PDF document parsing
- Project detail extraction
- Higher confidence scores

## Extraction Logic

### Content Parsing

Extracted fields from articles:

| Field | Extraction Method |
|-------|-------------------|
| Title | Article headline |
| Description | First paragraphs |
| Construction Type | Keyword matching |
| Location | Named entity recognition |
| Dates | Date pattern matching |
| District | Location-district mapping |

### Location Extraction

```typescript
// Keywords that indicate location
const locationPatterns = [
  /(?:đường|phố|quận|huyện)\s+([^\,\.\;]+)/gi,
  /(?:tại|ở|trên)\s+([^\,\.\;]+)/gi,
  /(?:từ)\s+([^\,\.\;]+)\s+(?:đến)\s+([^\,\.\;]+)/gi
];
```

### Date Extraction

```typescript
// Vietnamese date formats
const datePatterns = [
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/,           // DD/MM/YYYY
  /(\d{1,2})\s+tháng\s+(\d{1,2})/,            // DD tháng MM
  /(?:năm|năm)\s+(\d{4})/,                    // năm YYYY
  /(?:quý|Q)\s*(\d)\s*[\/\-]?\s*(\d{4})/      // Q1/2024
];
```

### Construction Type Detection

```typescript
const typeKeywords = {
  metro: ['metro', 'tàu điện', 'đường sắt'],
  road: ['đường', 'mở rộng đường', 'nâng cấp đường'],
  bridge: ['cầu', 'cầu vượt'],
  tunnel: ['hầm', 'hầm chui'],
  highway: ['cao tốc', 'đường cao tốc'],
  interchange: ['nút giao', 'vòng xoay'],
  station: ['nhà ga', 'trạm']
};
```

## Deduplication

### Content Hashing

Each article is hashed to prevent duplicates:

```typescript
function generateContentHash(article: ParsedData): string {
  const content = [
    article.title,
    article.sourceUrl,
    article.publishDate?.toISOString()
  ].join('|');

  return crypto.createHash('md5').update(content).digest('hex');
}
```

### Duplicate Checking

Before creating suggestion:

1. Check content hash against database
2. Check source URL against existing suggestions
3. Compare title similarity (> 80% = duplicate)
4. Check within recent time window (7 days)

## Confidence Scoring

Score from 0-100 indicating data reliability:

| Factor | Weight | Description |
|--------|--------|-------------|
| Source reliability | 30% | Government > News |
| Field completeness | 25% | More fields = higher |
| Location precision | 20% | Geocoded > text only |
| Date specificity | 15% | Exact date > quarter |
| Content length | 10% | Longer = more context |

### Score Thresholds

| Score | Action |
|-------|--------|
| 80-100 | High priority in queue |
| 60-79 | Normal priority |
| 40-59 | Low priority |
| < 40 | May be auto-rejected |

## Geocoding

### Process

1. Extract location mentions from text
2. Clean and normalize location names
3. Query geocoding service
4. Validate result is within HCMC
5. Store coordinates and accuracy

### Geocoding Services

Primary: Internal district/location database
Fallback: External geocoding API

### Accuracy Levels

- **Exact** - Specific coordinates found
- **District** - District centroid used
- **City** - HCMC center (low accuracy)
- **None** - Could not geocode

## Scheduled Execution

### Vercel Cron Jobs

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scraper",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/translate",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### Scraper Cron Endpoint

```
GET /api/cron/scraper

Headers:
  Authorization: Bearer {CRON_SECRET}

Response:
{
  success: true,
  results: {
    tuoitre: { processed: 10, created: 3, duplicates: 7 },
    vnexpress: { processed: 15, created: 5, duplicates: 10 }
  },
  duration: 12500
}
```

### Translation Cron

Translates Vietnamese content to English:

- Runs daily at 3 AM
- Translates new suggestion descriptions
- Updates English fields

## Manual Triggering

Admins can trigger scrapers manually:

```
POST /api/admin/scrapers/[source]/run

Authorization: Admin

Response:
{
  success: true,
  source: "tuoitre",
  results: { ... }
}
```

## Logging & Monitoring

### Cron Job Logs

All scraper runs are logged:

```typescript
interface CronJobLog {
  id: string;
  cronJob: CronJob;
  status: 'success' | 'partial' | 'failed';
  result: {
    processed: number;
    created: number;
    duplicates: number;
    errors: number;
  };
  errorMessage?: string;
  startedAt: Date;
  completedAt: Date;
}
```

### Dashboard Metrics

Visible in admin dashboard:

- Last run time per source
- Success/failure rate
- Articles processed
- Suggestions created
- Error counts

## Error Handling

### Retry Logic

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1));  // Exponential backoff
    }
  }
}
```

### Partial Failures

If some articles fail:
- Continue processing others
- Log failed URLs
- Return partial success status

### Source Unavailable

If entire source is down:
- Log error
- Skip source
- Continue with other sources
- Alert admin (if configured)

## Admin Interface

### Scraper Management Page

```
┌────────────────────────────────────────────────┐
│ Scraper Management                             │
├────────────────────────────────────────────────┤
│                                                │
│ TuoiTre Scraper                                │
│ Status: ✓ Active                               │
│ Last run: 2 hours ago                          │
│ Next run: 4 hours                              │
│ [Run Now]  [View Logs]                         │
│                                                │
│ ──────────────────────────────────────────     │
│                                                │
│ VNExpress Scraper                              │
│ Status: ✓ Active                               │
│ Last run: 2 hours ago                          │
│ [Run Now]  [View Logs]                         │
│                                                │
│ ──────────────────────────────────────────     │
│                                                │
│ Recent Activity                                │
│ • 10:00 - TuoiTre: 3 new suggestions          │
│ • 10:00 - VNExpress: 5 new suggestions        │
│ • 04:00 - TuoiTre: 2 new suggestions          │
└────────────────────────────────────────────────┘
```

## Feature Flag

**Flag:** `FEATURE_SCRAPER`

When disabled:
- Cron endpoints return 403
- Manual trigger disabled
- No new scraper suggestions
- Existing suggestions unaffected

## Environment Variables

```env
# Cron authentication
CRON_SECRET=your-secret-key

# Scraper configuration
SCRAPER_TIMEOUT=30000
SCRAPER_MAX_ARTICLES=50
```

## Rate Limiting

Scrapers respect source rate limits:

- Wait between requests (1-2 seconds)
- Max requests per run
- Daily request budgets

## Related Files

- `src/app/api/cron/scraper/route.ts`
- `src/app/api/cron/translate/route.ts`
- `src/app/api/admin/scrapers/[source]/run/route.ts`
- `src/lib/scrapers/tuoitre.ts`
- `src/lib/scrapers/vnexpress.ts`
- `src/lib/scrapers/base.ts`
- `src/lib/scrapers/utils.ts`
- `src/collections/CronJobs.ts`
- `src/collections/CronJobLogs.ts`
