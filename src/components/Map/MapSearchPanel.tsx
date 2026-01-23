'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getStatusColor, getStatusLabel } from '@/lib/construction-utils';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useListNavigation } from '@/hooks/useListNavigation';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import type { SearchResult, Construction } from '@/types/construction';

interface NearbyConstruction extends Construction {
  distance: number;
}

interface MapSearchPanelProps {
  accessToken: string;
  onLocationSelect: (center: [number, number], zoom: number) => void;
  onConstructionSelect?: (construction: Construction) => void;
}

export function MapSearchPanel({
  accessToken,
  onLocationSelect,
  onConstructionSelect,
}: MapSearchPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [nearbyConstructions, setNearbyConstructions] = useState<NearbyConstruction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [radius, setRadius] = useState(10);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  // Fetch nearby constructions
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

  // Handle selecting a location
  const handleSelectLocation = useCallback((result: SearchResult) => {
    setSelectedLocation(result);
    setQuery(result.place_name);
    setSuggestions([]);
    setShowRecentSearches(false);
    addRecentSearch(result);
    onLocationSelect(result.center, 14);
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

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (!selectedLocation) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedLocation]);

  // Search for address suggestions
  const searchAddress = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    setShowRecentSearches(false);
    try {
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
      } else if (!selectedLocation) {
        setIsExpanded(false);
      } else {
        // Clear and collapse
        setSelectedLocation(null);
        setQuery('');
        setNearbyConstructions([]);
        setIsExpanded(false);
      }
      return;
    }
    handleListKeyDown(e);
  }, [handleListKeyDown, suggestions.length, showRecentSearches, selectedLocation]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    if (query.trim() === '' && recentSearches.length > 0) {
      setShowRecentSearches(true);
    }
  }, [query, recentSearches.length]);

  // Clear search
  const handleClear = useCallback(() => {
    setSelectedLocation(null);
    setQuery('');
    setNearbyConstructions([]);
    setSuggestions([]);
  }, []);

  const showDropdown = suggestions.length > 0 || (showRecentSearches && recentSearches.length > 0);
  const dropdownItems = suggestions.length > 0 ? suggestions : recentSearches;

  // Collapsed state - just show search icon button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="absolute top-20 left-4 z-10 w-10 h-10 bg-card shadow-lg rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
        title="Tìm kiếm địa điểm"
      >
        <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="absolute top-20 left-4 z-10 w-80 bg-card shadow-lg rounded-lg overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Search input */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            placeholder="Tìm kiếm địa điểm..."
            className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {isSearching ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : query ? (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showDropdown && (
          <div className="mt-2 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.length === 0 && showRecentSearches && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border flex justify-between items-center">
                <span>Tìm kiếm gần đây</span>
                <button
                  onClick={clearRecentSearches}
                  className="hover:text-foreground transition-colors"
                >
                  Xóa
                </button>
              </div>
            )}
            {dropdownItems.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelectLocation(result)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-3 py-2.5 text-left border-b border-border last:border-b-0 transition-colors ${
                  highlightedIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <p className="text-sm text-foreground truncate">{result.place_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Radius selector and results */}
      {selectedLocation && (
        <>
          <div className="px-3 py-2 border-b border-border bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Bán kính:</span>
              <div className="flex gap-1">
                {[5, 10, 15, 20].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRadiusChange(r)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      radius === r
                        ? 'bg-blue-500 text-white'
                        : 'bg-card border border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-foreground">
                  Công trình gần đây ({nearbyConstructions.length})
                </h3>
                {isLoadingNearby && (
                  <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>

              {isLoadingNearby ? (
                <div className="space-y-2">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : nearbyConstructions.length === 0 ? (
                <p className="text-muted-foreground text-xs py-2">Không có công trình nào trong khu vực.</p>
              ) : (
                <div className="space-y-2">
                  {nearbyConstructions.map((construction) => (
                    <div
                      key={construction.id}
                      className="p-2 bg-muted/50 border border-border rounded-lg hover:border-blue-400 cursor-pointer transition-colors"
                      onClick={() => handleConstructionClick(construction)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-xs truncate">{construction.title}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(construction.constructionStatus)}`} />
                            <span className="text-[10px] text-muted-foreground">{getStatusLabel(construction.constructionStatus)}</span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground">{construction.progress}%</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {construction.distance.toFixed(1)} km
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
