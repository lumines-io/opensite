# Analytics & Monitoring

## Overview

The Analytics & Monitoring feature provides insights into application usage, performance metrics, and user behavior. It combines Vercel's built-in analytics with custom event tracking.

## Analytics Services

### Vercel Analytics

Automatic web analytics provided by Vercel:

- Page views
- Unique visitors
- Top pages
- Geographic distribution
- Device types
- Referrers

### Vercel Speed Insights

Performance monitoring:

- Core Web Vitals (LCP, FID, CLS)
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Real user metrics

### Custom Analytics

Application-specific event tracking:

- User actions
- Feature usage
- Search queries
- Error occurrences

## Implementation

### Vercel Analytics Setup

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Custom Event Tracking

```typescript
// src/lib/analytics/index.ts
interface AnalyticsEvent {
  eventType: string;
  eventData: Record<string, any>;
  userId?: string;
  timestamp: Date;
}

export async function trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>) {
  await payload.create({
    collection: 'analytics-events',
    data: {
      ...event,
      timestamp: new Date()
    }
  });
}
```

## Tracked Events

### User Events

| Event | Data | Description |
|-------|------|-------------|
| `user.login` | `{ method }` | User logged in |
| `user.register` | `{ source }` | New registration |
| `user.logout` | - | User logged out |
| `user.verify_email` | - | Email verified |

### Construction Events

| Event | Data | Description |
|-------|------|-------------|
| `construction.view` | `{ slug, type }` | Detail page viewed |
| `construction.search` | `{ query, filters }` | Search performed |
| `construction.filter` | `{ filters }` | Filters applied |

### Suggestion Events

| Event | Data | Description |
|-------|------|-------------|
| `suggestion.create` | `{ type }` | Suggestion submitted |
| `suggestion.approve` | `{ id }` | Suggestion approved |
| `suggestion.reject` | `{ id, reason }` | Suggestion rejected |
| `suggestion.merge` | `{ id }` | Suggestion merged |

### Map Events

| Event | Data | Description |
|-------|------|-------------|
| `map.marker_click` | `{ constructionId }` | Marker clicked |
| `map.route_calculate` | `{ from, to }` | Route calculated |
| `map.zoom` | `{ level }` | Zoom level changed |

### Feature Events

| Event | Data | Description |
|-------|------|-------------|
| `feature.language_switch` | `{ from, to }` | Language changed |
| `feature.theme_switch` | `{ theme }` | Theme changed |

## Event Data Model

```typescript
// src/collections/AnalyticsEvents.ts
const AnalyticsEvents: CollectionConfig = {
  slug: 'analytics-events',
  admin: {
    useAsTitle: 'eventType',
  },
  fields: [
    {
      name: 'eventType',
      type: 'text',
      required: true,
      index: true
    },
    {
      name: 'eventData',
      type: 'json'
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false
    },
    {
      name: 'sessionId',
      type: 'text'
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      index: true
    },
    {
      name: 'metadata',
      type: 'group',
      fields: [
        { name: 'userAgent', type: 'text' },
        { name: 'ipAddress', type: 'text' },
        { name: 'country', type: 'text' },
        { name: 'city', type: 'text' }
      ]
    }
  ]
};
```

## Usage in Components

### Client-Side Tracking

```typescript
'use client';

import { track } from '@vercel/analytics';
import { trackEvent } from '@/lib/analytics';

export function SearchForm() {
  const handleSearch = async (query: string) => {
    // Vercel Analytics
    track('search', { query });

    // Custom analytics
    await trackEvent({
      eventType: 'construction.search',
      eventData: { query }
    });
  };

  return <form onSubmit={handleSearch}>...</form>;
}
```

### Server-Side Tracking

```typescript
// src/app/api/suggestions/route.ts
import { trackEvent } from '@/lib/analytics';

export async function POST(request: Request) {
  const suggestion = await createSuggestion(data);

  await trackEvent({
    eventType: 'suggestion.create',
    eventData: {
      type: suggestion.suggestionType,
      constructionId: suggestion.construction?.id
    },
    userId: user.id
  });

  return Response.json(suggestion);
}
```

## Admin Dashboard

### Analytics Overview

```
┌────────────────────────────────────────────────────────┐
│ Analytics Dashboard                                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Overview (Last 30 Days)                                │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Page Views    │ Users    │ Suggestions │ Routes  │   │
│ │   45,234      │ 12,456   │    234      │  1,890  │   │
│ │   ↑ 12%       │ ↑ 8%     │   ↑ 23%     │  ↓ 5%   │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ Traffic Over Time                                      │
│ ┌──────────────────────────────────────────────────┐   │
│ │                    📊                             │   │
│ │              /\    /\                            │   │
│ │             /  \  /  \    /\                     │   │
│ │        /\  /    \/    \  /  \                    │   │
│ │       /  \/            \/    \                   │   │
│ │ ─────/─────────────────────────\──────────────   │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ Top Constructions Viewed                               │
│ 1. Metro Line 2 Construction     2,340 views          │
│ 2. Ring Road Section 3           1,892 views          │
│ 3. Bridge Renovation Thu Thiem   1,456 views          │
│                                                        │
│ Top Search Queries                                     │
│ 1. "metro"           890 searches                      │
│ 2. "quan 1"          654 searches                      │
│ 3. "road closed"     432 searches                      │
└────────────────────────────────────────────────────────┘
```

### Available Metrics

**Traffic Metrics:**
- Total page views
- Unique visitors
- Sessions
- Bounce rate
- Average session duration

**User Metrics:**
- New registrations
- Active users
- Verified users
- User retention

**Feature Metrics:**
- Suggestions submitted
- Routes calculated
- Searches performed
- Map interactions

**Performance Metrics:**
- Core Web Vitals
- API response times
- Error rates

## API Endpoints

### Get Analytics Summary

```
GET /api/admin/analytics

Authorization: Admin

Query Parameters:
  from    (date) - Start date
  to      (date) - End date
  metrics (string) - Comma-separated metrics

Response:
{
  period: { from, to },
  metrics: {
    pageViews: 45234,
    uniqueUsers: 12456,
    suggestions: 234,
    routes: 1890
  },
  trends: {
    pageViews: { change: 12, direction: "up" },
    // ...
  }
}
```

### Get Event Stream

```
GET /api/admin/analytics/events

Authorization: Admin

Query Parameters:
  type    (string) - Event type filter
  from    (date) - Start date
  to      (date) - End date
  limit   (number) - Max results

Response:
{
  events: [
    {
      id: "abc",
      eventType: "suggestion.create",
      eventData: { type: "update" },
      timestamp: "2024-01-15T10:30:00Z"
    }
  ],
  total: 1234
}
```

### Export Analytics

```
GET /api/admin/analytics/export

Authorization: Admin

Query Parameters:
  format  (string) - csv or json
  from    (date) - Start date
  to      (date) - End date

Response: File download
```

## Performance Monitoring

### Logging

Using Pino logger:

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty'
  }
});

// Usage
logger.info({ constructionId }, 'Construction viewed');
logger.error({ error }, 'API error occurred');
```

### Error Tracking

```typescript
// src/lib/error-tracking.ts
export async function trackError(error: Error, context?: Record<string, any>) {
  logger.error({ error, context }, 'Application error');

  await trackEvent({
    eventType: 'error.occurred',
    eventData: {
      message: error.message,
      stack: error.stack,
      ...context
    }
  });
}
```

### API Monitoring

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const start = Date.now();

  // Process request...

  const duration = Date.now() - start;

  if (duration > 1000) {
    logger.warn({
      path: request.pathname,
      duration
    }, 'Slow API response');
  }
}
```

## Scraper Metrics

### Tracking Scraper Performance

```typescript
interface ScraperMetrics {
  source: string;
  articlesProcessed: number;
  suggestionsCreated: number;
  duplicatesSkipped: number;
  errorsEncountered: number;
  duration: number;
}
```

### Dashboard Display

```
┌────────────────────────────────────────────────────┐
│ Scraper Performance                                │
├────────────────────────────────────────────────────┤
│                                                    │
│ TuoiTre (Last 24 hours)                           │
│ Processed: 45  Created: 12  Duplicates: 30        │
│ Errors: 3  Avg Duration: 12.5s                    │
│                                                    │
│ VNExpress (Last 24 hours)                         │
│ Processed: 38  Created: 8   Duplicates: 28        │
│ Errors: 2  Avg Duration: 10.2s                    │
└────────────────────────────────────────────────────┘
```

## Privacy Considerations

### Data Retention

- Analytics events: 90 days
- Performance logs: 30 days
- Error logs: 30 days

### PII Handling

- IP addresses anonymized
- User IDs hashed for export
- No sensitive data in event payloads

### GDPR Compliance

- Cookie consent banner (if EU traffic)
- Data export capability
- Data deletion on request

## Configuration

### Environment Variables

```env
# Vercel Analytics (automatic)
# No configuration needed

# Custom analytics
ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=90

# Logging
LOG_LEVEL=info
```

## Related Files

- `src/app/layout.tsx` (Analytics/SpeedInsights)
- `src/lib/analytics/index.ts`
- `src/lib/logger.ts`
- `src/collections/AnalyticsEvents.ts`
- `src/app/api/admin/analytics/route.ts`
- `src/app/(payload)/admin/[[...segments]]/analytics/page.tsx`
