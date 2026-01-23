export interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

export interface Construction {
  id: number;
  title: string;
  slug: string;
  constructionStatus: string;
  constructionType: string;
  progress: number;
  distance?: number;
  center?: [number, number];
}

export interface ConstructionAlert {
  id: number;
  title: string;
  slug: string;
  constructionStatus: string;
  constructionType: string;
  progress: number;
  distance: number; // in meters for route alerts
  center?: [number, number];
  startDate?: string;
  expectedEndDate?: string;
}

export interface RouteInfo {
  duration: number; // in seconds
  distance: number; // in meters
  geometry: GeoJSON.LineString;
}

// Full-text search types
export interface SearchFilters {
  query: string;
  type: string;
  status: string;
  district: string;
  startDateFrom: string;
  startDateTo: string;
  endDateFrom: string;
  endDateTo: string;
}

export interface District {
  id: number;
  name: string;
  nameEn?: string;
  code?: string;
}

export interface SearchResultItem {
  id: number;
  title: string;
  slug: string;
  constructionType: string;
  constructionStatus: string;
  progress: number;
  district: District | null;
  startDate: string | null;
  expectedEndDate: string | null;
  center: [number, number] | null;
  excerpt: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: SearchFilters;
}

export interface FilterOption {
  value: string;
  label: string;
}
