# Internationalization (i18n)

## Overview

The Internationalization feature provides multi-language support for the HCMC Road Construction Tracker. Currently supporting Vietnamese (primary) and English, it enables users to view the interface and content in their preferred language.

## Supported Languages

| Language | Code | Status | Coverage |
|----------|------|--------|----------|
| Vietnamese | `vi` | Primary | 100% |
| English | `en` | Secondary | 100% |

## Implementation

### Technology Stack

- **next-intl** - Next.js internationalization library
- **ICU Message Format** - For pluralization and formatting
- **Server Components** - Full SSR support

### File Structure

```
src/
├── i18n/
│   ├── config.ts          # i18n configuration
│   ├── request.ts         # Request handling
│   └── routing.ts         # Locale routing
├── messages/
│   ├── vi.json            # Vietnamese translations
│   └── en.json            # English translations
└── app/
    └── [locale]/          # Locale-based routing
```

## Configuration

### i18n Config

```typescript
// src/i18n/config.ts
export const locales = ['vi', 'en'] as const;
export const defaultLocale = 'vi';

export type Locale = (typeof locales)[number];
```

### Message Files

```json
// messages/vi.json
{
  "common": {
    "loading": "Đang tải...",
    "error": "Có lỗi xảy ra",
    "save": "Lưu",
    "cancel": "Hủy",
    "search": "Tìm kiếm"
  },
  "navigation": {
    "home": "Trang chủ",
    "search": "Tìm kiếm",
    "suggest": "Đề xuất",
    "profile": "Hồ sơ"
  },
  "construction": {
    "status": {
      "planned": "Dự kiến",
      "in-progress": "Đang thi công",
      "completed": "Hoàn thành",
      "paused": "Tạm dừng",
      "cancelled": "Đã hủy"
    },
    "type": {
      "road": "Đường",
      "metro": "Metro",
      "bridge": "Cầu",
      "highway": "Cao tốc"
    }
  }
}
```

```json
// messages/en.json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel",
    "search": "Search"
  },
  "navigation": {
    "home": "Home",
    "search": "Search",
    "suggest": "Suggest",
    "profile": "Profile"
  },
  "construction": {
    "status": {
      "planned": "Planned",
      "in-progress": "In Progress",
      "completed": "Completed",
      "paused": "Paused",
      "cancelled": "Cancelled"
    },
    "type": {
      "road": "Road",
      "metro": "Metro",
      "bridge": "Bridge",
      "highway": "Highway"
    }
  }
}
```

## Usage

### In Server Components

```typescript
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('construction');

  return (
    <div>
      <h1>{t('status.in-progress')}</h1>
    </div>
  );
}
```

### In Client Components

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function StatusBadge({ status }) {
  const t = useTranslations('construction.status');

  return <span>{t(status)}</span>;
}
```

### With Variables

```json
{
  "results": {
    "found": "Tìm thấy {count} kết quả"
  }
}
```

```typescript
t('results.found', { count: 42 });
// Output: "Tìm thấy 42 kết quả"
```

### Pluralization

```json
{
  "items": {
    "count": "{count, plural, =0 {Không có mục} one {# mục} other {# mục}}"
  }
}
```

```typescript
t('items.count', { count: 0 });  // "Không có mục"
t('items.count', { count: 1 });  // "1 mục"
t('items.count', { count: 5 });  // "5 mục"
```

## Language Switcher

### Component

```typescript
// src/components/LanguageSwitcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    router.push(pathname.replace(`/${locale}`, `/${newLocale}`));
  };

  return (
    <select value={locale} onChange={(e) => switchLocale(e.target.value)}>
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  );
}
```

### Location in UI

```
┌─────────────────────────────────────────────────┐
│ Logo    Home  Search  ...     [VI ▼]  [👤]     │
└─────────────────────────────────────────────────┘
                                  ↑
                          Language Switcher
```

## URL Structure

### Locale Prefix

URLs include locale prefix:

```
/vi/             # Vietnamese home
/en/             # English home
/vi/details/abc  # Vietnamese detail page
/en/details/abc  # English detail page
```

### Default Locale

Default locale (Vietnamese) may optionally omit prefix:

```
/                # Redirects to /vi/ or shows Vietnamese
/details/abc     # Shows Vietnamese version
```

## Content Translation

### PayloadCMS Localization

PayloadCMS is configured with built-in localization support. Localized fields automatically store separate values for each locale.

#### Configuration

```typescript
// src/payload.config.ts
export default buildConfig({
  localization: {
    locales: [
      { label: 'Tiếng Việt', code: 'vi' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'vi',
    fallback: true, // Falls back to default locale if translation missing
  },
  // ...
});
```

#### Localized Fields

Fields with `localized: true` store separate values per locale:

| Collection | Localized Fields |
|------------|------------------|
| **Constructions** | `title`, `description`, `metroStations[].name`, `images[].caption`, `sources[].title` |
| **Suggestions** | `title`, `locationDescription`, `justification` |
| **Districts** | `name` |

#### Field Definition Example

```typescript
// src/collections/Constructions.ts
{
  name: 'title',
  type: 'text',
  required: true,
  localized: true,  // Enables per-locale storage
},
{
  name: 'description',
  type: 'richText',
  localized: true,  // Rich text also supports localization
  // ...
}
```

### Fetching Localized Content

#### Via PayloadCMS API

```bash
# Fetch constructions in Vietnamese (default)
GET /api/constructions

# Fetch constructions in English
GET /api/constructions?locale=en

# Fetch specific document in English
GET /api/constructions/123?locale=en
```

#### Via Payload SDK

```typescript
import { getPayload } from 'payload';
import config from '@payload-config';

const payload = await getPayload({ config });

// Fetch in specific locale
const constructions = await payload.find({
  collection: 'constructions',
  locale: 'en',
});

// Fetch single document
const construction = await payload.findByID({
  collection: 'constructions',
  id: '123',
  locale: 'vi',
});
```

### Auto-Translation Feature

The auto-translate system automatically translates Vietnamese content to English when documents are created or updated.

#### How It Works

1. **Language Detection**: When content is saved, the system detects if it's Vietnamese based on diacritics
2. **Background Processing**: Translations are queued and processed in the background (non-blocking)
3. **API Translation**: Uses Google Translate API for translations
4. **Rich Text Support**: Handles both plain text and Lexical rich text content

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PayloadCMS Admin UI                       │
│                                                             │
│   User enters Vietnamese content → Save Document            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   beforeChange Hook                          │
│                                                             │
│   1. Detect source language (Vietnamese/English)            │
│   2. Store translation metadata on document                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    afterChange Hook                          │
│                                                             │
│   1. Read translation metadata                              │
│   2. Queue translation job (background)                     │
│   3. Return document immediately (non-blocking)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Background Translation                       │
│                                                             │
│   1. Translate text/richText fields                         │
│   2. Update document with translations per locale           │
│   3. Rate-limited (150ms between API calls)                 │
└─────────────────────────────────────────────────────────────┘
```

#### Configuration

Auto-translate hooks are configured per collection:

```typescript
// src/collections/Constructions.ts
import { createAutoTranslateHooks } from '@/hooks/auto-translate';

const autoTranslateHooks = createAutoTranslateHooks({
  fields: ['title'],           // Plain text fields
  richTextFields: ['description'],  // Lexical rich text fields
  immediate: false,            // Process in background
});

export const Constructions: CollectionConfig = {
  // ...
  hooks: {
    beforeChange: [autoTranslateHooks.beforeChange],
    afterChange: [autoTranslateHooks.afterChange],
  },
};
```

#### Translation Utilities

Located in `src/lib/translate.ts`:

| Function | Description |
|----------|-------------|
| `translateText(text, from, to)` | Translates plain text between locales |
| `translateRichText(content, from, to)` | Translates Lexical JSON content recursively |
| `detectLocale(text)` | Detects Vietnamese based on diacritics |
| `hasPlaceholders(text)` | Checks for `{variable}` patterns |
| `hasHtmlTags(text)` | Checks for HTML tags |
| `autoTranslateField(value, sourceLocale)` | Auto-translates to all other locales |

#### Translation Safety

The system skips automatic translation for:
- Strings containing placeholders: `{count} items`
- Strings containing HTML tags: `<strong>text</strong>`
- Empty or whitespace-only strings

These require manual translation to preserve formatting.

### Manual Translation API

Endpoint for manually triggering translations on existing content.

#### Trigger Translation

```bash
POST /api/translate-content
Content-Type: application/json
Cookie: payload-token=<admin-token>

{
  "collection": "constructions",
  "id": "123",
  "sourceLocale": "vi",           // Optional, auto-detected
  "targetLocales": ["en"],        // Optional, defaults to all
  "fields": ["title", "description"]  // Optional, defaults to all
}
```

**Response:**
```json
{
  "success": true,
  "message": "Translated document 123 in constructions",
  "results": {
    "en": {
      "title": "Metro Line 1 Ben Thanh - Suoi Tien",
      "description": "Translated"
    }
  }
}
```

#### Check Translation Status

```bash
GET /api/translate-content?collection=constructions&id=123
```

**Response:**
```json
{
  "collection": "constructions",
  "id": "123",
  "locales": {
    "vi": {
      "title": "present",
      "description": "present"
    },
    "en": {
      "title": "present",
      "description": "missing"
    }
  }
}
```

### Frontend Translation (Build-time)

Frontend UI translation files are processed at build time, not via cron job.

**Script:** `scripts/translate-messages.ts`

**Purpose:** Translates missing keys between `vi.json` and `en.json` message files

**NPM Scripts:**
```bash
# Run during build (automatic)
npm run build          # Runs translate then next build

# Run manually
npm run translate      # Translate missing keys

# Preview what would be translated
npm run translate:dry-run
```

**Command Line Options:**
- `--dry-run` - Preview translations without making changes
- `--verbose` - Show detailed translation output

### Translation Notifications

Auto-translate operations create log entries in PayloadCMS that can be viewed in the admin panel under the Logs collection.

**Notification Types:**
| Type | Level | Description |
|------|-------|-------------|
| `translation_started` | info | Translation job has begun |
| `translation_completed` | info | Translation job finished successfully |
| `translation_failed` | error | Translation job encountered an error |

**Log Entry Structure:**
```json
{
  "level": "info",
  "message": "Auto-translation completed for \"Metro Line 1\" (constructions) to en",
  "context": {
    "type": "auto_translate",
    "notificationType": "translation_completed",
    "collection": "constructions",
    "documentId": "123",
    "documentTitle": "Metro Line 1",
    "userId": "456",
    "fieldsCount": 2,
    "targetLocales": ["en"]
  }
}
```

**Viewing Notifications:**
1. Go to PayloadCMS Admin
2. Navigate to **Logs** collection
3. Filter by `context.type = "auto_translate"`

## API Responses

### Localized Responses

API can return localized content:

```
GET /api/constructions?locale=en

Response:
{
  docs: [
    {
      id: "abc",
      title: "Metro Line 2 Construction",  // English
      // ...
    }
  ]
}
```

### Locale Header

Alternative: Accept-Language header

```
GET /api/constructions
Accept-Language: en

Response returns English content
```

## Date & Number Formatting

### Date Formatting

```typescript
import { useFormatter } from 'next-intl';

function DateDisplay({ date }) {
  const format = useFormatter();

  return (
    <time>{format.dateTime(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</time>
  );
}

// vi: "15 tháng 1, 2024"
// en: "January 15, 2024"
```

### Number Formatting

```typescript
const format = useFormatter();

format.number(1234567.89);
// vi: "1.234.567,89"
// en: "1,234,567.89"

format.number(1000000, { style: 'currency', currency: 'VND' });
// vi: "1.000.000 ₫"
// en: "₫1,000,000"
```

## Feature Flag

**Flag:** `FEATURE_I18N`

When enabled:
- Language switcher visible
- Locale routing active
- Translated content served

When disabled:
- Vietnamese only
- Language switcher hidden
- `/[locale]` routing disabled

## Translation Keys Organization

### Namespaces

| Namespace | Content |
|-----------|---------|
| `common` | Shared UI text |
| `navigation` | Menu items |
| `construction` | Construction-related |
| `suggestion` | Suggestion forms |
| `auth` | Authentication |
| `errors` | Error messages |
| `validation` | Form validation |

### Key Naming Convention

```
{namespace}.{category}.{item}

Examples:
- construction.status.in-progress
- auth.login.submit
- errors.notFound.title
```

## Adding New Translations

### Step 1: Add to Vietnamese file

```json
// messages/vi.json
{
  "newFeature": {
    "title": "Tiêu đề mới",
    "description": "Mô tả tính năng"
  }
}
```

### Step 2: Add to English file

```json
// messages/en.json
{
  "newFeature": {
    "title": "New Title",
    "description": "Feature description"
  }
}
```

### Step 3: Use in component

```typescript
const t = useTranslations('newFeature');
return <h1>{t('title')}</h1>;
```

## Testing Translations

### Missing Key Detection

In development, missing keys show placeholder:

```
[missing: vi.newFeature.unknownKey]
```

### Type Safety

TypeScript validates translation keys:

```typescript
// Generates types from message files
type Messages = typeof import('../messages/vi.json');

// Type error if key doesn't exist
t('nonexistent.key');  // TS Error
```

## SEO Considerations

### Hreflang Tags

```html
<link rel="alternate" hreflang="vi" href="https://example.com/vi/page" />
<link rel="alternate" hreflang="en" href="https://example.com/en/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/vi/page" />
```

### Localized Metadata

```typescript
export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description')
  };
}
```

## Related Files

### Frontend i18n
- `src/i18n/config.ts` - Locale configuration
- `src/i18n/request.ts` - Request handling
- `src/i18n/messages/vi.json` - Vietnamese translations
- `src/i18n/messages/en.json` - English translations
- `src/components/LanguageSwitcher.tsx` - Language switcher component

### PayloadCMS Localization
- `src/payload.config.ts` - PayloadCMS localization config
- `src/collections/Constructions.ts` - Localized construction fields
- `src/collections/Suggestions.ts` - Localized suggestion fields
- `src/collections/Districts.ts` - Localized district fields

### Translation Utilities
- `src/lib/translate.ts` - Translation utility functions
- `src/hooks/auto-translate.ts` - Auto-translate PayloadCMS hooks with notifications
- `src/app/api/translate-content/route.ts` - Manual translation API
- `scripts/translate-messages.ts` - Build-time frontend translation script
