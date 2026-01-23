'use client';

import { useState, useCallback } from 'react';

interface UseListNavigationOptions<T> {
  items: T[];
  onSelect: (item: T) => void;
  isOpen: boolean;
}

interface UseListNavigationReturn {
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useListNavigation<T>({
  items,
  onSelect,
  isOpen,
}: UseListNavigationOptions<T>): UseListNavigationReturn {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || items.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : items.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            onSelect(items[highlightedIndex]);
            setHighlightedIndex(-1);
          }
          break;
      }
    },
    [isOpen, items, highlightedIndex, onSelect]
  );

  // Compute the actual highlighted index to return
  // If not open or no items, return -1
  const effectiveHighlightedIndex = (!isOpen || items.length === 0) ? -1 : highlightedIndex;

  return {
    highlightedIndex: effectiveHighlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
  };
}
