# Anonymous User Flow

## Overview

This document describes the user experience for visitors who are not logged in to the HCMC Road Construction Tracker.

## Entry Points

### Direct URL Access

- Home page: `https://example.com/`
- Search: `https://example.com/?search=metro`
- Construction detail: `https://example.com/details/metro-line-2`

### Referrals

- Search engine results
- Social media links
- News article references

## User Journey Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ANONYMOUS USER JOURNEY                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────┐     ┌──────────┐     ┌────────────────┐               │
│   │ Landing │ ──► │ Explore  │ ──► │ View Details   │               │
│   │  Page   │     │   Map    │     │ (Construction) │               │
│   └─────────┘     └────┬─────┘     └────────────────┘               │
│                        │                                             │
│                        ▼                                             │
│   ┌─────────────┐  ┌──────────┐     ┌────────────────┐              │
│   │ Calculate   │◄─┤  Search  │     │ Suggest Edit   │              │
│   │   Route     │  │ Projects │     │   (blocked)    │              │
│   └─────────────┘  └──────────┘     └───────┬────────┘              │
│                                              │                       │
│                                              ▼                       │
│                                     ┌────────────────┐              │
│                                     │ Login/Register │              │
│                                     │    Prompt      │              │
│                                     └────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

## Available Features

### 1. Home Page / Map View

**URL:** `/`

**Experience:**
1. Full-screen interactive map of HCMC
2. Construction markers visible
3. Map controls available:
   - Zoom in/out
   - Pan
   - Fullscreen toggle
   - Current location (with permission)
   - Map style toggle

**Actions:**
- Click marker → View popup with summary
- Click "View Details" → Navigate to detail page
- Zoom to cluster → See individual markers

### 2. Search Constructions

**URL:** `/?search=query`

**Experience:**
1. Search bar in map header
2. Type query → See live results
3. Results appear in dropdown/list

**Search Capabilities:**
- Text search (title, description)
- Location search
- Type filter (if advanced search enabled)
- Status filter (if advanced search enabled)

**Flow:**
```
┌─────────────┐
│ Type query  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ View results│ ──► │ Click result│
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                   ┌─────────────┐
                   │ View detail │
                   │    page     │
                   └─────────────┘
```

### 3. Advanced Search (Filter Panel)

**Feature Flag:** `FEATURE_ADVANCED_SEARCH`

**Experience:**
1. Click filter icon in search area
2. Filter panel opens
3. Select criteria:
   - Construction type (multi-select)
   - Status (multi-select)
   - District (dropdown)
   - Date range (start/end)
4. Apply filters
5. Map updates with filtered results

### 4. View Construction Details

**URL:** `/details/[slug]`

**Experience:**
1. Full construction information displayed
2. Multiple tabs available:
   - **Overview** - Summary and status
   - **Timeline** - Project timeline
   - **Details** - Full description
   - **Gallery** - Project images
   - **Map** - Location map
   - **Changes** - Edit history

**Information Shown:**
- Title and type badge
- Status and progress
- Start date / Expected end date
- District location
- Description (rich text)
- Contractor name
- Budget information
- Funding source
- Gallery images
- Location on mini-map

### 5. Route Planning

**Feature Flag:** `FEATURE_ROUTING`

**Experience:**
1. Click routing icon on map
2. Routing panel opens
3. Set origin:
   - Use current location
   - Click on map
   - Enter address
4. Set destination:
   - Click on map
   - Enter address
5. View route on map
6. See construction alerts along route

**Alerts Shown:**
- Construction projects near route
- Distance from route
- Project status
- Potential impact

### 6. Language Switching

**Feature Flag:** `FEATURE_I18N`

**Experience:**
1. Find language toggle in header
2. Select Vietnamese or English
3. Interface updates immediately
4. URL includes locale prefix

### 7. Theme Switching

**Feature Flag:** `FEATURE_THEME_TOGGLE`

**Experience:**
1. Find theme toggle in header
2. Click to switch dark/light mode
3. Preference saved locally
4. Persists across sessions

## Restricted Actions

### Submitting Suggestions

**Trigger:** Click "Suggest Edit" on construction detail

**Response:**
```
┌────────────────────────────────────┐
│         Login Required             │
├────────────────────────────────────┤
│                                    │
│ To suggest edits, please:          │
│                                    │
│ [Login]  or  [Create Account]      │
│                                    │
└────────────────────────────────────┘
```

### Accessing Profile

**Trigger:** Click profile/account icon

**Response:**
```
┌────────────────────────────────────┐
│         Account                    │
├────────────────────────────────────┤
│                                    │
│ • Login                            │
│ • Create Account                   │
│                                    │
└────────────────────────────────────┘
```

### Accessing Moderator/Admin

**Trigger:** Direct URL access to `/moderator/*` or `/admin/*`

**Response:** Redirect to login page with return URL

## Navigation Structure

### Header

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [Search Bar...      ]  [🌐 VI] [🌙] [👤 Login]       │
└─────────────────────────────────────────────────────────────┘
```

### Map Controls

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [🔍 Search]        [Filter]                               │
│                                                             │
│                    MAP CONTENT                              │
│                                                             │
│                                          [+]                │
│                                          [-]                │
│                                          [📍]               │
│                                          [⛶]                │
│                                                             │
│  [🗺️ Routing]       [Legend]                               │
└─────────────────────────────────────────────────────────────┘
```

### Footer

```
┌─────────────────────────────────────────────────────────────┐
│ About  |  Privacy  |  Terms  |  Contact     © 2024 HCMC    │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Prompts

### When to Show Login Prompt

| Action | Prompt Type |
|--------|-------------|
| Click "Suggest Edit" | Modal with login/register options |
| Navigate to `/suggest` | Redirect to `/login?returnTo=/suggest` |
| Navigate to `/suggestions` | Redirect to `/login?returnTo=/suggestions` |
| Navigate to `/profile` | Redirect to `/login?returnTo=/profile` |

### Prompt Design

```
┌────────────────────────────────────┐
│            ✕                       │
├────────────────────────────────────┤
│                                    │
│    🔒 Sign in to contribute        │
│                                    │
│    Help keep our construction      │
│    data accurate by suggesting     │
│    updates and corrections.        │
│                                    │
│    [    Sign In    ]               │
│                                    │
│    New here? [Create an account]   │
│                                    │
└────────────────────────────────────┘
```

## Performance Considerations

### Initial Load

- Map tiles load progressively
- Construction data fetched on visible bounds
- Images lazy loaded
- Search ready immediately

### Interaction Speed

- Search results appear within 200ms
- Map interactions at 60fps
- Route calculation under 1 second

## Error States

### Map Loading Error

```
┌────────────────────────────────────┐
│                                    │
│    ⚠️ Unable to load map          │
│                                    │
│    Please check your connection    │
│    and refresh the page.           │
│                                    │
│    [Refresh Page]                  │
│                                    │
└────────────────────────────────────┘
```

### Search Error

```
┌────────────────────────────────────┐
│                                    │
│    ⚠️ Search unavailable          │
│                                    │
│    Please try again in a moment.   │
│                                    │
└────────────────────────────────────┘
```

### Construction Not Found

```
┌────────────────────────────────────┐
│                                    │
│    🔍 Construction not found       │
│                                    │
│    The project you're looking for  │
│    doesn't exist or may have been  │
│    removed.                        │
│                                    │
│    [Back to Map]  [Search Projects]│
│                                    │
└────────────────────────────────────┘
```

## Analytics Tracked

| Event | Data |
|-------|------|
| `page.view` | Page path, referrer |
| `map.load` | Load time, bounds |
| `search.query` | Query text, result count |
| `construction.view` | Slug, source |
| `route.calculate` | Origin, destination |
| `language.switch` | From, to |
| `theme.switch` | Theme value |

## Next Steps

After exploring as anonymous user, common paths:

1. **Create Account** → [Registration Flow](./registration.md)
2. **Login** → [Login Flow](./login.md)
3. **Continue Exploring** → Stay on map
4. **Leave Site** → Exit

## Related Flows

- [Registration Flow](./registration.md)
- [Login Flow](./login.md)
- [Contributor Flow](./contributor.md)
