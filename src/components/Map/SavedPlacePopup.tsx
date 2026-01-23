'use client';

import { Popup } from 'react-map-gl/mapbox';
import { MapPin, Pencil, Trash2, ExternalLink, Building2 } from 'lucide-react';
import Link from 'next/link';
import type { Coordinates } from './construction-map.types';
import type { SavedPlaceFeatureProperties } from '@/components/SavedPlaces/types';

interface SavedPlacePopupProps {
  place: SavedPlaceFeatureProperties;
  coordinates: Coordinates;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Popup shown when clicking on a saved place marker.
 * Shows place details and action buttons.
 */
export function SavedPlacePopup({
  place,
  coordinates,
  onClose,
  onEdit,
  onDelete,
  onMouseEnter,
  onMouseLeave,
}: SavedPlacePopupProps) {
  return (
    <Popup
      longitude={coordinates[0]}
      latitude={coordinates[1]}
      anchor="bottom"
      onClose={onClose}
      closeButton={false}
      closeOnClick={false}
      className="saved-place-popup"
      maxWidth="300px"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                {place.label}
              </h3>
              {place.listName && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {place.listName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 py-2 space-y-2">
          {/* Address */}
          {place.addressText && (
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
              {place.addressText}
            </p>
          )}

          {/* Note */}
          {place.note && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2">
              &ldquo;{place.note}&rdquo;
            </p>
          )}

          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {place.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                >
                  {tag}
                </span>
              ))}
              {place.tags.length > 3 && (
                <span className="text-[10px] text-gray-400">
                  +{place.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Linked construction */}
          {place.construction && (
            <Link
              href={`/construction/${place.construction.slug || place.construction.id}`}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Building2 className="w-3 h-3" />
              <span className="truncate">{place.construction.title || 'View construction'}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit</span>
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </Popup>
  );
}
