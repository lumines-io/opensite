'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import {
  SOURCE_IDS,
  LAYER_IDS,
  CLUSTER_CONFIG,
  PULSE_CONFIG,
} from './construction-map.constants';
import {
  separateFeaturesByGeometry,
  buildTypeColorExpression,
  buildLineWidthExpression,
  buildRadiusExpression,
  buildOpacityExpression,
  buildStrokeWidthExpression,
  buildTypeIconExpression,
  buildLabelTextSizeExpression,
} from './construction-map.utils';

export interface VisibilityFilters {
  visibleTypes: Set<string>;
  visibleStatuses: Set<string>;
  visibleCategories: Set<string>;
}

interface UseMapLayersOptions {
  mapRef: React.RefObject<MapRef | null>;
  loaded: boolean;
  geojsonData: GeoJSON.FeatureCollection | null;
  styleLoaded?: number; // Counter that increments on style changes to trigger layer re-add
  filters?: VisibilityFilters;
}

/**
 * Helper to safely add or update a GeoJSON source
 */
function addOrUpdateSource(
  map: mapboxgl.Map,
  id: string,
  data: GeoJSON.FeatureCollection,
  options?: object
) {
  if (map.getSource(id)) {
    (map.getSource(id) as mapboxgl.GeoJSONSource).setData(data);
  } else {
    map.addSource(id, { type: 'geojson', data, ...options });
  }
}

/**
 * Helper to safely add a layer if it doesn't exist
 */
function addLayerIfNotExists(map: mapboxgl.Map, layer: mapboxgl.LayerSpecification) {
  if (!map.getLayer(layer.id)) {
    map.addLayer(layer);
  }
}

/**
 * Build filter expression based on visibility settings
 */
function buildVisibilityFilter(filters?: VisibilityFilters): mapboxgl.Expression | undefined {
  if (!filters) return undefined;

  const typeFilter: mapboxgl.Expression = [
    'in',
    ['get', 'constructionType'],
    ['literal', Array.from(filters.visibleTypes)],
  ];

  const statusFilter: mapboxgl.Expression = [
    'in',
    ['get', 'constructionStatus'],
    ['literal', Array.from(filters.visibleStatuses)],
  ];

  // Category filter - handle missing constructionCategory (default to 'public')
  const categoryFilter: mapboxgl.Expression = [
    'in',
    ['coalesce', ['get', 'constructionCategory'], 'public'],
    ['literal', Array.from(filters.visibleCategories)],
  ];

  return ['all', typeFilter, statusFilter, categoryFilter] as mapboxgl.Expression;
}

/**
 * Hook to manage construction map layers
 * Re-runs when styleLoaded changes to handle theme switching
 */
export function useMapLayers({ mapRef, loaded, geojsonData, styleLoaded, filters }: UseMapLayersOptions) {
  const animationRef = useRef<number | null>(null);

  // Animation function for pulsing effect
  const animatePulse = useCallback((map: mapboxgl.Map) => {
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = (elapsed % PULSE_CONFIG.DURATION) / PULSE_CONFIG.DURATION;

      // Sine wave for smooth pulsing (0 to 1 to 0)
      const pulseValue = Math.sin(progress * Math.PI);

      // Calculate pulse scale and opacity
      const pulseScale = 1 + (PULSE_CONFIG.SCALE_MAX - 1) * pulseValue;
      const pulseOpacity = PULSE_CONFIG.OPACITY_MAX - (PULSE_CONFIG.OPACITY_MAX - PULSE_CONFIG.OPACITY_MIN) * pulseValue;

      // Update pulse layers
      if (map.getLayer(LAYER_IDS.POINTS_PULSE)) {
        map.setPaintProperty(LAYER_IDS.POINTS_PULSE, 'circle-radius', 12 * pulseScale);
        map.setPaintProperty(LAYER_IDS.POINTS_PULSE, 'circle-opacity', pulseOpacity);
      }

      if (map.getLayer(LAYER_IDS.LINES_PULSE)) {
        map.setPaintProperty(LAYER_IDS.LINES_PULSE, 'line-width', 12 * pulseScale);
        map.setPaintProperty(LAYER_IDS.LINES_PULSE, 'line-opacity', pulseOpacity * 0.5);
      }

      if (map.getLayer(LAYER_IDS.POLYGONS_PULSE)) {
        map.setPaintProperty(LAYER_IDS.POLYGONS_PULSE, 'fill-opacity', pulseOpacity * 0.3);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !loaded || !geojsonData) return;

    // Separate features by geometry type
    const { points, lines, polygons } = separateFeaturesByGeometry(geojsonData.features);

    // Build expressions
    const typeColorExpr = buildTypeColorExpression();
    const typeLineWidthExpr = buildLineWidthExpression();
    const typeRadiusExpr = buildRadiusExpression();

    // Build visibility filter (no zoom-based filtering anymore)
    const visibilityFilter = buildVisibilityFilter(filters);

    // Add sources
    addOrUpdateSource(
      map,
      SOURCE_IDS.POINTS,
      { type: 'FeatureCollection', features: points },
      {
        cluster: true,
        clusterMaxZoom: CLUSTER_CONFIG.maxZoom,
        clusterRadius: CLUSTER_CONFIG.radius,
      }
    );

    addOrUpdateSource(
      map,
      SOURCE_IDS.POLYGONS,
      { type: 'FeatureCollection', features: polygons }
    );

    addOrUpdateSource(
      map,
      SOURCE_IDS.LINES,
      { type: 'FeatureCollection', features: lines }
    );

    // === PULSE LAYERS (added first, below main layers) ===

    // Polygon pulse layer
    addLayerIfNotExists(map, {
      id: LAYER_IDS.POLYGONS_PULSE,
      type: 'fill',
      source: SOURCE_IDS.POLYGONS,
      ...(visibilityFilter ? { filter: visibilityFilter } : {}),
      paint: {
        'fill-color': typeColorExpr,
        'fill-opacity': PULSE_CONFIG.OPACITY_MAX * 0.3,
      },
    });

    // Line pulse layer
    addLayerIfNotExists(map, {
      id: LAYER_IDS.LINES_PULSE,
      type: 'line',
      source: SOURCE_IDS.LINES,
      ...(visibilityFilter ? { filter: visibilityFilter } : {}),
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': typeColorExpr,
        'line-width': 12,
        'line-opacity': PULSE_CONFIG.OPACITY_MAX * 0.5,
      },
    });

    // Points pulse layer (for non-clustered points)
    addLayerIfNotExists(map, {
      id: LAYER_IDS.POINTS_PULSE,
      type: 'circle',
      source: SOURCE_IDS.POINTS,
      filter: visibilityFilter
        ? ['all', ['!', ['has', 'point_count']], visibilityFilter]
        : ['!', ['has', 'point_count']],
      paint: {
        'circle-color': typeColorExpr,
        'circle-radius': 12,
        'circle-opacity': PULSE_CONFIG.OPACITY_MAX,
        'circle-stroke-width': 0,
      },
    });

    // === MAIN LAYERS ===

    // Add polygon fill layer
    addLayerIfNotExists(map, {
      id: LAYER_IDS.POLYGONS,
      type: 'fill',
      source: SOURCE_IDS.POLYGONS,
      ...(visibilityFilter ? { filter: visibilityFilter } : {}),
      paint: {
        'fill-color': typeColorExpr,
        'fill-opacity': buildOpacityExpression(0.2, 0.5),
      },
    });

    // Add polygon outline layer
    addLayerIfNotExists(map, {
      id: LAYER_IDS.POLYGON_OUTLINES,
      type: 'line',
      source: SOURCE_IDS.POLYGONS,
      ...(visibilityFilter ? { filter: visibilityFilter } : {}),
      paint: {
        'line-color': typeColorExpr,
        'line-width': buildStrokeWidthExpression(),
      },
    });

    // Add line layer
    addLayerIfNotExists(map, {
      id: LAYER_IDS.LINES,
      type: 'line',
      source: SOURCE_IDS.LINES,
      ...(visibilityFilter ? { filter: visibilityFilter } : {}),
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': typeColorExpr,
        'line-width': typeLineWidthExpr,
        'line-opacity': buildOpacityExpression(0.6, 1),
      },
    });

    // Add line icons layer (construction type icons along the line)
    addLayerIfNotExists(map, {
      id: LAYER_IDS.LINES_ICONS,
      type: 'symbol',
      source: SOURCE_IDS.LINES,
      ...(visibilityFilter ? { filter: visibilityFilter } : {}),
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 200,
        'icon-image': buildTypeIconExpression(),
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          14, 1.3,
          16, 1.7,
          18, 2.0,
        ],
        'icon-allow-overlap': false,
        'icon-ignore-placement': false,
        'icon-pitch-alignment': 'viewport',
        'icon-rotation-alignment': 'viewport',
      },
      paint: {
        'icon-opacity': buildOpacityExpression(0.9, 1),
      },
    });

    // Add line labels layer (project name along the line)
    addLayerIfNotExists(map, {
      id: LAYER_IDS.LINES_LABELS,
      type: 'symbol',
      source: SOURCE_IDS.LINES,
      ...(visibilityFilter ? { filter: visibilityFilter } : {}),
      layout: {
        'symbol-placement': 'line-center',
        'text-field': ['get', 'title'],
        'text-size': buildLabelTextSizeExpression(),
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
        'text-anchor': 'center',
        'text-max-width': 10,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-pitch-alignment': 'viewport',
        'text-rotation-alignment': 'map',
        'text-offset': [0, -1.5],
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 1,
        'text-opacity': buildOpacityExpression(0.7, 1),
      },
    });

    // Add cluster circles
    addLayerIfNotExists(map, {
      id: LAYER_IDS.CLUSTERS,
      type: 'circle',
      source: SOURCE_IDS.POINTS,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          10, '#f1f075',
          50, '#f28cb1',
        ],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, ['step', ['get', 'point_count'], 12, 10, 18, 50, 24],
          14, ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
        ],
      },
    });

    // Add cluster count labels
    addLayerIfNotExists(map, {
      id: LAYER_IDS.CLUSTER_COUNT,
      type: 'symbol',
      source: SOURCE_IDS.POINTS,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 12],
      },
    });

    // Add individual points layer
    addLayerIfNotExists(map, {
      id: LAYER_IDS.POINTS,
      type: 'circle',
      source: SOURCE_IDS.POINTS,
      filter: visibilityFilter
        ? ['all', ['!', ['has', 'point_count']], visibilityFilter]
        : ['!', ['has', 'point_count']],
      paint: {
        'circle-color': typeColorExpr,
        'circle-radius': typeRadiusExpr,
        'circle-stroke-width': buildStrokeWidthExpression(),
        'circle-stroke-color': '#ffffff',
        'circle-opacity': buildOpacityExpression(0.7, 1),
      },
    });

    // Start pulse animation
    animatePulse(map);

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      const layerIds = [
        LAYER_IDS.POINTS,
        LAYER_IDS.POINTS_PULSE,
        LAYER_IDS.CLUSTER_COUNT,
        LAYER_IDS.CLUSTERS,
        LAYER_IDS.LINES,
        LAYER_IDS.LINES_PULSE,
        LAYER_IDS.LINES_ICONS,
        LAYER_IDS.LINES_LABELS,
        LAYER_IDS.POLYGON_OUTLINES,
        LAYER_IDS.POLYGONS,
        LAYER_IDS.POLYGONS_PULSE,
      ];
      const sourceIds = [SOURCE_IDS.POINTS, SOURCE_IDS.LINES, SOURCE_IDS.POLYGONS];

      for (const id of layerIds) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of sourceIds) {
        if (map.getSource(id)) map.removeSource(id);
      }
    };
  }, [mapRef, loaded, geojsonData, styleLoaded, filters, animatePulse]);
}

/**
 * Hook to update layer filters when visibility settings change
 */
export function useLayerFilters(
  mapRef: React.RefObject<MapRef | null>,
  loaded: boolean,
  filters?: VisibilityFilters
) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !loaded) return;

    const visibilityFilter = buildVisibilityFilter(filters);

    // Update filters on all relevant layers
    const layersToUpdate = [
      LAYER_IDS.POLYGONS,
      LAYER_IDS.POLYGONS_PULSE,
      LAYER_IDS.POLYGON_OUTLINES,
      LAYER_IDS.LINES,
      LAYER_IDS.LINES_PULSE,
      LAYER_IDS.LINES_ICONS,
      LAYER_IDS.LINES_LABELS,
    ];

    for (const layerId of layersToUpdate) {
      if (map.getLayer(layerId)) {
        map.setFilter(layerId, visibilityFilter || null);
      }
    }

    // Points layers need special handling (combine with cluster filter)
    const pointsFilter = visibilityFilter
      ? ['all', ['!', ['has', 'point_count']], visibilityFilter]
      : ['!', ['has', 'point_count']];

    if (map.getLayer(LAYER_IDS.POINTS)) {
      map.setFilter(LAYER_IDS.POINTS, pointsFilter as mapboxgl.FilterSpecification);
    }
    if (map.getLayer(LAYER_IDS.POINTS_PULSE)) {
      map.setFilter(LAYER_IDS.POINTS_PULSE, pointsFilter as mapboxgl.FilterSpecification);
    }
  }, [mapRef, loaded, filters]);
}

interface RouteAlert {
  id: number;
  center?: [number, number];
  title: string;
  constructionStatus: string;
  constructionType: string;
  progress: number;
  distance: number;
}

interface UseRouteLayerOptions {
  mapRef: React.RefObject<MapRef | null>;
  loaded: boolean;
  route: GeoJSON.LineString | null;
  routeAlerts?: RouteAlert[];
  styleLoaded?: number; // Counter that increments on style changes to trigger layer re-add
}

/**
 * Hook to manage route layer
 * Re-runs when styleLoaded changes to handle theme switching
 */
export function useRouteLayer({ mapRef, loaded, route, routeAlerts = [], styleLoaded }: UseRouteLayerOptions) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !loaded) return;

    // Remove existing route layers/sources
    if (map.getLayer(LAYER_IDS.ROUTE)) map.removeLayer(LAYER_IDS.ROUTE);
    if (map.getLayer(LAYER_IDS.ROUTE_OUTLINE)) map.removeLayer(LAYER_IDS.ROUTE_OUTLINE);
    if (map.getLayer(LAYER_IDS.ROUTE_ALERTS)) map.removeLayer(LAYER_IDS.ROUTE_ALERTS);
    if (map.getLayer(LAYER_IDS.ROUTE_ALERTS_PULSE)) map.removeLayer(LAYER_IDS.ROUTE_ALERTS_PULSE);
    if (map.getSource(SOURCE_IDS.ROUTE)) map.removeSource(SOURCE_IDS.ROUTE);
    if (map.getSource(SOURCE_IDS.ROUTE_ALERTS)) map.removeSource(SOURCE_IDS.ROUTE_ALERTS);

    // Add new route if provided
    if (route) {
      const routeData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: route,
        }],
      };

      map.addSource(SOURCE_IDS.ROUTE, {
        type: 'geojson',
        data: routeData,
      });

      // Add route outline (for contrast)
      map.addLayer({
        id: LAYER_IDS.ROUTE_OUTLINE,
        type: 'line',
        source: SOURCE_IDS.ROUTE,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#1e40af',
          'line-width': 8,
          'line-opacity': 0.5,
        },
      });

      // Add route line
      map.addLayer({
        id: LAYER_IDS.ROUTE,
        type: 'line',
        source: SOURCE_IDS.ROUTE,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 5,
        },
      });

      // Add route alerts markers if available
      if (routeAlerts.length > 0) {
        const alertFeatures: GeoJSON.Feature[] = routeAlerts
          .filter(alert => alert.center)
          .map(alert => ({
            type: 'Feature',
            properties: {
              id: alert.id,
              title: alert.title,
              constructionStatus: alert.constructionStatus,
              constructionType: alert.constructionType,
              progress: alert.progress,
              distance: alert.distance,
            },
            geometry: {
              type: 'Point',
              coordinates: alert.center!,
            },
          }));

        if (alertFeatures.length > 0) {
          map.addSource(SOURCE_IDS.ROUTE_ALERTS, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: alertFeatures,
            },
          });

          // Add pulse circle (outer)
          map.addLayer({
            id: LAYER_IDS.ROUTE_ALERTS_PULSE,
            type: 'circle',
            source: SOURCE_IDS.ROUTE_ALERTS,
            paint: {
              'circle-radius': 18,
              'circle-color': '#f59e0b',
              'circle-opacity': 0.3,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#f59e0b',
              'circle-stroke-opacity': 0.5,
            },
          });

          // Add alert markers
          map.addLayer({
            id: LAYER_IDS.ROUTE_ALERTS,
            type: 'circle',
            source: SOURCE_IDS.ROUTE_ALERTS,
            paint: {
              'circle-radius': 10,
              'circle-color': [
                'match',
                ['get', 'constructionStatus'],
                'in-progress', '#f59e0b',
                'paused', '#ef4444',
                'completed', '#10b981',
                '#6b7280',
              ],
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff',
            },
          });
        }
      }

      // Fit map to route bounds
      const coords = route.coordinates as [number, number][];
      if (coords.length > 0) {
        const bounds = coords.reduce(
          (acc, coord) => ({
            minLng: Math.min(acc.minLng, coord[0]),
            maxLng: Math.max(acc.maxLng, coord[0]),
            minLat: Math.min(acc.minLat, coord[1]),
            maxLat: Math.max(acc.maxLat, coord[1]),
          }),
          { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
        );

        map.fitBounds(
          [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
          { padding: 50 }
        );
      }
    }

    return () => {
      if (map.getLayer(LAYER_IDS.ROUTE)) map.removeLayer(LAYER_IDS.ROUTE);
      if (map.getLayer(LAYER_IDS.ROUTE_OUTLINE)) map.removeLayer(LAYER_IDS.ROUTE_OUTLINE);
      if (map.getLayer(LAYER_IDS.ROUTE_ALERTS)) map.removeLayer(LAYER_IDS.ROUTE_ALERTS);
      if (map.getLayer(LAYER_IDS.ROUTE_ALERTS_PULSE)) map.removeLayer(LAYER_IDS.ROUTE_ALERTS_PULSE);
      if (map.getSource(SOURCE_IDS.ROUTE)) map.removeSource(SOURCE_IDS.ROUTE);
      if (map.getSource(SOURCE_IDS.ROUTE_ALERTS)) map.removeSource(SOURCE_IDS.ROUTE_ALERTS);
    };
  }, [mapRef, loaded, route, routeAlerts, styleLoaded]);
}
