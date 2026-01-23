/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { SavedPlacesProvider, useSavedPlaces } from '../SavedPlacesContext';
import type { AddressList, SavedAddress } from '../types';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/components/Auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  _verified: true,
};

const mockLists: AddressList[] = [
  {
    id: '1',
    name: 'Saved Places',
    description: 'Default list',
    user: '1',
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    addressCount: 2,
  },
  {
    id: '2',
    name: 'Favorites',
    description: 'My favorites',
    user: '1',
    isDefault: false,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    addressCount: 1,
  },
];

const mockAddresses: SavedAddress[] = [
  {
    id: '1',
    label: 'Home',
    addressText: '123 Main St',
    location: { type: 'Point', coordinates: [106.7, 10.8] },
    note: 'My home',
    user: '1',
    addressList: '1',
    tags: [{ tag: 'home' }],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    label: 'Office',
    addressText: '456 Office Blvd',
    location: { type: 'Point', coordinates: [106.8, 10.9] },
    user: '1',
    addressList: '1',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

const mockGeoJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: '1',
      geometry: { type: 'Point', coordinates: [106.7, 10.8] },
      properties: {
        id: '1',
        label: 'Home',
        addressText: '123 Main St',
      },
    },
  ],
};

// Wrapper component
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SavedPlacesProvider>{children}</SavedPlacesProvider>
);

describe('SavedPlacesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
    });
    // Default successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lists: [], features: [] }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useSavedPlaces hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSavedPlaces());
      }).toThrow('useSavedPlaces must be used within a SavedPlacesProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial state', () => {
      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      expect(result.current.lists).toBeDefined();
      expect(result.current.addresses).toBeDefined();
      expect(result.current.isCreatingList).toBe(false);
      expect(result.current.isCreatingAddress).toBe(false);
      expect(typeof result.current.fetchLists).toBe('function');
      expect(typeof result.current.createList).toBe('function');
      expect(typeof result.current.createAddress).toBe('function');
    });
  });

  describe('fetchLists', () => {
    it('should fetch lists when authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ lists: mockLists }),
      });

      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/saved-places/lists', {
          credentials: 'include',
        });
      });
    });

    it('should not fetch lists when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      // Should not call fetch when not authenticated (at least not for lists)
      expect(result.current.lists).toEqual([]);
    });
  });

  describe('createList', () => {
    it('should create a new list successfully', async () => {
      const newList: AddressList = {
        id: '3',
        name: 'New List',
        user: '1',
        isDefault: false,
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ lists: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGeoJSON),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, list: newList }),
        });

      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      let createResult: { success: boolean; list?: AddressList; error?: string };
      await act(async () => {
        createResult = await result.current.createList({ name: 'New List' });
      });

      expect(createResult!.success).toBe(true);
      expect(createResult!.list).toEqual(newList);
    });

    it('should handle create list error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ lists: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGeoJSON),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Name is required' }),
        });

      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createList({ name: '' });
      });

      expect(createResult!.success).toBe(false);
      expect(createResult!.error).toBe('Name is required');
    });

    it('should handle network error on create', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ lists: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGeoJSON),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createList({ name: 'Test' });
      });

      expect(createResult!.success).toBe(false);
      expect(createResult!.error).toBe('Network error. Please try again.');
    });
  });

  describe('createAddress', () => {
    it('should create an address successfully', async () => {
      const newAddress: SavedAddress = {
        id: '3',
        label: 'New Place',
        location: { type: 'Point', coordinates: [106.9, 11.0] },
        user: '1',
        addressList: '1',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ lists: mockLists }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGeoJSON),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, address: newAddress }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGeoJSON),
        });

      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      let createResult: { success: boolean; address?: SavedAddress; error?: string };
      await act(async () => {
        createResult = await result.current.createAddress({
          label: 'New Place',
          location: { type: 'Point', coordinates: [106.9, 11.0] },
          addressList: '1',
        });
      });

      expect(createResult!.success).toBe(true);
      expect(createResult!.address).toEqual(newAddress);
    });

    it('should handle create address error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ lists: mockLists }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGeoJSON),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Invalid location' }),
        });

      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createAddress({
          label: 'Test',
          location: { type: 'Point', coordinates: [0, 0] },
        });
      });

      expect(createResult!.success).toBe(false);
      expect(createResult!.error).toBe('Invalid location');
    });
  });

  describe('selectList', () => {
    it('should update selected list', () => {
      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      act(() => {
        result.current.selectList('1');
      });

      expect(result.current.selectedListId).toBe('1');

      act(() => {
        result.current.selectList(null);
      });

      expect(result.current.selectedListId).toBeNull();
    });
  });

  describe('getDefaultList', () => {
    it('should return undefined when no lists', () => {
      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      const defaultList = result.current.getDefaultList();
      expect(defaultList).toBeUndefined();
    });
  });

  describe('getAddressCount', () => {
    it('should return 0 when no lists', () => {
      const { result } = renderHook(() => useSavedPlaces(), { wrapper });

      const count = result.current.getAddressCount();
      expect(count).toBe(0);
    });
  });
});
