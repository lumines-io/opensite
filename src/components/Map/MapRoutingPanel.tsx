'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getStatusColor, getStatusLabel, formatDistance, formatDuration } from '@/lib/construction-utils';
import { useListNavigation } from '@/hooks/useListNavigation';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import type { SearchResult, ConstructionAlert, RouteInfo } from '@/types/construction';

interface MapRoutingPanelProps {
  accessToken: string;
  onRouteCalculated: (route: GeoJSON.LineString | null, alerts: ConstructionAlert[]) => void;
  onConstructionSelect?: (construction: ConstructionAlert) => void;
}

export function MapRoutingPanel({
  accessToken,
  onRouteCalculated,
  onConstructionSelect,
}: MapRoutingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originResult, setOriginResult] = useState<SearchResult | null>(null);
  const [destinationResult, setDestinationResult] = useState<SearchResult | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<SearchResult[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<SearchResult[]>([]);
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [alerts, setAlerts] = useState<ConstructionAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  const originInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for origin suggestions
  const handleOriginSelect = useCallback((result: SearchResult) => {
    setOrigin(result.place_name);
    setOriginResult(result);
    setOriginSuggestions([]);
    setActiveInput(null);
  }, []);

  const handleDestinationSelect = useCallback((result: SearchResult) => {
    setDestination(result.place_name);
    setDestinationResult(result);
    setDestinationSuggestions([]);
    setActiveInput(null);
  }, []);

  const {
    highlightedIndex: originHighlightedIndex,
    setHighlightedIndex: setOriginHighlightedIndex,
    handleKeyDown: handleOriginListKeyDown,
  } = useListNavigation({
    items: originSuggestions,
    onSelect: handleOriginSelect,
    isOpen: activeInput === 'origin' && originSuggestions.length > 0,
  });

  const {
    highlightedIndex: destinationHighlightedIndex,
    setHighlightedIndex: setDestinationHighlightedIndex,
    handleKeyDown: handleDestinationListKeyDown,
  } = useListNavigation({
    items: destinationSuggestions,
    onSelect: handleDestinationSelect,
    isOpen: activeInput === 'destination' && destinationSuggestions.length > 0,
  });

  // Focus origin input when expanded
  useEffect(() => {
    if (isExpanded && originInputRef.current) {
      setTimeout(() => originInputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Close on click outside (only if no route)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (!routeInfo) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [routeInfo]);

  // Search for address suggestions
  const searchAddress = useCallback(async (query: string, type: 'origin' | 'destination') => {
    if (!query.trim() || query.length < 3) {
      if (type === 'origin') setOriginSuggestions([]);
      else setDestinationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${accessToken}&` +
        `country=VN&` +
        `proximity=106.6297,10.8231&` +
        `types=address,poi,neighborhood,locality&` +
        `limit=5&` +
        `language=vi`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      const results = data.features.map((f: { id: string; place_name: string; center: [number, number] }) => ({
        id: f.id,
        place_name: f.place_name,
        center: f.center,
      }));

      if (type === 'origin') setOriginSuggestions(results);
      else setDestinationSuggestions(results);
    } catch (error) {
      console.error('Search error:', error);
      if (type === 'origin') setOriginSuggestions([]);
      else setDestinationSuggestions([]);
    }
  }, [accessToken]);

  // Debounced search
  const handleInputChange = useCallback((value: string, type: 'origin' | 'destination') => {
    if (type === 'origin') {
      setOrigin(value);
      setOriginResult(null);
    } else {
      setDestination(value);
      setDestinationResult(null);
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAddress(value, type);
    }, 300);
  }, [searchAddress]);

  // Calculate route
  const calculateRoute = useCallback(async () => {
    if (!originResult || !destinationResult) {
      setError('Vui lòng chọn điểm đi và điểm đến');
      return;
    }

    setIsCalculating(true);
    setError(null);
    setAlerts([]);
    setRouteInfo(null);

    try {
      const coords = `${originResult.center[0]},${originResult.center[1]};${destinationResult.center[0]},${destinationResult.center[1]}`;
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?` +
        `geometries=geojson&` +
        `overview=full&` +
        `access_token=${accessToken}`
      );

      if (!response.ok) throw new Error('Directions failed');

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = data.routes[0];
      const geometry = route.geometry as GeoJSON.LineString;

      setRouteInfo({
        duration: route.duration,
        distance: route.distance,
        geometry,
      });

      const alertsResponse = await fetch('/api/route/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: geometry,
          bufferMeters: 200,
        }),
      });

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.constructions || []);
        onRouteCalculated(geometry, alertsData.constructions || []);
      } else {
        onRouteCalculated(geometry, []);
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      setError('Không thể tính toán tuyến đường. Vui lòng thử lại.');
      onRouteCalculated(null, []);
    } finally {
      setIsCalculating(false);
    }
  }, [originResult, destinationResult, accessToken, onRouteCalculated]);

  // Clear route
  const clearRoute = useCallback(() => {
    setOrigin('');
    setDestination('');
    setOriginResult(null);
    setDestinationResult(null);
    setRouteInfo(null);
    setAlerts([]);
    setError(null);
    onRouteCalculated(null, []);
  }, [onRouteCalculated]);

  // Swap origin and destination
  const swapLocations = useCallback(() => {
    const tempOrigin = origin;
    const tempOriginResult = originResult;
    setOrigin(destination);
    setOriginResult(destinationResult);
    setDestination(tempOrigin);
    setDestinationResult(tempOriginResult);
  }, [origin, destination, originResult, destinationResult]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (originSuggestions.length > 0 || destinationSuggestions.length > 0) {
        setOriginSuggestions([]);
        setDestinationSuggestions([]);
      } else if (!routeInfo) {
        setIsExpanded(false);
      } else {
        clearRoute();
        setIsExpanded(false);
      }
      return;
    }

    if (activeInput === 'origin') {
      handleOriginListKeyDown(e);
    } else if (activeInput === 'destination') {
      handleDestinationListKeyDown(e);
    }
  }, [activeInput, originSuggestions.length, destinationSuggestions.length, handleOriginListKeyDown, handleDestinationListKeyDown, routeInfo, clearRoute]);

  // Handle construction alert click
  const handleAlertClick = useCallback((alert: ConstructionAlert) => {
    if (onConstructionSelect) {
      onConstructionSelect(alert);
    }
  }, [onConstructionSelect]);

  // Collapsed state - just show directions icon button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="absolute top-32 left-4 z-10 w-10 h-10 bg-blue-600 shadow-lg rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        title="Chỉ đường"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
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
      {/* Header */}
      <div className="px-3 py-2 bg-blue-600 text-white flex items-center justify-between">
        <span className="text-sm font-medium">Chỉ đường</span>
        <button
          onClick={() => {
            if (routeInfo) clearRoute();
            setIsExpanded(false);
          }}
          className="p-1 hover:bg-blue-700 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Origin/Destination inputs */}
      <div className="p-3 space-y-2">
        {/* Origin */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <input
              ref={originInputRef}
              type="text"
              value={origin}
              onChange={(e) => handleInputChange(e.target.value, 'origin')}
              onFocus={() => setActiveInput('origin')}
              placeholder="Điểm đi..."
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          {activeInput === 'origin' && originSuggestions.length > 0 && (
            <div className="absolute left-8 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
              {originSuggestions.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleOriginSelect(result)}
                  onMouseEnter={() => setOriginHighlightedIndex(index)}
                  className={`w-full px-3 py-2 text-left border-b border-border last:border-b-0 transition-colors ${
                    originHighlightedIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="text-xs text-foreground truncate">{result.place_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            onClick={swapLocations}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Đổi điểm đi/đến"
          >
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Destination */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <input
              type="text"
              value={destination}
              onChange={(e) => handleInputChange(e.target.value, 'destination')}
              onFocus={() => setActiveInput('destination')}
              placeholder="Điểm đến..."
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          {activeInput === 'destination' && destinationSuggestions.length > 0 && (
            <div className="absolute left-8 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
              {destinationSuggestions.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleDestinationSelect(result)}
                  onMouseEnter={() => setDestinationHighlightedIndex(index)}
                  className={`w-full px-3 py-2 text-left border-b border-border last:border-b-0 transition-colors ${
                    destinationHighlightedIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="text-xs text-foreground truncate">{result.place_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={calculateRoute}
            disabled={!originResult || !destinationResult || isCalculating}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isCalculating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Đang tính...</span>
              </>
            ) : (
              <span>Tìm đường</span>
            )}
          </button>
          {routeInfo && (
            <button
              onClick={clearRoute}
              className="px-3 py-2 bg-muted text-foreground text-sm rounded-lg hover:bg-muted/80 transition-colors"
            >
              Xóa
            </button>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-xs">{error}</p>
        )}
      </div>

      {/* Results */}
      {(isCalculating || routeInfo) && (
        <div className="border-t border-border max-h-64 overflow-y-auto">
          {isCalculating ? (
            <div className="p-3">
              <div className="bg-muted rounded-lg p-3 mb-3 animate-pulse">
                <div className="h-6 bg-border rounded w-1/2 mb-1" />
                <div className="h-4 bg-border rounded w-1/3" />
              </div>
              <div className="space-y-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          ) : routeInfo ? (
            <div className="p-3">
              {/* Route summary */}
              <div className="bg-blue-500/10 dark:bg-blue-500/20 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatDuration(routeInfo.duration)}
                    </p>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                      {formatDistance(routeInfo.distance)}
                    </p>
                  </div>
                  <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
              </div>

              {/* Construction alerts */}
              <div>
                <h3 className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Công trình trên đường ({alerts.length})
                </h3>

                {alerts.length === 0 ? (
                  <div className="bg-green-500/10 dark:bg-green-500/20 rounded-lg p-3 text-center">
                    <svg className="w-6 h-6 mx-auto text-green-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-600 dark:text-green-400 text-xs font-medium">Không có công trình</p>
                    <p className="text-green-600/80 dark:text-green-400/80 text-[10px]">Tuyến đường thông thoáng</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-400/30 rounded-lg p-2 cursor-pointer hover:border-amber-400 transition-colors"
                        onClick={() => handleAlertClick(alert)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-amber-900 dark:text-amber-200 text-xs truncate">{alert.title}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(alert.constructionStatus)}`} />
                              <span className="text-[10px] text-amber-800 dark:text-amber-300">{getStatusLabel(alert.constructionStatus)}</span>
                              <span className="text-[10px] text-amber-700 dark:text-amber-400">•</span>
                              <span className="text-[10px] text-amber-800 dark:text-amber-300">{alert.progress}%</span>
                            </div>
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                              Cách {formatDistance(alert.distance)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
