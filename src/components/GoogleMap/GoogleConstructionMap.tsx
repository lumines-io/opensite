'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { List } from 'lucide-react';

import { useTheme } from '../ThemeProvider';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  USER_LOCATION_ZOOM,
  MAP_CONTAINER_STYLE,
  GOOGLE_MAP_DARK_STYLE,
  GOOGLE_MAP_LIGHT_STYLE,
  DEFAULT_MAP_OPTIONS,
  GOOGLE_MAPS_LIBRARIES,
  TYPE_COLORS,
  STATUS_COLORS,
  SOURCE_COLLECTION_COLORS,
  DEVELOPMENT_TYPE_COLORS,
} from './google-map.constants';
import type {
  GoogleConstructionMapProps,
  Construction,
  Development,
  MapFeature,
  ConstructionFeature,
  LatLng,
  VisibilityFilters,
} from './google-map.types';
import { isConstruction, isDevelopment } from './google-map.types';
import {
  featureCollectionToConstructionFeatures,
  getFeatureStyle,
  featurePassesFilters,
  isGeometryInBounds,
  geoJsonPathToLatLngPath,
  createMarkerIcon,
  createAnimatedPolylinesForFeatures,
} from './google-map.utils';
import { GoogleMapInfoWindow } from './GoogleMapInfoWindow';
import { GoogleMapLegend } from './GoogleMapLegend';
import { GoogleConstructionListModal } from './GoogleConstructionListModal';
import { CitySelectionModal } from '../Map/CitySelectionModal';
import { useUserLocation } from '../Map/useUserLocation';

// Re-export types
export type { Construction, ConstructionAlert } from './google-map.types';

// Debounce delay for viewport changes
const VIEWPORT_UPDATE_DELAY = 300;

/**
 * GoogleConstructionMap - Interactive Google Maps showing construction projects
 *
 * Features:
 * - Type-based coloring with pulsing animation for in-progress
 * - Filter by type, status, and category via legend toggles
 * - List modal showing constructions in current viewport
 * - InfoWindow popup on hover/click
 * - Route overlay support
 * - Dark/light theme support
 */
export function GoogleConstructionMap({
  apiKey,
  onSelectConstruction,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  route = null,
  routeAlerts = [],
}: GoogleConstructionMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const alertMarkersRef = useRef<google.maps.Marker[]>([]);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFlownToUserLocation = useRef(false);
  const animatedPolylinesCleanupRef = useRef<(() => void) | null>(null);

  const { theme } = useTheme();

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // User location detection with city fallback
  const {
    status: locationStatus,
    coordinates: userCoordinates,
    showCitySelector,
    handleCitySelect,
  } = useUserLocation();

  // Map state
  const [features, setFeatures] = useState<ConstructionFeature[]>([]);
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null);

  // Popup state
  const [activeFeature, setActiveFeature] = useState<MapFeature | null>(null);
  const [popupPosition, setPopupPosition] = useState<LatLng | null>(null);

  // Filter state
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(
    () => new Set(Object.keys(TYPE_COLORS))
  );
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(
    () => new Set(Object.keys(STATUS_COLORS))
  );
  const [visibleSourceCollections, setVisibleSourceCollections] = useState<Set<string>>(
    () => new Set(Object.keys(SOURCE_COLLECTION_COLORS))
  );
  const [visibleDevelopmentTypes, setVisibleDevelopmentTypes] = useState<Set<string>>(
    () => new Set(Object.keys(DEVELOPMENT_TYPE_COLORS))
  );

  // Modal state
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState<MapFeature[]>([]);

  // Zoom state (for detail marker visibility)
  const [currentZoom, setCurrentZoom] = useState(initialZoom);

  // Memoized filters
  const filters: VisibilityFilters = useMemo(
    () => ({
      visibleTypes,
      visibleStatuses,
      visibleCategories: visibleSourceCollections,
      visibleDevelopmentTypes,
    }),
    [visibleTypes, visibleStatuses, visibleSourceCollections, visibleDevelopmentTypes]
  );

  // Fetch construction data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/map/constructions');
        if (response.ok) {
          const data = await response.json();
          setGeojsonData(data);
          setFeatures(featureCollectionToConstructionFeatures(data));
        }
      } catch (error) {
        console.error('Failed to fetch constructions:', error);
        setGeojsonData({ type: 'FeatureCollection', features: [] });
        setFeatures([]);
      }
    }
    fetchData();
  }, []);

  // Apply theme styles to map
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({
        styles: theme === 'dark' ? GOOGLE_MAP_DARK_STYLE : GOOGLE_MAP_LIGHT_STYLE,
      });
    }
  }, [theme]);

  // Add/update Data Layer with GeoJSON
  useEffect(() => {
    if (!mapRef.current || !geojsonData) return;

    const map = mapRef.current;

    // Remove existing data layer
    if (dataLayerRef.current) {
      dataLayerRef.current.setMap(null);
    }

    // Create new data layer
    const dataLayer = new google.maps.Data({ map });
    dataLayerRef.current = dataLayer;

    // Add GeoJSON features
    dataLayer.addGeoJson(geojsonData);

    // Apply styling based on filters and zoom level
    dataLayer.setStyle((feature) => {
      const sourceCollection = feature.getProperty('sourceCollection') as string;

      // Check source collection filter first
      if (!visibleSourceCollections.has(sourceCollection)) {
        return { visible: false };
      }

      if (sourceCollection === 'constructions') {
        // Construction filtering
        const type = feature.getProperty('constructionType') as string;
        const status = feature.getProperty('constructionStatus') as string;
        const isDetailMarker = feature.getProperty('isDetailMarker') as boolean;

        // Hide detail markers (metro_station, freeway_exit) if their parent type is filtered out
        if (isDetailMarker) {
          // Metro stations should follow metro filter, freeway exits should follow highway filter
          const parentType = type === 'metro_station' ? 'metro' : type === 'freeway_exit' ? 'highway' : type;
          if (!visibleTypes.has(parentType)) {
            return { visible: false };
          }
        } else {
          // Hide if not in type filters
          if (!visibleTypes.has(type)) {
            return { visible: false };
          }
        }

        // Hide if not in status filters
        if (!visibleStatuses.has(status)) {
          return { visible: false };
        }
      } else if (sourceCollection === 'developments') {
        // Development filtering
        const developmentType = feature.getProperty('developmentType') as string;

        // Hide if not in development type filters
        if (!visibleDevelopmentTypes.has(developmentType)) {
          return { visible: false };
        }
      }

      // Pass current zoom to getFeatureStyle for detail marker zoom-based visibility
      return getFeatureStyle(feature, currentZoom);
    });

    // Helper to extract feature properties
    const extractFeatureProps = (feature: google.maps.Data.Feature): MapFeature => {
      const sourceCollection = feature.getProperty('sourceCollection') as 'constructions' | 'developments';

      if (sourceCollection === 'developments') {
        return {
          id: feature.getProperty('id') as string,
          slug: feature.getProperty('slug') as string,
          title: feature.getProperty('title') as string,
          excerpt: feature.getProperty('excerpt') as string,
          sourceCollection: 'developments',
          developmentStatus: feature.getProperty('developmentStatus') as string,
          developmentType: feature.getProperty('developmentType') as string,
          organizationName: feature.getProperty('organizationName') as string,
          headline: feature.getProperty('headline') as string,
          priceDisplay: feature.getProperty('priceDisplay') as string,
          featured: feature.getProperty('featured') as boolean,
          priority: feature.getProperty('priority') as number,
          showSponsoredBadge: feature.getProperty('showSponsoredBadge') as boolean,
          useCustomMarker: feature.getProperty('useCustomMarker') as boolean,
          markerColor: feature.getProperty('markerColor') as string,
          launchDate: feature.getProperty('launchDate') as string,
          expectedCompletion: feature.getProperty('expectedCompletion') as string,
        } as Development;
      }

      return {
        id: feature.getProperty('id') as string,
        slug: feature.getProperty('slug') as string,
        title: feature.getProperty('title') as string,
        excerpt: feature.getProperty('excerpt') as string,
        sourceCollection: 'constructions',
        constructionStatus: feature.getProperty('constructionStatus') as string,
        progress: feature.getProperty('progress') as number,
        constructionType: feature.getProperty('constructionType') as string,
        startDate: feature.getProperty('startDate') as string,
        expectedEndDate: feature.getProperty('expectedEndDate') as string,
        // Detail marker properties (generic)
        isDetailMarker: feature.getProperty('isDetailMarker') as boolean,
        parentId: feature.getProperty('parentId') as string | number,
        parentTitle: feature.getProperty('parentTitle') as string,
        pointType: feature.getProperty('pointType') as string,
        pointOrder: feature.getProperty('pointOrder') as number,
        pointDescription: feature.getProperty('pointDescription') as string,
        openedAt: feature.getProperty('openedAt') as string,
        // Legacy detail marker properties
        stationOrder: feature.getProperty('stationOrder') as number,
        exitOrder: feature.getProperty('exitOrder') as number,
        exitType: feature.getProperty('exitType') as string,
        connectedRoads: feature.getProperty('connectedRoads') as string,
      } as Construction;
    };

    // Handle click events
    dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
      const feature = event.feature;
      const props = extractFeatureProps(feature);

      setActiveFeature(props);
      setPopupPosition({
        lat: event.latLng?.lat() || 0,
        lng: event.latLng?.lng() || 0,
      });
      onSelectConstruction?.(props.id);
    });

    // Handle mouseover for hover effect
    dataLayer.addListener('mouseover', (event: google.maps.Data.MouseEvent) => {
      map.getDiv().style.cursor = 'pointer';

      const feature = event.feature;
      const props = extractFeatureProps(feature);

      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      setActiveFeature(props);
      setPopupPosition({
        lat: event.latLng?.lat() || 0,
        lng: event.latLng?.lng() || 0,
      });
    });

    // Handle mouseout - just reset cursor, popup handles its own closing
    dataLayer.addListener('mouseout', () => {
      map.getDiv().style.cursor = '';
    });

    return () => {
      dataLayer.setMap(null);
    };
  }, [geojsonData, visibleTypes, visibleStatuses, visibleSourceCollections, visibleDevelopmentTypes, currentZoom, onSelectConstruction]);

  // Create animated polylines for in-progress LineString constructions
  useEffect(() => {
    if (!mapRef.current || features.length === 0) return;

    // Cleanup previous animated polylines
    if (animatedPolylinesCleanupRef.current) {
      animatedPolylinesCleanupRef.current();
      animatedPolylinesCleanupRef.current = null;
    }

    // Create new animated polylines
    const cleanup = createAnimatedPolylinesForFeatures(
      mapRef.current,
      features,
      visibleTypes,
      visibleStatuses,
      visibleSourceCollections
    );

    animatedPolylinesCleanupRef.current = cleanup;

    return () => {
      if (animatedPolylinesCleanupRef.current) {
        animatedPolylinesCleanupRef.current();
        animatedPolylinesCleanupRef.current = null;
      }
    };
  }, [features, visibleTypes, visibleStatuses, visibleSourceCollections]);

  // Add route polyline
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing route
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    // Remove existing alert markers
    alertMarkersRef.current.forEach((marker) => marker.setMap(null));
    alertMarkersRef.current = [];

    if (!route) return;

    // Add route polyline
    const routePolyline = new google.maps.Polyline({
      path: geoJsonPathToLatLngPath(route.coordinates as [number, number][]),
      strokeColor: '#3B82F6',
      strokeWeight: 5,
      strokeOpacity: 0.8,
      map: mapRef.current,
    });
    routePolylineRef.current = routePolyline;

    // Add alert markers along route
    routeAlerts.forEach((alert) => {
      if (alert.center) {
        const marker = new google.maps.Marker({
          position: { lat: alert.center[1], lng: alert.center[0] },
          map: mapRef.current!,
          icon: createMarkerIcon('#EF4444', 16),
          title: alert.title,
        });
        alertMarkersRef.current.push(marker);
      }
    });
  }, [route, routeAlerts]);

  // Fly to user location when available
  useEffect(() => {
    if (
      mapRef.current &&
      locationStatus === 'success' &&
      userCoordinates &&
      !hasFlownToUserLocation.current
    ) {
      hasFlownToUserLocation.current = true;
      mapRef.current.panTo({
        lat: userCoordinates[1],
        lng: userCoordinates[0],
      });
      mapRef.current.setZoom(USER_LOCATION_ZOOM);
    }
  }, [locationStatus, userCoordinates]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (viewportTimeoutRef.current) clearTimeout(viewportTimeoutRef.current);
    };
  }, []);

  // Hide popup immediately
  const hidePopup = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setActiveFeature(null);
    setPopupPosition(null);
  }, []);

  // Compute visible features
  const computeVisibleFeatures = useCallback(() => {
    if (!mapRef.current || features.length === 0) return;

    const bounds = mapRef.current.getBounds();
    if (!bounds) return;

    const visible = features
      .filter((feature) =>
        featurePassesFilters(
          feature,
          visibleTypes,
          visibleStatuses,
          visibleSourceCollections,
          visibleDevelopmentTypes
        ) && isGeometryInBounds(feature.geometry, bounds)
      )
      .map((f) => f.properties);

    setVisibleFeatures(visible);
  }, [features, visibleTypes, visibleStatuses, visibleSourceCollections, visibleDevelopmentTypes]);

  // Handle map bounds change (debounced)
  const handleBoundsChanged = useCallback(() => {
    if (viewportTimeoutRef.current) {
      clearTimeout(viewportTimeoutRef.current);
    }
    viewportTimeoutRef.current = setTimeout(() => {
      computeVisibleFeatures();
    }, VIEWPORT_UPDATE_DELAY);
  }, [computeVisibleFeatures]);

  // Handle zoom change for detail marker visibility
  const handleZoomChanged = useCallback(() => {
    if (mapRef.current) {
      const zoom = mapRef.current.getZoom();
      if (zoom !== undefined) {
        setCurrentZoom(zoom);
      }
    }
  }, []);

  // Map load handler
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Apply initial theme
    map.setOptions({
      styles: theme === 'dark' ? GOOGLE_MAP_DARK_STYLE : GOOGLE_MAP_LIGHT_STYLE,
    });

    // Initial computation of visible features
    setTimeout(computeVisibleFeatures, 100);
  }, [theme, computeVisibleFeatures]);

  // Filter toggle handlers
  const handleTypeToggle = useCallback((type: string) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleStatusToggle = useCallback((status: string) => {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const handleSourceCollectionToggle = useCallback((source: string) => {
    setVisibleSourceCollections((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }, []);

  const handleDevelopmentTypeToggle = useCallback((type: string) => {
    setVisibleDevelopmentTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleToggleAllTypes = useCallback(() => {
    setVisibleTypes((prev) =>
      prev.size === Object.keys(TYPE_COLORS).length
        ? new Set<string>()
        : new Set(Object.keys(TYPE_COLORS))
    );
  }, []);

  const handleToggleAllStatuses = useCallback(() => {
    setVisibleStatuses((prev) =>
      prev.size === Object.keys(STATUS_COLORS).length
        ? new Set<string>()
        : new Set(Object.keys(STATUS_COLORS))
    );
  }, []);

  const handleToggleAllSourceCollections = useCallback(() => {
    setVisibleSourceCollections((prev) =>
      prev.size === Object.keys(SOURCE_COLLECTION_COLORS).length
        ? new Set<string>()
        : new Set(Object.keys(SOURCE_COLLECTION_COLORS))
    );
  }, []);

  const handleToggleAllDevelopmentTypes = useCallback(() => {
    setVisibleDevelopmentTypes((prev) =>
      prev.size === Object.keys(DEVELOPMENT_TYPE_COLORS).length
        ? new Set<string>()
        : new Set(Object.keys(DEVELOPMENT_TYPE_COLORS))
    );
  }, []);

  // Handle selecting feature from list
  const handleSelectFromList = useCallback(
    (mapFeature: MapFeature) => {
      const feature = features.find((f) => f.id === mapFeature.id);
      if (feature && mapRef.current) {
        mapRef.current.panTo(feature.center);
        mapRef.current.setZoom(14);
        setActiveFeature(mapFeature);
        setPopupPosition(feature.center);
      }
      setIsListModalOpen(false);
      onSelectConstruction?.(mapFeature.id);
    },
    [features, onSelectConstruction]
  );

  // Loading state
  if (loadError) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-muted">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-heading-lg text-foreground mb-2">
            Không thể tải bản đồ
          </h2>
          <p className="text-body-sm text-muted-foreground">
            Đã xảy ra lỗi khi tải Google Maps
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <span className="text-slate-500 dark:text-slate-400">
            Đang tải bản đồ...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={initialCenter}
        zoom={initialZoom}
        onLoad={handleMapLoad}
        onBoundsChanged={handleBoundsChanged}
        onZoomChanged={handleZoomChanged}
        options={DEFAULT_MAP_OPTIONS}
      >
        {/* InfoWindow popup */}
        {activeFeature && popupPosition && (
          <GoogleMapInfoWindow
            feature={activeFeature}
            position={popupPosition}
            onClose={hidePopup}
          />
        )}
      </GoogleMap>

      {/* Feature list toggle button */}
      <button
        onClick={() => setIsListModalOpen(true)}
        className="absolute bottom-24 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-card shadow-lg rounded-lg hover:bg-muted transition-colors"
      >
        <List className="w-5 h-5" />
        <span className="text-sm font-medium">{visibleFeatures.length}</span>
      </button>

      {/* Feature list modal */}
      <GoogleConstructionListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        features={visibleFeatures}
        onSelectFeature={handleSelectFromList}
      />

      {/* Legend with filter toggles */}
      <GoogleMapLegend
        visibleTypes={visibleTypes}
        visibleStatuses={visibleStatuses}
        visibleSourceCollections={visibleSourceCollections}
        visibleDevelopmentTypes={visibleDevelopmentTypes}
        onTypeToggle={handleTypeToggle}
        onStatusToggle={handleStatusToggle}
        onSourceCollectionToggle={handleSourceCollectionToggle}
        onDevelopmentTypeToggle={handleDevelopmentTypeToggle}
        onToggleAllTypes={handleToggleAllTypes}
        onToggleAllStatuses={handleToggleAllStatuses}
        onToggleAllSourceCollections={handleToggleAllSourceCollections}
        onToggleAllDevelopmentTypes={handleToggleAllDevelopmentTypes}
      />

      {/* City selection modal */}
      <CitySelectionModal
        isOpen={showCitySelector}
        onSelectCity={handleCitySelect}
      />
    </div>
  );
}
