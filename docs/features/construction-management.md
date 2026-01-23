# Construction Information Management

## Overview

The Construction Information Management feature is the core of the HCMC Road Construction Tracker. It provides a comprehensive system for storing, displaying, and managing construction project data across Ho Chi Minh City.

The platform supports two distinct types of constructions:

1. **Public Constructions**: Government infrastructure projects (roads, metro, bridges, highways) - open for community contributions
2. **Private Constructions**: Commercial and real estate developments managed by verified Sponsors/Developers

## Key Capabilities

### Data Structure

Each construction project contains:

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | Project name |
| `slug` | String (unique) | URL-friendly identifier |
| `description` | Rich Text (Lexical) | Detailed project description |
| `constructionCategory` | Enum | public, private - determines project type |
| `constructionType` | Enum | road, highway, metro, bridge, tunnel, interchange, station, other |
| `privateType` | Enum | residential, commercial, mixed_use, industrial, hospitality, other (for private only) |
| `status` | Enum | planned, in-progress, completed, paused, cancelled |
| `progress` | Number (0-100) | Completion percentage |
| `startDate` | Date | Project start date |
| `expectedEndDate` | Date | Expected completion date |
| `contractor` | String | Contractor name |
| `budget` | Number | Project budget |
| `fundingSource` | String | Funding source information |
| `geometry` | GeoJSON | Project location/area |
| `centroid` | Coordinates | Center point for map display |
| `district` | Relation | District reference |
| `media` | Gallery | Project images |
| `organization` | Relation | Owning organization (for private only) |
| `approvalStatus` | Enum | draft, submitted, under_review, approved, published, etc. (for private only) |
| `marketing` | Group | Marketing content - headline, features, pricing (for private only) |

### Construction Categories

#### Public Constructions
- Managed by community contributors and moderators
- Open for community suggestions and updates
- No approval workflow required for updates
- Standard map markers with type-based colors

#### Private Constructions
- Managed by verified Sponsor/Developer organizations
- Require approval workflow before publishing
- Support marketing features (CTAs, pricing, virtual tours)
- Enhanced map markers with sponsor badge

### Construction Types (Public)

- **Road** - Standard road construction/repair
- **Highway** - Major highway projects
- **Metro** - Metro line construction
- **Bridge** - Bridge construction/repair
- **Tunnel** - Tunnel projects
- **Interchange** - Highway interchange construction
- **Station** - Metro/bus station construction
- **Other** - Miscellaneous infrastructure

### Private Construction Types

- **Residential** - Apartment buildings, housing developments
- **Commercial** - Shopping centers, retail spaces
- **Mixed-Use** - Combined residential/commercial
- **Industrial** - Factories, warehouses
- **Hospitality** - Hotels, resorts
- **Other** - Other commercial developments

### Status Values

- **Planned** - Project approved but not started
- **In Progress** - Active construction
- **Completed** - Project finished
- **Paused** - Temporarily halted
- **Cancelled** - Project cancelled

## Map Visualization

### Interactive Map Display

The main map displays all construction projects using Mapbox GL:

- **Markers** - Color-coded by type and category
- **Clusters** - Groups nearby projects at lower zoom levels
- **Geometry Layers** - Shows project boundaries when available
- **Popups** - Quick info on click (enhanced for private constructions)

### Map Features

- Zoom controls
- Fullscreen mode
- Map style toggle (satellite/street)
- Current location button
- Legend with filter controls

### Map Legend & Filtering

The map legend allows users to filter visible constructions by:

1. **Category** (Phân loại)
   - Public Infrastructure (Công trình công) - Blue markers
   - Private Developments (Dự án tư nhân) - Purple markers

2. **Construction Type** (Loại công trình)
   - Road, Highway, Metro, Bridge, Tunnel, etc.

3. **Status** (Trạng thái)
   - Planned, In Progress, Completed, Paused, etc.

### Visual Differentiation

| Aspect | Public Construction | Private Construction |
|--------|---------------------|----------------------|
| Marker Color | Type-based (blue, red, purple, etc.) | Purple with badge |
| Popup | Standard info | Enhanced with marketing |
| Badge | None | "Tài trợ" (Sponsored) badge |
| Organization | Not shown | Shows developer name |

## Construction Detail Page

Located at `/details/[slug]`, each construction has a dedicated page showing:

### Header Section
- Title and status badge
- Construction type
- District location
- Progress percentage

### Timeline Tab
- Visual timeline showing project milestones
- Start date, expected end date
- Key events and updates

### Details Tab
- Full description (rich text)
- Contractor information
- Budget details
- Funding source

### Gallery Tab
- Image carousel
- Full-screen image viewer
- Caption display

### Map Tab
- Mini-map showing project location
- Geometry visualization
- Nearby constructions

### Changelog Tab
- Version history of all changes
- Who made changes
- When changes occurred
- What was modified (RFC 6902 patches)

## Changelog System

Every modification to construction data is tracked:

```typescript
interface ConstructionChangelog {
  id: string;
  construction: Construction;
  version: number;
  changes: JSONPatch[];  // RFC 6902 format
  changedBy: User;
  createdAt: Date;
}
```

### Change Types Tracked

- Field value updates
- Status changes
- Geometry modifications
- Media additions/removals
- Metadata updates

## API Endpoints

### List Constructions
```
GET /api/constructions
Query params: type, status, district, category, page, limit
```

### Get Construction Details
```
GET /api/constructions/[slug]
```

### Get Construction Changelog
```
GET /api/constructions/[slug]/changelog
Query params: page, limit
```

### Map Constructions
```
GET /api/map/constructions
Returns: GeoJSON FeatureCollection

Properties include:
- constructionType, constructionStatus, progress
- constructionCategory (public/private)
- privateType (for private constructions)
- organizationName (for private constructions)
```

### Sponsor API Endpoints

```
GET /api/sponsor/constructions
Query params: approvalStatus
Returns: List of sponsor's private constructions

POST /api/sponsor/constructions
Body: Construction data
Creates: New private construction (draft status)

GET /api/sponsor/constructions/[id]
Returns: Single construction details

PATCH /api/sponsor/constructions/[id]
Body: Partial construction data
Updates: Existing private construction

POST /api/sponsor/constructions/[id]/workflow
Body: { action: string, notes?: string }
Actions: submit, submit_internal, withdraw, resubmit
Executes: Workflow state transition
```

### Moderator Workflow Endpoints

```
POST /api/sponsor/constructions/[id]/workflow
Body: { action: string, notes?: string }
Actions: start_review, approve, reject, request_changes, publish, unpublish
Executes: Moderator workflow actions
```

## Related Components

- `ConstructionMap` - Main map component
- `ConstructionPopup` - Map popup
- `ConstructionDetail` - Detail page layout
- `ChangelogTimeline` - Version history display
- `ProgressRing` - Visual progress indicator
- `TimelineVisual` - Project timeline
- `ImageGallery` - Photo gallery

## Database Schema

Located in `src/collections/Constructions.ts`:

```typescript
const Constructions: CollectionConfig = {
  slug: 'constructions',
  admin: {
    useAsTitle: 'title',
  },
  versions: {
    drafts: true,
  },
  fields: [
    // ... field definitions
  ],
};
```

## Feature Flag

This is a core feature and cannot be disabled. However, related features can be controlled:

- `FEATURE_MAP_ANIMATIONS` - Controls map animation effects
- `FEATURE_ADVANCED_SEARCH` - Controls advanced filtering

## Performance Considerations

- Geometry data is simplified for list views
- Full geometry loaded only on detail pages
- Images are lazily loaded
- Map uses clustering for large datasets
- Changelog is paginated
