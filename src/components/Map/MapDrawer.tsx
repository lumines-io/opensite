'use client';

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Map, { NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// Drawing modes
export type DrawMode = 'simple_select' | 'direct_select' | 'draw_point' | 'draw_line_string' | 'draw_polygon';

export interface MapDrawerProps {
  accessToken: string;
  initialGeometry?: GeoJSON.Geometry | null;
  onGeometryChange?: (geometry: GeoJSON.Geometry | null) => void;
  center?: [number, number];
  zoom?: number;
  drawMode?: DrawMode;
  showControls?: boolean;
  snapToRoad?: boolean;
  mapStyle?: 'streets' | 'satellite' | 'dark';
}

export interface MapDrawerRef {
  getGeometry: () => GeoJSON.Geometry | null;
  setGeometry: (geometry: GeoJSON.Geometry | null) => void;
  setMode: (mode: DrawMode) => void;
  clearAll: () => void;
  snapToRoad: () => Promise<void>;
}

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

export const MapDrawer = forwardRef<MapDrawerRef, MapDrawerProps>(({
  accessToken,
  initialGeometry,
  onGeometryChange,
  center = [106.6297, 10.8231], // HCMC center
  zoom = 12,
  drawMode = 'simple_select',
  showControls = true,
  snapToRoad = false,
  mapStyle = 'streets',
}, ref) => {
  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [currentMode, setCurrentMode] = useState<DrawMode>(drawMode);
  const [isSnapping, setIsSnapping] = useState(false);

  // Initialize draw control
  useEffect(() => {
    if (!mapRef.current || !loaded) return;

    const map = mapRef.current.getMap();

    // Create draw control
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: showControls ? {
        point: true,
        line_string: true,
        polygon: true,
        trash: true,
      } : {},
      defaultMode: drawMode,
      styles: [
        // Line styles
        {
          id: 'gl-draw-line',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
          paint: {
            'line-color': '#F59E0B',
            'line-width': 4,
          },
        },
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#F59E0B',
            'fill-opacity': 0.2,
          },
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'line-color': '#F59E0B',
            'line-width': 3,
          },
        },
        // Points
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#F59E0B',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        },
        // Vertex points
        {
          id: 'gl-draw-point-vertex',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#F59E0B',
          },
        },
        // Midpoints
        {
          id: 'gl-draw-point-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: {
            'circle-radius': 4,
            'circle-color': '#F59E0B',
          },
        },
      ],
    });

    map.addControl(draw, 'top-left');
    drawRef.current = draw;

    // Load initial geometry
    if (initialGeometry) {
      const feature: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: initialGeometry,
      };
      draw.add(feature);
    }

    // Listen for draw events
    const handleCreate = () => updateGeometry();
    const handleUpdate = () => updateGeometry();
    const handleDelete = () => updateGeometry();

    map.on('draw.create', handleCreate);
    map.on('draw.update', handleUpdate);
    map.on('draw.delete', handleDelete);

    return () => {
      map.off('draw.create', handleCreate);
      map.off('draw.update', handleUpdate);
      map.off('draw.delete', handleDelete);
      if (drawRef.current) {
        map.removeControl(drawRef.current);
        drawRef.current = null;
      }
    };
  }, [loaded, showControls, drawMode, initialGeometry]);

  // Update parent when geometry changes
  const updateGeometry = useCallback(() => {
    if (!drawRef.current) return;

    const data = drawRef.current.getAll();
    if (data.features.length === 0) {
      onGeometryChange?.(null);
    } else {
      // Combine all features into a single geometry
      const feature = data.features[0];
      onGeometryChange?.(feature.geometry);
    }
  }, [onGeometryChange]);

  // Snap to road using Mapbox Map Matching API
  const handleSnapToRoad = useCallback(async () => {
    if (!drawRef.current || !accessToken) return;

    const data = drawRef.current.getAll();
    if (data.features.length === 0) return;

    const feature = data.features[0];
    if (feature.geometry.type !== 'LineString') {
      console.warn('Snap to road only works with LineString geometries');
      return;
    }

    const coordinates = feature.geometry.coordinates;
    if (coordinates.length < 2) return;

    setIsSnapping(true);

    try {
      // Mapbox Map Matching API (max 100 coordinates per request)
      const coordString = coordinates
        .slice(0, 100)
        .map((c) => `${c[0]},${c[1]}`)
        .join(';');

      const response = await fetch(
        `https://api.mapbox.com/matching/v5/mapbox/driving/${coordString}?geometries=geojson&overview=full&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error('Map matching failed');
      }

      const result = await response.json();

      if (result.matchings && result.matchings.length > 0) {
        const matchedGeometry = result.matchings[0].geometry;

        // Clear existing and add snapped geometry
        drawRef.current.deleteAll();
        const newFeature: GeoJSON.Feature = {
          type: 'Feature',
          properties: {},
          geometry: matchedGeometry,
        };
        drawRef.current.add(newFeature);
        updateGeometry();
      }
    } catch (error) {
      console.error('Snap to road error:', error);
    } finally {
      setIsSnapping(false);
    }
  }, [accessToken, updateGeometry]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getGeometry: () => {
      if (!drawRef.current) return null;
      const data = drawRef.current.getAll();
      return data.features.length > 0 ? data.features[0].geometry : null;
    },
    setGeometry: (geometry: GeoJSON.Geometry | null) => {
      if (!drawRef.current) return;
      drawRef.current.deleteAll();
      if (geometry) {
        const feature: GeoJSON.Feature = {
          type: 'Feature',
          properties: {},
          geometry,
        };
        drawRef.current.add(feature);
      }
    },
    setMode: (mode: DrawMode) => {
      if (!drawRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (drawRef.current as any).changeMode(mode);
      setCurrentMode(mode);
    },
    clearAll: () => {
      if (!drawRef.current) return;
      drawRef.current.deleteAll();
      updateGeometry();
    },
    snapToRoad: handleSnapToRoad,
  }), [updateGeometry, handleSnapToRoad]);

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={accessToken}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLES[mapStyle]}
        onLoad={() => setLoaded(true)}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
      </Map>

      {/* Drawing toolbar */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 flex gap-2">
        <button
          onClick={() => {
            drawRef.current?.changeMode('draw_point');
            setCurrentMode('draw_point');
          }}
          className={`p-2 rounded ${currentMode === 'draw_point' ? 'bg-amber-500 text-white' : 'hover:bg-gray-100'}`}
          title="Draw Point"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="4" />
          </svg>
        </button>
        <button
          onClick={() => {
            drawRef.current?.changeMode('draw_line_string');
            setCurrentMode('draw_line_string');
          }}
          className={`p-2 rounded ${currentMode === 'draw_line_string' ? 'bg-amber-500 text-white' : 'hover:bg-gray-100'}`}
          title="Draw Line"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l6-6 6 6" />
          </svg>
        </button>
        <button
          onClick={() => {
            drawRef.current?.changeMode('draw_polygon');
            setCurrentMode('draw_polygon');
          }}
          className={`p-2 rounded ${currentMode === 'draw_polygon' ? 'bg-amber-500 text-white' : 'hover:bg-gray-100'}`}
          title="Draw Polygon"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h12v12H4z" />
          </svg>
        </button>
        <div className="w-px bg-gray-300" />
        <button
          onClick={() => {
            drawRef.current?.changeMode('simple_select');
            setCurrentMode('simple_select');
          }}
          className={`p-2 rounded ${currentMode === 'simple_select' ? 'bg-amber-500 text-white' : 'hover:bg-gray-100'}`}
          title="Select"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-5-5m0 0l-5 5m5-5V3" />
          </svg>
        </button>
        <button
          onClick={() => {
            drawRef.current?.trash();
            updateGeometry();
          }}
          className="p-2 rounded hover:bg-red-100 text-red-600"
          title="Delete Selected"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        {snapToRoad && (
          <>
            <div className="w-px bg-gray-300" />
            <button
              onClick={handleSnapToRoad}
              disabled={isSnapping}
              className="p-2 rounded hover:bg-blue-100 text-blue-600 disabled:opacity-50"
              title="Snap to Road"
            >
              {isSnapping ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>

      {/* Mode indicator */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow px-3 py-1.5 text-sm">
        <span className="text-gray-500">Mode:</span>{' '}
        <span className="font-medium">
          {currentMode === 'draw_point' && 'Drawing Point'}
          {currentMode === 'draw_line_string' && 'Drawing Line'}
          {currentMode === 'draw_polygon' && 'Drawing Polygon'}
          {currentMode === 'simple_select' && 'Select'}
          {currentMode === 'direct_select' && 'Edit Vertices'}
        </span>
      </div>
    </div>
  );
});

MapDrawer.displayName = 'MapDrawer';
