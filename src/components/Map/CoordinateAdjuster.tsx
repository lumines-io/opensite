'use client';

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Map, { NavigationControl, Marker } from 'react-map-gl/mapbox';
import type { MapRef, MarkerDragEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface CoordinatePoint {
  id: string;
  longitude: number;
  latitude: number;
  label?: string;
  color?: string;
}

export interface CoordinateAdjusterProps {
  accessToken: string;
  points: CoordinatePoint[];
  onPointChange?: (pointId: string, longitude: number, latitude: number) => void;
  center?: [number, number];
  zoom?: number;
  mapStyle?: 'streets' | 'satellite' | 'dark';
  height?: string;
  readOnly?: boolean;
}

export interface CoordinateAdjusterRef {
  getPoints: () => CoordinatePoint[];
  resetPoint: (pointId: string) => void;
  fitToPoints: () => void;
}

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

export const CoordinateAdjuster = forwardRef<CoordinateAdjusterRef, CoordinateAdjusterProps>(({
  accessToken,
  points,
  onPointChange,
  center,
  zoom = 14,
  mapStyle = 'streets',
  height = '400px',
  readOnly = false,
}, ref) => {
  const mapRef = useRef<MapRef>(null);
  const [localPoints, setLocalPoints] = useState<CoordinatePoint[]>(points);
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);

  // Update local points when props change
  useEffect(() => {
    setLocalPoints(points);
  }, [points]);

  // Calculate center from points if not provided
  const calculatedCenter = center || (() => {
    if (localPoints.length === 0) return [106.6297, 10.8231] as [number, number];
    const avgLng = localPoints.reduce((sum, p) => sum + p.longitude, 0) / localPoints.length;
    const avgLat = localPoints.reduce((sum, p) => sum + p.latitude, 0) / localPoints.length;
    return [avgLng, avgLat] as [number, number];
  })();

  const handleDragStart = useCallback((pointId: string) => {
    setDraggedPointId(pointId);
  }, []);

  const handleDrag = useCallback((pointId: string, event: MarkerDragEvent) => {
    const { lng, lat } = event.lngLat;
    setLocalPoints(prev =>
      prev.map(p => p.id === pointId ? { ...p, longitude: lng, latitude: lat } : p)
    );
  }, []);

  const handleDragEnd = useCallback((pointId: string, event: MarkerDragEvent) => {
    const { lng, lat } = event.lngLat;
    setDraggedPointId(null);
    onPointChange?.(pointId, lng, lat);
  }, [onPointChange]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getPoints: () => localPoints,
    resetPoint: (pointId: string) => {
      const originalPoint = points.find(p => p.id === pointId);
      if (originalPoint) {
        setLocalPoints(prev =>
          prev.map(p => p.id === pointId ? originalPoint : p)
        );
        onPointChange?.(pointId, originalPoint.longitude, originalPoint.latitude);
      }
    },
    fitToPoints: () => {
      if (!mapRef.current || localPoints.length === 0) return;

      const bounds = localPoints.reduce(
        (acc, point) => ({
          minLng: Math.min(acc.minLng, point.longitude),
          maxLng: Math.max(acc.maxLng, point.longitude),
          minLat: Math.min(acc.minLat, point.latitude),
          maxLat: Math.max(acc.maxLat, point.latitude),
        }),
        { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
      );

      mapRef.current.fitBounds(
        [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
        { padding: 50, maxZoom: 16 }
      );
    },
  }), [localPoints, points, onPointChange]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border" style={{ height }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={accessToken}
        initialViewState={{
          longitude: calculatedCenter[0],
          latitude: calculatedCenter[1],
          zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLES[mapStyle]}
      >
        <NavigationControl position="top-right" />

        {localPoints.map((point) => (
          <Marker
            key={point.id}
            longitude={point.longitude}
            latitude={point.latitude}
            draggable={!readOnly}
            onDragStart={() => handleDragStart(point.id)}
            onDrag={(e) => handleDrag(point.id, e)}
            onDragEnd={(e) => handleDragEnd(point.id, e)}
          >
            <div
              className={`flex flex-col items-center ${draggedPointId === point.id ? 'scale-110' : ''} transition-transform`}
            >
              <div
                className={`w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-${readOnly ? 'default' : 'grab'} ${draggedPointId === point.id ? 'cursor-grabbing' : ''}`}
                style={{ backgroundColor: point.color || '#F59E0B' }}
              >
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              {point.label && (
                <span className="mt-1 px-2 py-0.5 bg-white/90 dark:bg-gray-800/90 rounded text-xs font-medium shadow-sm whitespace-nowrap">
                  {point.label}
                </span>
              )}
            </div>
          </Marker>
        ))}
      </Map>

      {/* Instructions */}
      {!readOnly && localPoints.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow px-3 py-2 text-sm">
          <span className="text-muted-foreground">Drag markers to adjust coordinates</span>
        </div>
      )}

      {/* Dragging indicator */}
      {draggedPointId && (
        <div className="absolute top-4 left-4 bg-amber-500 text-white rounded-lg shadow px-3 py-1.5 text-sm font-medium animate-pulse">
          Moving coordinate...
        </div>
      )}
    </div>
  );
});

CoordinateAdjuster.displayName = 'CoordinateAdjuster';
