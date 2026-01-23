# Feature Flags

## Overview

The Feature Flags system provides runtime control over application features without requiring code deployments. Administrators can enable or disable features instantly through the admin interface.

## Available Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `FEATURE_USER_REGISTRATION` | `true` | Enable user signup |
| `FEATURE_COMMUNITY_SUGGESTIONS` | `true` | Enable suggestion submission |
| `FEATURE_ROUTING` | `true` | Enable A-to-B routing |
| `FEATURE_SCRAPER` | `true` | Enable automated scraping |
| `FEATURE_ADVANCED_SEARCH` | `true` | Enable filter search |
| `FEATURE_RATE_LIMITING` | `true` | Enable API rate limits |
| `FEATURE_CACHING` | `true` | Enable response caching |
| `FEATURE_EMAIL_NOTIFICATIONS` | `true` | Enable emails |
| `FEATURE_I18N` | `true` | Enable multi-language |
| `FEATURE_THEME_TOGGLE` | `true` | Enable dark/light mode |
| `FEATURE_MODERATOR_DASHBOARD` | `true` | Enable moderation UI |
| `FEATURE_MAP_ANIMATIONS` | `true` | Enable map animations |

## Architecture

### Storage

Feature flags stored in database (Payload CMS global):

```typescript
// src/globals/FeatureFlags.ts
const FeatureFlags: GlobalConfig = {
  slug: 'feature-flags',
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'flags',
      type: 'array',
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        { name: 'description', type: 'text' }
      ]
    }
  ]
};
```

### Retrieval

Flags are fetched and cached:

```typescript
// src/lib/feature-flags/index.ts
export async function getFeatureFlag(key: string): Promise<boolean> {
  const cached = await getCachedFlags();
  if (cached) return cached[key] ?? getDefaultValue(key);

  const flags = await fetchFeatureFlags();
  await cacheFlags(flags);
  return flags[key] ?? getDefaultValue(key);
}
```

### Caching Strategy

- Flags cached in Redis/memory
- 5-minute TTL
- Cache invalidated on update
- Fallback to defaults if cache/DB unavailable

## Usage

### In Server Components

```typescript
import { getFeatureFlag } from '@/lib/feature-flags';

export default async function Page() {
  const routingEnabled = await getFeatureFlag('FEATURE_ROUTING');

  return (
    <div>
      {routingEnabled && <RoutingPanel />}
    </div>
  );
}
```

### In Client Components

```typescript
'use client';

import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export function SearchPanel() {
  const advancedSearchEnabled = useFeatureFlag('FEATURE_ADVANCED_SEARCH');

  return (
    <div>
      <SearchBar />
      {advancedSearchEnabled && <FilterButton />}
    </div>
  );
}
```

### In API Routes

```typescript
import { getFeatureFlag } from '@/lib/feature-flags';

export async function POST(request: Request) {
  const registrationEnabled = await getFeatureFlag('FEATURE_USER_REGISTRATION');

  if (!registrationEnabled) {
    return Response.json(
      { error: 'Registration is currently disabled' },
      { status: 403 }
    );
  }

  // Process registration...
}
```

### In Middleware

```typescript
import { getFeatureFlag } from '@/lib/feature-flags';

export async function middleware(request: NextRequest) {
  if (request.pathname.startsWith('/suggest')) {
    const suggestionsEnabled = await getFeatureFlag('FEATURE_COMMUNITY_SUGGESTIONS');
    if (!suggestionsEnabled) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
}
```

## API Endpoints

### Get Feature Flags

```
GET /api/admin/feature-flags

Authorization: Admin

Response:
{
  flags: {
    FEATURE_USER_REGISTRATION: true,
    FEATURE_COMMUNITY_SUGGESTIONS: true,
    FEATURE_ROUTING: false,
    // ...
  }
}
```

### Update Feature Flags

```
POST /api/admin/feature-flags

Authorization: Admin

Body:
{
  flags: {
    FEATURE_ROUTING: false,
    FEATURE_MAP_ANIMATIONS: true
  }
}

Response:
{
  success: true,
  flags: { ... }
}
```

### Get Single Flag (Public)

```
GET /api/feature-flags/[key]

Response:
{
  key: "FEATURE_ROUTING",
  enabled: true
}
```

## Admin Interface

### Feature Flags Page

Located in Payload admin or custom admin view:

```
┌────────────────────────────────────────────────────┐
│ Feature Flags                                      │
├────────────────────────────────────────────────────┤
│                                                    │
│ ☑ User Registration                                │
│   Allow new users to create accounts               │
│                                                    │
│ ☑ Community Suggestions                            │
│   Enable user-submitted suggestions                │
│                                                    │
│ ☐ Routing                                          │
│   A-to-B route planning with construction alerts   │
│                                                    │
│ ☑ Advanced Search                                  │
│   Enable advanced filtering options                │
│                                                    │
│ ☑ Rate Limiting                                    │
│   Enable API rate limiting                         │
│                                                    │
│ ...                                                │
│                                                    │
│ [Save Changes]  [Reset to Defaults]                │
└────────────────────────────────────────────────────┘
```

## Feature Flag Details

### FEATURE_USER_REGISTRATION

Controls user account creation.

**When disabled:**
- Registration page shows "Registration disabled" message
- `/register` API returns 403
- Login still works for existing users

**Use case:** Temporarily close registration during maintenance or to limit growth.

### FEATURE_COMMUNITY_SUGGESTIONS

Controls community contribution system.

**When disabled:**
- "Suggest" menu item hidden
- Suggestion forms disabled
- `/suggest` redirects to home
- Existing suggestions viewable by owners

**Use case:** Temporarily pause submissions during review backlogs.

### FEATURE_ROUTING

Controls A-to-B routing feature.

**When disabled:**
- Routing panel hidden
- Route endpoints return 403
- Map click doesn't create route markers

**Use case:** Disable if Mapbox quota exceeded or service issues.

### FEATURE_SCRAPER

Controls automated data collection.

**When disabled:**
- Cron jobs skip scraping
- Manual trigger returns 403
- No new scraper-sourced suggestions

**Use case:** Pause scraping during source website issues.

### FEATURE_ADVANCED_SEARCH

Controls advanced filtering UI.

**When disabled:**
- Filter button hidden
- Basic search only
- API still accepts filter params (backwards compatibility)

**Use case:** Simplify UI for mobile users.

### FEATURE_RATE_LIMITING

Controls API rate limiting.

**When disabled:**
- No request throttling
- All requests processed
- Potential for abuse

**Use case:** Disable during load testing or trusted environments.

### FEATURE_CACHING

Controls response caching.

**When disabled:**
- Fresh data on every request
- Higher database load
- No stale data issues

**Use case:** Debugging cache issues, ensuring fresh data.

### FEATURE_EMAIL_NOTIFICATIONS

Controls email sending.

**When disabled:**
- No verification emails
- No notification emails
- Users can still register (manual verification)

**Use case:** Email service issues or maintenance.

### FEATURE_I18N

Controls internationalization.

**When disabled:**
- Vietnamese only
- Language switcher hidden
- Simpler URL structure

**Use case:** Before translations are complete.

### FEATURE_THEME_TOGGLE

Controls dark/light mode toggle.

**When disabled:**
- System theme used
- Toggle button hidden
- Consistent theme

**Use case:** Branding requirements, incomplete dark theme.

### FEATURE_MODERATOR_DASHBOARD

Controls moderator access.

**When disabled:**
- Moderator menu hidden
- Moderation endpoints return 403
- Suggestions stay in pending

**Use case:** During moderation workflow changes.

### FEATURE_MAP_ANIMATIONS

Controls map visual effects.

**When disabled:**
- Instant transitions
- No animation delays
- Better performance on low-end devices

**Use case:** Performance optimization for slower devices.

## Best Practices

### Naming Convention

```
FEATURE_{FEATURE_NAME}

Examples:
- FEATURE_USER_REGISTRATION
- FEATURE_DARK_MODE
- FEATURE_BETA_SEARCH
```

### Adding New Flags

1. Add to defaults in config
2. Add to admin interface
3. Implement checks in code
4. Update documentation
5. Test both enabled/disabled states

### Removing Flags

1. Ensure feature is stable
2. Remove flag checks from code
3. Remove from admin interface
4. Clean up any cached values
5. Document removal

## Testing

### Unit Tests

```typescript
describe('Feature Flags', () => {
  it('returns default when flag not set', async () => {
    const result = await getFeatureFlag('FEATURE_NEW');
    expect(result).toBe(true);  // Default is true
  });

  it('returns false when disabled', async () => {
    await setFeatureFlag('FEATURE_ROUTING', false);
    const result = await getFeatureFlag('FEATURE_ROUTING');
    expect(result).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Registration with flag disabled', () => {
  beforeAll(async () => {
    await setFeatureFlag('FEATURE_USER_REGISTRATION', false);
  });

  it('returns 403 on register attempt', async () => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });
    expect(response.status).toBe(403);
  });
});
```

## Related Files

- `src/globals/FeatureFlags.ts`
- `src/lib/feature-flags/index.ts`
- `src/lib/feature-flags/defaults.ts`
- `src/hooks/useFeatureFlag.ts`
- `src/app/api/admin/feature-flags/route.ts`
- `src/app/(payload)/admin/[[...segments]]/feature-flags/page.tsx`
