'use client';

import { useState, useCallback, useRef } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { Search, X, ChevronDown } from 'lucide-react';
import { GOOGLE_MAPS_LIBRARIES } from './google-map.constants';
import type { Construction, ConstructionAlert, LatLng } from './google-map.types';

interface GoogleMapSearchPanelProps {
  apiKey: string;
  onLocationSelect: (center: LatLng, zoom: number) => void;
  onConstructionSelect?: (construction: Construction | ConstructionAlert) => void;
}

/**
 * Google Maps search panel with Places Autocomplete
 */
export function GoogleMapSearchPanel({
  apiKey,
  onLocationSelect,
  onConstructionSelect,
}: GoogleMapSearchPanelProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [nearbyConstructions, setNearbyConstructions] = useState<Construction[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(async () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        setQuery(place.formatted_address || place.name || '');
        onLocationSelect({ lat, lng }, 14);

        // Fetch nearby constructions
        setIsLoadingNearby(true);
        try {
          const response = await fetch(
            `/api/search/nearby?lat=${lat}&lng=${lng}&radius=2000`
          );
          if (response.ok) {
            const data = await response.json();
            setNearbyConstructions(data.constructions || []);
          }
        } catch (error) {
          console.error('Failed to fetch nearby constructions:', error);
        } finally {
          setIsLoadingNearby(false);
        }
      }
    }
  }, [onLocationSelect]);

  const handleClear = useCallback(() => {
    setQuery('');
    setNearbyConstructions([]);
  }, []);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
    setQuery('');
    setNearbyConstructions([]);
  }, []);

  const handleConstructionClick = useCallback(
    (construction: Construction) => {
      onConstructionSelect?.(construction);
    },
    [onConstructionSelect]
  );

  if (!isLoaded) return null;

  // Collapsed state - just show search icon button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="absolute top-20 left-4 z-10 w-10 h-10 bg-card shadow-lg rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
        aria-label="Mở tìm kiếm"
      >
        <Search className="w-5 h-5 text-foreground" />
      </button>
    );
  }

  // Expanded state - show full search panel
  return (
    <div className="absolute top-20 left-4 z-10 w-80 bg-card shadow-lg rounded-lg overflow-hidden">
      {/* Search input */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <Autocomplete
            onLoad={onLoad}
            onPlaceChanged={onPlaceChanged}
            options={{
              componentRestrictions: { country: 'vn' },
              fields: ['formatted_address', 'geometry', 'name', 'place_id'],
              types: ['geocode', 'establishment'],
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm địa điểm..."
              className="w-full pl-9 pr-16 py-2 text-sm bg-muted rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </Autocomplete>

          {/* Clear and close buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button
                onClick={handleClear}
                className="p-1 rounded hover:bg-background transition-colors"
                aria-label="Xóa"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-background transition-colors"
              aria-label="Đóng"
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Nearby constructions */}
      {(isLoadingNearby || nearbyConstructions.length > 0) && (
        <div className="max-h-[300px] overflow-y-auto">
          {isLoadingNearby ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
              <span className="text-sm">Đang tìm công trình gần đây...</span>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  Công trình gần đây ({nearbyConstructions.length})
                </span>
              </div>
              {nearbyConstructions.map((construction) => (
                <button
                  key={construction.id}
                  onClick={() => handleConstructionClick(construction)}
                  className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                >
                  <h4 className="text-sm font-medium text-card-foreground line-clamp-1">
                    {construction.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {construction.constructionType} • {construction.progress}%
                  </p>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
