'use client';

import { useState, useEffect, useCallback } from 'react';
import { VIETNAM_CITIES, type CityId } from './construction-map.constants';

export type LocationStatus = 'loading' | 'success' | 'error' | 'needs-selection';

interface UserLocationState {
  status: LocationStatus;
  coordinates: [number, number] | null;
  showCitySelector: boolean;
}

interface UseUserLocationOptions {
  /** Timeout in milliseconds for geolocation request */
  timeout?: number;
  /** Whether to enable high accuracy mode */
  enableHighAccuracy?: boolean;
}

interface UseUserLocationResult {
  /** Current status of location detection */
  status: LocationStatus;
  /** User's coordinates [longitude, latitude] or null if not available */
  coordinates: [number, number] | null;
  /** Whether to show the city selection modal */
  showCitySelector: boolean;
  /** Handle city selection from the modal */
  handleCitySelect: (cityId: CityId) => void;
}

const GEOLOCATION_TIMEOUT = 10000; // 10 seconds

/**
 * Hook to detect user's location with fallback to city selection
 *
 * Flow:
 * 1. On mount, attempt to get user's geolocation
 * 2. If successful, return coordinates
 * 3. If failed (denied, timeout, unavailable), show city selection modal
 * 4. User selects a city, which provides coordinates
 */
export function useUserLocation(
  options: UseUserLocationOptions = {}
): UseUserLocationResult {
  const { timeout = GEOLOCATION_TIMEOUT, enableHighAccuracy = false } = options;

  const [state, setState] = useState<UserLocationState>({
    status: 'loading',
    coordinates: null,
    showCitySelector: false,
  });

  // Handle successful geolocation
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { longitude, latitude } = position.coords;
    setState({
      status: 'success',
      coordinates: [longitude, latitude],
      showCitySelector: false,
    });
  }, []);

  // Handle geolocation error - show city selector
  const handleError = useCallback(() => {
    setState({
      status: 'needs-selection',
      coordinates: null,
      showCitySelector: true,
    });
  }, []);

  // Handle city selection from modal
  const handleCitySelect = useCallback((cityId: CityId) => {
    const city = VIETNAM_CITIES[cityId];
    setState({
      status: 'success',
      coordinates: [...city.coordinates],
      showCitySelector: false,
    });
  }, []);

  // Attempt geolocation on mount
  useEffect(() => {
    // Check if geolocation is supported - use timeout to defer state update
    if (!navigator.geolocation) {
      const timeoutId = setTimeout(handleError, 0);
      return () => clearTimeout(timeoutId);
    }

    // Request location
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy,
      timeout,
      maximumAge: 0,
    });
  }, [handleSuccess, handleError, enableHighAccuracy, timeout]);

  return {
    status: state.status,
    coordinates: state.coordinates,
    showCitySelector: state.showCitySelector,
    handleCitySelect,
  };
}
