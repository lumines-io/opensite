# Search & Discovery

## Overview

The Search & Discovery feature enables users to find construction projects through text search, filters, and location-based queries. It provides multiple ways to discover relevant construction information.

## Search Methods

### 1. Text Search

Full-text search across construction data:

**Searched fields:**
- Title
- Description
- Contractor name
- District name

**Features:**
- Case-insensitive matching
- Partial word matching
- Result highlighting/excerpts
- Relevance ranking

```
GET /api/search?query=metro+line+2
```

### 2. Filter Search (Advanced)

Advanced filtering with multiple criteria:

**Available filters:**

| Filter | Type | Options |
|--------|------|---------|
| `type` | Multi-select | road, highway, metro, bridge, tunnel, interchange, station, other |
| `status` | Multi-select | planned, in-progress, completed, paused, cancelled |
| `district` | Select | All HCMC districts |
| `startDateFrom` | Date | Projects starting after date |
| `startDateTo` | Date | Projects starting before date |
| `endDateFrom` | Date | Projects ending after date |
| `endDateTo` | Date | Projects ending before date |

```
GET /api/constructions?type=metro,highway&status=in-progress&district=quan-1
```

### 3. Nearby Search

Location-based search using coordinates:

```
GET /api/search/nearby?lat=10.7769&lng=106.7009&radius=5000
```

**Parameters:**
- `lat` - Latitude (required)
- `lng` - Longitude (required)
- `radius` - Search radius in meters (default: 5000)

**Returns:**
- Constructions within radius
- Distance from point
- Sorted by proximity

### 4. Map-Based Search

Visual search by panning/zooming the map:

- Constructions load for visible bounds
- Clusters show count of projects
- Click cluster to zoom in
- Click marker for details

## Search Interface

### Search Bar Component

Located in map header:

- Text input with search icon
- Autocomplete suggestions
- Recent searches dropdown
- Clear button
- Voice input (if supported)

### Filter Panel

Overlay panel with advanced filters:

```
┌──────────────────────────────────────┐
│ Advanced Search                    X │
├──────────────────────────────────────┤
│ Construction Type                    │
│ [x] Metro  [ ] Road  [x] Bridge     │
│                                      │
│ Status                               │
│ [x] In Progress  [ ] Planned        │
│                                      │
│ District                             │
│ [Select district          ▼]        │
│                                      │
│ Start Date                           │
│ From: [________]  To: [________]    │
│                                      │
│ Expected End Date                    │
│ From: [________]  To: [________]    │
│                                      │
│ [Clear Filters]  [Apply Filters]    │
└──────────────────────────────────────┘
```

### Search Results

Results displayed in:

1. **List Modal** - Scrollable list with pagination
2. **Map Markers** - Visual representation on map
3. **Result Cards** - Title, type, status, snippet

## API Reference

### Full-Text Search

```
GET /api/search

Query Parameters:
  query     (string, required) - Search query
  page      (number, default: 1) - Page number
  limit     (number, default: 10) - Results per page
  type      (string) - Filter by type
  status    (string) - Filter by status
  district  (string) - Filter by district

Response:
{
  results: [
    {
      id: string,
      title: string,
      slug: string,
      type: string,
      status: string,
      excerpt: string,      // Highlighted snippet
      district: string,
      relevance: number
    }
  ],
  total: number,
  page: number,
  totalPages: number
}
```

### Filtered List

```
GET /api/constructions

Query Parameters:
  type          (string) - Comma-separated types
  status        (string) - Comma-separated statuses
  district      (string) - District slug
  startDateFrom (string) - ISO date
  startDateTo   (string) - ISO date
  endDateFrom   (string) - ISO date
  endDateTo     (string) - ISO date
  page          (number) - Page number
  limit         (number) - Results per page
  sort          (string) - Sort field
  order         (string) - asc or desc

Response:
{
  docs: Construction[],
  totalDocs: number,
  page: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPrevPage: boolean
}
```

### Nearby Search

```
GET /api/search/nearby

Query Parameters:
  lat      (number, required) - Latitude
  lng      (number, required) - Longitude
  radius   (number, default: 5000) - Radius in meters
  limit    (number, default: 20) - Max results
  type     (string) - Filter by type
  status   (string) - Filter by status

Response:
{
  results: [
    {
      ...construction,
      distance: number  // meters from point
    }
  ],
  center: { lat, lng },
  radius: number
}
```

## Search Behavior

### Relevance Scoring

Results are ranked by:

1. **Title match** - Highest weight
2. **Description match** - Medium weight
3. **District match** - Medium weight
4. **Contractor match** - Lower weight

### Result Highlighting

Matching terms are highlighted in results:

```html
<p>Construction of <mark>metro</mark> <mark>line</mark> 2 from...</p>
```

### Pagination

- Default 10 results per page
- Maximum 100 per page
- Total count provided
- Page navigation included

### Empty Results

When no results found:
- Helpful message displayed
- Suggestions to broaden search
- Link to browse all constructions

## Recent Searches

### Storage

Recent searches stored in localStorage:

```javascript
{
  "recent_searches": [
    { query: "metro line 2", timestamp: 1234567890 },
    { query: "quan 1 road", timestamp: 1234567800 }
  ]
}
```

### Features

- Last 10 searches saved
- Click to re-run search
- Clear history option
- Per-browser storage

## Search Performance

### Optimization Techniques

1. **Database Indexing**
   - Full-text index on searchable fields
   - B-tree index on filter fields
   - Spatial index on geometry

2. **Caching**
   - Popular searches cached
   - Filter combinations cached
   - Cache TTL: 5 minutes

3. **Query Optimization**
   - Limit fields returned
   - Pagination enforced
   - Expensive filters deferred

### Response Times

Target response times:
- Text search: < 200ms
- Filtered list: < 150ms
- Nearby search: < 300ms

## Feature Flags

### FEATURE_ADVANCED_SEARCH

When enabled:
- Filter panel visible
- Advanced filters functional
- Complex queries allowed

When disabled:
- Only basic text search
- Filter button hidden
- Limited query options

## Mobile Considerations

### Responsive Design

- Search bar adapts to width
- Filter panel becomes bottom sheet
- Results in scrollable list
- Map/list toggle on mobile

### Touch Interactions

- Tap to search
- Swipe to dismiss
- Pull to refresh results
- Pinch to zoom map

## Error Handling

### Invalid Queries

- Too short query (< 2 chars): Show message
- Invalid characters: Sanitize
- Empty query: Show recent/popular

### No Results

- Suggest alternative searches
- Show nearby constructions
- Offer to clear filters

### API Errors

- Graceful degradation
- Retry option
- Cached results if available

## Components

- `MapSearchPanel` - Search bar on map
- `FilterSearchOverlay` - Advanced filter panel
- `SearchResults` - Results list
- `ConstructionListModal` - Modal with results
- `RecentSearches` - Recent search list

## Related Files

- `src/app/api/search/route.ts`
- `src/app/api/search/nearby/route.ts`
- `src/app/api/constructions/route.ts`
- `src/components/map/MapSearchPanel.tsx`
- `src/components/map/FilterSearchOverlay.tsx`
- `src/components/map/ConstructionListModal.tsx`
