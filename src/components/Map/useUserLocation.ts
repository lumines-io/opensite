'use client';

import { useState, useEffect, useCallback } from 'react';
import { VIETNAM_CITIES, SAVED_CITY_KEY, type CityId } from './construction-map.constants';

export type LocationStatus = 'loading' | 'success' | 'error' | 'needs-selection';

interface UserLocationState {
  status: LocationStatus;
  coordinates: [number, number] | null;
  showCitySelector: boolean;
  savedCityId: CityId | null;
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
  /** The saved city ID from localStorage (if any) */
  savedCityId: CityId | null;
}

const GEOLOCATION_TIMEOUT = 10000; // 10 seconds

/**
 * Get saved city from localStorage
 */
function getSavedCity(): CityId | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(SAVED_CITY_KEY);
  if (saved && saved in VIETNAM_CITIES) {
    return saved as CityId;
  }
  return null;
}

/**
 * Save city to localStorage
 */
function saveCity(cityId: CityId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_CITY_KEY, cityId);
}

/**
 * Hook to detect user's location with fallback to city selection
 *
 * Flow:
 * 1. On mount, check localStorage for saved city preference
 * 2. If saved city exists, use it immediately (skip geolocation)
 * 3. Otherwise, attempt to get user's geolocation
 * 4. If geolocation successful, return coordinates
 * 5. If failed (denied, timeout, unavailable), show city selection modal
 * 6. User selects a city, which provides coordinates and saves to localStorage
 */
export function useUserLocation(
  options: UseUserLocationOptions = {}
): UseUserLocationResult {
  const { timeout = GEOLOCATION_TIMEOUT, enableHighAccuracy = false } = options;

  const [state, setState] = useState<UserLocationState>(() => {
    // Check for saved city on initial mount
    const savedCity = getSavedCity();
    if (savedCity) {
      const city = VIETNAM_CITIES[savedCity];
      return {
        status: 'success',
        coordinates: [...city.coordinates],
        showCitySelector: false,
        savedCityId: savedCity,
      };
    }
    return {
      status: 'loading',
      coordinates: null,
      showCitySelector: false,
      savedCityId: null,
    };
  });

  // Handle successful geolocation
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { longitude, latitude } = position.coords;
    setState((prev) => ({
      ...prev,
      status: 'success',
      coordinates: [longitude, latitude],
      showCitySelector: false,
    }));
  }, []);

  // Handle geolocation error - show city selector
  const handleError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'needs-selection',
      coordinates: null,
      showCitySelector: true,
    }));
  }, []);

  // Handle city selection from modal
  const handleCitySelect = useCallback((cityId: CityId) => {
    const city = VIETNAM_CITIES[cityId];
    // Save to localStorage
    saveCity(cityId);
    setState({
      status: 'success',
      coordinates: [...city.coordinates],
      showCitySelector: false,
      savedCityId: cityId,
    });
  }, []);

  // Attempt geolocation on mount (only if no saved city)
  useEffect(() => {
    // Skip geolocation if we already have a saved city
    if (state.savedCityId) {
      return;
    }

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
  }, [handleSuccess, handleError, enableHighAccuracy, timeout, state.savedCityId]);

  return {
    status: state.status,
    coordinates: state.coordinates,
    showCitySelector: state.showCitySelector,
    handleCitySelect,
    savedCityId: state.savedCityId,
  };
}
