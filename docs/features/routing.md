# Routing & Navigation

## Overview

The Routing feature provides A-to-B navigation with construction alerts, helping users plan routes while being aware of ongoing construction projects that may affect their journey.

## Key Features

### Route Planning

Users can calculate routes between two points:

1. **Origin Selection**
   - Click on map
   - Enter address
   - Use current location

2. **Destination Selection**
   - Click on map
   - Enter address
   - Search for location

3. **Route Calculation**
   - Powered by Mapbox Directions API
   - Multiple route options
   - Distance and duration estimates

### Construction Alerts

Routes display nearby construction projects:

- **Distance from route** - How far construction is from path
- **Construction type** - What kind of work
- **Status** - Current project status
- **Impact level** - Potential route impact

## Routing Interface

### Routing Panel

```
┌────────────────────────────────────┐
│ Route Planning                   X │
├────────────────────────────────────┤
│ From:                              │
│ [📍 Use current location    ]     │
│ [Enter starting point...    ]     │
│                                    │
│ To:                                │
│ [Enter destination...       ]     │
│                                    │
│ [Swap ⇅]  [Calculate Route]       │
├────────────────────────────────────┤
│ Route Info (when calculated):      │
│ Distance: 12.5 km                  │
│ Duration: ~25 min                  │
├────────────────────────────────────┤
│ ⚠️ Construction Alerts (3)         │
│                                    │
│ 🚧 Metro Line 2 Construction       │
│    150m from route · In Progress   │
│                                    │
│ 🚧 Road Expansion                  │
│    300m from route · In Progress   │
│                                    │
│ 🚧 Bridge Repair                   │
│    500m from route · Paused        │
└────────────────────────────────────┘
```

### Map Visualization

- **Route line** - Blue line showing path
- **Origin marker** - Green marker
- **Destination marker** - Red marker
- **Construction markers** - Orange icons along route
- **Alert radius** - Visual buffer around route

## API Reference

### Calculate Route with Alerts

```
GET /api/route/constructions

Query Parameters:
  from    (string, required) - Origin coordinates "lat,lng"
  to      (string, required) - Destination coordinates "lat,lng"
  buffer  (number, default: 500) - Alert radius in meters

Response:
{
  route: {
    geometry: GeoJSON,
    distance: number,      // meters
    duration: number,      // seconds
    steps: RouteStep[]
  },
  constructions: [
    {
      id: string,
      title: string,
      type: string,
      status: string,
      distanceFromRoute: number,  // meters
      geometry: GeoJSON,
      centroid: [lng, lat]
    }
  ],
  alertCount: number
}
```

### Get Route Alerts Only

```
GET /api/route/alerts

Query Parameters:
  routeGeometry   (string) - Encoded route geometry
  buffer          (number, default: 500)

Response:
{
  alerts: [
    {
      construction: Construction,
      distanceFromRoute: number,
      impactLevel: "high" | "medium" | "low"
    }
  ]
}
```

## Route Calculation Logic

### Step 1: Get Route from Mapbox

```typescript
const route = await mapboxDirections.getRoute({
  origin: [fromLng, fromLat],
  destination: [toLng, toLat],
  profile: 'driving-traffic'
});
```

### Step 2: Find Nearby Constructions

```typescript
const nearbyConstructions = await findConstructionsNearRoute({
  routeGeometry: route.geometry,
  bufferMeters: 500
});
```

### Step 3: Calculate Distances

For each construction, calculate minimum distance from route line:

```typescript
const distance = turf.pointToLineDistance(
  constructionCentroid,
  routeLine,
  { units: 'meters' }
);
```

### Step 4: Sort by Relevance

Constructions sorted by:
1. Distance from route (closer first)
2. Status (in-progress prioritized)
3. Construction type

## Impact Level Calculation

| Distance | Status | Impact Level |
|----------|--------|--------------|
| < 100m | in-progress | High |
| < 100m | planned/paused | Medium |
| 100-300m | in-progress | Medium |
| 100-300m | other | Low |
| > 300m | any | Low |

## User Interactions

### Setting Origin

1. **Click map** - Sets marker at clicked location
2. **Current location** - Uses browser geolocation
3. **Address search** - Geocodes typed address

### Setting Destination

1. **Click map** - Sets marker at clicked location
2. **Address search** - Geocodes typed address
3. **Select construction** - Route to specific project

### Viewing Alerts

- Click alert to zoom to construction
- Hover for quick info
- Click "View Details" for full page

### Recalculating Route

- Move markers to recalculate
- Change buffer distance
- Swap origin/destination

## Feature Configuration

### Buffer Distance Options

Users can adjust alert buffer:

- 250m - Immediate vicinity only
- 500m - Default setting
- 1000m - Wider awareness
- 2000m - Maximum coverage

### Route Profiles

Available via Mapbox:

- **Driving** - Car routes
- **Driving-traffic** - With live traffic
- **Walking** - Pedestrian routes
- **Cycling** - Bike-friendly routes

## Mobile Behavior

### Responsive Layout

- Panel becomes bottom drawer
- Full-screen map option
- Swipe gestures for panel
- Tap for alert details

### Location Services

- Prompts for location permission
- Falls back to manual entry
- Shows accuracy indicator

## Error Handling

### No Route Found

- Display error message
- Suggest alternative destinations
- Check for water/boundary crossings

### Geocoding Failures

- Show "Location not found"
- Suggest using map click
- Offer popular destinations

### API Errors

- Graceful degradation
- Retry mechanism
- Cached route if available

## Performance

### Optimizations

- Route caching (5 min TTL)
- Simplified geometries
- Progressive loading of alerts
- Debounced input handling

### Response Times

- Route calculation: < 500ms
- Alert lookup: < 200ms
- Full response: < 700ms

## Feature Flag

**Flag:** `FEATURE_ROUTING`

When disabled:
- Routing panel hidden
- Route endpoints return 403
- Map click doesn't set markers

## Components

- `MapRoutingPanel` - Main routing interface
- `RouteDisplay` - Route line on map
- `ConstructionAlertList` - Alert list
- `RouteMarkers` - Origin/destination markers

## External Dependencies

- **Mapbox Directions API** - Route calculation
- **Mapbox Geocoding API** - Address lookup
- **Turf.js** - Geospatial calculations

## Related Files

- `src/app/api/route/constructions/route.ts`
- `src/app/api/route/alerts/route.ts`
- `src/components/map/MapRoutingPanel.tsx`
- `src/components/map/RouteDisplay.tsx`
- `src/lib/routing/index.ts`
