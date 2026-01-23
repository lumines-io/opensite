'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { TYPE_ICON_NAMES } from './construction-map.constants';

interface UseMapIconsOptions {
  mapRef: React.RefObject<MapRef | null>;
  loaded: boolean;
  styleLoaded?: number;
}

/**
 * Hook to load construction type icons into Mapbox
 * Icons are loaded from /public/icons/ directory
 */
export function useMapIcons({ mapRef, loaded, styleLoaded }: UseMapIconsOptions) {
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const loadingRef = useRef(false);
  const lastStyleLoadedRef = useRef<number | undefined>(undefined);

  const loadIcons = useCallback(async (map: mapboxgl.Map) => {
    // Prevent concurrent loads
    if (loadingRef.current) return;
    loadingRef.current = true;

    const iconIds = Object.values(TYPE_ICON_NAMES);
    const loadPromises: Promise<void>[] = [];

    for (const iconId of iconIds) {
      // Skip if icon already exists
      if (map.hasImage(iconId)) continue;

      const promise = new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            if (!map.hasImage(iconId)) {
              map.addImage(iconId, img, { pixelRatio: 2 });
            }
            resolve();
          } catch (error) {
            console.error(`Failed to add icon ${iconId}:`, error);
            reject(error);
          }
        };

        img.onerror = (error) => {
          console.error(`Failed to load icon ${iconId}:`, error);
          reject(error);
        };

        // Load from public directory
        img.src = `/icons/${iconId}.svg`;
      });

      loadPromises.push(promise);
    }

    try {
      await Promise.all(loadPromises);
      setIconsLoaded(true);
    } catch {
      console.error('Some icons failed to load');
      // Still mark as loaded to allow map to render
      setIconsLoaded(true);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // Reset iconsLoaded when styleLoaded changes (theme switch)
  useEffect(() => {
    if (styleLoaded !== undefined && styleLoaded !== lastStyleLoadedRef.current) {
      if (lastStyleLoadedRef.current !== undefined) {
        // Only reset if this isn't the initial load
        setIconsLoaded(false);
      }
      lastStyleLoadedRef.current = styleLoaded;
    }
  }, [styleLoaded]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !loaded) return;

    const handleStyleLoad = () => {
      loadIcons(map);
    };

    // Check if style is already loaded
    if (map.isStyleLoaded()) {
      loadIcons(map);
    } else {
      map.on('style.load', handleStyleLoad);
    }

    // Also handle missing images
    const handleMissingImage = (e: { id: string }) => {
      const iconIds = Object.values(TYPE_ICON_NAMES);
      if (iconIds.includes(e.id)) {
        loadIcons(map);
      }
    };

    map.on('styleimagesmissing', handleMissingImage);

    return () => {
      map.off('style.load', handleStyleLoad);
      map.off('styleimagesmissing', handleMissingImage);
    };
  }, [mapRef, loaded, styleLoaded, loadIcons]);

  return { iconsLoaded };
}
