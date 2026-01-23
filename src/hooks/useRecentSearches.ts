'use client';

import { useState, useCallback } from 'react';
import type { SearchResult } from '@/types/construction';

const STORAGE_KEY = 'opensite-recent-searches';
const MAX_RECENT = 5;

interface UseRecentSearchesReturn {
  recentSearches: SearchResult[];
  addRecentSearch: (search: SearchResult) => void;
  clearRecentSearches: () => void;
}

// Helper to safely get from localStorage
function getStoredSearches(): SearchResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage not available or invalid data
  }
  return [];
}

export function useRecentSearches(): UseRecentSearchesReturn {
  // Lazy initialization from localStorage
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(getStoredSearches);

  const addRecentSearch = useCallback((search: SearchResult) => {
    setRecentSearches((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter((s) => s.id !== search.id);
      // Add to front and limit to MAX_RECENT
      const updated = [search, ...filtered].slice(0, MAX_RECENT);
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage not available
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage not available
    }
  }, []);

  return {
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  };
}
