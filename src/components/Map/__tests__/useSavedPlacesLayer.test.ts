/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSavedPlacesLayer, SAVED_PLACES_INTERACTIVE_LAYERS } from '../useSavedPlacesLayer';
import {
  SAVED_PLACES_LAYER_IDS,
  SAVED_PLACES_SOURCE_ID,
} from '../construction-map.constants';

// Mock mapbox-gl
const mockMap = {
  getLayer: vi.fn(),
  getSource: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  removeSource: vi.fn(),
  setLayoutProperty: vi.fn(),
};

// Mock map ref
const createMockMapRef = (mapInstance = mockMap) => ({
  current: {
    getMap: () => mapInstance,
  },
});

// Sample GeoJSON data
const mockGeoJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: '1',
      geometry: { type: 'Point', coordinates: [106.7, 10.8] },
      properties: { id: '1', label: 'Home' },
    },
    {
      type: 'Feature',
      id: '2',
      geometry: { type: 'Point', coordinates: [106.8, 10.9] },
      properties: { id: '2', label: 'Office' },
    },
  ],
};

describe('useSavedPlacesLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getLayer.mockReturnValue(undefined);
    mockMap.getSource.mockReturnValue(undefined);
  });

  describe('initialization', () => {
    it('should not add layers when not loaded', () => {
      const mapRef = createMockMapRef();

      renderHook(() =>
        useSavedPlacesLayer({
          mapRef: mapRef as any,
          loaded: false,
          savedPlacesGeoJSON: mockGeoJSON,
          visible: true,
        })
      );

      expect(mockMap.addSource).not.toHaveBeenCalled();
      expect(mockMap.addLayer).not.toHaveBeenCalled();
    });

    it('should not add layers when not visible', () => {
      const mapRef = createMockMapRef();

      renderHook(() =>
        useSavedPlacesLayer({
          mapRef: mapRef as any,
          loaded: true,
          savedPlacesGeoJSON: mockGeoJSON,
          visible: false,
        })
      );

      expect(mockMap.addSource).not.toHaveBeenCalled();
      expect(mockMap.addLayer).not.toHaveBeenCalled();
    });

    it('should not add layers when GeoJSON is null', () => {
      const mapRef = createMockMapRef();

      renderHook(() =>
        useSavedPlacesLayer({
          mapRef: mapRef as any,
          loaded: true,
          savedPlacesGeoJSON: null,
          visible: true,
        })
      );

      expect(mockMap.addSource).not.toHaveBeenCalled();
      expect(mockMap.addLayer).not.toHaveBeenCalled();
    });

    it('should not add layers when GeoJSON has no features', () => {
      const mapRef = createMockMapRef();
      const emptyGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      };

      renderHook(() =>
        useSavedPlacesLayer({
          mapRef: mapRef as any,
          loaded: true,
          savedPlacesGeoJSON: emptyGeoJSON,
          visible: true,
        })
      );

      expect(mockMap.addSource).not.toHaveBeenCalled();
      expect(mockMap.addLayer).not.toHaveBeenCalled();
    });

    it('should add source and layers when all conditions are met', () => {
      const mapRef = createMockMapRef();

      renderHook(() =>
        useSavedPlacesLayer({
          mapRef: mapRef as any,
          loaded: true,
          savedPlacesGeoJSON: mockGeoJSON,
          visible: true,
        })
      );

      expect(mockMap.addSource).toHaveBeenCalledWith(SAVED_PLACES_SOURCE_ID, {
        type: 'geojson',
        data: mockGeoJSON,
      });
      expect(mockMap.addLayer).toHaveBeenCalledTimes(2); // Points and labels
    });
  });

  describe('layer cleanup', () => {
    it('should remove existing layers before adding new ones', () => {
      mockMap.getLayer
        .mockReturnValueOnce({}) // LABELS exists
        .mockReturnValueOnce({}); // POINTS exists

      const mapRef = createMockMapRef();

      renderHook(() =>
        useSavedPlacesLayer({
          mapRef: mapRef as any,
          loaded: true,
          savedPlacesGeoJSON: mockGeoJSON,
          visible: true,
        })
      );

      expect(mockMap.removeLayer).toHaveBeenCalledWith(SAVED_PLACES_LAYER_IDS.LABELS);
      expect(mockMap.removeLayer).toHaveBeenCalledWith(SAVED_PLACES_LAYER_IDS.POINTS);
    });

    it('should remove existing source before adding new one', () => {
      mockMap.getSource.mockReturnValue({});

      const mapRef = createMockMapRef();

      renderHook(() =>
        useSavedPlacesLayer({
          mapRef: mapRef as any,
          loaded: true,
          savedPlacesGeoJSON: mockGeoJSON,
          visible: true,
        })
      );

      expect(mockMap.removeSource).toHaveBeenCalledWith(SAVED_PLACES_SOURCE_ID);
    });
  });

  describe('visibility toggling', () => {
    it('should set layer visibility to visible', () => {
      mockMap.getLayer.mockReturnValue({});

      const mapRef = createMockMapRef();

      renderHook(() =>
        useSavedPlacesLayer({
          mapRef: mapRef as any,
          loaded: true,
          savedPlacesGeoJSON: mockGeoJSON,
          visible: true,
        })
      );

      expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
        SAVED_PLACES_LAYER_IDS.POINTS,
        'visibility',
        'visible'
      );
      expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
        SAVED_PLACES_LAYER_IDS.LABELS,
        'visibility',
        'visible'
      );
    });

    it('should set layer visibility to none when not visible', () => {
      mockMap.getLayer.mockReturnValue({});

      const mapRef = createMockMapRef();

      renderHook(() =>
        useSavedPlacesLayer({
          mapRef: mapRef as any,
          loaded: true,
          savedPlacesGeoJSON: mockGeoJSON,
          visible: false,
        })
      );

      expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
        SAVED_PLACES_LAYER_IDS.POINTS,
        'visibility',
        'none'
      );
      expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
        SAVED_PLACES_LAYER_IDS.LABELS,
        'visibility',
        'none'
      );
    });
  });

  describe('source data updates', () => {
    it('should update source data when GeoJSON changes', () => {
      const mockSetData = vi.fn();
      mockMap.getSource.mockReturnValue({ type: 'geojson', setData: mockSetData });

      const mapRef = createMockMapRef();

      const { rerender } = renderHook(
        ({ geoJSON }) =>
          useSavedPlacesLayer({
            mapRef: mapRef as any,
            loaded: true,
            savedPlacesGeoJSON: geoJSON,
            visible: true,
          }),
        { initialProps: { geoJSON: mockGeoJSON } }
      );

      const updatedGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          ...mockGeoJSON.features,
          {
            type: 'Feature',
            id: '3',
            geometry: { type: 'Point', coordinates: [106.9, 11.0] },
            properties: { id: '3', label: 'New Place' },
          },
        ],
      };

      rerender({ geoJSON: updatedGeoJSON });

      expect(mockSetData).toHaveBeenCalledWith(updatedGeoJSON);
    });
  });

  describe('null map handling', () => {
    it('should handle null map ref gracefully', () => {
      const mapRef = { current: null };

      expect(() => {
        renderHook(() =>
          useSavedPlacesLayer({
            mapRef: mapRef as any,
            loaded: true,
            savedPlacesGeoJSON: mockGeoJSON,
            visible: true,
          })
        );
      }).not.toThrow();
    });

    it('should handle null getMap result gracefully', () => {
      const mapRef = { current: { getMap: () => null } };

      expect(() => {
        renderHook(() =>
          useSavedPlacesLayer({
            mapRef: mapRef as any,
            loaded: true,
            savedPlacesGeoJSON: mockGeoJSON,
            visible: true,
          })
        );
      }).not.toThrow();
    });
  });

  describe('styleLoaded dependency', () => {
    it('should re-setup layers when styleLoaded changes', () => {
      const mapRef = createMockMapRef();

      const { rerender } = renderHook(
        ({ styleLoaded }) =>
          useSavedPlacesLayer({
            mapRef: mapRef as any,
            loaded: true,
            savedPlacesGeoJSON: mockGeoJSON,
            visible: true,
            styleLoaded,
          }),
        { initialProps: { styleLoaded: 0 } }
      );

      const initialAddSourceCalls = mockMap.addSource.mock.calls.length;

      rerender({ styleLoaded: 1 });

      // Should have added source again after style change
      expect(mockMap.addSource.mock.calls.length).toBeGreaterThan(initialAddSourceCalls);
    });
  });
});

describe('SAVED_PLACES_INTERACTIVE_LAYERS', () => {
  it('should export interactive layers array', () => {
    expect(SAVED_PLACES_INTERACTIVE_LAYERS).toBeDefined();
    expect(Array.isArray(SAVED_PLACES_INTERACTIVE_LAYERS)).toBe(true);
  });

  it('should contain the points layer', () => {
    expect(SAVED_PLACES_INTERACTIVE_LAYERS).toContain(SAVED_PLACES_LAYER_IDS.POINTS);
  });
});
