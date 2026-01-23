'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useField, useFormFields } from '@payloadcms/ui';
import Map, { NavigationControl, GeolocateControl, Marker } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// Drawing modes
type DrawMode = 'simple_select' | 'direct_select' | 'draw_point' | 'draw_line_string' | 'draw_polygon';

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

// HCMC center coordinates
const DEFAULT_CENTER: [number, number] = [106.6297, 10.8231];
const DEFAULT_ZOOM = 12;

// Mapbox access token - read from environment or window
const getMapboxToken = (): string => {
  // Check for environment variable (server-side or build-time)
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  }
  // Check for window variable (client-side)
  if (typeof window !== 'undefined') {
    // @ts-expect-error - window.__ENV__ might be set by the app
    const envToken = window.__ENV__?.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (envToken) return envToken;

    // Fallback to checking process.env through Next.js
    const nextPublicToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (nextPublicToken) return nextPublicToken;
  }
  return '';
};

interface GeometryMapFieldProps {
  path: string;
  readOnly?: boolean;
}

export const GeometryMapField: React.FC<GeometryMapFieldProps> = ({ path, readOnly = false }) => {
  const { value, setValue } = useField<GeoJSON.Geometry | null>({ path });

  // Get the centroid field if available
  const centroidField = useFormFields(([fields]) => fields['centroid']);

  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [currentMode, setCurrentMode] = useState<DrawMode>('simple_select');
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'dark'>('streets');
  const [isSnapping, setIsSnapping] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editingJson, setEditingJson] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  // Load access token on client side
  useEffect(() => {
    const token = getMapboxToken();
    setAccessToken(token);
  }, []);

  // Calculate center from geometry
  const getCenter = useCallback((): [number, number] => {
    if (!value) return DEFAULT_CENTER;

    try {
      if (value.type === 'Point') {
        return [value.coordinates[0], value.coordinates[1]] as [number, number];
      }

      if (value.type === 'LineString') {
        const coords = value.coordinates;
        const midIndex = Math.floor(coords.length / 2);
        return [coords[midIndex][0], coords[midIndex][1]] as [number, number];
      }

      if (value.type === 'Polygon') {
        const coords = value.coordinates[0];
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        return [centerLng, centerLat];
      }

      // Check centroid field as fallback
      if (centroidField?.value && Array.isArray(centroidField.value) && centroidField.value.length === 2) {
        return centroidField.value as [number, number];
      }
    } catch {
      // Fall back to default
    }

    return DEFAULT_CENTER;
  }, [value, centroidField?.value]);

  // Initialize draw control when map loads
  useEffect(() => {
    if (!mapRef.current || !loaded || !showMap || readOnly) return;

    const map = mapRef.current.getMap();

    // Create draw control
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
      styles: [
        // Line styles
        {
          id: 'gl-draw-line',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
          },
        },
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.2,
          },
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'line-color': '#3b82f6',
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
            'circle-color': '#3b82f6',
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
            'circle-stroke-color': '#3b82f6',
          },
        },
        // Midpoints
        {
          id: 'gl-draw-point-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: {
            'circle-radius': 4,
            'circle-color': '#3b82f6',
          },
        },
      ],
    });

    map.addControl(draw, 'top-left');
    drawRef.current = draw;

    // Load initial geometry
    if (value) {
      const feature: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: value,
      };
      draw.add(feature);
    }

    // Listen for draw events
    const handleDrawChange = () => {
      if (!drawRef.current) return;
      const data = drawRef.current.getAll();
      if (data.features.length === 0) {
        setValue(null);
      } else {
        const feature = data.features[0];
        setValue(feature.geometry);
      }
    };

    map.on('draw.create', handleDrawChange);
    map.on('draw.update', handleDrawChange);
    map.on('draw.delete', handleDrawChange);

    return () => {
      map.off('draw.create', handleDrawChange);
      map.off('draw.update', handleDrawChange);
      map.off('draw.delete', handleDrawChange);
      if (drawRef.current) {
        map.removeControl(drawRef.current);
        drawRef.current = null;
      }
    };
  }, [loaded, showMap, readOnly, value, setValue]);

  // Snap to road using Mapbox Map Matching API
  const handleSnapToRoad = useCallback(async () => {
    if (!drawRef.current || !accessToken) return;

    const data = drawRef.current.getAll();
    if (data.features.length === 0) return;

    const feature = data.features[0];
    if (feature.geometry.type !== 'LineString') {
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
        setValue(matchedGeometry);
      }
    } catch (error) {
      console.error('Snap to road error:', error);
    } finally {
      setIsSnapping(false);
    }
  }, [accessToken, setValue]);

  // Change drawing mode
  const changeMode = useCallback((mode: DrawMode) => {
    if (drawRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (drawRef.current as any).changeMode(mode);
      setCurrentMode(mode);
    }
  }, []);

  // Clear all geometry
  const clearGeometry = useCallback(() => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      setValue(null);
    }
  }, [setValue]);

  // Handle JSON editing
  const handleJsonEdit = useCallback(() => {
    setJsonInput(value ? JSON.stringify(value, null, 2) : '');
    setEditingJson(true);
    setJsonError(null);
  }, [value]);

  const handleJsonSave = useCallback(() => {
    try {
      if (!jsonInput.trim()) {
        setValue(null);
        setEditingJson(false);
        setJsonError(null);
        return;
      }
      const parsed = JSON.parse(jsonInput);
      // Basic GeoJSON validation
      if (!parsed.type || !parsed.coordinates) {
        throw new Error('Invalid GeoJSON: must have "type" and "coordinates"');
      }
      const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
      if (!validTypes.includes(parsed.type)) {
        throw new Error(`Invalid geometry type: ${parsed.type}`);
      }
      setValue(parsed);
      setEditingJson(false);
      setJsonError(null);

      // Update map if showing
      if (drawRef.current && showMap) {
        drawRef.current.deleteAll();
        const feature: GeoJSON.Feature = {
          type: 'Feature',
          properties: {},
          geometry: parsed,
        };
        drawRef.current.add(feature);
      }
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, [jsonInput, setValue, showMap]);

  const handleJsonCancel = useCallback(() => {
    setEditingJson(false);
    setJsonError(null);
  }, []);

  // Get geometry type label
  const getGeometryLabel = (geometry: GeoJSON.Geometry | null): string => {
    if (!geometry) return 'No geometry';
    switch (geometry.type) {
      case 'Point':
        return `Point (${geometry.coordinates[0].toFixed(6)}, ${geometry.coordinates[1].toFixed(6)})`;
      case 'LineString':
        return `LineString (${geometry.coordinates.length} points)`;
      case 'Polygon':
        return `Polygon (${geometry.coordinates[0].length - 1} vertices)`;
      case 'MultiPoint':
        return `MultiPoint (${geometry.coordinates.length} points)`;
      case 'MultiLineString':
        return `MultiLineString (${geometry.coordinates.length} lines)`;
      case 'MultiPolygon':
        return `MultiPolygon (${geometry.coordinates.length} polygons)`;
      default:
        return geometry.type;
    }
  };

  if (!accessToken) {
    return (
      <div className="field-type json">
        <label className="field-label">
          Geometry
          <span className="field-description">GeoJSON geometry (Point, LineString, or Polygon)</span>
        </label>
        <div style={{
          padding: '16px',
          background: 'var(--theme-elevation-50)',
          borderRadius: '4px',
          border: '1px solid var(--theme-elevation-100)'
        }}>
          <p style={{ margin: 0, color: 'var(--theme-error-500)' }}>
            Mapbox access token not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN environment variable.
          </p>
          {/* Still show JSON editor as fallback */}
          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleJsonEdit}
              style={{
                padding: '8px 16px',
                background: 'var(--theme-elevation-100)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Edit as JSON
            </button>
          </div>
          {editingJson && (
            <div style={{ marginTop: '12px' }}>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '200px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '8px',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: '4px',
                  background: 'var(--theme-input-bg)',
                  color: 'var(--theme-text)',
                }}
                placeholder='{"type": "Point", "coordinates": [106.6297, 10.8231]}'
              />
              {jsonError && (
                <p style={{ color: 'var(--theme-error-500)', margin: '8px 0', fontSize: '13px' }}>
                  {jsonError}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleJsonSave}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--theme-success-500)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleJsonCancel}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--theme-elevation-100)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="field-type json">
      <label className="field-label">
        Geometry
        <span className="field-description" style={{ fontWeight: 'normal', marginLeft: '8px', color: 'var(--theme-elevation-400)' }}>
          GeoJSON geometry (Point, LineString, or Polygon)
        </span>
      </label>

      {/* Current value display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'var(--theme-elevation-50)',
        borderRadius: '4px',
        marginBottom: '12px',
        border: '1px solid var(--theme-elevation-100)'
      }}>
        <div style={{
          padding: '4px 8px',
          background: value ? 'var(--theme-success-100)' : 'var(--theme-elevation-100)',
          color: value ? 'var(--theme-success-600)' : 'var(--theme-elevation-500)',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          {getGeometryLabel(value)}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                style={{
                  padding: '6px 12px',
                  background: showMap ? 'var(--theme-elevation-500)' : 'var(--theme-elevation-100)',
                  color: showMap ? 'white' : 'inherit',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
                  <path d="M8 2v16" />
                  <path d="M16 6v16" />
                </svg>
                {showMap ? 'Hide Map' : 'Edit on Map'}
              </button>
              <button
                type="button"
                onClick={handleJsonEdit}
                style={{
                  padding: '6px 12px',
                  background: 'var(--theme-elevation-100)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                Edit JSON
              </button>
            </>
          )}
        </div>
      </div>

      {/* JSON Editor Modal */}
      {editingJson && (
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          background: 'var(--theme-elevation-50)',
          borderRadius: '4px',
          border: '1px solid var(--theme-elevation-100)'
        }}>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            disabled={readOnly}
            style={{
              width: '100%',
              minHeight: '200px',
              fontFamily: 'monospace',
              fontSize: '12px',
              padding: '8px',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: '4px',
              background: 'var(--theme-input-bg)',
              color: 'var(--theme-text)',
              resize: 'vertical',
            }}
            placeholder='{"type": "Point", "coordinates": [106.6297, 10.8231]}'
          />
          {jsonError && (
            <p style={{ color: 'var(--theme-error-500)', margin: '8px 0', fontSize: '13px' }}>
              {jsonError}
            </p>
          )}
          {!readOnly && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleJsonSave}
                style={{
                  padding: '8px 16px',
                  background: 'var(--theme-success-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleJsonCancel}
                style={{
                  padding: '8px 16px',
                  background: 'var(--theme-elevation-100)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map Editor */}
      {showMap && (
        <div style={{
          border: '1px solid var(--theme-elevation-100)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          {/* Map Toolbar */}
          {!readOnly && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'var(--theme-elevation-50)',
              borderBottom: '1px solid var(--theme-elevation-100)',
              flexWrap: 'wrap',
            }}>
              {/* Drawing tools */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => changeMode('draw_point')}
                  style={{
                    padding: '6px 10px',
                    background: currentMode === 'draw_point' ? 'var(--theme-elevation-500)' : 'var(--theme-elevation-100)',
                    color: currentMode === 'draw_point' ? 'white' : 'inherit',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title="Draw Point"
                >
                  Point
                </button>
                <button
                  type="button"
                  onClick={() => changeMode('draw_line_string')}
                  style={{
                    padding: '6px 10px',
                    background: currentMode === 'draw_line_string' ? 'var(--theme-elevation-500)' : 'var(--theme-elevation-100)',
                    color: currentMode === 'draw_line_string' ? 'white' : 'inherit',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title="Draw Line"
                >
                  Line
                </button>
                <button
                  type="button"
                  onClick={() => changeMode('draw_polygon')}
                  style={{
                    padding: '6px 10px',
                    background: currentMode === 'draw_polygon' ? 'var(--theme-elevation-500)' : 'var(--theme-elevation-100)',
                    color: currentMode === 'draw_polygon' ? 'white' : 'inherit',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title="Draw Polygon"
                >
                  Polygon
                </button>
              </div>

              <div style={{ width: '1px', height: '24px', background: 'var(--theme-elevation-200)' }} />

              {/* Selection tool */}
              <button
                type="button"
                onClick={() => changeMode('simple_select')}
                style={{
                  padding: '6px 10px',
                  background: currentMode === 'simple_select' ? 'var(--theme-elevation-500)' : 'var(--theme-elevation-100)',
                  color: currentMode === 'simple_select' ? 'white' : 'inherit',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
                title="Select & Edit"
              >
                Select
              </button>

              {/* Snap to road (for lines only) */}
              {value?.type === 'LineString' && (
                <button
                  type="button"
                  onClick={handleSnapToRoad}
                  disabled={isSnapping}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--theme-elevation-100)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isSnapping ? 'wait' : 'pointer',
                    fontSize: '12px',
                    opacity: isSnapping ? 0.6 : 1,
                  }}
                  title="Snap line to nearest road"
                >
                  {isSnapping ? 'Snapping...' : 'Snap to Road'}
                </button>
              )}

              {/* Clear button */}
              {value && (
                <button
                  type="button"
                  onClick={clearGeometry}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--theme-error-100)',
                    color: 'var(--theme-error-600)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title="Clear geometry"
                >
                  Clear
                </button>
              )}

              <div style={{ flex: 1 }} />

              {/* Map style selector */}
              <select
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value as 'streets' | 'satellite' | 'dark')}
                style={{
                  padding: '6px 8px',
                  background: 'var(--theme-elevation-100)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <option value="streets">Streets</option>
                <option value="satellite">Satellite</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          )}

          {/* Map Container */}
          <div style={{ height: '400px', position: 'relative' }}>
            <Map
              ref={mapRef}
              mapboxAccessToken={accessToken}
              initialViewState={{
                longitude: getCenter()[0],
                latitude: getCenter()[1],
                zoom: value ? 14 : DEFAULT_ZOOM,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle={MAP_STYLES[mapStyle]}
              onLoad={() => setLoaded(true)}
            >
              <NavigationControl position="top-right" />
              <GeolocateControl position="top-right" />

              {/* Show marker for point geometry in read-only mode */}
              {readOnly && value?.type === 'Point' && (
                <Marker
                  longitude={value.coordinates[0]}
                  latitude={value.coordinates[1]}
                  color="#3b82f6"
                />
              )}
            </Map>

            {/* Mode indicator */}
            {!readOnly && loaded && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                fontSize: '12px',
              }}>
                <span style={{ color: '#666' }}>Mode:</span>{' '}
                <span style={{ fontWeight: 500 }}>
                  {currentMode === 'draw_point' && 'Drawing Point'}
                  {currentMode === 'draw_line_string' && 'Drawing Line (click to add points, double-click to finish)'}
                  {currentMode === 'draw_polygon' && 'Drawing Polygon (click to add points, double-click to finish)'}
                  {currentMode === 'simple_select' && 'Select & Move'}
                  {currentMode === 'direct_select' && 'Edit Vertices'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeometryMapField;
