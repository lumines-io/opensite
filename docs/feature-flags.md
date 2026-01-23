# Feature Flags Documentation

This document describes the feature flag system implemented in the HCMC Road Construction Tracker application.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Available Feature Flags](#available-feature-flags)
- [Usage](#usage)
  - [Server-Side Usage](#server-side-usage)
  - [Client-Side Usage](#client-side-usage)
- [Feature Flag Reference](#feature-flag-reference)
- [Best Practices](#best-practices)

---

## Overview

Feature flags (also known as feature toggles) allow you to:

- **Gradually roll out** new features to users
- **A/B test** features with different user segments
- **Disable problematic features** without deployment
- **Enable features for specific user groups**
- **Reduce infrastructure costs** by disabling optional features

The feature flag system in this application uses environment variables for configuration and provides both server-side and client-side utilities.

---

## Configuration

Feature flags are configured via environment variables. Add them to your `.env` file or deployment environment:

```bash
# Feature Toggles (all default to 'true' if not set)
FEATURE_USER_REGISTRATION=true
FEATURE_COMMUNITY_SUGGESTIONS=true
FEATURE_ROUTING=true
FEATURE_SCRAPER=true
FEATURE_ADVANCED_SEARCH=true
FEATURE_RATE_LIMITING=true
FEATURE_CACHING=true
FEATURE_EMAIL_NOTIFICATIONS=true
FEATURE_I18N=true
FEATURE_THEME_TOGGLE=true
FEATURE_MODERATOR_DASHBOARD=true
FEATURE_MAP_ANIMATIONS=true
```

### Valid Values

- `true`, `1`, `yes`, `on` - Feature is **enabled**
- Any other value or not set - Uses **default value** (typically `true`)
- `false`, `0`, `no`, `off` - Feature is **disabled**

---

## Available Feature Flags

| Flag | Default | Category | Impact | Description |
|------|---------|----------|--------|-------------|
| `FEATURE_USER_REGISTRATION` | `true` | Core | High | Allow new users to create accounts |
| `FEATURE_COMMUNITY_SUGGESTIONS` | `true` | Core | High | Allow users to submit construction suggestions |
| `FEATURE_ROUTING` | `true` | External | Medium | A-to-B routing with construction alerts |
| `FEATURE_SCRAPER` | `true` | Ops | High | Automated news scraping |
| `FEATURE_ADVANCED_SEARCH` | `true` | UI | Low | Advanced filtering capabilities |
| `FEATURE_RATE_LIMITING` | `true` | Ops | Medium | API rate limiting |
| `FEATURE_CACHING` | `true` | Ops | Medium | Response caching |
| `FEATURE_EMAIL_NOTIFICATIONS` | `true` | External | Medium | Email notifications |
| `FEATURE_I18N` | `true` | UI | Low | Multi-language support |
| `FEATURE_THEME_TOGGLE` | `true` | UI | Low | Dark/light mode switching |
| `FEATURE_MODERATOR_DASHBOARD` | `true` | Core | High | Moderator review workflows |
| `FEATURE_MAP_ANIMATIONS` | `true` | UI | Low | Animated map markers |

---

## Usage

### Server-Side Usage

For API routes, server components, and middleware:

```typescript
import { isFeatureEnabled, FEATURE_FLAGS, featureFlagGuard } from '@/lib/feature-flags';

// Simple check
if (!isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)) {
  return Response.json({ error: 'Registration disabled' }, { status: 403 });
}

// Using the guard helper (returns Response if disabled, null if enabled)
export async function POST(request: NextRequest) {
  const guardResponse = featureFlagGuard(FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS);
  if (guardResponse) {
    return guardResponse;
  }

  // Feature is enabled, continue with handler
  // ...
}

// Get all flags
const flags = getFeatureFlags();
console.log(flags.FEATURE_ROUTING); // true or false
```

### Client-Side Usage

For React components, use the provided hooks and components:

```tsx
import { useFeatureFlag, FeatureFlag, FEATURE_FLAGS } from '@/lib/feature-flags/provider';

// Using the hook
function MyComponent() {
  const isRoutingEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_ROUTING);

  if (!isRoutingEnabled) {
    return null; // or fallback UI
  }

  return <RoutingPanel />;
}

// Using the component wrapper
function AnotherComponent() {
  return (
    <FeatureFlag
      flag={FEATURE_FLAGS.FEATURE_THEME_TOGGLE}
      fallback={<div>Theme toggle unavailable</div>}
    >
      <ThemeToggle />
    </FeatureFlag>
  );
}

// Get all flags
function DebugComponent() {
  const flags = useFeatureFlags();
  return <pre>{JSON.stringify(flags, null, 2)}</pre>;
}
```

### Provider Setup

The `FeatureFlagsProvider` is already configured in the app layout (`src/app/(app)/layout.tsx`). It receives flags from the server and provides them to client components.

---

## Feature Flag Reference

### FEATURE_USER_REGISTRATION

**Purpose:** Controls user registration functionality

**When OFF:**
- `/register` page shows "Registration Unavailable" message
- `POST /api/auth/register` returns 403 Forbidden
- "Create Account" links hidden from UI
- Existing users can still log in

**Use Cases:**
- Closed beta periods
- Temporarily disable during spam attacks
- Invite-only phases

---

### FEATURE_COMMUNITY_SUGGESTIONS

**Purpose:** Controls the community suggestion/contribution system

**When OFF:**
- `/suggest` and `/suggestions` pages show disabled message
- "Suggest Edit" buttons hidden from construction details
- `POST /api/suggestions` returns 403 Forbidden
- Existing suggestions can still be processed by moderators

**Use Cases:**
- Disable during content freeze periods
- Turn off if moderation backlog is too high
- Enable only for trusted users

---

### FEATURE_ROUTING

**Purpose:** Controls A-to-B routing with construction alerts

**When OFF:**
- `MapRoutingPanel` component hidden from map interface
- `/api/route/*` endpoints return 403 Forbidden
- Map search still works, only routing disabled

**Use Cases:**
- Reduce Mapbox Directions API costs
- Disable if API quota exceeded
- Progressive feature rollout

---

### FEATURE_SCRAPER

**Purpose:** Controls automated news scraping from external sources

**When OFF:**
- `/api/scraper/run` returns 403 Forbidden
- Cron job `/api/cron/scraper` skips execution
- Admin scraper panel shows "disabled" status
- Manual trigger button disabled
- Existing scraped suggestions remain and can be processed

**Use Cases:**
- Disable during news source API issues
- Reduce server load during peak times
- Maintenance periods

---

### FEATURE_ADVANCED_SEARCH

**Purpose:** Controls advanced search filtering capabilities

**When OFF:**
- "Filter Search" button hidden from map header
- `FilterSearchOverlay` component not rendered
- Basic search (text query) still available via `MapSearchPanel`

**Use Cases:**
- Simplify UX for mobile users
- Reduce database load
- Progressive feature rollout

---

### FEATURE_RATE_LIMITING

**Purpose:** Controls API request rate limiting

**When OFF:**
- No request limits enforced
- `X-RateLimit-*` headers still present but limits not applied
- Useful for development/testing environments

**Use Cases:**
- Development environment
- Load testing scenarios
- Trusted internal networks

**Note:** Also requires Redis to be configured for rate limiting to work.

---

### FEATURE_CACHING

**Purpose:** Controls response caching for API endpoints

**When OFF:**
- All requests hit database directly
- Always fresh data (no stale cache concerns)
- Higher database load, potentially slower responses

**Use Cases:**
- Debug cache-related issues
- Force fresh data for testing
- Development environment

**Note:** Also requires Redis to be configured for caching to work.

---

### FEATURE_EMAIL_NOTIFICATIONS

**Purpose:** Controls email sending functionality

**When OFF:**
- Email verification skipped (implementation dependent)
- Password reset emails not sent
- Suggestion status notifications not sent

**Use Cases:**
- Development without SMTP
- Email provider issues
- Reduce email costs

---

### FEATURE_I18N

**Purpose:** Controls internationalization (multi-language support)

**When OFF:**
- Language switcher hidden from UI
- Default language (Vietnamese) used for all users

**Use Cases:**
- Single-language deployment
- Simplify for initial launch
- Reduce translation maintenance

---

### FEATURE_THEME_TOGGLE

**Purpose:** Controls dark/light mode switching

**When OFF:**
- Theme toggle button hidden from UI
- System default or configured default theme used

**Use Cases:**
- Standardize branding
- Reduce CSS complexity
- A/B test theme preferences

---

### FEATURE_MODERATOR_DASHBOARD

**Purpose:** Controls moderator review functionality

**When OFF:**
- `/moderator/*` routes show disabled message
- Moderator links hidden from user menu
- Suggestions cannot be processed (queue builds up)

**Use Cases:**
- Pause moderation during policy review
- Maintenance of moderation workflow
- Emergency disable if workflow has bugs

---

### FEATURE_MAP_ANIMATIONS

**Purpose:** Controls map animation effects

**When OFF:**
- Static markers (no pulse animations)
- Better performance on low-power devices
- Reduced battery drain on mobile

**Use Cases:**
- Performance optimization
- Accessibility (reduce motion)
- Low-bandwidth mode

---

## Best Practices

### 1. Default to Enabled

All feature flags default to `true` unless explicitly disabled. This ensures the application works out-of-the-box.

### 2. Use Descriptive Names

Feature flag names follow the pattern `FEATURE_<FEATURE_NAME>` for clarity.

### 3. Document Changes

When adding new feature flags or changing behavior, update this documentation.

### 4. Clean Up Old Flags

Remove feature flags that are no longer needed. Long-lived flags should be documented with their purpose.

### 5. Test Both States

Always test your application with features both enabled and disabled.

### 6. Consider Dependencies

Some features depend on others. For example:
- `FEATURE_CACHING` requires Redis configuration
- `FEATURE_RATE_LIMITING` requires Redis configuration

### 7. Use Guards Consistently

For API routes, use the `featureFlagGuard` helper for consistent error responses:

```typescript
const guardResponse = featureFlagGuard(FEATURE_FLAGS.FEATURE_NAME);
if (guardResponse) return guardResponse;
```

### 8. Provide Fallback UI

When hiding UI elements, consider providing fallback content or messages to explain why a feature is unavailable.

---

## Adding New Feature Flags

1. Add the flag to `src/lib/feature-flags/config.ts`:

```typescript
export const FEATURE_FLAGS = {
  // ... existing flags
  FEATURE_MY_NEW_FEATURE: 'FEATURE_MY_NEW_FEATURE',
} as const;
```

2. Set the default value:

```typescript
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagValue, boolean> = {
  // ... existing defaults
  [FEATURE_FLAGS.FEATURE_MY_NEW_FEATURE]: true,
};
```

3. Add metadata for documentation:

```typescript
export const FEATURE_FLAG_METADATA: Record<FeatureFlagValue, FeatureFlagMetadata> = {
  // ... existing metadata
  [FEATURE_FLAGS.FEATURE_MY_NEW_FEATURE]: {
    key: FEATURE_FLAGS.FEATURE_MY_NEW_FEATURE,
    name: 'My New Feature',
    description: 'Description of the feature',
    category: 'core', // core, ui, ops, external
    impact: 'medium', // high, medium, low
    affectedRoutes: ['/my-route'],
    affectedComponents: ['MyComponent'],
  },
};
```

4. Use the flag in your code:

```typescript
// Server-side
if (!isFeatureEnabled(FEATURE_FLAGS.FEATURE_MY_NEW_FEATURE)) {
  // Handle disabled state
}

// Client-side
const isEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_MY_NEW_FEATURE);
```

5. Update this documentation with the new flag details.

---

## File Structure

```
src/lib/feature-flags/
├── config.ts       # Flag definitions, defaults, and metadata
├── index.ts        # Server-side utilities and exports
└── provider.tsx    # React context provider and hooks
```

---

## Environment Examples

### Development (all features enabled)

```bash
# No configuration needed - all features default to enabled
```

### Production (with some features disabled)

```bash
FEATURE_USER_REGISTRATION=false   # Closed beta
FEATURE_SCRAPER=false              # Manual content only
FEATURE_MAP_ANIMATIONS=false       # Performance optimization
```

### Staging (testing specific features)

```bash
FEATURE_ROUTING=false              # Test without routing
FEATURE_CACHING=false              # Test without cache
```
