# HCMC Road Construction Tracker - Complete Technical Specification

> **Version:** 1.0
> **Last Updated:** January 2025
> **Status:** Ready for Implementation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Features](#2-core-features)
3. [Technical Architecture](#3-technical-architecture)
4. [Map Provider Strategy](#4-map-provider-strategy)
5. [Database Schema](#5-database-schema)
6. [Geometry Editing System](#6-geometry-editing-system)
7. [User Features](#7-user-features)
8. [Workflow & Approval System](#8-workflow--approval-system)
9. [Scraper Service](#9-scraper-service)
10. [API Specification](#10-api-specification)
11. [Frontend Components](#11-frontend-components)
12. [Security & Performance](#12-security--performance)
13. [Monetization](#13-monetization)
14. [Implementation Phases](#14-implementation-phases)
15. [File Structure](#15-file-structure)

---

## 1. Project Overview

### 1.1 Description

A web application showing all current road construction projects and their progress in Ho Chi Minh City and surrounding areas. Users can:
- View construction projects on an interactive map
- Search by address to find nearby constructions (10km radius)
- Plan routes (A-to-B) and see constructions along the way
- Submit suggestions and corrections
- View project timelines and changelogs

### 1.2 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+ (App Router) |
| **CMS** | PayloadCMS 3.x |
| **Database** | PostgreSQL + PostGIS |
| **Map Display** | Mapbox GL JS |
| **Geocoding** | Google Geocoding API |
| **Routing** | Google Directions API |
| **Hosting** | Vercel + Railway |
| **Cache** | Vercel KV (Redis) |

### 1.3 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map display | Mapbox | Better customization, cleaner ad integration |
| Geocoding | Google | Superior Vietnamese address parsing |
| Routing | Google | Real-time HCMC traffic data |
| Snap-to-road | Mapbox Map Matching | Free tier, good integration |
| Community input | Full drawing tools | User requested advanced capabilities |
| Metro handling | Separate type + stations | Track per-station progress |

---

## 2. Core Features

### 2.1 Feature Matrix

| Feature | Description | Priority |
|---------|-------------|----------|
| **Map Display** | Interactive map with construction overlays | P0 |
| **Address Search** | Search address, show constructions within 10km | P0 |
| **A-to-B Routing** | Route planning with construction alerts | P0 |
| **Project Timeline** | Visual timeline & changelog for each project | P0 |
| **Community Suggestions** | Users submit changes with full geometry drawing | P1 |
| **Approval Workflow** | All changes require moderator approval | P1 |
| **Versioning** | Full history with JSON Patch diffs | P1 |
| **News Scraper** | Automated data collection from news sites | P2 |
| **Metro Stations** | Special handling for metro lines with stations | P1 |

### 2.2 User Roles

| Role | Permissions |
|------|-------------|
| **Public** | View map, search, route planning |
| **Contributor** | Submit suggestions, track own submissions |
| **Moderator** | Review suggestions, approve/reject, edit geometry |
| **Admin** | Full access, manage users, configure scrapers |

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NextJS 14+ App (App Router)                      │
├───────────────┬───────────────┬───────────────┬─────────────────────────┤
│   /map        │  /search      │  /contribute  │   /admin (PayloadCMS)   │
│   Public map  │  Address/Route│  Submit form  │   Review queue          │
│   View data   │  Search       │  Track status │   Manage content        │
└───────────────┴───────────────┴───────────────┴─────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
         ┌────────────┐      ┌────────────┐      ┌────────────┐
         │ Map API    │      │ Search API │      │ PayloadCMS │
         │ (Mapbox)   │      │ (Google)   │      │ API        │
         └────────────┘      └────────────┘      └────────────┘
                │                   │                   │
                └───────────────────┴───────────────────┘
                                    │
                                    ▼
                          ┌───────────────────┐
                          │   PostgreSQL      │
                          │   + PostGIS       │
                          │                   │
                          │ - constructions   │
                          │ - metro_stations  │
                          │ - versions        │
                          │ - suggestions     │
                          │ - users           │
                          │ - scraper_runs    │
                          └───────────────────┘
                                    ▲
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
           ┌────────────────┐            ┌────────────────┐
           │ Scraper Worker │            │ Cache Layer    │
           │ (Cron-based)   │            │ (Vercel KV)    │
           └────────────────┘            └────────────────┘
```

### 3.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Data Sources                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Community          News Scraper           Admin (PayloadCMS)            │
│      │                   │                        │                      │
│      ▼                   ▼                        ▼                      │
│  ┌─────────┐        ┌─────────┐             ┌─────────┐                 │
│  │Suggestion│        │Suggestion│             │ Direct  │                 │
│  │ (pending)│        │ (pending)│             │ Edit    │                 │
│  └────┬────┘        └────┬────┘             └────┬────┘                 │
│       │                  │                       │                       │
│       └──────────────────┼───────────────────────┘                       │
│                          │                                               │
│                          ▼                                               │
│                   ┌─────────────┐                                        │
│                   │  Moderator  │                                        │
│                   │   Review    │                                        │
│                   └──────┬──────┘                                        │
│                          │                                               │
│              ┌───────────┴───────────┐                                   │
│              ▼                       ▼                                   │
│        ┌──────────┐           ┌──────────┐                              │
│        │ Approved │           │ Rejected │                              │
│        └────┬─────┘           └──────────┘                              │
│             │                                                            │
│             ▼                                                            │
│      ┌─────────────┐                                                     │
│      │ Merge into  │                                                     │
│      │Construction │                                                     │
│      │(new version)│                                                     │
│      └─────────────┘                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Map Provider Strategy

### 4.1 Hybrid Approach

| Service | Provider | Rationale |
|---------|----------|-----------|
| Map Display | Mapbox GL JS | Custom styling, better ad compatibility |
| Geocoding | Google Geocoding API | Superior Vietnamese address parsing (Q1, hẻm) |
| Routing | Google Directions API | Real-time HCMC traffic data |
| Snap-to-Road | Mapbox Map Matching | Good free tier, integrates with Mapbox |

### 4.2 Cost Estimate (Monthly)

| Service | Free Tier | Est. Cost at 50K users |
|---------|-----------|------------------------|
| Mapbox Map Loads | 50K free | $0 |
| Google Geocoding | 40K free | $0 - $25 |
| Google Directions | 40K free | $0 - $25 |
| Mapbox Map Matching | 100K free | $0 |
| **Total** | | **$0 - $50** |

### 4.3 Google Maps Terms of Service Note

- Cannot overlay ads directly on Google Maps
- Using Google only for geocoding/routing (backend), not display
- Mapbox display allows ads on page without restriction

---

## 5. Database Schema

### 5.1 Core Tables

```sql
-- Construction types enum
CREATE TYPE construction_type AS ENUM (
  'road', 'highway', 'metro', 'bridge',
  'tunnel', 'interchange', 'station', 'other'
);

-- Construction status enum
CREATE TYPE construction_status AS ENUM (
  'planned', 'in-progress', 'completed', 'paused', 'cancelled'
);

-- Main constructions table
CREATE TABLE constructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Type & Status
  construction_type construction_type NOT NULL DEFAULT 'road',
  status construction_status NOT NULL DEFAULT 'planned',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Geospatial (PostGIS)
  geometry GEOMETRY(Geometry, 4326),  -- Polygon, LineString, or Point
  centroid GEOMETRY(Point, 4326),

  -- Generated column for geometry type
  geometry_type VARCHAR(20) GENERATED ALWAYS AS (
    CASE WHEN geometry IS NULL THEN NULL
    ELSE ST_GeometryType(geometry) END
  ) STORED,

  -- Timeline
  announced_date DATE,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,

  -- Details
  contractor VARCHAR(255),
  budget BIGINT,  -- VND
  funding_source VARCHAR(255),

  -- Relations
  district_id UUID REFERENCES districts(id),

  -- Versioning
  current_version INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Metro stations (for metro type constructions)
CREATE TABLE metro_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id UUID NOT NULL REFERENCES constructions(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),

  location GEOMETRY(Point, 4326) NOT NULL,
  station_order INTEGER NOT NULL,  -- 1, 2, 3...

  status VARCHAR(50) DEFAULT 'planned',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  opened_at DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version history (immutable audit log)
CREATE TABLE construction_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id UUID NOT NULL REFERENCES constructions(id),
  version INTEGER NOT NULL,

  -- Snapshot & diff
  data JSONB NOT NULL,           -- Full state at this version
  diff JSONB,                    -- JSON Patch from previous version

  -- Change tracking
  changed_by UUID REFERENCES users(id),
  change_source VARCHAR(50) NOT NULL,  -- 'admin', 'community', 'scraper'
  suggestion_id UUID REFERENCES suggestions(id),
  change_summary TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(construction_id, version)
);

-- Suggestions queue
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target
  construction_id UUID REFERENCES constructions(id),  -- NULL if new project
  suggestion_type VARCHAR(50) NOT NULL,  -- 'create', 'update', 'complete', 'correction'

  -- Proposed changes
  proposed_data JSONB NOT NULL,
  proposed_geometry GEOMETRY(Geometry, 4326),
  location_description TEXT,

  -- User context
  title VARCHAR(500) NOT NULL,
  justification TEXT,
  evidence_urls TEXT[],

  -- Source tracking
  source_type VARCHAR(50) NOT NULL,  -- 'community', 'scraper', 'api'
  source_url VARCHAR(1000),
  source_confidence DECIMAL(3,2),  -- 0.00 to 1.00 for scraped data
  content_hash VARCHAR(64),  -- For deduplication

  -- Workflow
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Review
  assigned_to UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- If merged
  merged_at TIMESTAMPTZ,
  merged_version INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Districts reference
CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  code VARCHAR(50),
  geometry GEOMETRY(MultiPolygon, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (managed by PayloadCMS)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'contributor',
  reputation INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scraper sources
CREATE TABLE scraper_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(1000) NOT NULL,
  scraper_type VARCHAR(50) NOT NULL,
  schedule VARCHAR(50),  -- Cron expression
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scraper runs
CREATE TABLE scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES scraper_sources(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'running',
  articles_found INTEGER DEFAULT 0,
  suggestions_created INTEGER DEFAULT 0,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Indexes

```sql
-- Geospatial indexes (critical for performance)
CREATE INDEX idx_constructions_geometry ON constructions USING GIST (geometry);
CREATE INDEX idx_constructions_centroid ON constructions USING GIST (centroid);
CREATE INDEX idx_constructions_centroid_geo ON constructions USING GIST ((centroid::geography));
CREATE INDEX idx_districts_geometry ON districts USING GIST (geometry);
CREATE INDEX idx_metro_stations_location ON metro_stations USING GIST (location);

-- Query optimization
CREATE INDEX idx_constructions_status ON constructions(status);
CREATE INDEX idx_constructions_type ON constructions(construction_type);
CREATE INDEX idx_constructions_district ON constructions(district_id);
CREATE INDEX idx_constructions_slug ON constructions(slug);

CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_source ON suggestions(source_type);
CREATE INDEX idx_suggestions_construction ON suggestions(construction_id);
CREATE INDEX idx_suggestions_content_hash ON suggestions(content_hash);

CREATE INDEX idx_versions_construction ON construction_versions(construction_id, version DESC);
CREATE INDEX idx_metro_stations_construction ON metro_stations(construction_id);

-- Full-text search
ALTER TABLE constructions ADD COLUMN search_vector tsvector;
CREATE INDEX idx_constructions_search ON constructions USING GIN(search_vector);

CREATE FUNCTION update_construction_search() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER constructions_search_update
  BEFORE INSERT OR UPDATE ON constructions
  FOR EACH ROW EXECUTE FUNCTION update_construction_search();
```

---

## 6. Geometry Editing System

### 6.1 Drawing Modes

| Mode | Description | Best For |
|------|-------------|----------|
| **Snap-to-Road** | Click waypoints → Mapbox snaps to actual streets | Roads, highways |
| **Draw Line** | Click points → double-click to finish | Metro lines, custom paths |
| **Draw Polygon** | Click points → double-click to close | Interchanges, large sites |
| **Drop Pin** | Single click to place marker | Small construction sites |
| **Select/Edit** | Drag vertices to refine | Adjusting existing shapes |

### 6.2 MapDrawer Component

```typescript
// lib/components/map/MapDrawer.tsx
'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import Map, { Source, Layer, MapRef } from 'react-map-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

export type DrawMode = 'simple_select' | 'draw_line_string' | 'draw_polygon' | 'draw_point' | 'snap_to_road';

interface MapDrawerProps {
  initialGeometry?: GeoJSON.Geometry | null;
  onChange: (geometry: GeoJSON.Geometry | null) => void;
  allowedModes?: DrawMode[];
  enableSnapToRoad?: boolean;
  height?: string;
}

export function MapDrawer({
  initialGeometry,
  onChange,
  allowedModes = ['draw_line_string', 'draw_polygon', 'draw_point'],
  enableSnapToRoad = true,
  height = '400px',
}: MapDrawerProps) {
  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [activeMode, setActiveMode] = useState<DrawMode>('simple_select');
  const [snapWaypoints, setSnapWaypoints] = useState<[number, number][]>([]);

  // Snap-to-road: call Mapbox Map Matching API
  const handleSnapClick = useCallback(async (e: mapboxgl.MapLayerMouseEvent) => {
    if (activeMode !== 'snap_to_road') return;

    const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    const newWaypoints = [...snapWaypoints, point];
    setSnapWaypoints(newWaypoints);

    if (newWaypoints.length >= 2) {
      const coords = newWaypoints.map(p => p.join(',')).join(';');
      const response = await fetch(
        `https://api.mapbox.com/matching/v5/mapbox/driving/${coords}?` +
        `geometries=geojson&overview=full&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      const data = await response.json();

      if (data.matchings?.[0]?.geometry) {
        drawRef.current?.deleteAll();
        drawRef.current?.add({
          type: 'Feature',
          geometry: data.matchings[0].geometry,
          properties: {},
        });
        onChange(data.matchings[0].geometry);
      }
    }
  }, [activeMode, snapWaypoints, onChange]);

  // ... (full implementation in Phase 2)
}
```

### 6.3 Metro Stations Manager

For metro-type constructions, a specialized component manages stations:

```typescript
// payload/fields/MetroStationsField/index.tsx
interface MetroStation {
  name: string;
  nameEn?: string;
  location: GeoJSON.Point;
  stationOrder: number;
  status: 'planned' | 'in-progress' | 'completed' | 'operational';
  progress: number;
  openedAt?: Date;
}
```

Features:
- List of stations with drag-to-reorder
- Click map to set station location
- Per-station status and progress tracking
- Visual markers on map (colored by status)

### 6.4 User Experience by Role

| Role | Capabilities |
|------|-------------|
| **PayloadCMS Admin** | Full editor: all draw modes, import GeoJSON, metro stations |
| **Community** | Full drawing tools + snap-to-road + text description |
| **Moderator** | Refine community geometry before merge |

---

## 7. User Features

### 7.1 Address Search (10km Radius)

**User Story:** Search for an address and see all active constructions within 10km.

**Flow:**
```
1. User types address  →  Google Places Autocomplete
2. User selects        →  Geocode to lat/lng (Google Geocoding)
3. Query DB            →  PostGIS ST_DWithin (10km radius)
4. Display on map      →  Mapbox with circle overlay
```

**API Endpoint:**
```typescript
// GET /api/search/nearby?lat=10.8231&lng=106.6297&radius=10
{
  center: { lat: 10.8231, lng: 106.6297 },
  radius_km: 10,
  constructions: [
    {
      id: "...",
      title: "Nâng cấp đường Nguyễn Văn Linh",
      status: "in-progress",
      progress: 65,
      distance_km: 2.3,
      geometry: { type: "LineString", coordinates: [...] }
    }
  ]
}
```

### 7.2 A-to-B Route with Constructions

**User Story:** Enter start and destination, see route with construction alerts.

**Flow:**
```
1. User enters A & B   →  Google Places Autocomplete
2. Get route           →  Google Directions API (returns polyline)
3. Decode polyline     →  Array of lat/lng points
4. Buffer route        →  PostGIS ST_Buffer (500m corridor)
5. Find intersections  →  ST_Intersects with constructions
6. Display             →  Mapbox with route + markers
```

**API Endpoint:**
```typescript
// POST /api/route/constructions
// Body: { origin: {lat, lng}, destination: {lat, lng} }
{
  route: {
    polyline: "encoded_polyline_string",
    duration: { text: "35 mins", value: 2100 },
    duration_in_traffic: { text: "45 mins", value: 2700 },
    distance: { text: "12.5 km", value: 12500 }
  },
  constructions: [
    {
      id: "...",
      title: "Metro Line 1 - Station 5",
      status: "in-progress",
      route_position: 0.35,  // 35% along the route
      geometry: { type: "Point", coordinates: [...] }
    }
  ]
}
```

### 7.3 Project Timeline & Changelog

**UI Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Dự án: Nâng cấp đường Nguyễn Văn Linh                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TIẾN ĐỘ: 65%  [████████████████░░░░░░░░]  Đang thi công        │
│                                                                  │
│  Công bố      Khởi công     Hiện tại      Dự kiến hoàn thành    │
│  15/03/2024   01/06/2024    ●             31/12/2025            │
│                                                                  │
│  LỊCH SỬ THAY ĐỔI                                               │
│  ├─ v5 • 10/01/2025 • Báo chí                                   │
│  │     Tiến độ: 60% → 65%                                       │
│  │     Nguồn: vnexpress.net                                     │
│  ├─ v4 • 15/12/2024 • Cộng đồng                                 │
│  │     Thêm ảnh công trường                                     │
│  ├─ v3 • 01/11/2024 • Quản trị viên                            │
│  │     Ngày hoàn thành: 30/06/2025 → 31/12/2025                 │
│  └─ ...                                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Workflow & Approval System

### 8.1 Suggestion States

```typescript
const SUGGESTION_STATES = {
  pending: {
    label: 'Pending Review',
    transitions: ['under_review', 'rejected'],
    allowedRoles: ['moderator', 'admin'],
  },
  under_review: {
    label: 'Under Review',
    transitions: ['approved', 'changes_requested', 'rejected'],
    allowedRoles: ['moderator', 'admin'],
  },
  changes_requested: {
    label: 'Changes Requested',
    transitions: ['pending', 'cancelled'],
    allowedRoles: ['submitter'],
  },
  approved: {
    label: 'Approved',
    transitions: ['merged'],
    allowedRoles: ['system'],  // Auto-transition
  },
  merged: { label: 'Merged', transitions: [], final: true },
  rejected: { label: 'Rejected', transitions: ['pending'], allowedRoles: ['submitter'] },
  cancelled: { label: 'Cancelled', transitions: [], final: true },
  superseded: { label: 'Superseded', transitions: [], final: true },
};
```

### 8.2 Merge Logic

When a suggestion is approved:
1. Load current construction data
2. Apply proposed changes
3. Generate JSON Patch diff
4. Increment version number
5. Store version record with diff
6. Update suggestion status to 'merged'

```typescript
// lib/workflow/merge.ts
import { createPatch } from 'rfc6902';

export async function mergeSuggestion(suggestion: Suggestion, userId: string) {
  const construction = await getConstruction(suggestion.constructionId);
  const previousData = constructionToData(construction);
  const newData = { ...previousData, ...suggestion.proposedData };
  const diff = createPatch(previousData, newData);
  const newVersion = construction.currentVersion + 1;

  await db.transaction(async (tx) => {
    // Update construction
    await tx.update(constructions).set({
      ...newData,
      currentVersion: newVersion,
      updatedAt: new Date(),
    });

    // Create version record
    await tx.insert(constructionVersions).values({
      constructionId: construction.id,
      version: newVersion,
      data: newData,
      diff,
      changedBy: userId,
      changeSource: suggestion.sourceType,
      suggestionId: suggestion.id,
      changeSummary: generateChangeSummary(diff),
    });

    // Update suggestion
    await tx.update(suggestions).set({
      status: 'merged',
      mergedAt: new Date(),
      mergedVersion: newVersion,
    });
  });
}
```

---

## 9. Scraper Service

### 9.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Scraper Service (Node.js)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  VnExpress   │    │  Tuổi Trẻ    │    │  Gov Sites   │      │
│  │  Scraper     │    │  Scraper     │    │  Scraper     │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                    │
│                             ▼                                    │
│                   ┌──────────────────┐                          │
│                   │  Article Parser  │                          │
│                   │  + NLP Extract   │                          │
│                   └────────┬─────────┘                          │
│                            │                                     │
│                            ▼                                     │
│                   ┌──────────────────┐                          │
│                   │  Geocoding       │                          │
│                   │  (Google API)    │                          │
│                   └────────┬─────────┘                          │
│                            │                                     │
│                            ▼                                     │
│                   ┌──────────────────┐                          │
│                   │  Deduplication   │                          │
│                   │  (content hash)  │                          │
│                   └────────┬─────────┘                          │
│                            │                                     │
│                            ▼                                     │
│                   ┌──────────────────┐                          │
│                   │  Create          │                          │
│                   │  Suggestion      │                          │
│                   └──────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Key Features

- **Retry with exponential backoff** for transient failures
- **Content-hash deduplication** (not just URL)
- **Confidence scoring** for extracted data
- **Vietnamese text normalization** (Q1 → Quận 1)
- **Auto-rejection** for confidence < 0.5

### 9.3 Schedule

| Source | Schedule | Focus |
|--------|----------|-------|
| VnExpress | Every 6 hours | Transportation news |
| Tuổi Trẻ | Every 6 hours | HCMC local news |
| Gov sites | Daily | Official announcements |

---

## 10. API Specification

### 10.1 Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/map/constructions` | GET | Get constructions for map (GeoJSON) |
| `/api/constructions/[slug]` | GET | Get construction detail with timeline |
| `/api/search/nearby` | GET | Search by location (10km radius) |
| `/api/route/constructions` | POST | Get constructions along a route |
| `/api/districts` | GET | Get list of districts |

### 10.2 Authenticated Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/suggestions` | POST | Submit a suggestion |
| `/api/suggestions/[id]` | GET | Get suggestion status |
| `/api/user/suggestions` | GET | List user's suggestions |

### 10.3 Admin Endpoints (PayloadCMS)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/suggestions` | GET | List all pending suggestions |
| `/api/admin/suggestions/[id]/approve` | POST | Approve suggestion |
| `/api/admin/suggestions/[id]/reject` | POST | Reject suggestion |

---

## 11. Frontend Components

### 11.1 Component Tree

```
app/
├── (public)/
│   ├── page.tsx                    # Home/Map view
│   ├── search/page.tsx             # Address/route search
│   └── construction/[slug]/page.tsx # Detail view
├── (auth)/
│   ├── contribute/page.tsx         # Suggestion form
│   └── my-suggestions/page.tsx     # User's submissions
└── (admin)/
    └── admin/[[...slug]]/page.tsx  # PayloadCMS admin

components/
├── Map/
│   ├── ConstructionMap.tsx         # Main map display
│   ├── MapDrawer.tsx               # Drawing tools
│   └── MapLegend.tsx               # Status legend
├── Search/
│   ├── AddressSearch.tsx           # Google Places autocomplete
│   └── RouteSearch.tsx             # A-to-B input
├── Construction/
│   ├── ConstructionCard.tsx        # List item
│   ├── ConstructionDetail.tsx      # Full detail view
│   ├── ProjectTimeline.tsx         # Visual timeline
│   └── Changelog.tsx               # Version history
├── Suggestions/
│   ├── SuggestionForm.tsx          # Submit form
│   └── GeometryInput.tsx           # Map drawing input
└── Ads/
    └── AdSlot.tsx                  # Ad placement component
```

### 11.2 Key Components

See Section 6 for MapDrawer implementation.

---

## 12. Security & Performance

### 12.1 Security Measures

| Measure | Implementation |
|---------|----------------|
| **Rate Limiting** | Upstash Ratelimit (10 req/min for mutations) |
| **Input Sanitization** | DOMPurify for user content |
| **CSRF Protection** | Next.js built-in |
| **SQL Injection** | Drizzle ORM parameterized queries |
| **XSS Prevention** | React auto-escaping + CSP headers |

### 12.2 Caching Strategy

| Data | Cache | TTL |
|------|-------|-----|
| Map constructions | Vercel KV | 5 minutes |
| Geocoding results | Vercel KV | Permanent |
| Construction detail | Vercel KV | 10 minutes |
| Static assets | CDN | 1 year |

### 12.3 Performance Optimizations

- **Map clustering** for many markers
- **Viewport-based loading** (only fetch visible area)
- **Pagination** for API responses
- **Database connection pooling**
- **Image optimization** with Next.js Image

---

## 13. Monetization

### 13.1 Ad Placement

```
┌─────────────────────────────────────────────────────────────────┐
│  [AD BANNER - Leaderboard 728x90]                               │
├─────────────────────────────────┬───────────────────────────────┤
│                                 │  Search Panel                 │
│       MAP AREA                  │  [AD - Rectangle 300x250]     │
│    (No ads overlay)             │                               │
│                                 │  Results List                 │
│                                 │  [AD - Native in-feed]        │
└─────────────────────────────────┴───────────────────────────────┘
```

### 13.2 Revenue Estimates

| Traffic | Monthly Pageviews | Est. Revenue |
|---------|-------------------|--------------|
| Launch | 10K | $10-30 |
| Growth | 100K | $100-300 |
| Established | 500K | $500-1,500 |
| Popular | 1M+ | $1,500-5,000 |

*Note: Vietnam CPM ~$0.50-2 (lower than US/EU)*

### 13.3 Alternative Revenue

- Sponsored construction listings
- API access for businesses
- Premium features (ad-free, alerts)
- Local partnerships

---

## 14. Implementation Phases

### Phase 1: Foundation (MVP)

- [ ] Initialize Next.js 14 + PayloadCMS 3.x
- [ ] Set up PostgreSQL + PostGIS on Railway
- [ ] Create database schema (constructions, districts)
- [ ] Implement basic Mapbox map display
- [ ] Build construction CRUD in PayloadCMS
- [ ] Deploy to Vercel + Railway

### Phase 2: Core Features

- [ ] Implement geometry editor (MapDrawer)
- [ ] Add snap-to-road functionality
- [ ] Build address search (Google Places)
- [ ] Build A-to-B routing
- [ ] Add metro stations support
- [ ] Implement timeline/changelog UI

### Phase 3: Community & Workflow

- [ ] User authentication (NextAuth)
- [ ] Suggestion submission form
- [ ] Moderator review queue
- [ ] Version history tracking
- [ ] Email notifications

### Phase 4: Automation

- [ ] Build scraper service
- [ ] Implement VnExpress scraper
- [ ] Add geocoding with caching
- [ ] Confidence scoring
- [ ] Scraper monitoring dashboard

### Phase 5: Production Hardening

- [ ] Rate limiting
- [ ] Error tracking (Sentry)
- [ ] Performance optimization
- [ ] Ad integration
- [ ] Legal review (ToS, privacy)

---

## 15. File Structure

```
project-site-map/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── search/page.tsx
│   │   └── construction/[slug]/page.tsx
│   ├── (auth)/
│   │   ├── contribute/page.tsx
│   │   └── my-suggestions/page.tsx
│   ├── (admin)/
│   │   └── admin/[[...slug]]/page.tsx
│   └── api/
│       ├── map/constructions/route.ts
│       ├── search/nearby/route.ts
│       ├── route/constructions/route.ts
│       ├── constructions/[slug]/route.ts
│       └── suggestions/route.ts
├── components/
│   ├── Map/
│   ├── Search/
│   ├── Construction/
│   ├── Suggestions/
│   └── Ads/
├── lib/
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── components/
│   │   └── map/
│   │       ├── MapDrawer.tsx
│   │       └── SnapToRoad.tsx
│   ├── workflow/
│   │   ├── merge.ts
│   │   └── states.ts
│   ├── utils/
│   │   ├── geometry.ts
│   │   └── vietnamese.ts
│   └── cache.ts
├── payload/
│   ├── collections/
│   │   ├── Constructions.ts
│   │   ├── Suggestions.ts
│   │   ├── Users.ts
│   │   └── Districts.ts
│   ├── fields/
│   │   ├── GeometryField/
│   │   └── MetroStationsField/
│   └── payload.config.ts
├── scraper/
│   ├── index.ts
│   ├── sources/
│   │   ├── vnexpress.ts
│   │   └── tuoitre.ts
│   └── utils/
│       ├── resilience.ts
│       └── geocoding.ts
├── drizzle/
│   ├── schema.ts
│   └── migrations/
├── public/
├── .env.example
├── package.json
└── README.md
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "payload": "^3.0.0",
    "@payloadcms/db-postgres": "^3.0.0",
    "@payloadcms/richtext-lexical": "^3.0.0",
    "drizzle-orm": "^0.29.0",
    "mapbox-gl": "^3.0.0",
    "react-map-gl": "^7.0.0",
    "@mapbox/mapbox-gl-draw": "^1.4.0",
    "@react-google-maps/api": "^2.0.0",
    "@upstash/ratelimit": "^1.0.0",
    "@vercel/kv": "^1.0.0",
    "rfc6902": "^5.0.0",
    "date-fns": "^3.0.0",
    "swr": "^2.0.0",
    "zod": "^3.0.0",
    "next-auth": "^5.0.0"
  },
  "devDependencies": {
    "@types/mapbox__mapbox-gl-draw": "^1.4.0",
    "drizzle-kit": "^0.20.0",
    "typescript": "^5.0.0"
  }
}
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
MAPBOX_SECRET_TOKEN=sk.xxx

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=xxx
GOOGLE_MAPS_API_KEY=xxx

# Auth
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://...

# Cache
KV_REST_API_URL=xxx
KV_REST_API_TOKEN=xxx

# Monitoring
SENTRY_DSN=xxx

# Payload
PAYLOAD_SECRET=xxx
```

---

*Specification created: January 2025*
