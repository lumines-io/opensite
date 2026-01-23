/**
 * Type definitions for Google Maps components
 */

// Google Maps LatLng format
export interface LatLng {
  lat: number;
  lng: number;
}

// Construction data from API
export interface Construction {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string;
  constructionStatus: string;
  progress: number;
  constructionType: string;
  constructionCategory?: 'public' | 'private';
  privateType?: string;
  organizationName?: string;
  startDate?: string;
  expectedEndDate?: string;
}

// Construction alert for routes
export interface ConstructionAlert {
  id: number;
  title: string;
  slug: string;
  constructionStatus: string;
  constructionType: string;
  progress: number;
  distance: number;
  center?: [number, number];
  startDate?: string;
  expectedEndDate?: string;
}

// Props for GoogleConstructionMap
export interface GoogleConstructionMapProps {
  apiKey: string;
  onSelectConstruction?: (id: string) => void;
  initialCenter?: LatLng;
  initialZoom?: number;
  route?: GeoJSON.LineString | null;
  routeAlerts?: ConstructionAlert[];
}

// Props for GoogleMiniMap
export interface GoogleMiniMapProps {
  apiKey: string;
  center: LatLng;
  zoom?: number;
  markerTitle?: string;
}

// Map bounds
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Feature with construction data
export interface ConstructionFeature {
  id: string;
  geometry: GeoJSON.Geometry;
  properties: Construction;
  center: LatLng;
}

// Visibility filters
export interface VisibilityFilters {
  visibleTypes: Set<string>;
  visibleStatuses: Set<string>;
  visibleCategories: Set<string>;
}
