'use client';

import { useEffect, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import {
  SAVED_PLACES_LAYER_IDS,
  SAVED_PLACES_SOURCE_ID,
  SAVED_PLACES_MARKER_COLOR,
  SAVED_PLACES_MARKER_SIZE,
  SAVED_PLACES_MARKER_STROKE_COLOR,
  SAVED_PLACES_MARKER_STROKE_WIDTH,
} from './construction-map.constants';

interface UseSavedPlacesLayerOptions {
  mapRef: React.RefObject<MapRef | null>;
  loaded: boolean;
  savedPlacesGeoJSON: GeoJSON.FeatureCollection | null;
  styleLoaded?: number;
  visible: boolean;
}

/**
 * Hook to manage saved places layer on the map
 */
export function useSavedPlacesLayer({
  mapRef,
  loaded,
  savedPlacesGeoJSON,
  styleLoaded = 0,
  visible,
}: UseSavedPlacesLayerOptions) {
  // Add or update the saved places layer
  const setupLayers = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !loaded) return;

    // Remove existing layers and source if they exist
    if (map.getLayer(SAVED_PLACES_LAYER_IDS.LABELS)) {
      map.removeLayer(SAVED_PLACES_LAYER_IDS.LABELS);
    }
    if (map.getLayer(SAVED_PLACES_LAYER_IDS.POINTS)) {
      map.removeLayer(SAVED_PLACES_LAYER_IDS.POINTS);
    }
    if (map.getSource(SAVED_PLACES_SOURCE_ID)) {
      map.removeSource(SAVED_PLACES_SOURCE_ID);
    }

    // Don't add layers if not visible or no data
    if (!visible || !savedPlacesGeoJSON || savedPlacesGeoJSON.features.length === 0) {
      return;
    }

    // Add source
    map.addSource(SAVED_PLACES_SOURCE_ID, {
      type: 'geojson',
      data: savedPlacesGeoJSON,
    });

    // Add points layer (circle markers)
    map.addLayer({
      id: SAVED_PLACES_LAYER_IDS.POINTS,
      type: 'circle',
      source: SAVED_PLACES_SOURCE_ID,
      paint: {
        'circle-radius': SAVED_PLACES_MARKER_SIZE,
        'circle-color': SAVED_PLACES_MARKER_COLOR,
        'circle-stroke-width': SAVED_PLACES_MARKER_STROKE_WIDTH,
        'circle-stroke-color': SAVED_PLACES_MARKER_STROKE_COLOR,
        'circle-opacity': 0.9,
      },
    });

    // Add labels layer
    map.addLayer({
      id: SAVED_PLACES_LAYER_IDS.LABELS,
      type: 'symbol',
      source: SAVED_PLACES_SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-max-width': 10,
      },
      paint: {
        'text-color': SAVED_PLACES_MARKER_COLOR,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
      minzoom: 12, // Only show labels at higher zoom levels
    });
  }, [mapRef, loaded, savedPlacesGeoJSON, visible]);

  // Set up layers when map is ready or data changes
  useEffect(() => {
    setupLayers();
  }, [setupLayers, styleLoaded]);

  // Update visibility when it changes
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !loaded) return;

    const visibility = visible ? 'visible' : 'none';

    if (map.getLayer(SAVED_PLACES_LAYER_IDS.POINTS)) {
      map.setLayoutProperty(SAVED_PLACES_LAYER_IDS.POINTS, 'visibility', visibility);
    }
    if (map.getLayer(SAVED_PLACES_LAYER_IDS.LABELS)) {
      map.setLayoutProperty(SAVED_PLACES_LAYER_IDS.LABELS, 'visibility', visibility);
    }
  }, [mapRef, loaded, visible]);

  // Update source data when GeoJSON changes
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !loaded || !visible) return;

    const source = map.getSource(SAVED_PLACES_SOURCE_ID);
    if (source && source.type === 'geojson' && savedPlacesGeoJSON) {
      (source as mapboxgl.GeoJSONSource).setData(savedPlacesGeoJSON);
    }
  }, [mapRef, loaded, savedPlacesGeoJSON, visible]);
}

// Interactive layer IDs for saved places (for mouse events)
export const SAVED_PLACES_INTERACTIVE_LAYERS = [
  SAVED_PLACES_LAYER_IDS.POINTS,
] as const;
