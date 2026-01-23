// Main map components
export { GoogleConstructionMap } from './GoogleConstructionMap';
export { GoogleMiniMap } from './GoogleMiniMap';
export { GoogleMapSearchPanel } from './GoogleMapSearchPanel';
export { GoogleMapInfoWindow } from './GoogleMapInfoWindow';
export { GoogleMapLegend } from './GoogleMapLegend';
export { GoogleConstructionListModal } from './GoogleConstructionListModal';

// Types
export type {
  LatLng,
  Construction,
  ConstructionAlert,
  GoogleConstructionMapProps,
  GoogleMiniMapProps,
  ConstructionFeature,
  VisibilityFilters,
  MapBounds,
} from './google-map.types';

// Constants
export {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  USER_LOCATION_ZOOM,
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAP_DARK_STYLE,
  GOOGLE_MAP_LIGHT_STYLE,
  TYPE_COLORS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  PRIVATE_TYPE_COLORS,
  TYPE_LABELS,
  STATUS_LABELS,
  CATEGORY_LABELS,
  PRIVATE_TYPE_LABELS,
  VIETNAM_CITIES,
} from './google-map.constants';

// Utilities
export {
  geoJsonToLatLng,
  latLngToGeoJson,
  geoJsonPathToLatLngPath,
  getGeometryCenter,
  featureCollectionToConstructionFeatures,
  getTypeColor,
  getStatusColor,
  getCategoryColor,
  getPrivateTypeColor,
  getTypeLabel,
  getStatusLabel,
  getCategoryLabel,
  getPrivateTypeLabel,
  formatDateVN,
  getMarkerColor,
  createMarkerIcon,
  createPulsingMarkerIcon,
  createStatusMarkerIcon,
  getFeatureStyle,
  featurePassesFilters,
  isInBounds,
  isGeometryInBounds,
  calculateFeaturesBounds,
  routeToGooglePath,
  createAnimatedPolyline,
  createPulsingPolyline,
} from './google-map.utils';

// Style option types for customization
export type {
  MarkerStyleOptions,
  LineStyleOptions,
  PolygonStyleOptions,
} from './google-map.utils';
