/**
 * Constants and configuration for ConstructionMap component
 */

// Map styles for light and dark modes
export const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const;

// Default map center (HCMC)
export const DEFAULT_CENTER: [number, number] = [106.6297, 10.8231];
export const DEFAULT_ZOOM = 11;

// User location zoom level
export const USER_LOCATION_ZOOM = 13;

// Major cities in Vietnam for location fallback
export const VIETNAM_CITIES = {
  'ho-chi-minh': {
    name: 'Hồ Chí Minh',
    coordinates: [106.6297, 10.8231] as [number, number],
  },
  'ha-noi': {
    name: 'Hà Nội',
    coordinates: [105.8342, 21.0278] as [number, number],
  },
  'da-nang': {
    name: 'Đà Nẵng',
    coordinates: [108.2022, 16.0544] as [number, number],
  },
} as const;

export type CityId = keyof typeof VIETNAM_CITIES;

// Status colors for construction markers
export const STATUS_COLORS: Record<string, string> = {
  'planned': '#9CA3AF',      // gray
  'in-progress': '#F59E0B',  // amber
  'completed': '#10B981',    // green
  'paused': '#EF4444',       // red
  'cancelled': '#6B7280',    // dark gray
};

// Category colors for public vs private constructions
export const CATEGORY_COLORS: Record<string, string> = {
  'public': '#2563EB',       // blue - government/infrastructure
  'private': '#9333EA',      // purple - commercial/real estate
};

// Vietnamese labels for construction categories
export const CATEGORY_LABELS: Record<string, string> = {
  'public': 'Hạ tầng công cộng',
  'private': 'Dự án tư nhân',
};

// Short Vietnamese labels for categories
export const CATEGORY_LABELS_SHORT: Record<string, string> = {
  'public': 'Công cộng',
  'private': 'Tư nhân',
};

// Private construction type colors (for differentiation within private category)
export const PRIVATE_TYPE_COLORS: Record<string, string> = {
  'residential': '#EC4899',    // pink - housing
  'commercial': '#F97316',     // orange - commerce
  'office': '#3B82F6',         // blue - office
  'mixed_use': '#8B5CF6',      // violet - mixed
  'industrial': '#78716C',     // stone - industrial
  'hospitality': '#14B8A6',    // teal - hotels
  'retail': '#EAB308',         // yellow - retail
  'healthcare': '#EF4444',     // red - medical
  'educational': '#22C55E',    // green - schools
  'other': '#6B7280',          // gray - other
};

// Vietnamese labels for private construction types
export const PRIVATE_TYPE_LABELS: Record<string, string> = {
  'residential': 'Nhà ở',
  'commercial': 'Thương mại',
  'office': 'Văn phòng',
  'mixed_use': 'Đa chức năng',
  'industrial': 'Công nghiệp',
  'hospitality': 'Khách sạn',
  'retail': 'Bán lẻ',
  'healthcare': 'Y tế',
  'educational': 'Giáo dục',
  'other': 'Khác',
};

// Construction type colors
export const TYPE_COLORS: Record<string, string> = {
  'highway': '#DC2626',      // red - major infrastructure
  'metro': '#7C3AED',        // purple - transit
  'bridge': '#EA580C',       // orange - major structure
  'tunnel': '#0D9488',       // teal - underground
  'interchange': '#DB2777',  // pink - complex junction
  'road': '#2563EB',         // blue - standard road
  'station': '#8B5CF6',      // violet - transit station
  'other': '#6B7280',        // gray - misc
};

// Construction type line thickness (base values, will be scaled)
export const TYPE_THICKNESS: Record<string, number> = {
  'highway': 8,
  'metro': 6,
  'bridge': 6,
  'tunnel': 5,
  'interchange': 7,
  'road': 4,
  'station': 5,
  'other': 3,
};

// Construction type point radius (base values, will be scaled)
export const TYPE_RADIUS: Record<string, number> = {
  'highway': 10,
  'metro': 9,
  'bridge': 9,
  'tunnel': 8,
  'interchange': 10,
  'road': 7,
  'station': 8,
  'other': 6,
};

// Major construction types (shown at low zoom levels)
export const MAJOR_TYPES = ['highway', 'metro', 'bridge', 'interchange'] as const;

// Vietnamese labels for construction types
export const TYPE_LABELS: Record<string, string> = {
  'highway': 'Cao tốc',
  'metro': 'Metro',
  'bridge': 'Cầu',
  'tunnel': 'Hầm',
  'interchange': 'Nút giao',
  'road': 'Đường',
  'station': 'Trạm',
  'other': 'Khác',
};

// Construction type icon names (for loading SVG icons into Mapbox)
export const TYPE_ICON_NAMES: Record<string, string> = {
  'highway': 'icon-highway',
  'metro': 'icon-metro',
  'bridge': 'icon-bridge',
  'tunnel': 'icon-tunnel',
  'interchange': 'icon-interchange',
  'road': 'icon-road',
  'station': 'icon-station',
  'other': 'icon-other',
};

// Short labels for construction type badges on map
export const TYPE_SHORT_LABELS: Record<string, string> = {
  'highway': 'CT',
  'metro': 'M',
  'bridge': 'C',
  'tunnel': 'H',
  'interchange': 'NG',
  'road': 'Đ',
  'station': 'T',
  'other': 'K',
};

// Vietnamese labels for construction statuses
export const STATUS_LABELS: Record<string, string> = {
  'planned': 'Đã lên kế hoạch',
  'in-progress': 'Đang thi công',
  'completed': 'Hoàn thành',
  'paused': 'Tạm dừng',
  'cancelled': 'Đã hủy',
};

// Short Vietnamese labels for legend
export const STATUS_LABELS_SHORT: Record<string, string> = {
  'planned': 'Kế hoạch',
  'in-progress': 'Thi công',
  'completed': 'Xong',
  'paused': 'Dừng',
  'cancelled': 'Hủy',
};

// Layer IDs
export const LAYER_IDS = {
  POINTS: 'construction-points',
  POINTS_PULSE: 'construction-points-pulse',
  LINES: 'construction-lines',
  LINES_PULSE: 'construction-lines-pulse',
  LINES_ICONS: 'construction-lines-icons',
  LINES_LABELS: 'construction-lines-labels',
  POLYGONS: 'construction-polygons',
  POLYGONS_PULSE: 'construction-polygons-pulse',
  POLYGON_OUTLINES: 'construction-polygon-outlines',
  CLUSTERS: 'clusters',
  CLUSTER_COUNT: 'cluster-count',
  ROUTE: 'route-line',
  ROUTE_OUTLINE: 'route-line-outline',
  ROUTE_ALERTS: 'route-alerts',
  ROUTE_ALERTS_PULSE: 'route-alerts-pulse',
} as const;

// Source IDs
export const SOURCE_IDS = {
  POINTS: 'construction-points-source',
  LINES: 'construction-lines-source',
  POLYGONS: 'construction-polygons-source',
  ROUTE: 'route-source',
  ROUTE_ALERTS: 'route-alerts-source',
} as const;

// Interactive layer IDs for mouse events
export const INTERACTIVE_LAYERS = [
  LAYER_IDS.POINTS,
  LAYER_IDS.POLYGONS,
  LAYER_IDS.LINES,
] as const;

// Cluster configuration
export const CLUSTER_CONFIG = {
  maxZoom: 14,
  radius: 50,
} as const;

// Zoom level thresholds
export const ZOOM_LEVELS = {
  SHOW_ALL: 12,      // Show all construction types at this zoom level and above
  MIN_SCALE: 8,      // Minimum zoom level for scaling
  MAX_SCALE: 16,     // Maximum zoom level for scaling
} as const;

// Scale factors for different zoom levels
export const SCALE_FACTORS = {
  MIN: 0.3,          // Scale factor at minimum zoom
  NORMAL: 1.0,       // Scale factor at normal zoom (12)
  MAX: 1.5,          // Scale factor at maximum zoom
  RADIUS_MIN: 0.5,   // Radius scale factor at minimum zoom
  RADIUS_MAX: 1.3,   // Radius scale factor at maximum zoom
} as const;

// Pulsing animation configuration
export const PULSE_CONFIG = {
  DURATION: 1500,    // Animation duration in ms
  SCALE_MAX: 1.3,    // Maximum scale during pulse
  OPACITY_MIN: 0.4,  // Minimum opacity during pulse
  OPACITY_MAX: 0.8,  // Maximum opacity during pulse
} as const;

// Saved places layer configuration
export const SAVED_PLACES_LAYER_IDS = {
  POINTS: 'saved-places-points',
  LABELS: 'saved-places-labels',
} as const;

export const SAVED_PLACES_SOURCE_ID = 'saved-places-source';

// Rose/Pink color to clearly distinguish from construction markers
export const SAVED_PLACES_MARKER_COLOR = '#E11D48';
export const SAVED_PLACES_MARKER_SIZE = 12;
export const SAVED_PLACES_MARKER_STROKE_COLOR = '#FFFFFF';
export const SAVED_PLACES_MARKER_STROKE_WIDTH = 2;
