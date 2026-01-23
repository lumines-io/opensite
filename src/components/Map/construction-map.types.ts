/**
 * Type definitions for ConstructionMap component
 */

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
  // Detail marker properties (for metro stations, freeway exits)
  isDetailMarker?: boolean;
  parentId?: string | number;
  parentTitle?: string;
  stationOrder?: number;
  openedAt?: string;
  exitOrder?: number;
  exitType?: string;
  connectedRoads?: string;
}

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

export interface ConstructionMapProps {
  accessToken: string;
  onSelectConstruction?: (id: string) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  route?: GeoJSON.LineString | null;
  routeAlerts?: ConstructionAlert[];
}

export type Coordinates = [number, number];

export interface MapBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}
