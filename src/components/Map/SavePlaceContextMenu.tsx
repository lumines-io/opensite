'use client';

import { useCallback } from 'react';
import { MapPin, X } from 'lucide-react';
import type { Coordinates } from './construction-map.types';

interface SavePlaceContextMenuProps {
  coordinates: Coordinates;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Context menu shown when user right-clicks or long-presses on the map.
 * Allows saving the location as a new place.
 */
export function SavePlaceContextMenu({
  coordinates,
  onSave,
  onClose,
}: SavePlaceContextMenuProps) {
  const handleSave = useCallback(() => {
    onSave();
    onClose();
  }, [onSave, onClose]);

  const [lng, lat] = coordinates;

  return (
    <div className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[200px]">
      {/* Header with coordinates */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          aria-label="Close menu"
        >
          <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Actions */}
      <div className="p-1">
        <button
          onClick={handleSave}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
        >
          <MapPin className="w-4 h-4" />
          <span>Save this place</span>
        </button>
      </div>
    </div>
  );
}
