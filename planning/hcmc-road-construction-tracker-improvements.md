# HCMC Road Construction Tracker - Plan Review & Improvements

## Overview

This document reviews the architecture plan in `hcmc-road-construction-tracker.md` and provides suggestions for improvement.

---

## New Feature Requirements

The following features are required but not covered in the original plan:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Address Search** | Search an address, show active constructions within 10km radius | High |
| **A-to-B Routing** | Show constructions along a route between two points | High |
| **Project Timeline** | Visual timeline and changelog for each construction project | High |

---

## Mapbox vs Google Maps Comparison

### Feature Comparison

| Feature | Mapbox GL JS | Google Maps Platform |
|---------|--------------|---------------------|
| **Map Rendering** | Vector tiles, highly customizable | Raster + vector, limited customization |
| **Geocoding (Address Search)** | Good, but weaker for Vietnamese addresses | Excellent Vietnamese address support |
| **Directions/Routing** | Mapbox Directions API | Google Directions API (superior traffic data) |
| **Traffic Data** | Basic, community-sourced | Excellent real-time traffic (Google's strength) |
| **Custom Styling** | Full control (Mapbox Studio) | Limited style options |
| **Offline Support** | Yes (with SDK) | Limited |
| **3D Buildings** | Yes | Yes |
| **Street View** | No | Yes |
| **Places/POI Data** | Limited | Extensive |

### Pricing Comparison (Monthly)

| Usage Tier | Mapbox | Google Maps |
|------------|--------|-------------|
| **Map Loads** | 50K free, then $5/1K | 28K free, then $7/1K |
| **Geocoding** | 100K free, then $0.75/1K | 40K free, then $5/1K |
| **Directions** | 100K free, then $1/1K | 40K free, then $5/1K |
| **Static Maps** | 50K free, then $1/1K | 100K free, then $2/1K |

### Vietnam-Specific Considerations

| Aspect | Mapbox | Google Maps |
|--------|--------|-------------|
| **Vietnamese Address Parsing** | Moderate - struggles with abbreviations (Q1, P.5) | Excellent - handles local formats well |
| **HCMC Coverage** | Good street data | Excellent, includes alleys (hẻm) |
| **Local Business Data** | Limited | Extensive |
| **Routing Accuracy** | Good for main roads | Better for complex routes, one-ways |

### Ad Compatibility

| Aspect | Mapbox | Google Maps |
|--------|--------|-------------|
| **Terms of Service** | ✅ Allows ads on pages with maps | ⚠️ Complex rules, restrictions apply |
| **Ad Placement** | No restrictions | Cannot overlay ads on map |
| **Commercial Use** | Straightforward pricing | Must use Google AdSense if showing Google Ads |
| **Attribution** | Required but unobtrusive | Required, more prominent |

### Recommendation

**Hybrid Approach:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Recommended Setup                             │
├─────────────────────────────────────────────────────────────────────┤
│  Map Display & Visualization    →  Mapbox GL JS                      │
│  - Custom styling                                                    │
│  - Construction overlays                                             │
│  - Better ad compatibility                                           │
├─────────────────────────────────────────────────────────────────────┤
│  Geocoding (Address Search)     →  Google Geocoding API              │
│  - Superior Vietnamese address parsing                               │
│  - Better handling of Q1, P.5, Hẻm formats                          │
├─────────────────────────────────────────────────────────────────────┤
│  Routing (A-to-B)               →  Google Directions API             │
│  - Better traffic data for HCMC                                      │
│  - More accurate for complex urban routing                           │
└─────────────────────────────────────────────────────────────────────┘
```

**Why hybrid?**
1. Mapbox for display = better customization + cleaner ad integration
2. Google for geocoding = much better Vietnamese address support
3. Google for routing = real-time traffic data critical for HCMC

**Cost estimate (hybrid approach):**
| Service | Provider | Est. Monthly Cost |
|---------|----------|-------------------|
| Map loads (50K) | Mapbox | $0 (free tier) |
| Geocoding (10K) | Google | $0 (free tier) |
| Directions (5K) | Google | $0 (free tier) |
| **Total** | | **$0 - $50** |

---

## New Feature Specifications

### Feature 1: Address Search with Nearby Constructions

**User Story:** As a user, I want to search for an address and see all active/in-progress constructions within 10km so I can plan my commute.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Address Search Flow                             │
├─────────────────────────────────────────────────────────────────────┤
│  1. User types address  →  Autocomplete (Google Places API)          │
│  2. User selects        →  Geocode to lat/lng (Google Geocoding)     │
│  3. Query DB            →  PostGIS ST_DWithin (10km radius)          │
│  4. Display on map      →  Mapbox with circle overlay                │
└─────────────────────────────────────────────────────────────────────┘
```

**API Endpoint:**

```typescript
// app/api/search/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radius = Math.min(parseFloat(searchParams.get('radius') || '10'), 50); // Max 50km

  // PostGIS query for constructions within radius
  const results = await db.execute(sql`
    SELECT
      id, slug, title, status, progress,
      ST_AsGeoJSON(geometry) as geometry,
      ST_AsGeoJSON(centroid) as centroid,
      ST_Distance(
        centroid::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) / 1000 as distance_km
    FROM constructions
    WHERE
      deleted_at IS NULL
      AND status IN ('planned', 'in-progress', 'paused')
      AND ST_DWithin(
        centroid::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radius * 1000}  -- Convert km to meters
      )
    ORDER BY distance_km ASC
    LIMIT 100
  `);

  return NextResponse.json({
    center: { lat, lng },
    radius_km: radius,
    constructions: results.rows.map(r => ({
      ...r,
      geometry: JSON.parse(r.geometry),
      centroid: JSON.parse(r.centroid),
    })),
  });
}
```

**Frontend Component:**

```typescript
// components/Search/AddressSearch.tsx
'use client';

import { useState, useCallback } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import useSWR from 'swr';

const libraries: ("places")[] = ['places'];

interface AddressSearchProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
}

export function AddressSearch({ onLocationSelect }: AddressSearchProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries,
  });

  const onPlaceChanged = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        onLocationSelect({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address || '',
        });
      }
    }
  }, [autocomplete, onLocationSelect]);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <Autocomplete
      onLoad={setAutocomplete}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: 'vn' },
        bounds: {
          north: 11.2,
          south: 10.3,
          east: 107.1,
          west: 106.3,
        },
      }}
    >
      <input
        type="text"
        placeholder="Nhập địa chỉ (ví dụ: 123 Nguyễn Huệ, Q1)"
        className="w-full px-4 py-2 border rounded-lg"
      />
    </Autocomplete>
  );
}
```

**Database Index:**

```sql
-- Spatial index for radius queries
CREATE INDEX idx_constructions_centroid_geography
  ON constructions USING GIST ((centroid::geography));
```

---

### Feature 2: A-to-B Route with Constructions

**User Story:** As a user, I want to enter a start and destination, see the route, and see all active constructions along the way so I can anticipate delays.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      A-to-B Route Flow                               │
├─────────────────────────────────────────────────────────────────────┤
│  1. User enters A & B     →  Google Places Autocomplete              │
│  2. Get route             →  Google Directions API (returns polyline)│
│  3. Decode polyline       →  Array of lat/lng points                 │
│  4. Buffer route          →  PostGIS ST_Buffer (500m corridor)       │
│  5. Find intersections    →  ST_Intersects with constructions        │
│  6. Display               →  Mapbox with route + markers             │
└─────────────────────────────────────────────────────────────────────┘
```

**API Endpoint:**

```typescript
// app/api/route/constructions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import polyline from '@mapbox/polyline';

export async function POST(request: NextRequest) {
  const { origin, destination, buffer_meters = 500 } = await request.json();

  // 1. Get route from Google Directions API
  const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
  directionsUrl.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  directionsUrl.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  directionsUrl.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY!);
  directionsUrl.searchParams.set('alternatives', 'true');
  directionsUrl.searchParams.set('departure_time', 'now'); // For traffic data

  const directionsRes = await fetch(directionsUrl.toString());
  const directions = await directionsRes.json();

  if (directions.status !== 'OK') {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }

  // 2. Decode the polyline to get route coordinates
  const route = directions.routes[0];
  const encodedPolyline = route.overview_polyline.points;
  const decodedPoints = polyline.decode(encodedPolyline);

  // 3. Create LineString from route points
  const lineStringCoords = decodedPoints
    .map(([lat, lng]) => `${lng} ${lat}`)
    .join(',');

  // 4. Find constructions that intersect with buffered route
  const results = await db.execute(sql`
    WITH route_line AS (
      SELECT ST_Buffer(
        ST_SetSRID(
          ST_GeomFromText('LINESTRING(${sql.raw(lineStringCoords)})'),
          4326
        )::geography,
        ${buffer_meters}
      )::geometry as buffered_route
    )
    SELECT
      c.id, c.slug, c.title, c.status, c.progress,
      c.start_date, c.expected_end_date,
      ST_AsGeoJSON(c.geometry) as geometry,
      ST_AsGeoJSON(c.centroid) as centroid,
      -- Calculate where along the route (0-1)
      ST_LineLocatePoint(
        ST_SetSRID(ST_GeomFromText('LINESTRING(${sql.raw(lineStringCoords)})'), 4326),
        c.centroid
      ) as route_position
    FROM constructions c, route_line r
    WHERE
      c.deleted_at IS NULL
      AND c.status IN ('planned', 'in-progress', 'paused')
      AND ST_Intersects(c.geometry, r.buffered_route)
    ORDER BY route_position ASC
  `);

  return NextResponse.json({
    route: {
      polyline: encodedPolyline,
      duration: route.legs[0].duration,
      duration_in_traffic: route.legs[0].duration_in_traffic,
      distance: route.legs[0].distance,
    },
    constructions: results.rows.map(r => ({
      ...r,
      geometry: JSON.parse(r.geometry),
      centroid: JSON.parse(r.centroid),
    })),
    buffer_meters,
  });
}
```

**Frontend Component:**

```typescript
// components/Route/RouteSearch.tsx
'use client';

import { useState } from 'react';
import { AddressSearch } from '../Search/AddressSearch';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface RouteSearchProps {
  onRouteFound: (route: RouteResult) => void;
}

export function RouteSearch({ onRouteFound }: RouteSearchProps) {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);

  const searchRoute = async () => {
    if (!origin || !destination) return;

    setLoading(true);
    try {
      const response = await fetch('/api/route/constructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination }),
      });

      const data = await response.json();
      onRouteFound(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium mb-1">Điểm đi</label>
        <AddressSearch onLocationSelect={setOrigin} />
        {origin && <p className="text-sm text-gray-500 mt-1">{origin.address}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Điểm đến</label>
        <AddressSearch onLocationSelect={setDestination} />
        {destination && <p className="text-sm text-gray-500 mt-1">{destination.address}</p>}
      </div>

      <button
        onClick={searchRoute}
        disabled={!origin || !destination || loading}
        className="w-full py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {loading ? 'Đang tìm...' : 'Tìm đường'}
      </button>
    </div>
  );
}
```

---

### Feature 3: Project Timeline & Changelog

**User Story:** As a user, I want to see a visual timeline and changelog of a construction project so I can understand its history and progress.

**Design:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Dự án: Nâng cấp đường Nguyễn Văn Linh                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TIMELINE                                                            │
│  ═══════════════════════════════════════════════════════════════    │
│  │ Công bố    │ Khởi công   │ Hiện tại      │ Dự kiến hoàn thành │  │
│  │ 15/03/2024 │ 01/06/2024  │ ██████████░░░ │ 31/12/2025         │  │
│  │            │             │ 65%           │                     │  │
│  ═══════════════════════════════════════════════════════════════    │
│                                                                      │
│  LỊCH SỬ THAY ĐỔI (Changelog)                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ v5 • 10/01/2025 • Cập nhật từ báo chí                         │ │
│  │     Tiến độ: 60% → 65%                                         │ │
│  │     Nguồn: vnexpress.net                                       │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ v4 • 15/12/2024 • Đóng góp cộng đồng                          │ │
│  │     Thêm ảnh công trường                                       │ │
│  │     Người gửi: user@email.com                                  │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ v3 • 01/11/2024 • Admin                                        │ │
│  │     Tiến độ: 40% → 60%                                         │ │
│  │     Ngày hoàn thành dự kiến: 30/06/2025 → 31/12/2025          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**API Endpoint Enhancement:**

```typescript
// app/api/constructions/[slug]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const construction = await db.query.constructions.findFirst({
    where: eq(constructions.slug, params.slug),
  });

  if (!construction) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Get version history with human-readable diffs
  const versions = await db.execute(sql`
    SELECT
      cv.version,
      cv.data,
      cv.diff,
      cv.change_source,
      cv.change_summary,
      cv.created_at,
      cv.suggestion_id,
      u.name as changed_by_name,
      u.email as changed_by_email,
      s.source_url
    FROM construction_versions cv
    LEFT JOIN users u ON cv.changed_by = u.id
    LEFT JOIN suggestions s ON cv.suggestion_id = s.id
    WHERE cv.construction_id = ${construction.id}
    ORDER BY cv.version DESC
    LIMIT 50
  `);

  // Build timeline data
  const timeline = {
    announced: construction.announced_date,
    started: construction.start_date,
    expectedEnd: construction.expected_end_date,
    actualEnd: construction.actual_end_date,
    currentProgress: construction.progress,
    status: construction.status,
  };

  return NextResponse.json({
    ...construction,
    timeline,
    versions: versions.rows.map(v => ({
      ...v,
      diff: formatDiffForDisplay(v.diff),
    })),
  });
}

// Helper to format JSON Patch diff for Vietnamese display
function formatDiffForDisplay(diff: any[]): string[] {
  if (!diff) return [];

  const fieldLabels: Record<string, string> = {
    '/progress': 'Tiến độ',
    '/status': 'Trạng thái',
    '/expected_end_date': 'Ngày hoàn thành dự kiến',
    '/title': 'Tên dự án',
    '/description': 'Mô tả',
    '/contractor': 'Nhà thầu',
    '/budget': 'Ngân sách',
  };

  const statusLabels: Record<string, string> = {
    'planned': 'Đã lên kế hoạch',
    'in-progress': 'Đang thi công',
    'completed': 'Hoàn thành',
    'paused': 'Tạm dừng',
    'cancelled': 'Đã hủy',
  };

  return diff.map(op => {
    const field = fieldLabels[op.path] || op.path;
    let value = op.value;

    if (op.path === '/status') {
      value = statusLabels[value] || value;
    }
    if (op.path === '/progress') {
      value = `${value}%`;
    }
    if (op.path === '/budget') {
      value = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(value);
    }

    switch (op.op) {
      case 'add': return `Thêm ${field}: ${value}`;
      case 'remove': return `Xóa ${field}`;
      case 'replace': return `${field}: ${value}`;
      default: return `Cập nhật ${field}`;
    }
  });
}
```

**Timeline Component:**

```typescript
// components/Construction/ProjectTimeline.tsx
'use client';

import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TimelineProps {
  announced?: string;
  started?: string;
  expectedEnd?: string;
  actualEnd?: string;
  progress: number;
  status: string;
}

export function ProjectTimeline({
  announced,
  started,
  expectedEnd,
  actualEnd,
  progress,
  status,
}: TimelineProps) {
  const today = new Date();

  // Calculate timeline position
  const startDate = started ? new Date(started) : null;
  const endDate = actualEnd ? new Date(actualEnd) : expectedEnd ? new Date(expectedEnd) : null;

  let timelineProgress = progress;
  if (startDate && endDate) {
    const totalDays = differenceInDays(endDate, startDate);
    const elapsedDays = differenceInDays(today, startDate);
    const expectedProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

    // Show if behind schedule
    const behindSchedule = progress < expectedProgress - 10;
  }

  const isDelayed = expectedEnd && !actualEnd && isAfter(today, new Date(expectedEnd));

  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <h3 className="font-semibold text-lg mb-4">Tiến độ dự án</h3>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>Tiến độ: {progress}%</span>
          <span className={status === 'completed' ? 'text-green-600' : ''}>
            {status === 'completed' ? 'Hoàn thành' :
             status === 'paused' ? 'Tạm dừng' :
             status === 'in-progress' ? 'Đang thi công' : 'Chưa bắt đầu'}
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              status === 'completed' ? 'bg-green-500' :
              status === 'paused' ? 'bg-yellow-500' :
              isDelayed ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {isDelayed && (
          <p className="text-red-600 text-sm mt-1">
            ⚠️ Dự án đã quá hạn dự kiến
          </p>
        )}
      </div>

      {/* Timeline dates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {announced && (
          <div>
            <p className="text-gray-500">Công bố</p>
            <p className="font-medium">
              {format(new Date(announced), 'dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
        )}
        {started && (
          <div>
            <p className="text-gray-500">Khởi công</p>
            <p className="font-medium">
              {format(new Date(started), 'dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
        )}
        {expectedEnd && (
          <div>
            <p className="text-gray-500">Dự kiến hoàn thành</p>
            <p className={`font-medium ${isDelayed ? 'text-red-600' : ''}`}>
              {format(new Date(expectedEnd), 'dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
        )}
        {actualEnd && (
          <div>
            <p className="text-gray-500">Hoàn thành thực tế</p>
            <p className="font-medium text-green-600">
              {format(new Date(actualEnd), 'dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Changelog Component:**

```typescript
// components/Construction/Changelog.tsx
'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Version {
  version: number;
  change_source: 'admin' | 'community' | 'scraper';
  change_summary: string;
  diff: string[];
  created_at: string;
  changed_by_name?: string;
  source_url?: string;
}

interface ChangelogProps {
  versions: Version[];
}

const SOURCE_LABELS = {
  admin: { label: 'Quản trị viên', color: 'bg-purple-100 text-purple-700' },
  community: { label: 'Cộng đồng', color: 'bg-blue-100 text-blue-700' },
  scraper: { label: 'Báo chí', color: 'bg-green-100 text-green-700' },
};

export function Changelog({ versions }: ChangelogProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <h3 className="font-semibold text-lg mb-4">Lịch sử thay đổi</h3>

      <div className="space-y-4">
        {versions.map((version, index) => (
          <div
            key={version.version}
            className={`relative pl-6 pb-4 ${
              index !== versions.length - 1 ? 'border-l-2 border-gray-200' : ''
            }`}
          >
            {/* Timeline dot */}
            <div className="absolute left-0 top-0 w-3 h-3 bg-blue-500 rounded-full -translate-x-[7px]" />

            {/* Version header */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-medium">v{version.version}</span>
              <span className="text-gray-500 text-sm">
                {formatDistanceToNow(new Date(version.created_at), {
                  addSuffix: true,
                  locale: vi,
                })}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${SOURCE_LABELS[version.change_source].color}`}>
                {SOURCE_LABELS[version.change_source].label}
              </span>
            </div>

            {/* Changes */}
            <ul className="text-sm text-gray-700 space-y-1">
              {version.diff.map((change, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>

            {/* Attribution */}
            <div className="mt-2 text-xs text-gray-500">
              {version.changed_by_name && (
                <span>Bởi: {version.changed_by_name}</span>
              )}
              {version.source_url && (
                <a
                  href={version.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Xem nguồn →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Ad Monetization Strategy

### Ad Placement Considerations

```
┌─────────────────────────────────────────────────────────────────────┐
│  Page Layout with Ads                                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Header / Navigation                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [AD BANNER - Leaderboard 728x90]                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────┬─────────────────────────────┐  │
│  │                                 │                             │  │
│  │                                 │  Search Panel               │  │
│  │       MAP AREA                  │  ─────────────────          │  │
│  │    (No ads overlay)             │  [AD - Rectangle 300x250]   │  │
│  │                                 │                             │  │
│  │                                 │  Results List               │  │
│  │                                 │  ─────────────────          │  │
│  │                                 │  [AD - Native in-feed]      │  │
│  │                                 │                             │  │
│  └─────────────────────────────────┴─────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Construction Detail Panel (when selected)                    │  │
│  │  Timeline | Changelog | [AD - In-content]                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Ad Network Recommendations

| Network | Best For | Revenue Potential | Integration |
|---------|----------|-------------------|-------------|
| **Google AdSense** | General traffic | Medium | Easy |
| **Google Ad Manager** | Higher traffic (>1M/mo) | High | Complex |
| **Carbon Ads** | Developer/tech audience | Medium | Easy |
| **Local Vietnamese** | HCMC audience | Medium | Direct deals |

### Implementation Guidelines

```typescript
// components/Ads/AdSlot.tsx
'use client';

import { useEffect, useRef } from 'react';

interface AdSlotProps {
  slotId: string;
  format: 'banner' | 'rectangle' | 'native';
  className?: string;
}

export function AdSlot({ slotId, format, className }: AdSlotProps) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize ad after component mounts
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('Ad error:', e);
      }
    }
  }, []);

  const sizes = {
    banner: { width: 728, height: 90 },
    rectangle: { width: 300, height: 250 },
    native: { width: '100%', height: 'auto' },
  };

  return (
    <div
      ref={adRef}
      className={`ad-container ${className}`}
      style={{
        minHeight: format === 'native' ? 100 : sizes[format].height,
        background: '#f5f5f5',
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-XXXXXXXX"
        data-ad-slot={slotId}
        data-ad-format={format === 'native' ? 'fluid' : 'auto'}
      />
    </div>
  );
}
```

### Ad-Friendly Design Principles

1. **Don't overlay map:** Google Maps ToS prohibits ads on the map; Mapbox allows it but it's bad UX
2. **Load ads after critical content:** Don't block map/search with ad loading
3. **Respect user experience:** Max 3-4 ad slots per page
4. **Mobile considerations:** Use responsive ad units, consider sticky bottom banner
5. **Vietnamese ad networks:** Consider local networks for higher CPM in Vietnam

### Revenue Projections

| Traffic Level | Est. Monthly Pageviews | Est. Revenue (AdSense) |
|---------------|------------------------|------------------------|
| Launch | 10K | $10-30 |
| Growth | 100K | $100-300 |
| Established | 500K | $500-1,500 |
| Popular | 1M+ | $1,500-5,000 |

*Note: Vietnam CPM rates are typically lower than US/EU (~$0.50-2 vs $2-10)*

### Alternative Monetization

Consider alongside ads:
- [ ] **Sponsored listings:** Featured construction updates from contractors
- [ ] **API access:** Paid tier for businesses needing construction data
- [ ] **Premium features:** Ad-free experience, email alerts, route planning
- [ ] **Local partnerships:** Traffic/navigation apps, real estate sites

---

## Executive Summary

The plan is comprehensive and well-structured. Key strengths include the thorough approach comparison, detailed database schema, and phased implementation. However, several areas need attention before implementation:

| Priority | Area | Impact |
|----------|------|--------|
| **High** | Security | Data integrity, legal compliance |
| **High** | Scraper robustness | Core feature reliability |
| **Medium** | Performance/caching | User experience at scale |
| **Medium** | Error handling | System reliability |
| **Low** | Testing strategy | Long-term maintainability |

---

## High Priority Improvements

### 1. Security Gaps

**Current state:** No explicit security considerations documented.

**Recommendations:**

```typescript
// Add rate limiting to API routes
// app/api/suggestions/route.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1m"), // 10 requests per minute
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  // ... rest of handler
}
```

**Add to plan:**
- [ ] Rate limiting on all mutation endpoints (suggestions, auth)
- [ ] CSRF token validation for form submissions
- [ ] Input sanitization for user-submitted content (XSS prevention)
- [ ] Content Security Policy headers
- [ ] Sanitize scraped HTML before storing (malicious injected scripts)

---

### 2. Scraper Robustness

**Current state:** Basic scraper implementation without resilience patterns.

**Issues identified:**
1. News sites will likely block/rate-limit the bot
2. No retry logic for transient failures
3. URL-based deduplication misses republished articles
4. Vietnamese text matching is fragile

**Recommendations:**

```typescript
// scraper/utils/resilience.ts
import pRetry from 'p-retry';
import { createHash } from 'crypto';

// Retry with exponential backoff
export async function fetchWithRetry(url: string): Promise<Response> {
  return pRetry(
    async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        },
      });

      if (response.status === 429) {
        throw new Error('Rate limited');
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    },
    {
      retries: 3,
      minTimeout: 2000,
      maxTimeout: 30000,
      onFailedAttempt: (error) => {
        console.log(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      },
    }
  );
}

// Content-based deduplication (not just URL)
export function hashArticleContent(title: string, content: string): string {
  const normalized = normalizeVietnamese(`${title} ${content.slice(0, 500)}`);
  return createHash('sha256').update(normalized).digest('hex');
}
```

**Add to plan:**
- [ ] Implement retry with exponential backoff
- [ ] Add content hash-based deduplication (articles get republished with different URLs)
- [ ] Random delays between requests (1-5 seconds)
- [ ] User-Agent rotation
- [ ] Consider using a proxy service if blocked (Bright Data, Oxylabs)
- [ ] Dead letter queue for failed scrape jobs
- [ ] Confidence threshold (e.g., < 0.5 → auto-reject, don't create suggestion)

---

### 3. Duplicate Suggestion Detection

**Current state:** Only checks `source_url` for scraper duplicates.

**Problem:** Community users may submit duplicate suggestions for the same update.

**Recommendation:**

```typescript
// lib/suggestions/duplicate-detection.ts
export async function findDuplicateSuggestion(
  constructionId: string | null,
  proposedData: Record<string, any>
): Promise<Suggestion | null> {
  // Check for pending suggestions on same construction with similar changes
  const pending = await db.query.suggestions.findMany({
    where: and(
      eq(suggestions.constructionId, constructionId),
      inArray(suggestions.status, ['pending', 'under_review']),
      // Within last 7 days
      gte(suggestions.createdAt, subDays(new Date(), 7))
    ),
  });

  for (const suggestion of pending) {
    const similarity = calculateJaccardSimilarity(
      Object.keys(suggestion.proposedData),
      Object.keys(proposedData)
    );

    if (similarity > 0.7) {
      return suggestion; // Likely duplicate
    }
  }

  return null;
}
```

**Add to plan:**
- [ ] Fuzzy duplicate detection for community suggestions
- [ ] Link duplicate suggestions together (show "similar suggestions exist")
- [ ] Auto-merge scraped updates that match pending community suggestions

---

## Medium Priority Improvements

### 4. Caching Strategy

**Current state:** No caching mentioned.

**Impact:** Map loads will hit DB on every request; geocoding API has costs.

**Recommendation:**

```typescript
// lib/cache.ts
import { kv } from '@vercel/kv';

// Cache map data for 5 minutes
export async function getMapData(bounds: string): Promise<GeoJSON> {
  const cacheKey = `map:${bounds}`;

  const cached = await kv.get<GeoJSON>(cacheKey);
  if (cached) return cached;

  const data = await fetchMapDataFromDB(bounds);
  await kv.set(cacheKey, data, { ex: 300 }); // 5 min TTL

  return data;
}

// Cache geocoding results permanently (addresses don't change)
export async function geocodeWithCache(address: string): Promise<Point | null> {
  const cacheKey = `geocode:${normalizeVietnamese(address)}`;

  const cached = await kv.get<Point>(cacheKey);
  if (cached) return cached;

  const result = await geocodeVietnameseAddress(address);
  if (result) {
    await kv.set(cacheKey, result); // No expiry
  }

  return result;
}
```

**Add to plan:**
- [ ] Vercel KV or Redis for caching
- [ ] Cache geocoding results (permanent, addresses don't move)
- [ ] Cache map data (5-minute TTL)
- [ ] Cache construction detail pages (invalidate on update)
- [ ] Consider CDN caching for public API responses

---

### 5. Map Performance at Scale

**Current state:** Renders all constructions as individual markers.

**Problem:** With hundreds of constructions, map becomes unusable.

**Recommendation:**

```typescript
// components/Map/ConstructionMap.tsx
// Add clustering for better performance
map.current!.addSource('constructions', {
  type: 'geojson',
  data: '/api/map/constructions',
  cluster: true,           // Enable clustering
  clusterMaxZoom: 14,      // Disable clustering at zoom 14+
  clusterRadius: 50,       // Cluster points within 50px
});

// Cluster circle layer
map.current!.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'constructions',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#51bbd6',  // < 10
      10, '#f1f075',  // 10-50
      50, '#f28cb1',  // 50+
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20, 10,
      30, 50,
      40,
    ],
  },
});

// Cluster count labels
map.current!.addLayer({
  id: 'cluster-count',
  type: 'symbol',
  source: 'constructions',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-size': 12,
  },
});
```

**Add to plan:**
- [ ] Enable Mapbox clustering for point markers
- [ ] Implement viewport-based loading (only fetch visible area)
- [ ] Add loading skeleton while map data loads
- [ ] Consider server-side tile generation for very large datasets

---

### 6. Error Handling & Observability

**Current state:** Basic try/catch, no structured logging or monitoring.

**Recommendation:**

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Usage in scraper
logger.info({ source: 'vnexpress', articlesFound: 15 }, 'Scraper run completed');
logger.error({ err, url }, 'Failed to fetch article');
```

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

// Wrap scraper runs with monitoring
export async function monitoredScraperRun(
  source: ScraperSource,
  fn: () => Promise<void>
) {
  const transaction = Sentry.startTransaction({
    name: `scraper.${source.id}`,
    op: 'scraper.run',
  });

  try {
    await fn();
    transaction.setStatus('ok');
  } catch (error) {
    transaction.setStatus('internal_error');
    Sentry.captureException(error, {
      tags: { scraper: source.id },
    });
    throw error;
  } finally {
    transaction.finish();
  }
}
```

**Add to plan:**
- [ ] Structured logging with Pino
- [ ] Error tracking with Sentry
- [ ] Scraper health dashboard (success rate, items/run)
- [ ] Alerts for scraper failures (Slack/email)
- [ ] Database query performance monitoring

---

### 7. Vietnamese Language Handling

**Current state:** Basic regex patterns for text extraction.

**Issues:**
- Vietnamese diacritics cause matching issues
- District names have multiple forms (Quận 1, Q1, Q.1)
- Street names often abbreviated

**Recommendation:**

```typescript
// lib/vietnamese.ts
import { removeDiacritics } from 'vietnamese-diacritics';

// Normalize for comparison
export function normalizeVietnamese(text: string): string {
  return removeDiacritics(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// District name normalization
const DISTRICT_ALIASES: Record<string, string> = {
  'q1': 'quan 1', 'q.1': 'quan 1', 'quan 1': 'quan 1',
  'q2': 'quan 2', 'q.2': 'quan 2', 'quan 2': 'quan 2',
  // ... all 24 districts
  'thu duc': 'tp thu duc', 'thanh pho thu duc': 'tp thu duc',
  'binh thanh': 'quan binh thanh',
  // etc.
};

export function normalizeDistrictName(name: string): string {
  const normalized = normalizeVietnamese(name);
  return DISTRICT_ALIASES[normalized] || normalized;
}

// Better location extraction with pre-processing
export function extractLocations(content: string): LocationMention[] {
  // First normalize common abbreviations
  const normalized = content
    .replace(/TP\.?\s*HCM/gi, 'Thành phố Hồ Chí Minh')
    .replace(/Q\.?\s*(\d+)/gi, 'Quận $1')
    .replace(/Đ\.?\s*/gi, 'Đường ');

  // Then apply patterns
  return applyLocationPatterns(normalized);
}
```

**Add to plan:**
- [ ] Vietnamese text normalization library
- [ ] District name alias mapping (Q1 → Quận 1)
- [ ] Common abbreviation expansion
- [ ] Consider using a Vietnamese NER model for better extraction

---

### 8. Workflow Improvements

**Current state:** Basic state machine, manual moderator assignment.

**Gaps identified:**
- No auto-assignment to moderators
- No escalation for stale suggestions
- No bulk operations

**Recommendation:**

```typescript
// lib/workflow/auto-assign.ts
export async function autoAssignSuggestion(suggestionId: string) {
  // Find moderator with least pending reviews
  const moderator = await db.query.users.findFirst({
    where: eq(users.role, 'moderator'),
    orderBy: [
      sql`(SELECT COUNT(*) FROM suggestions WHERE assigned_to = users.id AND status = 'under_review')`,
    ],
  });

  if (moderator) {
    await db.update(suggestions)
      .set({ assignedTo: moderator.id })
      .where(eq(suggestions.id, suggestionId));
  }
}

// Escalation cron job
export async function escalateStaleSuggestions() {
  const stale = await db.query.suggestions.findMany({
    where: and(
      eq(suggestions.status, 'under_review'),
      lt(suggestions.updatedAt, subDays(new Date(), 7)) // Stale after 7 days
    ),
  });

  for (const suggestion of stale) {
    await notifyAdmins('stale_suggestion', suggestion);
    // Optionally reassign
  }
}
```

**Add to plan:**
- [ ] Auto-assignment of suggestions to moderators (round-robin or load-based)
- [ ] Escalation alerts for suggestions pending > 7 days
- [ ] Bulk approve/reject for moderators
- [ ] Auto-approve high-confidence scraper updates (confidence > 0.9, status change only)

---

## Low Priority Improvements

### 9. Testing Strategy

**Current state:** No testing plan documented.

**Recommendation:**

```typescript
// __tests__/scraper/vnexpress.test.ts
import { vnexpressSource } from '@/scraper/sources/vnexpress';

describe('VnExpress Scraper', () => {
  it('extracts construction mentions from article', async () => {
    const article = {
      title: 'Khởi công nâng cấp đường Nguyễn Văn Linh',
      url: 'https://vnexpress.net/test',
      summary: 'Dự án nâng cấp đường tại Quận 7, TP.HCM',
    };

    const mentions = await vnexpressSource.extractConstructions(article);

    expect(mentions.length).toBeGreaterThan(0);
    expect(mentions[0].location.raw).toContain('Nguyễn Văn Linh');
  });

  it('filters non-HCMC articles', async () => {
    // Test that Hanoi articles are filtered out
  });
});

// __tests__/workflow/merge.test.ts
describe('Merge Logic', () => {
  it('creates correct JSON patch diff', async () => {
    const previous = { title: 'Old', progress: 50 };
    const proposed = { progress: 75 };

    const diff = createPatch(previous, { ...previous, ...proposed });

    expect(diff).toContainEqual({
      op: 'replace',
      path: '/progress',
      value: 75,
    });
  });
});
```

**Add to plan:**
- [ ] Unit tests for scrapers (with fixture HTML files)
- [ ] Integration tests for workflow state machine
- [ ] E2E tests for critical user flows (Playwright)
- [ ] Scraper regression tests (detect when site structure changes)

---

### 10. API Documentation

**Current state:** No API documentation plan.

**Recommendation:**

```typescript
// app/api/docs/route.ts
// Use next-swagger-doc or similar

/**
 * @swagger
 * /api/map/constructions:
 *   get:
 *     summary: Get constructions for map display
 *     parameters:
 *       - name: bounds
 *         in: query
 *         description: Bounding box (minLng,minLat,maxLng,maxLat)
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         schema:
 *           type: string
 *           enum: [planned, in-progress, completed, paused, cancelled]
 *     responses:
 *       200:
 *         description: GeoJSON FeatureCollection
 */
```

**Add to plan:**
- [ ] OpenAPI/Swagger documentation
- [ ] Interactive API explorer at /api/docs
- [ ] API versioning strategy (v1 prefix or header-based)
- [ ] Rate limit headers in responses

---

### 11. Mobile & Accessibility

**Current state:** No mobile or a11y considerations.

**Recommendations:**

- [ ] PWA support (service worker for offline map viewing)
- [ ] Touch-friendly map controls
- [ ] Screen reader support for map (ARIA labels)
- [ ] Vietnamese language UI (i18n setup)
- [ ] High contrast mode support

---

### 12. Legal Considerations

**Current state:** Not addressed.

**Important:**

- [ ] Terms of Service for community contributors
- [ ] Privacy policy (especially for user submissions)
- [ ] robots.txt compliance for scraped sites
- [ ] Consider news site licensing/attribution requirements
- [ ] Data retention policy for versions/suggestions

---

## Database Schema Additions

```sql
-- Add to suggestions table: content hash for deduplication
ALTER TABLE suggestions ADD COLUMN content_hash VARCHAR(64);
CREATE INDEX idx_suggestions_content_hash ON suggestions(content_hash);

-- Add to constructions: full-text search
ALTER TABLE constructions ADD COLUMN search_vector tsvector;
CREATE INDEX idx_constructions_search ON constructions USING GIN(search_vector);

-- Trigger to update search vector
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

-- Partitioning for version history (if expecting high volume)
-- Consider partitioning by construction_id or time range
```

---

## Revised Implementation Phases

### Phase 1: Foundation (unchanged)
Add:
- [ ] Vercel KV setup for caching
- [ ] Sentry error tracking setup
- [ ] Basic rate limiting

### Phase 2: Community Features (unchanged)
Add:
- [ ] Duplicate suggestion detection
- [ ] Auto-assignment to moderators
- [ ] Input sanitization

### Phase 3: Automation
Add:
- [ ] Retry logic and resilience patterns
- [ ] Content-hash deduplication
- [ ] Confidence threshold filtering
- [ ] Scraper health monitoring

### Phase 4: Enhancement (unchanged)
Add:
- [ ] Map clustering
- [ ] Full-text search
- [ ] API documentation

### Phase 5: Production Hardening (new)
- [ ] Load testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Legal review (ToS, privacy policy)

---

## Summary of Key Actions

1. **Before Phase 1:**
   - Add security section to plan (rate limiting, sanitization, CSP)
   - Set up error tracking (Sentry) and logging (Pino)
   - Plan caching strategy (Vercel KV)

2. **During scraper implementation:**
   - Implement retry with exponential backoff
   - Add content-hash deduplication
   - Set confidence threshold (auto-reject < 0.5)
   - Add Vietnamese text normalization

3. **Before launch:**
   - Map clustering for performance
   - Duplicate detection for suggestions
   - Legal review (ToS, scraping compliance)

---

*Review completed: January 2025*
