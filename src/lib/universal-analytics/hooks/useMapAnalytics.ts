'use client';

/**
 * Universal Analytics - useMapAnalytics Hook
 *
 * Specialized hook for map interaction tracking with debouncing.
 */

import { useCallback, useRef } from 'react';
import { trackMapEvent } from '../analytics-client';
import { DEBOUNCE_INTERVALS, EVENT_NAMES } from '../constants';
import type { MapEventProperties } from '../types';

interface MapBounds {
  sw: [number, number];
  ne: [number, number];
}

/**
 * Hook for tracking map interactions
 *
 * Provides debounced tracking functions for map events.
 *
 * @example
 * ```tsx
 * function MapComponent() {
 *   const mapAnalytics = useMapAnalytics();
 *
 *   const handleLoad = (loadTime: number) => {
 *     mapAnalytics.trackMapLoaded(loadTime);
 *   };
 *
 *   const handleMarkerClick = (constructionId: string, zoomLevel: number) => {
 *     mapAnalytics.trackMarkerClick(constructionId, zoomLevel);
 *   };
 *
 *   return <Map onLoad={handleLoad} />;
 * }
 * ```
 */
export function useMapAnalytics() {
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHoveredId = useRef<string | null>(null);

  /**
   * Track map loaded event
   */
  const trackMapLoaded = useCallback((loadTime: number, tileLoadCount?: number) => {
    trackMapEvent(EVENT_NAMES.MAP_LOADED, {
      loadTime,
      tileLoadCount,
    } as MapEventProperties);
  }, []);

  /**
   * Track map initial render
   */
  const trackMapRender = useCallback((renderTime: number, tileLoadCount?: number) => {
    trackMapEvent(EVENT_NAMES.MAP_INITIAL_RENDER, {
      renderTime,
      tileLoadCount,
    } as MapEventProperties);
  }, []);

  /**
   * Track marker click
   */
  const trackMarkerClick = useCallback((constructionId: string, zoomLevel?: number) => {
    trackMapEvent(EVENT_NAMES.MAP_MARKER_CLICK, {
      mapZoomLevel: zoomLevel,
    } as MapEventProperties);
  }, []);

  /**
   * Track marker hover (debounced)
   */
  const trackMarkerHover = useCallback((constructionId: string, zoomLevel?: number) => {
    // Avoid duplicate hover events for the same marker
    if (lastHoveredId.current === constructionId) {
      return;
    }

    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }

    hoverTimeout.current = setTimeout(() => {
      lastHoveredId.current = constructionId;
      trackMapEvent(EVENT_NAMES.MAP_MARKER_HOVER, {
        mapZoomLevel: zoomLevel,
      } as MapEventProperties);
    }, DEBOUNCE_INTERVALS.HOVER);
  }, []);

  /**
   * Clear hover tracking (call on mouse leave)
   */
  const clearHoverTracking = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    lastHoveredId.current = null;
  }, []);

  /**
   * Track filter toggle
   */
  const trackFilterToggle = useCallback(
    (filterType: 'type' | 'status' | 'category', filterValue: string, enabled: boolean) => {
      trackMapEvent(EVENT_NAMES.MAP_FILTER_TOGGLE, {
        filterType,
        filterValue,
        filterEnabled: enabled,
      } as MapEventProperties);
    },
    []
  );

  /**
   * Track zoom change (debounced)
   */
  const trackZoom = useCallback((zoomLevel: number, previousZoom?: number) => {
    if (zoomTimeout.current) {
      clearTimeout(zoomTimeout.current);
    }

    zoomTimeout.current = setTimeout(() => {
      trackMapEvent(EVENT_NAMES.MAP_ZOOM, {
        mapZoomLevel: zoomLevel,
      } as MapEventProperties);
    }, DEBOUNCE_INTERVALS.ZOOM);
  }, []);

  /**
   * Track pan (debounced)
   */
  const trackPan = useCallback((bounds: MapBounds) => {
    if (panTimeout.current) {
      clearTimeout(panTimeout.current);
    }

    panTimeout.current = setTimeout(() => {
      trackMapEvent(EVENT_NAMES.MAP_PAN, {
        mapBounds: bounds,
      } as MapEventProperties);
    }, DEBOUNCE_INTERVALS.PAN);
  }, []);

  /**
   * Track search
   */
  const trackSearch = useCallback((query: string, resultsCount: number) => {
    trackMapEvent(EVENT_NAMES.MAP_SEARCH, {
      searchQuery: query,
      searchResultsCount: resultsCount,
    } as MapEventProperties);
  }, []);

  /**
   * Track route planning
   */
  const trackRoutePlan = useCallback((alertsCount: number) => {
    trackMapEvent(EVENT_NAMES.MAP_ROUTE_PLAN, {
      searchResultsCount: alertsCount,
    } as MapEventProperties);
  }, []);

  /**
   * Track list modal open
   */
  const trackListModalOpen = useCallback((constructionsCount: number) => {
    trackMapEvent(EVENT_NAMES.MAP_LIST_MODAL_OPEN, {
      searchResultsCount: constructionsCount,
    } as MapEventProperties);
  }, []);

  /**
   * Track list item click
   */
  const trackListItemClick = useCallback((constructionId: string, position: number) => {
    trackMapEvent(EVENT_NAMES.MAP_LIST_ITEM_CLICK, {
      listPosition: position,
    } as MapEventProperties);
  }, []);

  /**
   * Track city selection
   */
  const trackCitySelect = useCallback((cityId: string, cityName: string) => {
    trackMapEvent(EVENT_NAMES.MAP_CITY_SELECT, {
      cityId,
      cityName,
    } as MapEventProperties);
  }, []);

  return {
    trackMapLoaded,
    trackMapRender,
    trackMarkerClick,
    trackMarkerHover,
    clearHoverTracking,
    trackFilterToggle,
    trackZoom,
    trackPan,
    trackSearch,
    trackRoutePlan,
    trackListModalOpen,
    trackListItemClick,
    trackCitySelect,
  };
}

export default useMapAnalytics;
