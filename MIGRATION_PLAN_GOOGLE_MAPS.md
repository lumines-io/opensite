# Migration Plan: Mapbox to Google Maps

## Implementation Status: ✅ COMPLETED

The migration of public-facing maps from Mapbox to Google Maps has been implemented. Below is a summary of what was done:

### Files Created
| File | Description |
|------|-------------|
| `src/components/GoogleMap/google-map.constants.ts` | Constants, styles, and configuration |
| `src/components/GoogleMap/google-map.types.ts` | TypeScript type definitions |
| `src/components/GoogleMap/google-map.utils.ts` | Utility functions and helpers |
| `src/components/GoogleMap/GoogleConstructionMap.tsx` | Main interactive map component |
| `src/components/GoogleMap/GoogleMapInfoWindow.tsx` | InfoWindow popup component |
| `src/components/GoogleMap/GoogleMapLegend.tsx` | Legend with filter toggles |
| `src/components/GoogleMap/GoogleConstructionListModal.tsx` | List of constructions modal |
| `src/components/GoogleMap/GoogleMapSearchPanel.tsx` | Places Autocomplete search |
| `src/components/GoogleMap/GoogleMiniMap.tsx` | Static mini map for detail pages |
| `src/components/GoogleMap/index.ts` | Barrel exports |

### Files Modified
| File | Change |
|------|--------|
| `src/middleware.ts` | Added Google Maps CSP entries |
| `src/app/globals.css` | Added Google Maps InfoWindow/Autocomplete styles |
| `src/app/(app)/page.tsx` | Updated to pass Google Maps API key |
| `src/components/HomePage/HomePage.tsx` | Switched to Google Maps components |
| `src/i18n/messages/en.json` | Added translation keys |
| `src/i18n/messages/vi.json` | Added translation keys |

### Environment Variable Required
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
```

### Google Cloud Console Setup Required
Enable the following APIs:
- Maps JavaScript API
- Places API
- Geocoding API

---

## Overview

This document outlines all touchpoints affected by migrating from Mapbox to Google Maps for the public-facing application, while maintaining Mapbox for the PayloadCMS `/admin` route.

## Migration Scope

| Area | Current Provider | Target Provider |
|------|-----------------|-----------------|
| Public Map (Homepage) | Mapbox | **Google Maps** |
| Detail Page MiniMap | Mapbox | **Google Maps** |
| Search/Geocoding (Public) | Mapbox Geocoding API | **Google Places API** |
| Routing (Public) | Google Directions API | Google Directions API (no change) |
| Suggest Page Map | Mapbox | **Google Maps** |
| PayloadCMS Admin (GeometryMapField) | Mapbox | Mapbox (no change) |
| PayloadCMS Admin (CoordinateAdjuster) | Mapbox | Mapbox (no change) |
| Moderator Suggestion Review | Mapbox | Mapbox (no change) |

---

## Affected Touchpoints

### 1. Package Dependencies

**File:** `package.json`

**Current Mapbox packages:**
- `mapbox-gl` (^3.17.0)
- `react-map-gl` (^8.1.0)
- `@mapbox/mapbox-gl-draw` (^1.5.1)
- `@types/mapbox__mapbox-gl-draw` (^1.4.9)

**Action Required:**
- Add Google Maps packages:
  - `@googlemaps/js-api-loader` - Google Maps JavaScript API loader
  - `@react-google-maps/api` - React wrapper for Google Maps
  - `@types/google.maps` - TypeScript types
- Keep Mapbox packages for admin route

---

### 2. Environment Variables

**Current:**
- `NEXT_PUBLIC_MAPBOX_TOKEN`

**Action Required:**
- Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Keep Mapbox tokens for admin usage
- Update `.env.example` with new variable

---

### 3. Configuration Files

#### `next.config.ts`

**Current:** Remote image patterns for `*.mapbox.com`

**Action Required:**
- Add Google Maps image domains:
  - `maps.googleapis.com`
  - `maps.gstatic.com`
- Keep Mapbox domains for admin

---

#### `src/middleware.ts`

**Current CSP allows:**
- `script-src`: `https://api.mapbox.com`
- `style-src`: `https://api.mapbox.com`
- `img-src`: `https://*.mapbox.com`
- `connect-src`: `https://*.mapbox.com`, `https://api.mapbox.com`, `https://events.mapbox.com`

**Action Required:**
- Add Google Maps CSP entries:
  - `script-src`: `https://maps.googleapis.com`
  - `style-src`: `https://fonts.googleapis.com`
  - `img-src`: `https://maps.googleapis.com`, `https://maps.gstatic.com`
  - `connect-src`: `https://maps.googleapis.com`
- Keep Mapbox CSP entries for admin route

---

### 4. Styling

#### `src/app/globals.css` (Lines 203-266)

**Current:** Mapbox-specific CSS classes:
- `.mapboxgl-popup`
- `.mapboxgl-popup-content`
- `.mapboxgl-popup-close-button`
- Dark mode for map controls

**Action Required:**
- Add Google Maps equivalent CSS:
  - `.gm-style-iw` (info window)
  - `.gm-style-iw-d` (info window content)
  - `.gm-ui-hover-effect` (close button)
- Keep Mapbox CSS for admin components

---

### 5. Core Map Components (PUBLIC - Migrate to Google Maps)

#### `src/components/Map/ConstructionMap.tsx` ⚠️ **MAJOR REWRITE**

**Current:** ~600 lines using `react-map-gl/mapbox`

**Action Required:**
- Rewrite using `@react-google-maps/api`
- Replace components:
  - `Map` → `GoogleMap`
  - `Marker` → `Marker` / `AdvancedMarkerElement`
  - `Popup` → `InfoWindow`
  - `Source` + `Layer` → Custom overlays or Data Layer
- Replace features:
  - GeoJSON rendering → Google Maps Data Layer API
  - Clustering → `@googlemaps/markerclusterer`
  - Navigation controls → Google Maps built-in controls
  - Geolocate control → Custom implementation with Geolocation API

---

#### `src/components/Map/MiniMap.tsx` ⚠️ **REWRITE**

**Current:** Direct `mapbox-gl` usage

**Action Required:**
- Rewrite using Google Maps JavaScript API directly
- Static map with single marker
- Consider using Static Maps API for simpler implementation

---

#### `src/app/(app)/details/[slug]/MiniMap.tsx` ⚠️ **REWRITE**

**Current:** Mapbox GL JS

**Action Required:**
- Same as above MiniMap component
- Could use Google Static Maps API for non-interactive preview

---

#### `src/components/Map/ConstructionPopup.tsx` ⚠️ **REWRITE**

**Current:** `react-map-gl/mapbox` Popup component

**Action Required:**
- Rewrite using Google Maps `InfoWindow`
- Maintain same content and styling
- Handle open/close state differently (Google uses imperative API)

---

### 6. Map Utilities & Hooks (PUBLIC - Migrate)

#### `src/components/Map/construction-map.constants.ts` ⚠️ **UPDATE**

**Current:**
- `MAP_STYLES` with Mapbox style URLs
- `DEFAULT_CENTER` as `[lng, lat]`

**Action Required:**
- Replace `MAP_STYLES` with Google Map IDs or style arrays
- Convert `DEFAULT_CENTER` to `{ lat, lng }` format (Google uses objects, not arrays)
- Add Google Maps specific constants (zoom controls, map type IDs)

---

#### `src/components/Map/construction-map.utils.ts` ⚠️ **MAJOR REWRITE**

**Current:** ~330 lines with Mapbox expression builders:
- `buildTypeColorExpression()`
- `buildLineWidthExpression()`
- `buildRadiusExpression()`
- `buildOpacityExpression()`
- etc.

**Action Required:**
- Replace Mapbox expressions with Google Maps Data Layer styling functions
- Create new utility functions for Google Maps styling:
  - `getFeatureStyle(feature)` returning `google.maps.Data.StyleOptions`
- Coordinate format conversions (array to object)

---

#### `src/components/Map/useMapLayers.ts` ⚠️ **DELETE/REWRITE**

**Current:** ~300 lines for Mapbox layer management

**Action Required:**
- Replace with Google Maps Data Layer management
- New approach:
  - `map.data.addGeoJson()` for loading features
  - `map.data.setStyle()` for styling
- Create new `useGoogleMapLayers.ts` hook

---

#### `src/components/Map/useMapIcons.ts` ⚠️ **REWRITE**

**Current:** Loads SVG icons into Mapbox with `map.addImage()`

**Action Required:**
- Google Maps uses different icon approach:
  - `Symbol` for SVG paths
  - `Icon` for image URLs
- Rewrite icon loading for Google Maps markers

---

#### `src/components/Map/construction-map.types.ts` ⚠️ **UPDATE**

**Action Required:**
- Update `Coordinates` type from `[number, number]` to `{ lat: number; lng: number }`
- Add Google Maps specific types
- Keep GeoJSON types for data format

---

### 7. Search & Geocoding (PUBLIC - Migrate)

#### `src/lib/scraper/geocoding.ts` ⚠️ **REWRITE**

**Current:** ~190 lines using Mapbox Geocoding API

**Action Required:**
- Replace with Google Places Autocomplete API or Geocoding API
- Update functions:
  - `geocodeLocation()` → Use Google Geocoding API
  - `batchGeocodeLocations()` → Update for Google API rate limits
- Update endpoint from `api.mapbox.com/geocoding/v5/mapbox.places/` to Google

---

#### `src/components/Map/MapSearchPanel.tsx` ⚠️ **REWRITE**

**Current:** Uses Mapbox Geocoding for suggestions

**Action Required:**
- Integrate with Google Places Autocomplete
- Use `@react-google-maps/api` Autocomplete component
- Update suggestion format

---

#### `src/components/SearchOverlay/SearchOverlay.tsx` ⚠️ **REWRITE**

**Current:** ~300 lines with Mapbox geocoding

**Action Required:**
- Replace with Google Places Autocomplete
- Update result handling for Google's response format

---

### 8. API Routes (PUBLIC - Update)

#### `src/app/api/search/route.ts` ⚠️ **UPDATE**

**Action Required:**
- Switch to Google Geocoding/Places API calls
- Update response format handling

---

#### `src/app/api/search/nearby/route.ts` ⚠️ **UPDATE**

**Action Required:**
- May need adjustment for coordinate format
- Consider using Google Places Nearby Search

---

#### `src/app/api/map/constructions/route.ts` ✅ **NO CHANGE**

- Returns GeoJSON which is compatible with both providers
- Keep as-is

---

#### `src/app/api/route/constructions/route.ts` ✅ **NO CHANGE**

- Already uses Google Directions API
- Keep as-is

---

### 9. Page-Level Integration (PUBLIC - Update)

#### `src/app/(app)/page.tsx` ⚠️ **UPDATE**

**Action Required:**
- Pass `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` instead of Mapbox token
- Update dynamic import

---

#### `src/components/HomePage/HomePage.tsx` ⚠️ **UPDATE**

**Action Required:**
- Update prop name from `mapboxToken` to `googleMapsApiKey`
- Update map component integration

---

#### `src/app/(app)/suggest/page.tsx` ⚠️ **UPDATE**

**Current:** Uses Mapbox for geometry drawing

**Action Required:**
- Need to decide: Use Google Maps drawing tools or keep Mapbox for drawing
- Google Maps Drawing Library is less feature-rich than Mapbox GL Draw
- **Recommendation:** Keep Mapbox for suggest page drawing functionality, or create a simplified Google Maps version

---

### 10. Components to KEEP on Mapbox (Admin Route)

These components should remain unchanged:

| Component | File | Reason |
|-----------|------|--------|
| GeometryMapField | `src/payload/components/fields/GeometryMapField.tsx` | Admin-only, needs drawing tools |
| CoordinateAdjuster | `src/components/Map/CoordinateAdjuster.tsx` | Admin-only coordinate editing |
| MapDrawer | `src/components/Map/MapDrawer.tsx` | Drawing tools, admin use |
| SuggestionDetail map | `src/app/(app)/moderator/suggestions/SuggestionDetail.tsx` | Admin/moderator only |

---

### 11. Tests

#### `src/components/Map/__tests__/construction-map.utils.test.ts` ⚠️ **REWRITE**

**Action Required:**
- Update tests for new Google Maps utility functions
- Test new styling functions

---

#### `src/payload/components/fields/__tests__/GeometryMapField.test.tsx` ✅ **NO CHANGE**

- Admin component stays on Mapbox
- Keep tests as-is

---

## Migration Summary by File

### Files to REWRITE (Major Changes)

| File | Lines | Priority | Complexity |
|------|-------|----------|------------|
| `ConstructionMap.tsx` | ~600 | High | High |
| `construction-map.utils.ts` | ~330 | High | High |
| `useMapLayers.ts` | ~300 | High | High |
| `SearchOverlay.tsx` | ~300 | Medium | Medium |
| `geocoding.ts` | ~190 | Medium | Medium |
| `MapSearchPanel.tsx` | ~150 | Medium | Medium |
| `ConstructionPopup.tsx` | ~100 | Medium | Low |
| `useMapIcons.ts` | ~120 | Medium | Medium |
| `MiniMap.tsx` (x2) | ~100 each | Low | Low |

### Files to UPDATE (Minor Changes)

| File | Change Type |
|------|-------------|
| `package.json` | Add Google packages |
| `next.config.ts` | Add image domains |
| `middleware.ts` | Add CSP entries |
| `globals.css` | Add Google Maps CSS |
| `construction-map.constants.ts` | Update styles/coords |
| `construction-map.types.ts` | Update coordinate types |
| `page.tsx` (home) | Update token prop |
| `HomePage.tsx` | Update token prop |
| `suggest/page.tsx` | Decision needed |
| API routes | Update geocoding calls |

### Files with NO CHANGE

| File | Reason |
|------|--------|
| `GeometryMapField.tsx` | Admin stays on Mapbox |
| `CoordinateAdjuster.tsx` | Admin stays on Mapbox |
| `MapDrawer.tsx` | Admin stays on Mapbox |
| `SuggestionDetail.tsx` | Admin stays on Mapbox |
| `/api/map/constructions` | GeoJSON is universal |
| `/api/route/constructions` | Already uses Google |

---

## Key Differences: Mapbox vs Google Maps

| Feature | Mapbox | Google Maps |
|---------|--------|-------------|
| Coordinate format | `[lng, lat]` array | `{ lat, lng }` object |
| Styling | Expressions (JSON-like DSL) | JavaScript functions |
| Layers | Declarative source + layer | Data Layer API |
| Popups | `Popup` component | `InfoWindow` class |
| Clustering | Built-in | `@googlemaps/markerclusterer` |
| Drawing | `mapbox-gl-draw` (powerful) | Drawing Library (basic) |
| Icons | `map.addImage()` | `Symbol` or `Icon` |

---

## Recommended Migration Order

1. **Phase 1: Setup**
   - Add Google Maps packages
   - Add environment variables
   - Update CSP and config

2. **Phase 2: Core Components**
   - Create new Google Maps base components
   - Migrate `ConstructionMap.tsx`
   - Migrate `ConstructionPopup.tsx`

3. **Phase 3: Utilities**
   - Rewrite `construction-map.utils.ts`
   - Create `useGoogleMapLayers.ts`
   - Update types and constants

4. **Phase 4: Search/Geocoding**
   - Migrate geocoding service
   - Update search overlays
   - Update API routes

5. **Phase 5: Detail Pages**
   - Migrate MiniMap components
   - Update detail page integrations

6. **Phase 6: Testing & Cleanup**
   - Update tests
   - Remove unused Mapbox code from public routes
   - Performance testing

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Drawing tools less powerful | High | Medium | Keep Mapbox for suggest page |
| Coordinate format bugs | Medium | High | Create conversion utilities |
| Styling differences | Medium | Medium | Test thoroughly |
| API quota/pricing | Low | High | Monitor usage, set quotas |
| Performance regression | Medium | Medium | Benchmark before/after |

---

## Estimated Effort

| Phase | Estimated Effort |
|-------|-----------------|
| Phase 1: Setup | 2-4 hours |
| Phase 2: Core Components | 16-24 hours |
| Phase 3: Utilities | 8-12 hours |
| Phase 4: Search/Geocoding | 8-12 hours |
| Phase 5: Detail Pages | 4-8 hours |
| Phase 6: Testing | 8-16 hours |
| **Total** | **46-76 hours** |

---

## Decision Points

1. **Suggest Page Drawing:** Keep Mapbox or migrate to Google's simpler Drawing Library?
2. **Static Maps:** Use Google Static Maps API for MiniMaps or full JavaScript API?
3. **Clustering Library:** Use `@googlemaps/markerclusterer` or custom solution?
4. **Feature Parity:** Accept some features may work differently or invest time for exact parity?

---

# Appendix A: Google Maps Drawing Library Deep Dive

## Overview

The Google Maps Drawing Library provides tools for drawing shapes on maps. This section analyzes its capabilities compared to Mapbox GL Draw, which is currently used in the PayloadCMS admin components.

## Google Maps Drawing Features

### Available Drawing Modes

| Mode | Google Maps | Mapbox GL Draw | Notes |
|------|-------------|----------------|-------|
| Point/Marker | `OverlayType.MARKER` | `draw_point` | Equivalent |
| Line/Polyline | `OverlayType.POLYLINE` | `draw_line_string` | Equivalent |
| Polygon | `OverlayType.POLYGON` | `draw_polygon` | Equivalent |
| Circle | `OverlayType.CIRCLE` | Custom mode required | Google advantage |
| Rectangle | `OverlayType.RECTANGLE` | Custom mode required | Google advantage |

### Drawing Manager Initialization

```typescript
import { DrawingManager } from '@react-google-maps/api';

<DrawingManager
  onOverlayComplete={handleOverlayComplete}
  options={{
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [
        google.maps.drawing.OverlayType.MARKER,
        google.maps.drawing.OverlayType.POLYLINE,
        google.maps.drawing.OverlayType.POLYGON,
      ],
    },
    markerOptions: { draggable: true },
    polylineOptions: {
      strokeColor: '#3b82f6',
      strokeWeight: 4,
      editable: true,
      draggable: true,
    },
    polygonOptions: {
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      strokeColor: '#3b82f6',
      strokeWeight: 3,
      editable: true,
      draggable: true,
    },
  }}
/>
```

### Editing Capabilities

| Feature | Mapbox GL Draw | Google Maps Drawing |
|---------|----------------|---------------------|
| Vertex editing | ✅ Built-in | ✅ `editable: true` |
| Midpoint handles | ✅ Automatic | ❌ Not available |
| Vertex deletion | ✅ Click to delete | ⚠️ Manual implementation |
| Shape dragging | ✅ Built-in | ✅ `draggable: true` |
| Multi-selection | ✅ Shift+click | ❌ Not available |
| Undo/Redo | ⚠️ Custom | ❌ Not available |

### Event Handling

```typescript
// Google Maps events
google.maps.event.addListener(drawingManager, 'overlaycomplete', (event) => {
  const overlay = event.overlay;
  const type = event.type;

  // Listen for vertex changes
  if (type === google.maps.drawing.OverlayType.POLYGON) {
    const path = (overlay as google.maps.Polygon).getPath();
    google.maps.event.addListener(path, 'set_at', () => { /* vertex moved */ });
    google.maps.event.addListener(path, 'insert_at', () => { /* vertex inserted */ });
    google.maps.event.addListener(path, 'remove_at', () => { /* vertex removed */ });
  }
});
```

## Critical Gap: GeoJSON Integration

### The Problem

Google Maps Drawing Library does **NOT** natively support GeoJSON. The current Mapbox implementation relies heavily on GeoJSON:

**Current Mapbox Usage (GeometryMapField.tsx):**
```typescript
// Native GeoJSON support
const data = drawRef.current.getAll();  // Returns FeatureCollection
setValue(data.features[0].geometry);     // Direct GeoJSON geometry

// Loading geometry
draw.add({
  type: 'Feature',
  properties: {},
  geometry: value,  // Direct GeoJSON
});
```

**Required Google Maps Conversion:**
```typescript
// Must manually convert to GeoJSON
function shapeToGeoJSON(
  overlay: google.maps.Polygon | google.maps.Polyline | google.maps.Marker
): GeoJSON.Geometry {
  if (overlay instanceof google.maps.Marker) {
    const pos = overlay.getPosition()!;
    return {
      type: 'Point',
      coordinates: [pos.lng(), pos.lat()],
    };
  }

  if (overlay instanceof google.maps.Polyline) {
    const path = overlay.getPath();
    const coordinates: [number, number][] = [];
    path.forEach((latLng) => {
      coordinates.push([latLng.lng(), latLng.lat()]);
    });
    return { type: 'LineString', coordinates };
  }

  if (overlay instanceof google.maps.Polygon) {
    const paths = overlay.getPaths();
    const rings: [number, number][][] = [];
    paths.forEach((path) => {
      const ring: [number, number][] = [];
      path.forEach((latLng) => {
        ring.push([latLng.lng(), latLng.lat()]);
      });
      if (ring.length > 0) ring.push(ring[0]); // Close ring
      rings.push(ring);
    });
    return { type: 'Polygon', coordinates: rings };
  }

  throw new Error('Unknown shape type');
}

// Must also manually load GeoJSON
function geoJSONToShape(
  geometry: GeoJSON.Geometry,
  map: google.maps.Map
): google.maps.MVCObject {
  switch (geometry.type) {
    case 'Point':
      return new google.maps.Marker({
        position: { lat: geometry.coordinates[1], lng: geometry.coordinates[0] },
        map,
        draggable: true,
      });
    case 'LineString':
      return new google.maps.Polyline({
        path: geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
        map,
        editable: true,
        draggable: true,
      });
    case 'Polygon':
      return new google.maps.Polygon({
        paths: geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng })),
        map,
        editable: true,
        draggable: true,
      });
    default:
      throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
}
```

## Missing Features Analysis

### 1. No Midpoint Vertex Insertion

**Mapbox GL Draw:** Automatically shows midpoint handles between vertices that can be dragged to insert new vertices.

**Google Maps:** Must implement custom solution:

```typescript
function addMidpointHandles(polygon: google.maps.Polygon, map: google.maps.Map) {
  const path = polygon.getPath();
  const midpointMarkers: google.maps.Marker[] = [];

  function createMidpoints() {
    midpointMarkers.forEach(m => m.setMap(null));
    midpointMarkers.length = 0;

    path.forEach((point, index) => {
      const nextIndex = (index + 1) % path.getLength();
      const nextPoint = path.getAt(nextIndex);

      const midLat = (point.lat() + nextPoint.lat()) / 2;
      const midLng = (point.lng() + nextPoint.lng()) / 2;

      const midpointMarker = new google.maps.Marker({
        position: { lat: midLat, lng: midLng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 4,
          fillColor: '#3b82f6',
          fillOpacity: 0.5,
          strokeWeight: 0,
        },
        draggable: true,
        cursor: 'pointer',
      });

      google.maps.event.addListener(midpointMarker, 'dragend', () => {
        const pos = midpointMarker.getPosition()!;
        path.insertAt(nextIndex, pos);
        createMidpoints();
      });

      midpointMarkers.push(midpointMarker);
    });
  }

  createMidpoints();
  google.maps.event.addListener(path, 'set_at', createMidpoints);
  google.maps.event.addListener(path, 'insert_at', createMidpoints);
  google.maps.event.addListener(path, 'remove_at', createMidpoints);
}
```

### 2. No Snap to Road Equivalent

**Current Mapbox Implementation:**
```typescript
// Uses Mapbox Map Matching API
const response = await fetch(
  `https://api.mapbox.com/matching/v5/mapbox/driving/${coordString}?geometries=geojson&overview=full&access_token=${accessToken}`
);
```

**Google Maps Alternative:**
```typescript
// Google Roads API - Snap to Roads
const response = await fetch(
  `https://roads.googleapis.com/v1/snapToRoads?path=${coordString}&interpolate=true&key=${apiKey}`
);

// Note: Different response format, requires conversion
const result = await response.json();
const snappedPoints = result.snappedPoints.map(p => ({
  lat: p.location.latitude,
  lng: p.location.longitude
}));
```

### 3. No Custom Drawing Modes

**Mapbox GL Draw:** Supports creating custom drawing modes for specialized behavior.

**Google Maps:** Fixed set of drawing modes, no extensibility.

---

# Appendix B: Full Admin Migration Assessment

## Current Admin Components Using Mapbox

### 1. GeometryMapField.tsx (~815 lines)

**Purpose:** Custom Payload CMS field for editing geometry in admin panel.

**Mapbox-Specific Features Used:**
| Feature | Lines | Complexity to Migrate |
|---------|-------|----------------------|
| MapboxDraw initialization | 114-184 | High |
| Custom draw styles (6 style objects) | 118-183 | Medium |
| Mode switching (`changeMode`) | 281-287 | Medium |
| Snap to Road (Map Matching API) | 227-278 | High |
| GeoJSON add/getAll | 190-208 | High |
| JSON editing fallback | 298-338 | None (keep) |

**Key Dependencies:**
- `react-map-gl/mapbox` (Map, NavigationControl, GeolocateControl, Marker)
- `@mapbox/mapbox-gl-draw` (MapboxDraw)
- Mapbox Map Matching API

### 2. MapDrawer.tsx (~396 lines)

**Purpose:** Reusable drawing component with imperative ref API.

**Mapbox-Specific Features Used:**
| Feature | Lines | Complexity to Migrate |
|---------|-------|----------------------|
| MapboxDraw with custom styles | 63-138 | High |
| Draw event listeners | 153-170 | Medium |
| Imperative ref methods | 243-273 | High |
| Snap to Road | 188-240 | High |

**Exposed API (via ref):**
- `getGeometry()` - Returns GeoJSON geometry
- `setGeometry()` - Loads GeoJSON geometry
- `setMode()` - Changes drawing mode
- `clearAll()` - Clears all drawn features
- `snapToRoad()` - Snaps line to nearest road

### 3. CoordinateAdjuster.tsx

**Purpose:** Fine-tune coordinates via draggable marker.

**Complexity:** Low - Only uses basic Map and draggable Marker.

---

## Migration Technical Challenge Assessment

### If Migrating Admin to Google Maps

| Component | Challenge Level | Estimated Effort | Key Blockers |
|-----------|----------------|------------------|--------------|
| GeometryMapField | 🔴 Very High | 40-60 hours | GeoJSON conversion, midpoint handles, snap-to-road |
| MapDrawer | 🔴 Very High | 30-40 hours | Imperative API, all Mapbox features |
| CoordinateAdjuster | 🟢 Low | 4-8 hours | Just basic map + marker |

### Required Custom Implementations

1. **GeoJSON Converter Utility** (~200 lines)
   - Shape to GeoJSON conversion
   - GeoJSON to Shape loading
   - Multi-geometry support

2. **Midpoint Handle System** (~150 lines)
   - Custom marker creation
   - Path listeners
   - Insertion logic

3. **Drawing Manager Wrapper** (~300 lines)
   - State management for current shape
   - Mode switching
   - Event coordination

4. **Snap to Road Service** (~100 lines)
   - Google Roads API integration
   - Response format conversion

**Total Custom Code Required:** ~750 lines

### Feature Parity Analysis

| Current Feature | Google Maps Equivalent | Parity Level |
|-----------------|----------------------|--------------|
| Point drawing | DrawingManager MARKER | ✅ Full |
| Line drawing | DrawingManager POLYLINE | ✅ Full |
| Polygon drawing | DrawingManager POLYGON | ✅ Full |
| Vertex editing | `editable: true` | ⚠️ Partial (no midpoints) |
| Mode indicator | Custom implementation | ✅ Full |
| Multiple map styles | Style arrays/Map IDs | ✅ Full |
| Snap to road | Google Roads API | ⚠️ Different API, needs conversion |
| JSON editing fallback | N/A (keep as-is) | ✅ Full |
| GeoJSON import/export | Custom converter | ⚠️ Requires implementation |

---

# Appendix C: Dark Mode Implementation for Google Maps

## Option 1: Style Arrays (Recommended for Dynamic Switching)

```typescript
const GOOGLE_MAP_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

const GOOGLE_MAP_LIGHT_STYLE: google.maps.MapTypeStyle[] = []; // Empty = default
```

## Dynamic Theme Switching

```typescript
import { useTheme } from '@/components/ThemeProvider';

function ThemedGoogleMap() {
  const { theme } = useTheme();
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({
        styles: theme === 'dark' ? GOOGLE_MAP_DARK_STYLE : GOOGLE_MAP_LIGHT_STYLE,
      });
    }
  }, [theme]);

  return (
    <GoogleMap
      onLoad={(map) => { mapRef.current = map; }}
      options={{
        styles: theme === 'dark' ? GOOGLE_MAP_DARK_STYLE : GOOGLE_MAP_LIGHT_STYLE,
      }}
    />
  );
}
```

## Option 2: Cloud-based Map IDs

1. Create two Map IDs in Google Cloud Console (one light, one dark)
2. Switch Map ID based on theme (requires map recreation)

```typescript
const mapId = theme === 'dark' ? 'YOUR_DARK_MAP_ID' : 'YOUR_LIGHT_MAP_ID';

<GoogleMap options={{ mapId }} />
```

---

# Appendix D: Google Places Autocomplete Integration

## React Implementation

```typescript
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const libraries: ("places")[] = ['places'];

function PlaceSearch({ onPlaceSelect }: { onPlaceSelect: (place: google.maps.places.PlaceResult) => void }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        onPlaceSelect(place);
      }
    }
  }, [onPlaceSelect]);

  if (!isLoaded) return <input disabled placeholder="Loading..." />;

  return (
    <Autocomplete
      onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: 'vn' },
        fields: ['formatted_address', 'geometry', 'name', 'place_id'],
        types: ['geocode', 'establishment'],
      }}
    >
      <input
        type="text"
        placeholder="Tìm kiếm địa điểm..."
        className="w-full px-4 py-2 border rounded-lg"
      />
    </Autocomplete>
  );
}
```

---

# Appendix E: Revised Recommendations

## Option A: Partial Migration (Recommended)

**Migrate to Google Maps:**
- Public ConstructionMap (homepage)
- Public MiniMap (detail pages)
- Search/Geocoding

**Keep on Mapbox:**
- GeometryMapField (PayloadCMS admin)
- MapDrawer (drawing component)
- CoordinateAdjuster (admin)
- Suggest page drawing (if feature-rich editing needed)

**Pros:**
- Lower risk, faster implementation
- Maintains drawing feature parity
- Users get familiar Google Maps experience

**Cons:**
- Two map libraries in bundle
- Two API keys to manage

## Option B: Full Migration to Google Maps

**Migrate Everything:**
- All public maps
- All admin maps
- Custom drawing implementation

**Pros:**
- Single map library
- Single API key
- Consistent experience

**Cons:**
- Very high implementation effort (100+ hours total)
- Risk of feature regression in admin
- Requires extensive custom code for drawing

## Option C: Full Migration with Simplified Admin Drawing

**Migrate Everything BUT:**
- Accept simpler drawing UX in admin
- Remove advanced features (snap-to-road, midpoints)
- Keep JSON editing as primary input method

**Pros:**
- Single map library
- Moderate implementation effort
- JSON editing already exists as fallback

**Cons:**
- Reduced admin UX quality
- May frustrate admin users

---

## Final Recommendation

**Go with Option A (Partial Migration)** unless there's a strong business requirement to eliminate Mapbox completely.

The drawing functionality in `GeometryMapField` and `MapDrawer` is sophisticated and would require significant custom development to replicate in Google Maps. The ROI of full migration is questionable given:

1. Admin routes are internal, not user-facing
2. Mapbox drawing tools are production-tested
3. Custom Google Maps drawing would add maintenance burden
4. Bundle size impact is manageable with code splitting

If full migration is required in the future, consider it as a separate phase after the public map migration is stable.
