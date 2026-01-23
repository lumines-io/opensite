'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

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
  CATEGORY_COLORS,
} from './google-map.constants';
import type {
  GoogleConstructionMapProps,
  Construction,
  ConstructionFeature,
  LatLng,
  VisibilityFilters,
} from './google-map.types';
import {
  featureCollectionToConstructionFeatures,
  getFeatureStyle,
  featurePassesFilters,
  isGeometryInBounds,
  geoJsonPathToLatLngPath,
  getGeometryCenter,
  getMarkerColor,
  createMarkerIcon,
  createStatusMarkerIcon,
  createPulsingPolyline,
  getTypeColor,
  getPrivateTypeColor,
  geoJsonToLatLng,
} from './google-map.utils';
import { GoogleMapInfoWindow } from './GoogleMapInfoWindow';
import { GoogleMapLegend } from './GoogleMapLegend';
import { GoogleConstructionListModal } from './GoogleConstructionListModal';
import { CitySelectionModal } from '../Map/CitySelectionModal';
import { useUserLocation } from '../Map/useUserLocation';

// Re-export types
export type { Construction, ConstructionAlert } from './google-map.types';

// Delay before hiding popup when mouse leaves
const POPUP_HIDE_DELAY = 150;

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
  const pointMarkersRef = useRef<Array<{ id: string; marker: google.maps.Marker }>>([]);
  const animatedPolylinesRef = useRef<Array<{ id: string; cleanup: () => void }>>([]);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFlownToUserLocation = useRef(false);
  const isMouseInPopupRef = useRef(false);

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
  const [activeConstruction, setActiveConstruction] = useState<Construction | null>(null);
  const [popupPosition, setPopupPosition] = useState<LatLng | null>(null);
  const [isMouseInPopup, setIsMouseInPopup] = useState(false);

  // Filter state
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(
    () => new Set(Object.keys(TYPE_COLORS))
  );
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(
    () => new Set(Object.keys(STATUS_COLORS))
  );
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    () => new Set(Object.keys(CATEGORY_COLORS))
  );

  // Modal state
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [visibleConstructions, setVisibleConstructions] = useState<Construction[]>([]);

  // Memoized filters
  const filters: VisibilityFilters = useMemo(
    () => ({
      visibleTypes,
      visibleStatuses,
      visibleCategories,
    }),
    [visibleTypes, visibleStatuses, visibleCategories]
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

  // Schedule popup hide with delay (defined early so it can be used in the Data Layer effect)
  const scheduleHidePopup = useCallback(() => {
    if (isMouseInPopup) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = setTimeout(() => {
      if (!isMouseInPopup) {
        setActiveConstruction(null);
        setPopupPosition(null);
      }
      hideTimeoutRef.current = null;
    }, POPUP_HIDE_DELAY);
  }, [isMouseInPopup]);

  // Add/update Data Layer with GeoJSON
  useEffect(() => {
    if (!mapRef.current || !geojsonData) return;

    const map = mapRef.current;

    // Remove existing data layer
    if (dataLayerRef.current) {
      dataLayerRef.current.setMap(null);
    }

    // Cleanup existing animated polylines
    animatedPolylinesRef.current.forEach(({ cleanup }) => cleanup());
    animatedPolylinesRef.current = [];

    // Cleanup existing point markers
    pointMarkersRef.current.forEach(({ marker }) => marker.setMap(null));
    pointMarkersRef.current = [];

    // Create new data layer
    const dataLayer = new google.maps.Data({ map });
    dataLayerRef.current = dataLayer;

    // Add GeoJSON features
    dataLayer.addGeoJson(geojsonData);

    // Track which feature IDs have custom rendering (animated polylines or point markers)
    const customRenderedIds = new Set<string>();

    // Create markers for Point features and animated polylines for in-progress LineStrings
    geojsonData.features.forEach((feature) => {
      if (!feature.geometry || !feature.properties) return;

      const type = feature.properties.constructionType as string;
      const status = feature.properties.constructionStatus as string;
      const category = (feature.properties.constructionCategory as string) || 'public';
      const privateType = feature.properties.privateType as string;
      const id = feature.properties.id as string;

      // Check if feature passes filters
      const passesFilters =
        visibleTypes.has(type) &&
        visibleStatuses.has(status) &&
        visibleCategories.has(category);

      if (!passesFilters) return;

      // Get color based on category and type
      const color = category === 'private' && privateType
        ? getPrivateTypeColor(privateType)
        : getTypeColor(type);

      // Handle Point features - create separate markers with SVG icons
      if (feature.geometry.type === 'Point') {
        const position = geoJsonToLatLng(feature.geometry.coordinates as [number, number]);
        const icon = createStatusMarkerIcon(color, status, type);

        const marker = new google.maps.Marker({
          position,
          map,
          icon,
          title: feature.properties.title as string,
          zIndex: status === 'in-progress' ? 100 : status === 'completed' ? 50 : 75,
        });

        // Add click listener to marker
        marker.addListener('click', () => {
          const props = {
            id: feature.properties!.id as string,
            slug: feature.properties!.slug as string,
            title: feature.properties!.title as string,
            excerpt: feature.properties!.excerpt as string,
            constructionStatus: feature.properties!.constructionStatus as string,
            progress: feature.properties!.progress as number,
            constructionType: feature.properties!.constructionType as string,
            constructionCategory: feature.properties!.constructionCategory as 'public' | 'private',
            privateType: feature.properties!.privateType as string,
            organizationName: feature.properties!.organizationName as string,
            startDate: feature.properties!.startDate as string,
            expectedEndDate: feature.properties!.expectedEndDate as string,
          };
          setActiveConstruction(props);
          setPopupPosition(position);
          onSelectConstruction?.(props.id);
        });

        // Add mouseover listener
        marker.addListener('mouseover', () => {
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
          }
          const props = {
            id: feature.properties!.id as string,
            slug: feature.properties!.slug as string,
            title: feature.properties!.title as string,
            excerpt: feature.properties!.excerpt as string,
            constructionStatus: feature.properties!.constructionStatus as string,
            progress: feature.properties!.progress as number,
            constructionType: feature.properties!.constructionType as string,
            constructionCategory: feature.properties!.constructionCategory as 'public' | 'private',
            privateType: feature.properties!.privateType as string,
            organizationName: feature.properties!.organizationName as string,
            startDate: feature.properties!.startDate as string,
            expectedEndDate: feature.properties!.expectedEndDate as string,
          };
          setActiveConstruction(props);
          setPopupPosition(position);
        });

        // Add mouseout listener
        marker.addListener('mouseout', () => {
          scheduleHidePopup();
        });

        pointMarkersRef.current.push({ id, marker });
        customRenderedIds.add(id);
      }

      // Handle in-progress LineStrings - create animated polylines
      if (feature.geometry.type === 'LineString' && status === 'in-progress') {
        const path = geoJsonPathToLatLngPath(
          feature.geometry.coordinates as [number, number][]
        );

        const { polylines, cleanup } = createPulsingPolyline(map, path, color, {
          strokeWeight: 5,
          zIndex: 100,
          animationSpeed: 'normal',
        });

        // Add event listeners to the base polyline (first one)
        const basePolyline = polylines[0];
        if (basePolyline) {
          const props = {
            id: feature.properties!.id as string,
            slug: feature.properties!.slug as string,
            title: feature.properties!.title as string,
            excerpt: feature.properties!.excerpt as string,
            constructionStatus: feature.properties!.constructionStatus as string,
            progress: feature.properties!.progress as number,
            constructionType: feature.properties!.constructionType as string,
            constructionCategory: feature.properties!.constructionCategory as 'public' | 'private',
            privateType: feature.properties!.privateType as string,
            organizationName: feature.properties!.organizationName as string,
            startDate: feature.properties!.startDate as string,
            expectedEndDate: feature.properties!.expectedEndDate as string,
          };

          // Calculate center of the line for popup position
          const midIdx = Math.floor(path.length / 2);
          const lineCenter = path[midIdx] || path[0];

          basePolyline.addListener('click', (e: google.maps.PolyMouseEvent) => {
            setActiveConstruction(props);
            setPopupPosition(e.latLng ? { lat: e.latLng.lat(), lng: e.latLng.lng() } : lineCenter);
            onSelectConstruction?.(props.id);
          });

          basePolyline.addListener('mouseover', (e: google.maps.PolyMouseEvent) => {
            map.getDiv().style.cursor = 'pointer';
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = null;
            }
            setActiveConstruction(props);
            setPopupPosition(e.latLng ? { lat: e.latLng.lat(), lng: e.latLng.lng() } : lineCenter);
          });

          basePolyline.addListener('mouseout', () => {
            map.getDiv().style.cursor = '';
            scheduleHidePopup();
          });
        }

        animatedPolylinesRef.current.push({ id, cleanup });
        customRenderedIds.add(id);
      }
    });

    // Apply styling based on filters
    dataLayer.setStyle((feature) => {
      const type = feature.getProperty('constructionType') as string;
      const status = feature.getProperty('constructionStatus') as string;
      const category = (feature.getProperty('constructionCategory') as string) || 'public';
      const id = feature.getProperty('id') as string;

      // Hide if not in filters
      if (
        !visibleTypes.has(type) ||
        !visibleStatuses.has(status) ||
        !visibleCategories.has(category)
      ) {
        return { visible: false };
      }

      // Hide features that have custom rendering (point markers or animated polylines)
      if (customRenderedIds.has(id)) {
        return { visible: false };
      }

      return getFeatureStyle(feature);
    });

    // Handle click events
    dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
      const feature = event.feature;
      const props = {
        id: feature.getProperty('id') as string,
        slug: feature.getProperty('slug') as string,
        title: feature.getProperty('title') as string,
        excerpt: feature.getProperty('excerpt') as string,
        constructionStatus: feature.getProperty('constructionStatus') as string,
        progress: feature.getProperty('progress') as number,
        constructionType: feature.getProperty('constructionType') as string,
        constructionCategory: feature.getProperty('constructionCategory') as 'public' | 'private',
        privateType: feature.getProperty('privateType') as string,
        organizationName: feature.getProperty('organizationName') as string,
        startDate: feature.getProperty('startDate') as string,
        expectedEndDate: feature.getProperty('expectedEndDate') as string,
      };

      setActiveConstruction(props);
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
      const props = {
        id: feature.getProperty('id') as string,
        slug: feature.getProperty('slug') as string,
        title: feature.getProperty('title') as string,
        excerpt: feature.getProperty('excerpt') as string,
        constructionStatus: feature.getProperty('constructionStatus') as string,
        progress: feature.getProperty('progress') as number,
        constructionType: feature.getProperty('constructionType') as string,
        constructionCategory: feature.getProperty('constructionCategory') as 'public' | 'private',
        privateType: feature.getProperty('privateType') as string,
        organizationName: feature.getProperty('organizationName') as string,
        startDate: feature.getProperty('startDate') as string,
        expectedEndDate: feature.getProperty('expectedEndDate') as string,
      };

      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      setActiveConstruction(props);
      setPopupPosition({
        lat: event.latLng?.lat() || 0,
        lng: event.latLng?.lng() || 0,
      });
    });

    // Handle mouseout
    dataLayer.addListener('mouseout', () => {
      map.getDiv().style.cursor = '';
      scheduleHidePopup();
    });

    return () => {
      dataLayer.setMap(null);
      // Cleanup point markers when effect re-runs
      pointMarkersRef.current.forEach(({ marker }) => marker.setMap(null));
      pointMarkersRef.current = [];
      // Cleanup animated polylines when effect re-runs
      animatedPolylinesRef.current.forEach(({ cleanup }) => cleanup());
      animatedPolylinesRef.current = [];
    };
  }, [geojsonData, visibleTypes, visibleStatuses, visibleCategories, onSelectConstruction, scheduleHidePopup]);

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
    setActiveConstruction(null);
    setPopupPosition(null);
    setIsMouseInPopup(false);
  }, []);

  // Compute visible constructions
  const computeVisibleConstructions = useCallback(() => {
    if (!mapRef.current || features.length === 0) return;

    const bounds = mapRef.current.getBounds();
    if (!bounds) return;

    const visible = features
      .filter((feature) =>
        featurePassesFilters(
          feature,
          visibleTypes,
          visibleStatuses,
          visibleCategories
        ) && isGeometryInBounds(feature.geometry, bounds)
      )
      .map((f) => f.properties);

    setVisibleConstructions(visible);
  }, [features, visibleTypes, visibleStatuses, visibleCategories]);

  // Handle map bounds change (debounced)
  const handleBoundsChanged = useCallback(() => {
    if (viewportTimeoutRef.current) {
      clearTimeout(viewportTimeoutRef.current);
    }
    viewportTimeoutRef.current = setTimeout(() => {
      computeVisibleConstructions();
    }, VIEWPORT_UPDATE_DELAY);
  }, [computeVisibleConstructions]);

  // Map load handler
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Apply initial theme
    map.setOptions({
      styles: theme === 'dark' ? GOOGLE_MAP_DARK_STYLE : GOOGLE_MAP_LIGHT_STYLE,
    });

    // Add click listener to close popup when clicking on empty map area
    map.addListener('click', () => {
      // Only close if not clicking on a feature (handled separately)
      if (!isMouseInPopupRef.current) {
        setActiveConstruction(null);
        setPopupPosition(null);
        setIsMouseInPopup(false);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      }
    });

    // Initial computation of visible constructions
    setTimeout(computeVisibleConstructions, 100);
  }, [theme, computeVisibleConstructions]);

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

  const handleCategoryToggle = useCallback((category: string) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
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

  const handleToggleAllCategories = useCallback(() => {
    setVisibleCategories((prev) =>
      prev.size === Object.keys(CATEGORY_COLORS).length
        ? new Set<string>()
        : new Set(Object.keys(CATEGORY_COLORS))
    );
  }, []);

  // Handle selecting construction from list
  const handleSelectFromList = useCallback(
    (construction: Construction) => {
      const feature = features.find((f) => f.id === construction.id);
      if (feature && mapRef.current) {
        mapRef.current.panTo(feature.center);
        mapRef.current.setZoom(14);
        setActiveConstruction(construction);
        setPopupPosition(feature.center);
      }
      setIsListModalOpen(false);
      onSelectConstruction?.(construction.id);
    },
    [features, onSelectConstruction]
  );

  // Handle popup mouse events
  const handlePopupMouseEnter = useCallback(() => {
    setIsMouseInPopup(true);
    isMouseInPopupRef.current = true;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    setIsMouseInPopup(false);
    isMouseInPopupRef.current = false;
    scheduleHidePopup();
  }, [scheduleHidePopup]);

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
        options={DEFAULT_MAP_OPTIONS}
      >
        {/* InfoWindow popup */}
        {activeConstruction && popupPosition && (
          <GoogleMapInfoWindow
            construction={activeConstruction}
            position={popupPosition}
            onClose={hidePopup}
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
          />
        )}
      </GoogleMap>

      {/* Construction list toggle button */}
      <button
        onClick={() => setIsListModalOpen(true)}
        className="absolute bottom-24 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-card shadow-lg rounded-lg hover:bg-muted transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        <span className="text-sm font-medium">{visibleConstructions.length}</span>
      </button>

      {/* Construction list modal */}
      <GoogleConstructionListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        constructions={visibleConstructions}
        onSelectConstruction={handleSelectFromList}
      />

      {/* Legend with filter toggles */}
      <GoogleMapLegend
        visibleTypes={visibleTypes}
        visibleStatuses={visibleStatuses}
        visibleCategories={visibleCategories}
        onTypeToggle={handleTypeToggle}
        onStatusToggle={handleStatusToggle}
        onCategoryToggle={handleCategoryToggle}
        onToggleAllTypes={handleToggleAllTypes}
        onToggleAllStatuses={handleToggleAllStatuses}
        onToggleAllCategories={handleToggleAllCategories}
      />

      {/* City selection modal */}
      <CitySelectionModal
        isOpen={showCitySelector}
        onSelectCity={handleCitySelect}
      />
    </div>
  );
}
