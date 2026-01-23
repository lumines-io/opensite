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

// Google Maps dark mode style
export const GOOGLE_MAP_DARK_STYLE: MapTypeStyle[] = [
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
  // Hide all POI icons and labels
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text',
    stylers: [{ visibility: 'off' }],
  },
  // But show government POIs
  {
    featureType: 'poi.government',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.government',
    elementType: 'labels.text',
    stylers: [{ visibility: 'on' }],
  },
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
  // Hide transit icons (we show our own metro/station data)
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
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

// Google Maps light mode style - hide POIs except government
export const GOOGLE_MAP_LIGHT_STYLE: MapTypeStyle[] = [
  // Hide all POI icons
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  // Hide all POI labels
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  // But show government POIs
  { featureType: 'poi.government', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.government', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  // Hide transit labels (we show our own metro/station data)
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
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
