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
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
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
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#181818' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1b1b1b' }],
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

// Google Maps light mode style (default/empty)
export const GOOGLE_MAP_LIGHT_STYLE: MapTypeStyle[] = [];

// Status colors for construction markers
export const STATUS_COLORS: Record<string, string> = {
  'planned': '#9CA3AF', // gray
  'in-progress': '#F59E0B', // amber
  'completed': '#10B981', // green
  'paused': '#EF4444', // red
  'cancelled': '#6B7280', // dark gray
};

// Category colors for public vs private constructions
export const CATEGORY_COLORS: Record<string, string> = {
  'public': '#2563EB', // blue - government/infrastructure
  'private': '#9333EA', // purple - commercial/real estate
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
  'other': '#6B7280', // gray - misc
};

// Private construction type colors
export const PRIVATE_TYPE_COLORS: Record<string, string> = {
  'residential': '#EC4899', // pink - housing
  'commercial': '#F97316', // orange - commerce
  'office': '#3B82F6', // blue - office
  'mixed_use': '#8B5CF6', // violet - mixed
  'industrial': '#78716C', // stone - industrial
  'hospitality': '#14B8A6', // teal - hotels
  'retail': '#EAB308', // yellow - retail
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

// Vietnamese labels for construction categories
export const CATEGORY_LABELS: Record<string, string> = {
  'public': 'Hạ tầng công cộng',
  'private': 'Dự án tư nhân',
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
} as const;
