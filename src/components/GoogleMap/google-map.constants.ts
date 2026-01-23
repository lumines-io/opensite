/**
 * Constants and configuration for Google Maps components
 */

// Google Maps libraries to load
export const GOOGLE_MAPS_LIBRARIES: ('places' | 'drawing' | 'geometry')[] = [
  'places',
  'geometry',
];

// Default map center (HCMC) - Google Maps uses { lat, lng } format
export const DEFAULT_CENTER = { lat: 10.8231, lng: 106.6297 };
export const DEFAULT_ZOOM = 11;

// User location zoom level
export const USER_LOCATION_ZOOM = 13;

// Major cities in Vietnam for location fallback
export const VIETNAM_CITIES = {
  'ho-chi-minh': {
    name: 'Hồ Chí Minh',
    center: { lat: 10.8231, lng: 106.6297 },
  },
  'ha-noi': {
    name: 'Hà Nội',
    center: { lat: 21.0278, lng: 105.8342 },
  },
  'da-nang': {
    name: 'Đà Nẵng',
    center: { lat: 16.0544, lng: 108.2022 },
  },
} as const;

export type CityId = keyof typeof VIETNAM_CITIES;

// Map container styles
export const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

// Google Maps style type (matches google.maps.MapTypeStyle structure)
interface MapTypeStyle {
  elementType?: string;
  featureType?: string;
  stylers: Array<{ [key: string]: string | number }>;
}

/**
 * Google Maps Feature Types Reference
 * Use these constants when creating custom map styles
 *
 * @see https://developers.google.com/maps/documentation/javascript/style-reference
 */
export const MAP_FEATURE_TYPES = {
  // All features
  ALL: 'all',

  // Administrative areas
  ADMINISTRATIVE: 'administrative',
  ADMINISTRATIVE_COUNTRY: 'administrative.country',
  ADMINISTRATIVE_LAND_PARCEL: 'administrative.land_parcel',
  ADMINISTRATIVE_LOCALITY: 'administrative.locality', // Cities
  ADMINISTRATIVE_NEIGHBORHOOD: 'administrative.neighborhood',
  ADMINISTRATIVE_PROVINCE: 'administrative.province', // States/provinces

  // Landscape features
  LANDSCAPE: 'landscape',
  LANDSCAPE_MAN_MADE: 'landscape.man_made', // Buildings, structures
  LANDSCAPE_NATURAL: 'landscape.natural', // Natural features
  LANDSCAPE_NATURAL_LANDCOVER: 'landscape.natural.landcover', // Land cover
  LANDSCAPE_NATURAL_TERRAIN: 'landscape.natural.terrain', // Terrain

  // Points of Interest (POI)
  POI: 'poi',
  POI_ATTRACTION: 'poi.attraction', // Tourist attractions
  POI_BUSINESS: 'poi.business', // Businesses (restaurants, shops, etc.)
  POI_GOVERNMENT: 'poi.government', // Government buildings
  POI_MEDICAL: 'poi.medical', // Hospitals, clinics
  POI_PARK: 'poi.park', // Parks and recreation
  POI_PLACE_OF_WORSHIP: 'poi.place_of_worship', // Churches, temples, mosques
  POI_SCHOOL: 'poi.school', // Schools and universities
  POI_SPORTS_COMPLEX: 'poi.sports_complex', // Sports facilities

  // Roads
  ROAD: 'road',
  ROAD_ARTERIAL: 'road.arterial', // Arterial roads
  ROAD_HIGHWAY: 'road.highway', // Highways
  ROAD_HIGHWAY_CONTROLLED_ACCESS: 'road.highway.controlled_access', // Freeways
  ROAD_LOCAL: 'road.local', // Local roads

  // Transit
  TRANSIT: 'transit',
  TRANSIT_LINE: 'transit.line', // Transit lines (bus, rail)
  TRANSIT_STATION: 'transit.station', // Transit stations
  TRANSIT_STATION_AIRPORT: 'transit.station.airport', // Airports
  TRANSIT_STATION_BUS: 'transit.station.bus', // Bus stations
  TRANSIT_STATION_RAIL: 'transit.station.rail', // Rail stations

  // Water
  WATER: 'water',
} as const;

/**
 * Google Maps Element Types Reference
 * Use these constants when targeting specific parts of features
 */
export const MAP_ELEMENT_TYPES = {
  // All elements
  ALL: 'all',

  // Geometry elements
  GEOMETRY: 'geometry',
  GEOMETRY_FILL: 'geometry.fill', // Fill color
  GEOMETRY_STROKE: 'geometry.stroke', // Stroke/outline color

  // Label elements
  LABELS: 'labels',
  LABELS_ICON: 'labels.icon', // Icons/markers
  LABELS_TEXT: 'labels.text', // All text
  LABELS_TEXT_FILL: 'labels.text.fill', // Text fill color
  LABELS_TEXT_STROKE: 'labels.text.stroke', // Text outline/halo
} as const;

/**
 * Google Maps Styler Properties Reference
 * Use these when creating stylers for map styles
 */
export const MAP_STYLER_PROPERTIES = {
  // Visibility
  VISIBILITY: 'visibility', // 'on', 'off', 'simplified'

  // Colors
  COLOR: 'color', // Hex color (e.g., '#FF0000')
  HUE: 'hue', // Hex color for hue shift

  // Adjustments
  LIGHTNESS: 'lightness', // -100 to 100
  SATURATION: 'saturation', // -100 to 100
  GAMMA: 'gamma', // 0.01 to 10.0
  WEIGHT: 'weight', // Stroke weight in pixels

  // Inversion
  INVERT_LIGHTNESS: 'invert_lightness', // true/false
} as const;

/**
 * Common visibility values
 */
export const MAP_VISIBILITY = {
  ON: 'on',
  OFF: 'off',
  SIMPLIFIED: 'simplified',
} as const;

// Type exports for TypeScript
export type MapFeatureType = typeof MAP_FEATURE_TYPES[keyof typeof MAP_FEATURE_TYPES];
export type MapElementType = typeof MAP_ELEMENT_TYPES[keyof typeof MAP_ELEMENT_TYPES];
export type MapStylerProperty = typeof MAP_STYLER_PROPERTIES[keyof typeof MAP_STYLER_PROPERTIES];
export type MapVisibility = typeof MAP_VISIBILITY[keyof typeof MAP_VISIBILITY];

/**
 * Helper function to create a map style entry
 *
 * Usage:
 *   mapStyle(F.POI_BUSINESS, E.LABELS_ICON, { visibility: 'off' })
 *   mapStyle(F.ROAD_HIGHWAY, E.GEOMETRY, { color: '#ff0000' })
 */
export function mapStyle(
  featureType: MapFeatureType,
  elementType: MapElementType | null,
  stylers: Record<string, string | number>
): MapTypeStyle {
  const style: MapTypeStyle = {
    featureType,
    stylers: [stylers],
  };
  if (elementType) {
    style.elementType = elementType;
  }
  return style;
}

// Shorthand aliases for cleaner syntax
export const F = MAP_FEATURE_TYPES;
export const E = MAP_ELEMENT_TYPES;

// Common map styles for feature visibility (shared between light and dark)
// Reference: MAP_FEATURE_TYPES for all available feature types
export const GOOGLE_MAP_COMMON_STYLE: MapTypeStyle[] = [
  // ===================
  // ADMINISTRATIVE
  // ===================
  // administrative - shown (country borders, region names)
  // administrative.country - shown
  // administrative.land_parcel - hidden (too detailed)
  { featureType: F.ADMINISTRATIVE_LAND_PARCEL, elementType: E.ALL, stylers: [{ visibility: 'off' }] },
  // administrative.locality - shown (city names)
  // administrative.neighborhood - shown
  // administrative.province - shown

  // ===================
  // LANDSCAPE
  // ===================
  // landscape - shown (default styling)
  // landscape.man_made - shown
  // landscape.natural - shown
  // landscape.natural.landcover - shown
  // landscape.natural.terrain - shown

  // ===================
  // POI (Points of Interest)
  // ===================
  // Hide all POI by default
  { featureType: F.POI, elementType: E.LABELS_ICON, stylers: [{ visibility: 'off' }] },
  { featureType: F.POI, elementType: E.LABELS_TEXT, stylers: [{ visibility: 'off' }] },
  // poi.attraction - hidden (covered by POI rule above)
  // poi.business - hidden (covered by POI rule above)
  // poi.government - show (important for context)
  { featureType: F.POI_GOVERNMENT, elementType: E.LABELS_ICON, stylers: [{ visibility: 'on' }] },
  { featureType: F.POI_GOVERNMENT, elementType: E.LABELS_TEXT, stylers: [{ visibility: 'on' }] },
  // poi.medical - hidden (covered by POI rule above)
  // poi.park - hidden labels but geometry shown (covered by POI rule above)
  // poi.place_of_worship - hidden (covered by POI rule above)
  // poi.school - hidden (covered by POI rule above)
  // poi.sports_complex - hidden (covered by POI rule above)

  // ===================
  // ROAD
  // ===================
  // road - shown (essential for navigation)
  // road.arterial - shown
  // road.highway - shown
  // road.highway.controlled_access - shown
  // road.local - shown

  // ===================
  // TRANSIT
  // ===================
  // Hide transit icons (we show our own metro/station data)
  { featureType: F.TRANSIT, elementType: E.LABELS_ICON, stylers: [{ visibility: 'off' }] },
  // transit.line - geometry shown, icons hidden
  // transit.station - hidden icons (we render our own)
  // transit.station.airport - hidden icons
  // transit.station.bus - hidden icons
  // transit.station.rail - hidden icons

  // ===================
  // WATER
  // ===================
  // water - shown (essential for geography)
];

// Google Maps dark mode style
export const GOOGLE_MAP_DARK_STYLE: MapTypeStyle[] = [
  ...GOOGLE_MAP_COMMON_STYLE,
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  // Dark mode specific: government label color
  {
    featureType: 'poi.government',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  // Keep park geometry visible (but no labels)
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#181818' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a8a' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#373737' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c3c3c' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#4e4e4e' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3d3d3d' }],
  },
];

// Google Maps light mode style
export const GOOGLE_MAP_LIGHT_STYLE: MapTypeStyle[] = [
  ...GOOGLE_MAP_COMMON_STYLE,
];

// Status colors for construction markers
export const STATUS_COLORS: Record<string, string> = {
  'planned': '#9CA3AF', // gray
  'in-progress': '#F59E0B', // amber
  'completed': '#10B981', // green
  'paused': '#EF4444', // red
  'cancelled': '#6B7280', // dark gray
};

// Source collection colors
export const SOURCE_COLLECTION_COLORS: Record<string, string> = {
  'constructions': '#2563EB', // blue - infrastructure
  'developments': '#9333EA', // purple - commercial/real estate
};

// Source collection labels
export const SOURCE_COLLECTION_LABELS: Record<string, string> = {
  'constructions': 'Hạ tầng',
  'developments': 'Bất động sản',
};

// Construction type colors
export const TYPE_COLORS: Record<string, string> = {
  'highway': '#DC2626', // red - major infrastructure
  'metro': '#7C3AED', // purple - transit
  'bridge': '#EA580C', // orange - major structure
  'tunnel': '#0D9488', // teal - underground
  'interchange': '#DB2777', // pink - complex junction
  'road': '#2563EB', // blue - standard road
  'station': '#8B5CF6', // violet - transit station
  'metro_station': '#A855F7', // purple-500 - metro station markers
  'freeway_exit': '#EF4444', // red-500 - freeway exit markers
  'other': '#6B7280', // gray - misc
};

// Development type colors
export const DEVELOPMENT_TYPE_COLORS: Record<string, string> = {
  // Residential
  'apartment_complex': '#EC4899', // pink - apartments
  'condominium': '#F472B6', // light pink - condos
  'villa_project': '#BE185D', // dark pink - villas
  'townhouse_project': '#DB2777', // rose - townhouses
  // Hospitality
  'resort': '#14B8A6', // teal - resorts
  'hotel': '#0D9488', // dark teal - hotels
  'serviced_apartment': '#2DD4BF', // light teal - serviced
  // Commercial
  'commercial_center': '#F97316', // orange - commercial
  'shopping_mall': '#FB923C', // light orange - malls
  'office_building': '#3B82F6', // blue - office
  'industrial_park': '#78716C', // stone - industrial
  // Mixed & Other
  'mixed_use': '#8B5CF6', // violet - mixed
  'township': '#A855F7', // purple - township
  'healthcare': '#EF4444', // red - medical
  'educational': '#22C55E', // green - schools
  'other': '#6B7280', // gray - other
};

// Vietnamese labels for construction types
export const TYPE_LABELS: Record<string, string> = {
  'highway': 'Cao tốc',
  'metro': 'Metro',
  'bridge': 'Cầu',
  'tunnel': 'Hầm',
  'interchange': 'Nút giao',
  'road': 'Đường',
  'station': 'Trạm',
  'metro_station': 'Ga Metro',
  'freeway_exit': 'Nút ra/vào',
  'other': 'Khác',
};

// Vietnamese labels for construction statuses
export const STATUS_LABELS: Record<string, string> = {
  'planned': 'Đã lên kế hoạch',
  'in-progress': 'Đang thi công',
  'completed': 'Hoàn thành',
  'paused': 'Tạm dừng',
  'cancelled': 'Đã hủy',
};

// Vietnamese labels for development types
export const DEVELOPMENT_TYPE_LABELS: Record<string, string> = {
  // Residential
  'apartment_complex': 'Chung cư',
  'condominium': 'Căn hộ cao cấp',
  'villa_project': 'Biệt thự',
  'townhouse_project': 'Nhà phố',
  // Hospitality
  'resort': 'Resort',
  'hotel': 'Khách sạn',
  'serviced_apartment': 'Căn hộ dịch vụ',
  // Commercial
  'commercial_center': 'Trung tâm thương mại',
  'shopping_mall': 'TTTM',
  'office_building': 'Tòa văn phòng',
  'industrial_park': 'Khu công nghiệp',
  // Mixed & Other
  'mixed_use': 'Tổ hợp đa năng',
  'township': 'Khu đô thị',
  'healthcare': 'Bệnh viện',
  'educational': 'Trường học',
  'other': 'Khác',
};

// Vietnamese labels for development status
export const DEVELOPMENT_STATUS_LABELS: Record<string, string> = {
  'upcoming': 'Sắp ra mắt',
  'pre_launch': 'Sắp mở bán',
  'selling': 'Đang bán',
  'limited': 'Còn ít căn',
  'sold_out': 'Đã bán hết',
  'under_construction': 'Đang xây dựng',
  'completed': 'Đã hoàn thành',
};

// Development status colors
export const DEVELOPMENT_STATUS_COLORS: Record<string, string> = {
  'upcoming': '#9CA3AF', // gray
  'pre_launch': '#F59E0B', // amber
  'selling': '#10B981', // green - available
  'limited': '#EF4444', // red - urgency
  'sold_out': '#6B7280', // dark gray
  'under_construction': '#3B82F6', // blue
  'completed': '#22C55E', // green
};

// Vietnamese labels for detail point types
export const POINT_TYPE_LABELS: Record<string, string> = {
  'station': 'Ga',
  'depot': 'Depot',
  'transfer': 'Điểm chuyển tuyến',
  'exit': 'Nút ra/vào',
  'interchange': 'Nút giao',
  'toll': 'Trạm thu phí',
  'rest_area': 'Trạm dừng nghỉ',
  'bridge_section': 'Đoạn cầu',
  'tunnel_portal': 'Cửa hầm',
  'milestone': 'Mốc',
  'other': 'Khác',
};

// Short Vietnamese labels for legend
export const STATUS_LABELS_SHORT: Record<string, string> = {
  'planned': 'Kế hoạch',
  'in-progress': 'Thi công',
  'completed': 'Xong',
  'paused': 'Dừng',
  'cancelled': 'Hủy',
};

// Map options (typed as any to avoid google.maps reference at module load)
export const DEFAULT_MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
} as const;

// InfoWindow pixel offset values (used to create google.maps.Size at runtime)
export const INFO_WINDOW_PIXEL_OFFSET = { x: 0, y: -30 };

// Marker clusterer options
export const CLUSTER_OPTIONS = {
  maxZoom: 14,
  gridSize: 50,
} as const;

// Zoom level thresholds
export const ZOOM_LEVELS = {
  SHOW_ALL: 12,
  MIN_SCALE: 8,
  MAX_SCALE: 16,
  SHOW_DETAIL_MARKERS: 13, // Show detail markers (metro stations, freeway exits) at this zoom and above
} as const;
