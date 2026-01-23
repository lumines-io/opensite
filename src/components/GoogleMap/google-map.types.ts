/**
 * Type definitions for Google Maps components
 */

// Google Maps LatLng format
export interface LatLng {
  lat: number;
  lng: number;
}

// Source collection type
export type SourceCollection = 'constructions' | 'developments';

// Point types for detail markers (infrastructure)
export type DetailPointType =
  | 'station'
  | 'depot'
  | 'transfer'
  | 'exit'
  | 'interchange'
  | 'toll'
  | 'rest_area'
  | 'bridge_section'
  | 'tunnel_portal'
  | 'milestone'
  | 'other';

// Infrastructure construction types
export type ConstructionType =
  | 'road'
  | 'highway'
  | 'metro'
  | 'bridge'
  | 'tunnel'
  | 'interchange'
  | 'station'
  | 'metro_station'
  | 'freeway_exit'
  | 'other';

// Development types (private/commercial projects)
export type DevelopmentType =
  | 'apartment_complex'
  | 'condominium'
  | 'villa_project'
  | 'townhouse_project'
  | 'resort'
  | 'hotel'
  | 'serviced_apartment'
  | 'commercial_center'
  | 'shopping_mall'
  | 'office_building'
  | 'industrial_park'
  | 'mixed_use'
  | 'township'
  | 'healthcare'
  | 'educational'
  | 'other';

// Development status
export type DevelopmentStatus =
  | 'upcoming'
  | 'pre_launch'
  | 'selling'
  | 'limited'
  | 'sold_out'
  | 'under_construction'
  | 'completed';

// Base properties shared by both constructions and developments
interface BaseMapFeature {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string;
  sourceCollection: SourceCollection;
}

// Construction data from API (infrastructure projects)
export interface Construction extends BaseMapFeature {
  sourceCollection: 'constructions';
  constructionStatus: string;
  progress: number;
  constructionType: ConstructionType | string;
  startDate?: string;
  expectedEndDate?: string;
  // Detail marker properties (generic for all point types)
  isDetailMarker?: boolean;
  parentId?: string | number;
  parentTitle?: string;
  pointType?: DetailPointType;
  pointOrder?: number;
  pointDescription?: string;
  openedAt?: string;
  // Legacy properties (for backward compatibility)
  stationOrder?: number;
  exitOrder?: number;
  exitType?: string;
  connectedRoads?: string;
}

// Development data from API (private/commercial projects)
export interface Development extends BaseMapFeature {
  sourceCollection: 'developments';
  developmentStatus: DevelopmentStatus | string;
  developmentType: DevelopmentType | string;
  organizationName?: string;
  headline?: string;
  priceDisplay?: string;
  // Display options
  featured?: boolean;
  priority?: number;
  showSponsoredBadge?: boolean;
  useCustomMarker?: boolean;
  markerColor?: string;
  // Timeline
  launchDate?: string;
  expectedCompletion?: string;
}

// Union type for map features (either construction or development)
export type MapFeature = Construction | Development;

// Type guard to check if a feature is a construction
export function isConstruction(feature: MapFeature): feature is Construction {
  return feature.sourceCollection === 'constructions';
}

// Type guard to check if a feature is a development
export function isDevelopment(feature: MapFeature): feature is Development {
  return feature.sourceCollection === 'developments';
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

// Feature with map data
export interface ConstructionFeature {
  id: string;
  geometry: GeoJSON.Geometry;
  properties: MapFeature;
  center: LatLng;
}

// Visibility filters
export interface VisibilityFilters {
  visibleTypes: Set<string>;
  visibleStatuses: Set<string>;
  visibleCategories: Set<string>;
  visibleDevelopmentTypes?: Set<string>;
}
