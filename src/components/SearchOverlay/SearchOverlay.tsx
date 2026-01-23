'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Search, Loader2, MapPin } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '@/lib/construction-utils';
import { useAnimatedVisibility } from '@/hooks/useAnimatedVisibility';
import { useListNavigation } from '@/hooks/useListNavigation';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import type { SearchResult, Construction } from '@/types/construction';

interface NearbyConstruction extends Construction {
  distance: number; // in km
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (center: [number, number], zoom: number) => void;
  onConstructionSelect?: (construction: Construction) => void;
  accessToken: string;
}

export function SearchOverlay({
  isOpen,
  onClose,
  onLocationSelect,
  onConstructionSelect,
  accessToken,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [nearbyConstructions, setNearbyConstructions] = useState<NearbyConstruction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [radius, setRadius] = useState(10); // km
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { shouldRender, isVisible } = useAnimatedVisibility(isOpen, 300);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  // Fetch nearby constructions (defined first so it can be used in handleSelectLocation)
  const fetchNearbyConstructions = useCallback(async (center: [number, number], radiusKm: number) => {
    setIsLoadingNearby(true);
    try {
      const response = await fetch(
        `/api/search/nearby?lng=${center[0]}&lat=${center[1]}&radius=${radiusKm}`
      );

      if (!response.ok) throw new Error('Failed to fetch nearby constructions');

      const data = await response.json();
      setNearbyConstructions(data.constructions || []);
    } catch (error) {
      console.error('Nearby search error:', error);
      setNearbyConstructions([]);
    } finally {
      setIsLoadingNearby(false);
    }
  }, []);

  // Handle selecting a location (from suggestions or recent)
  const handleSelectLocation = useCallback((result: SearchResult) => {
    setSelectedLocation(result);
    setQuery(result.place_name);
    setSuggestions([]);
    setShowRecentSearches(false);
    addRecentSearch(result);
    onLocationSelect(result.center, 14);
    // Fetch nearby constructions
    fetchNearbyConstructions(result.center, radius);
  }, [onLocationSelect, radius, addRecentSearch, fetchNearbyConstructions]);

  const {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown: handleListKeyDown,
  } = useListNavigation({
    items: suggestions.length > 0 ? suggestions : (showRecentSearches ? recentSearches : []),
    onSelect: handleSelectLocation,
    isOpen: suggestions.length > 0 || showRecentSearches,
  });

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search for address suggestions using Mapbox Geocoding API
  const searchAddress = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    setShowRecentSearches(false);
    try {
      // Bias search towards HCMC area
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        `access_token=${accessToken}&` +
        `country=VN&` +
        `proximity=106.6297,10.8231&` +
        `types=address,poi,neighborhood,locality&` +
        `limit=5&` +
        `language=vi`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      setSuggestions(
        data.features.map((f: { id: string; place_name: string; center: [number, number] }) => ({
          id: f.id,
          place_name: f.place_name,
          center: f.center,
        }))
      );
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [accessToken]);

  // Debounced search
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (value.trim() === '') {
      setSuggestions([]);
      setShowRecentSearches(true);
    } else {
      debounceRef.current = setTimeout(() => {
        searchAddress(value);
      }, 300);
    }
  }, [searchAddress]);

  // Handle radius change
  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
    if (selectedLocation) {
      fetchNearbyConstructions(selectedLocation.center, newRadius);
    }
  }, [selectedLocation, fetchNearbyConstructions]);

  // Handle construction card click
  const handleConstructionClick = useCallback((construction: NearbyConstruction) => {
    if (onConstructionSelect && selectedLocation) {
      onConstructionSelect({
        ...construction,
        center: selectedLocation.center,
      });
    }
  }, [onConstructionSelect, selectedLocation]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (suggestions.length > 0 || showRecentSearches) {
        setSuggestions([]);
        setShowRecentSearches(false);
      } else {
        onClose();
      }
      return;
    }
    handleListKeyDown(e);
  }, [onClose, handleListKeyDown, suggestions.length, showRecentSearches]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    if (query.trim() === '' && recentSearches.length > 0) {
      setShowRecentSearches(true);
    }
  }, [query, recentSearches.length]);

  // Handle input blur
  const handleInputBlur = useCallback(() => {
    // Delay to allow click on suggestions
    setTimeout(() => {
      setShowRecentSearches(false);
    }, 200);
  }, []);

  if (!shouldRender) return null;

  const showDropdown = suggestions.length > 0 || (showRecentSearches && recentSearches.length > 0);
  const dropdownItems = suggestions.length > 0 ? suggestions : recentSearches;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 overlay-backdrop ${
          isVisible ? 'overlay-backdrop-visible' : 'overlay-backdrop-hidden'
        }`}
        onClick={onClose}
      />

      {/* Overlay panel */}
      <div
        className={`fixed top-0 left-0 h-full w-full sm:max-w-md bg-card shadow-xl z-50 flex flex-col overlay-panel-left ${
          isVisible ? 'overlay-panel-left-visible' : 'overlay-panel-left-hidden'
        }`}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-lg text-foreground">Tìm kiếm địa điểm</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Nhập địa chỉ, tên đường, hoặc địa điểm..."
              className="w-full px-4 py-3 pr-10 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            {isSearching ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            )}
          </div>

          {/* Suggestions dropdown */}
          {showDropdown && (
            <div className="absolute left-4 right-4 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
              {/* Recent searches header */}
              {suggestions.length === 0 && showRecentSearches && (
                <div className="px-3 py-2 text-caption text-muted-foreground border-b border-border flex justify-between items-center">
                  <span>Tìm kiếm gần đây</span>
                  <button
                    onClick={clearRecentSearches}
                    className="hover:text-foreground transition-colors"
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}
              {dropdownItems.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectLocation(result)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors ${
                    highlightedIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="text-label-lg text-foreground truncate">{result.place_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Radius selector */}
        {selectedLocation && (
          <div className="px-4 py-3 border-b border-border bg-muted">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-muted-foreground">Bán kính tìm kiếm:</span>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRadiusChange(r)}
                    className={`px-3 py-1 text-body-sm rounded transition-colors ${
                      radius === r
                        ? 'bg-amber-500 text-white'
                        : 'bg-card border border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {selectedLocation ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">
                  Công trình trong bán kính {radius} km
                </h3>
                {isLoadingNearby && (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                )}
              </div>

              {isLoadingNearby ? (
                <div className="space-y-3">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : nearbyConstructions.length === 0 ? (
                <p className="text-muted-foreground text-body-sm">Không tìm thấy công trình nào trong khu vực này.</p>
              ) : (
                <div className="space-y-3">
                  {nearbyConstructions.map((construction) => (
                    <div
                      key={construction.id}
                      className="p-3 bg-card border border-border rounded-lg hover:border-amber-400 cursor-pointer transition-colors"
                      onClick={() => handleConstructionClick(construction)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-label-lg text-foreground">{construction.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(construction.constructionStatus)}`} />
                            <span className="text-caption text-muted-foreground">{getStatusLabel(construction.constructionStatus)}</span>
                            <span className="text-caption text-muted-foreground">•</span>
                            <span className="text-caption text-muted-foreground">{construction.progress}%</span>
                          </div>
                        </div>
                        <span className="text-caption text-muted-foreground whitespace-nowrap ml-2">
                          {construction.distance.toFixed(1)} km
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
              <p className="text-body-sm">Tìm kiếm một địa điểm để xem các công trình gần đó</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
