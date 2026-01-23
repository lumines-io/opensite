'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/components/Auth/AuthContext';
import type {
  AddressList,
  SavedAddress,
  CreateListInput,
  UpdateListInput,
  CreateAddressInput,
  UpdateAddressInput,
  ListsResponse,
  AddressesResponse,
  CreateListResponse,
  UpdateListResponse,
  CreateAddressResponse,
  UpdateAddressResponse,
} from './types';

interface SavedPlacesContextType {
  // Data
  lists: AddressList[];
  addresses: SavedAddress[];
  selectedListId: string | number | null;

  // Loading states
  isLoading: boolean;
  isCreatingList: boolean;
  isCreatingAddress: boolean;

  // Actions for lists
  fetchLists: () => Promise<void>;
  createList: (data: CreateListInput) => Promise<{ success: boolean; list?: AddressList; error?: string }>;
  updateList: (id: string | number, data: UpdateListInput) => Promise<{ success: boolean; error?: string }>;
  deleteList: (id: string | number) => Promise<{ success: boolean; error?: string }>;

  // Actions for addresses
  fetchAddresses: (listId?: string | number | null) => Promise<void>;
  createAddress: (data: CreateAddressInput) => Promise<{ success: boolean; address?: SavedAddress; error?: string }>;
  updateAddress: (id: string | number, data: UpdateAddressInput) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (id: string | number) => Promise<{ success: boolean; error?: string }>;

  // UI state
  selectList: (id: string | number | null) => void;

  // Map integration
  savedPlacesGeoJSON: GeoJSON.FeatureCollection | null;
  fetchMapData: () => Promise<void>;

  // Helpers
  getDefaultList: () => AddressList | undefined;
  getAddressCount: () => number;
}

const SavedPlacesContext = createContext<SavedPlacesContextType | null>(null);

interface SavedPlacesProviderProps {
  children: ReactNode;
}

export function SavedPlacesProvider({ children }: SavedPlacesProviderProps) {
  const { isAuthenticated, user } = useAuth();

  // State
  const [lists, setLists] = useState<AddressList[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | number | null>(null);
  const [savedPlacesGeoJSON, setSavedPlacesGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isCreatingAddress, setIsCreatingAddress] = useState(false);

  // Fetch lists
  const fetchLists = useCallback(async () => {
    if (!isAuthenticated) {
      setLists([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/saved-places/lists', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: ListsResponse = await response.json();
        setLists(data.lists);
      } else {
        setLists([]);
      }
    } catch {
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch addresses
  const fetchAddresses = useCallback(async (listId?: string | number | null) => {
    if (!isAuthenticated) {
      setAddresses([]);
      return;
    }

    setIsLoading(true);
    try {
      const url = listId
        ? `/api/saved-places/addresses?listId=${listId}`
        : '/api/saved-places/addresses';

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: AddressesResponse = await response.json();
        setAddresses(data.addresses);
      } else {
        setAddresses([]);
      }
    } catch {
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch map data
  const fetchMapData = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedPlacesGeoJSON(null);
      return;
    }

    try {
      const response = await fetch('/api/map/saved-places', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: GeoJSON.FeatureCollection = await response.json();
        setSavedPlacesGeoJSON(data);
      } else {
        setSavedPlacesGeoJSON(null);
      }
    } catch {
      setSavedPlacesGeoJSON(null);
    }
  }, [isAuthenticated]);

  // Create list
  const createList = useCallback(async (data: CreateListInput) => {
    setIsCreatingList(true);
    try {
      const response = await fetch('/api/saved-places/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to create list' };
      }

      const createResponse = result as CreateListResponse;
      // Add to local state
      setLists(prev => [createResponse.list, ...prev]);

      // If this list is default, update other lists
      if (data.isDefault) {
        setLists(prev => prev.map(list =>
          list.id === createResponse.list.id
            ? list
            : { ...list, isDefault: false }
        ));
      }

      return { success: true, list: createResponse.list };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsCreatingList(false);
    }
  }, []);

  // Update list
  const updateList = useCallback(async (id: string | number, data: UpdateListInput) => {
    try {
      const response = await fetch(`/api/saved-places/lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update list' };
      }

      const updateResponse = result as UpdateListResponse;
      // Update local state
      setLists(prev => prev.map(list => {
        if (list.id === id) {
          return { ...list, ...updateResponse.list };
        }
        // If this list became default, unset others
        if (data.isDefault && list.id !== id) {
          return { ...list, isDefault: false };
        }
        return list;
      }));

      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  // Delete list
  const deleteList = useCallback(async (id: string | number) => {
    try {
      const response = await fetch(`/api/saved-places/lists/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete list' };
      }

      // Remove from local state
      setLists(prev => prev.filter(list => list.id !== id));

      // Also remove addresses belonging to this list
      setAddresses(prev => prev.filter(addr => {
        const listId = typeof addr.addressList === 'object' ? addr.addressList.id : addr.addressList;
        return listId !== id;
      }));

      // Clear selection if deleted list was selected
      if (selectedListId === id) {
        setSelectedListId(null);
      }

      // Refresh map data
      fetchMapData();

      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [selectedListId, fetchMapData]);

  // Create address
  const createAddress = useCallback(async (data: CreateAddressInput) => {
    setIsCreatingAddress(true);
    try {
      const response = await fetch('/api/saved-places/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to save place' };
      }

      const createResponse = result as CreateAddressResponse;
      // Add to local state
      setAddresses(prev => [createResponse.address, ...prev]);

      // Update list address count
      const listId = data.addressList || lists.find(l => l.isDefault)?.id;
      if (listId) {
        setLists(prev => prev.map(list =>
          list.id === listId
            ? { ...list, addressCount: (list.addressCount || 0) + 1 }
            : list
        ));
      }

      // Refresh map data
      fetchMapData();

      return { success: true, address: createResponse.address };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsCreatingAddress(false);
    }
  }, [lists, fetchMapData]);

  // Update address
  const updateAddress = useCallback(async (id: string | number, data: UpdateAddressInput) => {
    try {
      const response = await fetch(`/api/saved-places/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update place' };
      }

      const updateResponse = result as UpdateAddressResponse;
      // Update local state
      setAddresses(prev => prev.map(addr =>
        addr.id === id ? { ...addr, ...updateResponse.address } : addr
      ));

      // Refresh map data if location changed
      if (data.location) {
        fetchMapData();
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [fetchMapData]);

  // Delete address
  const deleteAddress = useCallback(async (id: string | number) => {
    try {
      // Find the address to get its list ID before deleting
      const addressToDelete = addresses.find(a => a.id === id);

      const response = await fetch(`/api/saved-places/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete place' };
      }

      // Remove from local state
      setAddresses(prev => prev.filter(addr => addr.id !== id));

      // Update list address count
      if (addressToDelete) {
        const listId = typeof addressToDelete.addressList === 'object'
          ? addressToDelete.addressList.id
          : addressToDelete.addressList;

        setLists(prev => prev.map(list =>
          list.id === listId
            ? { ...list, addressCount: Math.max(0, (list.addressCount || 1) - 1) }
            : list
        ));
      }

      // Refresh map data
      fetchMapData();

      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [addresses, fetchMapData]);

  // Select list
  const selectList = useCallback((id: string | number | null) => {
    setSelectedListId(id);
  }, []);

  // Get default list
  const getDefaultList = useCallback(() => {
    return lists.find(list => list.isDefault);
  }, [lists]);

  // Get total address count
  const getAddressCount = useCallback(() => {
    return lists.reduce((sum, list) => sum + (list.addressCount || 0), 0);
  }, [lists]);

  // Load data when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchLists();
      fetchMapData();
    } else {
      setLists([]);
      setAddresses([]);
      setSavedPlacesGeoJSON(null);
    }
  }, [isAuthenticated, user, fetchLists, fetchMapData]);

  const value: SavedPlacesContextType = {
    lists,
    addresses,
    selectedListId,
    isLoading,
    isCreatingList,
    isCreatingAddress,
    fetchLists,
    createList,
    updateList,
    deleteList,
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    selectList,
    savedPlacesGeoJSON,
    fetchMapData,
    getDefaultList,
    getAddressCount,
  };

  return (
    <SavedPlacesContext.Provider value={value}>
      {children}
    </SavedPlacesContext.Provider>
  );
}

export function useSavedPlaces() {
  const context = useContext(SavedPlacesContext);
  if (!context) {
    throw new Error('useSavedPlaces must be used within a SavedPlacesProvider');
  }
  return context;
}
