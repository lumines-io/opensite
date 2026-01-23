'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Map, { NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { useTheme } from '../ThemeProvider';
import { MAP_STYLES, DEFAULT_CENTER, DEFAULT_ZOOM, USER_LOCATION_ZOOM, INTERACTIVE_LAYERS, TYPE_COLORS, STATUS_COLORS, CATEGORY_COLORS } from './construction-map.constants';
import type { CityId } from './construction-map.constants';
import type { Construction, ConstructionMapProps, Coordinates } from './construction-map.types';
import { useMapLayers, useRouteLayer, useLayerFilters, type VisibilityFilters } from './useMapLayers';
import { useMapIcons } from './useMapIcons';
import { ConstructionPopup } from './ConstructionPopup';
import { MapLegend } from './MapLegend';
import { ConstructionListModal, ConstructionListToggle } from './ConstructionListModal';
import { CitySelectionModal } from './CitySelectionModal';
import { useUserLocation } from './useUserLocation';

// Re-export types for external use
export type { Construction, ConstructionMapProps, ConstructionAlert } from './construction-map.types';

// Delay before hiding popup when mouse leaves (allows moving to popup)
const POPUP_HIDE_DELAY = 150;

// Debounce delay for viewport changes
const VIEWPORT_UPDATE_DELAY = 300;

/**
 * ConstructionMap - Interactive map showing construction projects
 *
 * Features:
 * - Type-based coloring and sizing with pulsing animation
 * - Filter by type and status via legend toggles
 * - List modal showing constructions in current viewport
 * - Unified hover/click popup with proximity detection
 * - Clickable header for navigation to details
 * - Route overlay support
 * - Theme change support (re-adds layers on style change)
 */
export function ConstructionMap({
  accessToken,
  onSelectConstruction,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  route = null,
  routeAlerts = [],
}: ConstructionMapProps) {

  const mapRef = useRef<MapRef>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFlownToUserLocation = useRef(false);
  const { theme } = useTheme();

  // User location detection with city fallback
  const {
    status: locationStatus,
    coordinates: userCoordinates,
    showCitySelector,
    handleCitySelect,
  } = useUserLocation();

  // Map state
  const [loaded, setLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(0);
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null);

  // Unified popup state
  const [activeConstruction, setActiveConstruction] = useState<Construction | null>(null);
  const [popupCoords, setPopupCoords] = useState<Coordinates | null>(null);
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

  // Combine filters for useMapLayers
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
        }
      } catch (error) {
        console.error('Failed to fetch constructions:', error);
        setGeojsonData({ type: 'FeatureCollection', features: [] });
      }
    }
    fetchData();
  }, []);

  // Listen for style changes (theme switching)
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !loaded) return;

    const handleStyleData = () => {
      setStyleLoaded((prev) => prev + 1);
    };

    map.on('style.load', handleStyleData);

    return () => {
      map.off('style.load', handleStyleData);
    };
  }, [loaded]);

  // Load map icons first
  const { iconsLoaded } = useMapIcons({ mapRef, loaded, styleLoaded });

  // Set up map layers (after icons are loaded)
  useMapLayers({ mapRef, loaded: loaded && iconsLoaded, geojsonData, styleLoaded, filters });
  useRouteLayer({ mapRef, loaded, route, routeAlerts, styleLoaded });
  useLayerFilters(mapRef, loaded && iconsLoaded, filters);

  // Fly to user location when available
  useEffect(() => {
    if (
      loaded &&
      locationStatus === 'success' &&
      userCoordinates &&
      !hasFlownToUserLocation.current
    ) {
      hasFlownToUserLocation.current = true;
      mapRef.current?.flyTo({
        center: userCoordinates,
        zoom: USER_LOCATION_ZOOM,
        duration: 1500,
      });
    }
  }, [loaded, locationStatus, userCoordinates]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (viewportTimeoutRef.current) {
        clearTimeout(viewportTimeoutRef.current);
      }
    };
  }, []);

  // Compute visible constructions based on map bounds and filters
  const computeVisibleConstructions = useCallback(
    (currentVisibleTypes: Set<string>, currentVisibleStatuses: Set<string>, currentVisibleCategories: Set<string>): Construction[] => {
      const map = mapRef.current?.getMap();
      if (!map || !geojsonData) return [];

      const bounds = map.getBounds();
      if (!bounds) return [];

      const visible: Construction[] = [];

      for (const feature of geojsonData.features) {
        if (!feature.geometry || !feature.properties) continue;

        const props = feature.properties as Construction;

        // Check if type and status are visible
        if (!currentVisibleTypes.has(props.constructionType)) continue;
        if (!currentVisibleStatuses.has(props.constructionStatus)) continue;

        // Check if category is visible
        const category = props.constructionCategory || 'public';
        if (!currentVisibleCategories.has(category)) continue;

        // Check if feature is in bounds
        let inBounds = false;

        if (feature.geometry.type === 'Point') {
          const [lng, lat] = feature.geometry.coordinates as [number, number];
          inBounds = bounds.contains([lng, lat]);
        } else if (feature.geometry.type === 'LineString') {
          const coords = feature.geometry.coordinates as [number, number][];
          inBounds = coords.some(([lng, lat]) => bounds.contains([lng, lat]));
        } else if (feature.geometry.type === 'Polygon') {
          const coords = feature.geometry.coordinates[0] as [number, number][];
          inBounds = coords.some(([lng, lat]) => bounds.contains([lng, lat]));
        }

        if (inBounds) {
          visible.push(props);
        }
      }

      return visible;
    },
    [geojsonData]
  );

  // Handle viewport changes (debounced) - update visible constructions
  const handleMoveEnd = useCallback(() => {
    if (viewportTimeoutRef.current) {
      clearTimeout(viewportTimeoutRef.current);
    }
    viewportTimeoutRef.current = setTimeout(() => {
      setVisibleConstructions(computeVisibleConstructions(visibleTypes, visibleStatuses, visibleCategories));
    }, VIEWPORT_UPDATE_DELAY);
  }, [computeVisibleConstructions, visibleTypes, visibleStatuses, visibleCategories]);

  // Filter toggle handlers - also update visible constructions list
  const handleTypeToggle = useCallback(
    (type: string) => {
      setVisibleTypes((prev) => {
        const next = new Set(prev);
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
        // Update visible constructions with new filter
        setTimeout(() => {
          setVisibleConstructions(computeVisibleConstructions(next, visibleStatuses, visibleCategories));
        }, 50);
        return next;
      });
    },
    [computeVisibleConstructions, visibleStatuses, visibleCategories]
  );

  const handleStatusToggle = useCallback(
    (status: string) => {
      setVisibleStatuses((prev) => {
        const next = new Set(prev);
        if (next.has(status)) {
          next.delete(status);
        } else {
          next.add(status);
        }
        // Update visible constructions with new filter
        setTimeout(() => {
          setVisibleConstructions(computeVisibleConstructions(visibleTypes, next, visibleCategories));
        }, 50);
        return next;
      });
    },
    [computeVisibleConstructions, visibleTypes, visibleCategories]
  );

  const handleCategoryToggle = useCallback(
    (category: string) => {
      setVisibleCategories((prev) => {
        const next = new Set(prev);
        if (next.has(category)) {
          next.delete(category);
        } else {
          next.add(category);
        }
        // Update visible constructions with new filter
        setTimeout(() => {
          setVisibleConstructions(computeVisibleConstructions(visibleTypes, visibleStatuses, next));
        }, 50);
        return next;
      });
    },
    [computeVisibleConstructions, visibleTypes, visibleStatuses]
  );

  const handleToggleAllTypes = useCallback(() => {
    setVisibleTypes((prev) => {
      const next =
        prev.size === Object.keys(TYPE_COLORS).length
          ? new Set<string>()
          : new Set(Object.keys(TYPE_COLORS));
      // Update visible constructions with new filter
      setTimeout(() => {
        setVisibleConstructions(computeVisibleConstructions(next, visibleStatuses, visibleCategories));
      }, 50);
      return next;
    });
  }, [computeVisibleConstructions, visibleStatuses, visibleCategories]);

  const handleToggleAllStatuses = useCallback(() => {
    setVisibleStatuses((prev) => {
      const next =
        prev.size === Object.keys(STATUS_COLORS).length
          ? new Set<string>()
          : new Set(Object.keys(STATUS_COLORS));
      // Update visible constructions with new filter
      setTimeout(() => {
        setVisibleConstructions(computeVisibleConstructions(visibleTypes, next, visibleCategories));
      }, 50);
      return next;
    });
  }, [computeVisibleConstructions, visibleTypes, visibleCategories]);

  const handleToggleAllCategories = useCallback(() => {
    setVisibleCategories((prev) => {
      const next =
        prev.size === Object.keys(CATEGORY_COLORS).length
          ? new Set<string>()
          : new Set(Object.keys(CATEGORY_COLORS));
      // Update visible constructions with new filter
      setTimeout(() => {
        setVisibleConstructions(computeVisibleConstructions(visibleTypes, visibleStatuses, next));
      }, 50);
      return next;
    });
  }, [computeVisibleConstructions, visibleTypes, visibleStatuses]);

  // Modal handlers
  const handleOpenListModal = useCallback(() => {
    setIsListModalOpen(true);
  }, []);

  const handleCloseListModal = useCallback(() => {
    setIsListModalOpen(false);
  }, []);

  // Handle map load - also initialize visible constructions
  const handleLoad = useCallback(() => {
    setLoaded(true);
    // Initial computation of visible constructions after map is loaded
    setTimeout(() => {
      setVisibleConstructions(computeVisibleConstructions(visibleTypes, visibleStatuses, visibleCategories));
    }, 100);
  }, [computeVisibleConstructions, visibleTypes, visibleStatuses, visibleCategories]);

  // Show popup for a construction
  const showPopup = useCallback((construction: Construction, coords: Coordinates) => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setActiveConstruction(construction);
    setPopupCoords(coords);
  }, []);

  // Schedule popup hide with delay (for proximity detection)
  const scheduleHidePopup = useCallback(() => {
    // Don't hide if mouse is in popup
    if (isMouseInPopup) return;

    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Schedule hide after delay
    hideTimeoutRef.current = setTimeout(() => {
      if (!isMouseInPopup) {
        setActiveConstruction(null);
        setPopupCoords(null);
      }
      hideTimeoutRef.current = null;
    }, POPUP_HIDE_DELAY);
  }, [isMouseInPopup]);

  // Immediately hide popup
  const hidePopup = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setActiveConstruction(null);
    setPopupCoords(null);
    setIsMouseInPopup(false);
  }, []);

  // Handle selecting a construction from the list modal
  const handleSelectFromList = useCallback(
    (construction: Construction) => {
      // Find the feature to get its coordinates
      if (!geojsonData) return;

      const feature = geojsonData.features.find(
        (f) => f.properties?.id === construction.id
      );

      if (feature && feature.geometry) {
        let coords: Coordinates | null = null;

        if (feature.geometry.type === 'Point') {
          coords = feature.geometry.coordinates as Coordinates;
        } else if (feature.geometry.type === 'LineString') {
          // Use midpoint of line
          const lineCoords = feature.geometry.coordinates as [number, number][];
          const midIdx = Math.floor(lineCoords.length / 2);
          coords = lineCoords[midIdx];
        } else if (feature.geometry.type === 'Polygon') {
          // Use centroid approximation (first coordinate)
          const polyCoords = feature.geometry.coordinates[0] as [number, number][];
          coords = polyCoords[0];
        }

        if (coords) {
          // Fly to the construction
          mapRef.current?.flyTo({
            center: coords,
            zoom: 14,
            duration: 1000,
          });

          // Show popup
          showPopup(construction, coords);
        }
      }

      setIsListModalOpen(false);
      onSelectConstruction?.(construction.id);
    },
    [geojsonData, onSelectConstruction, showPopup]
  );

  // Handle click on construction (same as hover, just shows popup)
  const handleClick = useCallback((e: MapMouseEvent) => {
    const features = e.features;
    if (features && features.length > 0) {
      const feature = features[0];
      const props = feature.properties as Construction;

      showPopup(props, e.lngLat.toArray() as Coordinates);
      onSelectConstruction?.(props.id);
    }
  }, [showPopup, onSelectConstruction]);

  // Handle mouse move for hover popup
  const handleMouseMove = useCallback((e: MapMouseEvent) => {
    const features = e.features;
    if (features && features.length > 0) {
      const feature = features[0];
      const props = feature.properties as Construction;

      // Update cursor
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = 'pointer';
      }

      // Show popup (or update if different feature)
      if (!activeConstruction || activeConstruction.id !== props.id) {
        showPopup(props, e.lngLat.toArray() as Coordinates);
      }
    } else {
      // Mouse not over any feature, schedule hide
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = '';
      }
      scheduleHidePopup();
    }
  }, [activeConstruction, showPopup, scheduleHidePopup]);

  // Handle mouse leave from map
  const handleMouseLeave = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = '';
    }
    scheduleHidePopup();
  }, [scheduleHidePopup]);

  // Handle mouse enter popup (keep it open)
  const handlePopupMouseEnter = useCallback(() => {
    setIsMouseInPopup(true);
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Handle mouse leave popup
  const handlePopupMouseLeave = useCallback(() => {
    setIsMouseInPopup(false);
    scheduleHidePopup();
  }, [scheduleHidePopup]);

  return (
    <div className="w-full h-screen relative">
      <Map
        ref={mapRef}
        mapboxAccessToken={accessToken}
        initialViewState={{
          longitude: initialCenter[0],
          latitude: initialCenter[1],
          zoom: initialZoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLES[theme]}
        onLoad={handleLoad}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMoveEnd={handleMoveEnd}
        interactiveLayerIds={loaded ? [...INTERACTIVE_LAYERS] : []}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" />

        {/* Unified popup with proximity detection */}
        {activeConstruction && popupCoords && (
          <ConstructionPopup
            construction={activeConstruction}
            coordinates={popupCoords}
            onClose={hidePopup}
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
          />
        )}
      </Map>

      {/* Construction list toggle button */}
      <ConstructionListToggle
        count={visibleConstructions.length}
        onClick={handleOpenListModal}
      />

      {/* Construction list modal */}
      <ConstructionListModal
        isOpen={isListModalOpen}
        onClose={handleCloseListModal}
        constructions={visibleConstructions}
        onSelectConstruction={handleSelectFromList}
      />

      {/* Legend with filter toggles */}
      <MapLegend
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

      {/* City selection modal (shown when geolocation is unavailable) */}
      <CitySelectionModal
        isOpen={showCitySelector}
        onSelectCity={handleCitySelect}
      />
    </div>
  );
}
