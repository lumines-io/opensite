/**
 * Map components and utilities
 */

// Main components
export { ConstructionMap } from './ConstructionMap';
export { MapDrawer } from './MapDrawer';
export type { MapDrawerRef, MapDrawerProps, DrawMode } from './MapDrawer';
export { CoordinateAdjuster } from './CoordinateAdjuster';
export type { CoordinateAdjusterRef, CoordinateAdjusterProps, CoordinatePoint } from './CoordinateAdjuster';

// Supporting components
export { ConstructionPopup, HoverPopup, SelectedPopup } from './ConstructionPopup';
export { MapLegend } from './MapLegend';
export type { MapLegendProps } from './MapLegend';
export { ConstructionListModal, ConstructionListToggle } from './ConstructionListModal';
export { CitySelectionModal } from './CitySelectionModal';
export { MapSearchPanel } from './MapSearchPanel';
export { MapRoutingPanel } from './MapRoutingPanel';

// Hooks
export { useMapLayers, useRouteLayer, useLayerFilters } from './useMapLayers';
export type { VisibilityFilters } from './useMapLayers';
export { useUserLocation } from './useUserLocation';
export type { LocationStatus } from './useUserLocation';

// Types
export type {
  Construction,
  ConstructionAlert,
  ConstructionMapProps,
  Coordinates,
  MapBounds,
} from './construction-map.types';

// Constants
export {
  MAP_STYLES,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  USER_LOCATION_ZOOM,
  VIETNAM_CITIES,
  STATUS_COLORS,
  TYPE_COLORS,
  TYPE_LABELS,
  STATUS_LABELS,
} from './construction-map.constants';
export type { CityId } from './construction-map.constants';

// Utilities
export {
  getTypeLabel,
  getStatusLabel,
  getTypeColor,
  formatDateVN,
} from './construction-map.utils';
