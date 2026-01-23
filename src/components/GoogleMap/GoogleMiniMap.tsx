'use client';

import { useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useTheme } from '../ThemeProvider';
import {
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAP_DARK_STYLE,
  GOOGLE_MAP_LIGHT_STYLE,
} from './google-map.constants';
import type { GoogleMiniMapProps } from './google-map.types';

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const DEFAULT_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'none',
  clickableIcons: false,
  draggable: false,
  scrollwheel: false,
  disableDoubleClickZoom: true,
};

/**
 * GoogleMiniMap - Small static map for detail pages
 * Non-interactive, shows single marker at construction location
 */
export function GoogleMiniMap({
  apiKey,
  center,
  zoom = 14,
  markerTitle,
}: GoogleMiniMapProps) {
  const { theme } = useTheme();
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Apply theme styles
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({
        styles: theme === 'dark' ? GOOGLE_MAP_DARK_STYLE : GOOGLE_MAP_LIGHT_STYLE,
      });
    }
  }, [theme]);

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      map.setOptions({
        styles: theme === 'dark' ? GOOGLE_MAP_DARK_STYLE : GOOGLE_MAP_LIGHT_STYLE,
      });
    },
    [theme]
  );

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <span className="text-sm text-muted-foreground">
          Không thể tải bản đồ
        </span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={zoom}
      onLoad={handleMapLoad}
      options={DEFAULT_MAP_OPTIONS}
    >
      <Marker position={center} title={markerTitle} />
    </GoogleMap>
  );
}
