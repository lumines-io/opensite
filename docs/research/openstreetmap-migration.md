# OpenStreetMap Migration Research

> **Status:** On Hold - Will revisit when Google Maps costs become significant
> **Last Updated:** 2025-01-29
> **Trigger:** Monthly Google Maps bill exceeds ~$100-200

---

## Executive Summary

Migration from Google Maps to OpenStreetMap is **feasible** with moderate effort. The main cost savings come from eliminating Google Maps API fees, but requires hosting/paying for tile servers and routing services.

**Estimated Effort:** 3-5 weeks for full migration

---

## 1. Technical Implementation Options

### Primary Library Options for React/Next.js

| Library | Description | Bundle Size | Best For |
|---------|-------------|-------------|----------|
| **Leaflet + react-leaflet** | Most popular, mature | ~40KB | General use, widest ecosystem |
| **MapLibre GL JS** | Fork of Mapbox GL (open-source) | ~200KB | Vector tiles, 3D, high performance |
| **OpenLayers** | Feature-rich, complex | ~150KB | Enterprise, GIS applications |

### Recommended: MapLibre GL JS

Given our existing Mapbox dependency (`mapbox-gl`, `react-map-gl`), **MapLibre GL JS** is the best choice because:

1. **Drop-in replacement for Mapbox GL** - Nearly identical API
2. **We already have react-map-gl** - Works with MapLibre via `mapLib` prop
3. **Vector tiles support** - Same as current Mapbox usage
4. **No license fees** - Unlike Mapbox GL v2+

```bash
# Replace mapbox-gl with maplibre-gl
npm uninstall mapbox-gl
npm install maplibre-gl
```

### Tile Providers (Map Rendering)

| Provider | Cost | Quality | Rate Limits |
|----------|------|---------|-------------|
| **OpenStreetMap.org tiles** | Free | Good | Heavy use discouraged |
| **Stadia Maps** | Free tier: 200k/mo | Excellent | Then $0.04/1k |
| **MapTiler** | Free tier: 100k/mo | Excellent | Then $0.05/1k |
| **Thunderforest** | Free: 150k/mo | Good | Then £0.05/1k |
| **Self-hosted** | Server costs | Full control | None |

### Routing Services (Directions API Replacement)

| Service | Cost | Features |
|---------|------|----------|
| **OSRM** | Free (self-hosted) | Fastest, driving only |
| **Valhalla** | Free (self-hosted) | Multi-modal, isochrones |
| **GraphHopper** | Free tier available | Comprehensive, commercial option |
| **OpenRouteService** | Free: 2k requests/day | Turn-by-turn, isochrones |

### Geocoding Services (Places API Replacement)

| Service | Cost | Features |
|---------|------|----------|
| **Nominatim** | Free (self-hosted) | Basic geocoding |
| **Photon** | Free (self-hosted) | Fast autocomplete |
| **Geoapify** | Free: 3k/day | Autocomplete, POI |
| **LocationIQ** | Free: 5k/day | Drop-in Google replacement |

---

## 2. Feature Porting Analysis

### Current Google Maps Features

Based on analysis of `src/components/GoogleMap/`:

| Feature | Current Implementation | OSM Equivalent | Effort |
|---------|----------------------|----------------|--------|
| **Base Map Rendering** | `GoogleMap` component | MapLibre GL / Leaflet | ⭐⭐ Medium |
| **Custom Styling** | `GOOGLE_MAP_DARK_STYLE`, `GOOGLE_MAP_LIGHT_STYLE` | MapLibre Style Spec | ⭐⭐ Medium |
| **GeoJSON Data Layer** | `google.maps.Data` | MapLibre `addSource` + `addLayer` | ⭐⭐ Medium |
| **Custom Markers** | `createMarkerIcon()` SVG markers | MapLibre markers / Leaflet DivIcon | ⭐⭐ Medium |
| **Polylines** | `google.maps.Polyline` | MapLibre line layers / L.polyline | ⭐ Easy |
| **Polygons** | Data Layer with fill | MapLibre fill layers / L.polygon | ⭐ Easy |
| **InfoWindow Popups** | `GoogleMapInfoWindow` | MapLibre Popup / L.popup | ⭐ Easy |
| **Places Autocomplete** | `@react-google-maps/api` Autocomplete | Photon/Nominatim + custom UI | ⭐⭐⭐ Hard |
| **Directions/Routing** | Google Directions API | OSRM/GraphHopper/OpenRouteService | ⭐⭐⭐ Hard |
| **User Geolocation** | Browser Geolocation API | Same (browser native) | ⭐ Easy |
| **Animated Polylines** | Custom pulsing animation | CSS/Canvas animation | ⭐⭐ Medium |
| **Clustering** | Marker clustering | supercluster / Leaflet.markercluster | ⭐ Easy |

### Migration Priority Order

1. **Phase 1 - Base Map (2-3 days)**
   - Replace Google Maps with MapLibre GL
   - Port custom styles to MapLibre style spec
   - Test basic map rendering

2. **Phase 2 - Data Layers (3-4 days)**
   - Port GeoJSON data layer rendering
   - Implement custom markers with SVG
   - Port polyline/polygon styling

3. **Phase 3 - Interactivity (2-3 days)**
   - Port InfoWindow popups
   - Implement hover/click handlers
   - Port legend filtering logic

4. **Phase 4 - Services (5-7 days)**
   - Replace Google Directions with OSRM/OpenRouteService
   - Implement geocoding with Nominatim/Photon
   - Build custom autocomplete UI

### Key Code Changes Required

**Main component (`GoogleConstructionMap.tsx`):**
- Replace `@react-google-maps/api` with `react-map-gl` + `maplibre-gl`
- Replace `google.maps.Data` with MapLibre source/layer system
- Update event handlers (`click`, `mouseover`, `mouseout`)

**Search panel (`GoogleMapSearchPanel.tsx`):**
- Complete rewrite needed - Google Places has no OSM equivalent
- Build custom autocomplete with Nominatim/Photon API

**Route API (`/api/route/constructions/route.ts`):**
- Replace Google Directions API call with OSRM/OpenRouteService
- Update polyline decoding (OSRM uses same format)

---

## 3. Licensing for Commercial Use

### OpenStreetMap Data License

**License:** Open Database License (ODbL) 1.0

**Key Terms:**
- ✅ **Free to use** for any purpose including commercial
- ✅ **Free to modify** and create derivative works
- ⚠️ **Attribution required** - Must credit "© OpenStreetMap contributors"
- ⚠️ **Share-Alike** - If you distribute a modified database, it must be under ODbL

**Attribution Requirements:**
```html
© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
```

### Tile Provider Licenses

| Provider | License | Commercial Use | Attribution |
|----------|---------|----------------|-------------|
| OSM.org tiles | Free for light use | Discouraged for heavy use | Required |
| Stadia Maps | Commercial | ✅ Yes | Required |
| MapTiler | Commercial | ✅ Yes | Required |
| MapLibre GL | BSD-3-Clause | ✅ Yes | In source only |

### Routing Service Licenses

| Service | License | Commercial Use |
|---------|---------|----------------|
| OSRM | BSD-2-Clause | ✅ Yes, self-hosted |
| Valhalla | MIT | ✅ Yes, self-hosted |
| GraphHopper | Apache 2.0 | ✅ Yes, but check hosted terms |
| OpenRouteService | MIT | ✅ Yes, API has rate limits |

### Commercial Benefit Summary

**No licensing fees for:**
- OpenStreetMap data
- MapLibre GL JS library
- Self-hosted routing (OSRM, Valhalla)
- Self-hosted geocoding (Nominatim, Photon)

**Potential costs:**
- Tile hosting (self-host or paid provider)
- High-volume routing API (if not self-hosted)
- High-volume geocoding API (if not self-hosted)

---

## 4. Maintainability Assessment

### Library Ecosystem Health

| Component | Maintainers | GitHub Stars | Health |
|-----------|-------------|--------------|--------|
| MapLibre GL JS | MapLibre org | 6.5k+ | 🟢 Excellent |
| Leaflet | Community | 41k+ | 🟢 Excellent |
| react-map-gl | Vis.gl | 7.7k+ | 🟢 Excellent |
| OSRM | Project-OSRM | 6k+ | 🟢 Good |
| Nominatim | OSM Foundation | 3k+ | 🟢 Good |

### Comparison: Google Maps vs OSM Ecosystem

| Aspect | Google Maps | OpenStreetMap |
|--------|-------------|---------------|
| **Documentation** | Excellent, unified | Good, fragmented across projects |
| **Support** | Paid support available | Community forums, GitHub issues |
| **Breaking Changes** | Rare, well-communicated | Library-dependent |
| **Data Quality** | Consistent globally | Varies by region (excellent in Vietnam cities) |
| **Feature Parity** | Full suite | Requires multiple services |
| **Vendor Lock-in** | High | None |
| **Long-term Cost** | Increasing | Stable/predictable |

### Vietnam-Specific Considerations

- **OSM data quality in Vietnam:** Good in major cities (HCMC, Hanoi, Da Nang)
- **Road network:** Well-mapped
- **POI coverage:** Less comprehensive than Google
- **Local community:** Active Vietnamese mapper community

### Maintenance Overhead

**Google Maps (Current):**
- Single API key management
- Single documentation source
- Automatic updates

**OpenStreetMap Stack:**
- Multiple service endpoints to monitor
- Multiple documentation sources
- Manual library updates
- Potential self-hosting infrastructure

---

## 5. Cost Comparison

### Current Google Maps Costs (Estimated)

| API | Free Tier | Cost After | Usage Risk |
|-----|-----------|------------|-----------------|
| Maps JavaScript | 28k loads/mo | $7/1k | Medium |
| Directions | 40k calls/mo | $5/1k | Low-Medium |
| Places Autocomplete | 10k sessions/mo | $2.83/session | Medium |
| Geocoding | 40k calls/mo | $5/1k | Low |

### OpenStreetMap Stack Costs (Estimated)

| Service | Option | Monthly Cost |
|---------|--------|--------------|
| **Tile Hosting** | Stadia Maps (free tier) | $0-50 |
| **Tile Hosting** | Self-hosted | $50-200 (server) |
| **Routing** | OpenRouteService (free) | $0 |
| **Routing** | Self-hosted OSRM | $30-100 (server) |
| **Geocoding** | LocationIQ (free tier) | $0-30 |

### Break-even Analysis

If monthly Google Maps bill exceeds **$100-200/month**, OSM migration likely pays off within 6-12 months, accounting for:
- Development time (~3-5 weeks)
- Testing and QA
- Ongoing maintenance

---

## 6. Recommended Migration Strategy

### When to Trigger Migration

- Monthly Google Maps costs exceed $100-200
- Google announces significant pricing changes
- Need for offline/self-hosted map capability

### Recommended Stack

| Component | Recommendation |
|-----------|----------------|
| **Map Rendering** | MapLibre GL JS (via react-map-gl) |
| **Tiles** | Stadia Maps or MapTiler (start hosted, migrate to self-hosted later) |
| **Routing** | OpenRouteService or self-hosted OSRM |
| **Geocoding** | Nominatim/Photon with custom autocomplete UI |

### Migration Timeline

```
Week 1: Set up MapLibre GL, port basic map rendering
Week 2: Port data layers, markers, and popups
Week 3: Integrate OSRM/OpenRouteService for routing
Week 4: Build custom autocomplete with Nominatim/Photon
Week 5: Testing, QA, performance optimization
```

---

## 7. Quick Reference: Key Changes

### Package Changes

```json
// Remove
"@react-google-maps/api": "^2.20.8"

// Keep (works with MapLibre)
"react-map-gl": "^8.1.0"

// Replace
"mapbox-gl": "^3.17.0"  →  "maplibre-gl": "^4.x"
```

### Import Changes

```typescript
// Before
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

// After
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
```

---

## Summary

| Aspect | Assessment |
|--------|------------|
| **Feasibility** | ✅ Migration is feasible with moderate effort |
| **Effort** | 3-5 weeks for full migration |
| **Cost Savings** | Significant at scale (>$100/mo Google costs) |
| **Risk** | Medium - Places Autocomplete is hardest to replace |
| **Recommendation** | Wait until Google costs justify migration |

### Key Advantages
- No per-request API fees
- Full data ownership
- No vendor lock-in
- Better long-term cost predictability

### Key Challenges
- Places Autocomplete replacement requires custom development
- Multiple services to integrate vs. single Google API
- Documentation fragmented across projects
- Initial setup complexity higher
