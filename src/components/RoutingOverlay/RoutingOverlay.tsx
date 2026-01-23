'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { X, Loader2, ArrowUpDown, Map, AlertTriangle, CheckCircle, ChevronLeft, ExternalLink, Calendar, Info } from 'lucide-react';
import { getStatusColor, getStatusLabel, getTypeLabel, formatDistance, formatDuration } from '@/lib/construction-utils';
import { useAnimatedVisibility } from '@/hooks/useAnimatedVisibility';
import { useListNavigation } from '@/hooks/useListNavigation';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { usePageTransition } from '@/components/PageTransition';
import type { SearchResult, ConstructionAlert, RouteInfo } from '@/types/construction';

type DirectionsProvider = 'mapbox' | 'google';

interface RoutingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteCalculated: (route: GeoJSON.LineString | null, alerts: ConstructionAlert[]) => void;
  onConstructionSelect?: (construction: ConstructionAlert) => void;
  accessToken: string;
}

export function RoutingOverlay({
  isOpen,
  onClose,
  onRouteCalculated,
  onConstructionSelect,
  accessToken,
}: RoutingOverlayProps) {
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
  const [directionsProvider, setDirectionsProvider] = useState<DirectionsProvider>('google');
  const [selectedAlert, setSelectedAlert] = useState<ConstructionAlert | null>(null);

  const originInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { shouldRender, isVisible } = useAnimatedVisibility(isOpen, 300);
  const { startTransition } = usePageTransition();

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

  // Focus origin input when overlay opens
  useEffect(() => {
    if (isOpen && originInputRef.current) {
      setTimeout(() => originInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  // Calculate route using Google Directions API
  const calculateRouteWithGoogle = useCallback(async () => {
    if (!originResult || !destinationResult) return null;

    const response = await fetch('/api/route/constructions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: originResult.center,
        destination: destinationResult.center,
        bufferMeters: 200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to calculate route');
    }

    const data = await response.json();
    return {
      routeInfo: {
        duration: data.route.duration,
        distance: data.route.distance,
        geometry: data.route.geometry,
      } as RouteInfo,
      constructions: data.constructions as ConstructionAlert[],
    };
  }, [originResult, destinationResult]);

  // Calculate route using Mapbox Directions API
  const calculateRouteWithMapbox = useCallback(async () => {
    if (!originResult || !destinationResult) return null;

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

    const routeInfoResult: RouteInfo = {
      duration: route.duration,
      distance: route.distance,
      geometry,
    };

    // Find constructions along the route
    const alertsResponse = await fetch('/api/route/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: geometry,
        bufferMeters: 200,
      }),
    });

    let constructions: ConstructionAlert[] = [];
    if (alertsResponse.ok) {
      const alertsData = await alertsResponse.json();
      constructions = alertsData.constructions || [];
    }

    return { routeInfo: routeInfoResult, constructions };
  }, [originResult, destinationResult, accessToken]);

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
    setSelectedAlert(null);

    try {
      const result = directionsProvider === 'google'
        ? await calculateRouteWithGoogle()
        : await calculateRouteWithMapbox();

      if (!result) {
        throw new Error('No route result');
      }

      setRouteInfo(result.routeInfo);
      setAlerts(result.constructions);
      onRouteCalculated(result.routeInfo.geometry, result.constructions);
    } catch (error) {
      console.error('Route calculation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể tính toán tuyến đường';
      setError(errorMessage);
      onRouteCalculated(null, []);
    } finally {
      setIsCalculating(false);
    }
  }, [originResult, destinationResult, directionsProvider, calculateRouteWithGoogle, calculateRouteWithMapbox, onRouteCalculated]);

  // Clear route
  const clearRoute = useCallback(() => {
    setOrigin('');
    setDestination('');
    setOriginResult(null);
    setDestinationResult(null);
    setRouteInfo(null);
    setAlerts([]);
    setError(null);
    setSelectedAlert(null);
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
      } else {
        onClose();
      }
      return;
    }

    if (activeInput === 'origin') {
      handleOriginListKeyDown(e);
    } else if (activeInput === 'destination') {
      handleDestinationListKeyDown(e);
    }
  }, [onClose, activeInput, originSuggestions.length, destinationSuggestions.length, handleOriginListKeyDown, handleDestinationListKeyDown]);

  // Handle construction alert click
  const handleAlertClick = useCallback((alert: ConstructionAlert) => {
    setSelectedAlert(alert);
    if (onConstructionSelect) {
      onConstructionSelect(alert);
    }
  }, [onConstructionSelect]);

  // Handle navigation to construction details
  const handleViewDetails = useCallback((alert: ConstructionAlert, e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(
      { x: e.clientX, y: e.clientY, width: 0, height: 0 },
      `/details/${alert.slug}`
    );
  }, [startTransition]);

  // Close details sidebar
  const closeDetailsSidebar = useCallback(() => {
    setSelectedAlert(null);
  }, []);

  if (!shouldRender) return null;

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
        className={`fixed top-0 right-0 h-full w-full sm:max-w-md bg-card shadow-xl z-50 flex flex-col overlay-panel-right ${
          isVisible ? 'overlay-panel-right-visible' : 'overlay-panel-right-hidden'
        }`}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-lg text-foreground">Chỉ đường</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Origin/Destination inputs */}
          <div className="space-y-3">
            {/* Origin */}
            <div className="relative">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <input
                  ref={originInputRef}
                  type="text"
                  value={origin}
                  onChange={(e) => handleInputChange(e.target.value, 'origin')}
                  onFocus={() => setActiveInput('origin')}
                  placeholder="Điểm đi..."
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* Origin suggestions */}
              {activeInput === 'origin' && originSuggestions.length > 0 && (
                <div className="absolute left-10 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {originSuggestions.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleOriginSelect(result)}
                      onMouseEnter={() => setOriginHighlightedIndex(index)}
                      className={`w-full px-3 py-2 text-left border-b border-border last:border-b-0 transition-colors ${
                        originHighlightedIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                    >
                      <p className="text-body-sm text-foreground truncate">{result.place_name}</p>
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
                <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Destination */}
            <div className="relative">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => handleInputChange(e.target.value, 'destination')}
                  onFocus={() => setActiveInput('destination')}
                  placeholder="Điểm đến..."
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* Destination suggestions */}
              {activeInput === 'destination' && destinationSuggestions.length > 0 && (
                <div className="absolute left-10 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {destinationSuggestions.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleDestinationSelect(result)}
                      onMouseEnter={() => setDestinationHighlightedIndex(index)}
                      className={`w-full px-3 py-2 text-left border-b border-border last:border-b-0 transition-colors ${
                        destinationHighlightedIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                    >
                      <p className="text-body-sm text-foreground truncate">{result.place_name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Directions Provider Toggle */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-caption text-muted-foreground">Dịch vụ:</span>
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setDirectionsProvider('google')}
                className={`px-2 py-1 text-caption rounded transition-colors ${
                  directionsProvider === 'google'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Google
              </button>
              <button
                onClick={() => setDirectionsProvider('mapbox')}
                className={`px-2 py-1 text-caption rounded transition-colors ${
                  directionsProvider === 'mapbox'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mapbox
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={calculateRoute}
              disabled={!originResult || !destinationResult || isCalculating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang tính...</span>
                </>
              ) : (
                <>
                  <Map className="w-5 h-5" />
                  <span>Tìm đường</span>
                </>
              )}
            </button>
            {routeInfo && (
              <button
                onClick={clearRoute}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Xóa
              </button>
            )}
          </div>

          {error && (
            <p className="text-error text-body-sm mt-2">{error}</p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isCalculating ? (
            <div className="p-4">
              <div className="bg-muted rounded-lg p-4 mb-4 animate-pulse">
                <div className="h-8 bg-border rounded w-1/2 mb-2" />
                <div className="h-4 bg-border rounded w-1/3" />
              </div>
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          ) : routeInfo ? (
            <div className="p-4">
              {/* Route summary */}
              <div className="bg-blue-500/10 dark:bg-blue-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-display-sm text-blue-600 dark:text-blue-400">
                      {formatDuration(routeInfo.duration)}
                    </p>
                    <p className="text-body-sm text-blue-600/80 dark:text-blue-400/80">
                      {formatDistance(routeInfo.distance)}
                    </p>
                  </div>
                  <Map className="w-10 h-10 text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
                </div>
              </div>

              {/* Construction alerts */}
              <div>
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Công trình trên tuyến đường ({alerts.length})
                </h3>

                {alerts.length === 0 ? (
                  <div className="bg-green-500/10 dark:bg-green-500/20 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-green-600 dark:text-green-400 font-medium">Không có công trình nào</p>
                    <p className="text-green-600/80 dark:text-green-400/80 text-sm">Tuyến đường thông thoáng</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`bg-amber-500/10 dark:bg-amber-500/20 border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedAlert?.id === alert.id
                            ? 'border-amber-500 ring-2 ring-amber-500/30'
                            : 'border-amber-400/30 hover:border-amber-400'
                        }`}
                        onClick={() => handleAlertClick(alert)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-label-lg text-amber-900 dark:text-amber-200">{alert.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`w-2 h-2 rounded-full ${getStatusColor(alert.constructionStatus)}`} />
                              <span className="text-caption text-amber-800 dark:text-amber-300">{getStatusLabel(alert.constructionStatus)}</span>
                              <span className="text-caption text-amber-700 dark:text-amber-400">•</span>
                              <span className="text-caption text-amber-800 dark:text-amber-300">{alert.progress}%</span>
                            </div>
                            <p className="text-caption text-amber-700 dark:text-amber-400 mt-1">
                              Cách tuyến đường {formatDistance(alert.distance)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-caption rounded ${
                            alert.constructionStatus === 'in-progress'
                              ? 'bg-amber-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {alert.constructionStatus === 'in-progress' ? 'Đang thi công' : getStatusLabel(alert.constructionStatus)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <Map className="w-12 h-12 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
              <p className="text-body-sm">Nhập điểm đi và điểm đến để xem tuyến đường</p>
              <p className="text-caption text-muted-foreground mt-1">Hệ thống sẽ cảnh báo các công trình trên đường đi</p>
            </div>
          )}
        </div>
      </div>

      {/* Construction Details Sidebar */}
      {selectedAlert && (
        <div
          className={`fixed top-0 right-0 h-full w-full sm:max-w-sm bg-card shadow-xl z-[60] flex flex-col transform transition-transform duration-300 ${
            selectedAlert ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ right: 'min(28rem, 100vw)' }}
        >
          {/* Details Header */}
          <div className="p-4 border-b border-border bg-amber-500/10 dark:bg-amber-500/20">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={closeDetailsSidebar}
                className="p-2 hover:bg-muted rounded-full transition-colors -ml-2"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <Link
                href={`/details/${selectedAlert.slug}`}
                onClick={(e) => handleViewDetails(selectedAlert, e)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Xem chi tiết
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            <h3 className="text-heading-lg text-foreground">{selectedAlert.title}</h3>
          </div>

          {/* Details Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Status and Progress */}
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-body-sm text-muted-foreground">Trạng thái</span>
                  <span className={`px-3 py-1 text-body-sm rounded-full ${
                    selectedAlert.constructionStatus === 'in-progress'
                      ? 'bg-amber-500 text-white'
                      : selectedAlert.constructionStatus === 'completed'
                      ? 'bg-green-500 text-white'
                      : selectedAlert.constructionStatus === 'paused'
                      ? 'bg-red-500 text-white'
                      : 'bg-muted-foreground/20 text-foreground'
                  }`}>
                    {getStatusLabel(selectedAlert.constructionStatus)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body-sm text-muted-foreground">Tiến độ</span>
                  <span className="text-label-md text-foreground">{selectedAlert.progress}%</span>
                </div>
                <div className="w-full bg-border rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      selectedAlert.constructionStatus === 'completed'
                        ? 'bg-green-500'
                        : selectedAlert.constructionStatus === 'paused'
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${selectedAlert.progress}%` }}
                  />
                </div>
              </div>

              {/* Type */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-body-sm text-muted-foreground">Loại công trình</span>
                <span className="text-label-md text-foreground">{getTypeLabel(selectedAlert.constructionType)}</span>
              </div>

              {/* Distance from Route */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-body-sm text-muted-foreground">Khoảng cách từ tuyến đường</span>
                <span className="text-label-md text-amber-600 dark:text-amber-400">{formatDistance(selectedAlert.distance)}</span>
              </div>

              {/* Dates */}
              {(selectedAlert.startDate || selectedAlert.expectedEndDate) && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="text-label-md text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Thời gian thi công
                  </h4>
                  {selectedAlert.startDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm text-muted-foreground">Ngày bắt đầu</span>
                      <span className="text-body-sm text-foreground">
                        {new Date(selectedAlert.startDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {selectedAlert.expectedEndDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm text-muted-foreground">Dự kiến hoàn thành</span>
                      <span className="text-body-sm text-foreground">
                        {new Date(selectedAlert.expectedEndDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Warning */}
              <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-400/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-label-md text-amber-900 dark:text-amber-200">Lưu ý khi đi qua khu vực này</p>
                    <p className="text-caption text-amber-800 dark:text-amber-300 mt-1">
                      Công trình có thể ảnh hưởng đến giao thông. Nên chú ý quan sát biển báo và điều chỉnh tốc độ phù hợp.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Footer */}
          <div className="p-4 border-t border-border">
            <Link
              href={`/details/${selectedAlert.slug}`}
              onClick={(e) => handleViewDetails(selectedAlert, e)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Info className="w-5 h-5" />
              Xem thông tin đầy đủ
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
