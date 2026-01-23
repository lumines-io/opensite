'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, MapPin, Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useSavedPlaces } from './SavedPlacesContext';
import type { CreateAddressInput } from './types';

interface SavePlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: [number, number]; // [lng, lat]
  initialAddressText?: string;
  onSaved?: () => void;
}

/**
 * Modal for saving a new place from the map.
 */
export function SavePlaceModal({
  isOpen,
  onClose,
  coordinates,
  initialAddressText = '',
  onSaved,
}: SavePlaceModalProps) {
  const { lists, createAddress, createList, isCreatingAddress, fetchLists } = useSavedPlaces();

  // Form state
  const [label, setLabel] = useState('');
  const [addressText, setAddressText] = useState(initialAddressText);
  const [note, setNote] = useState('');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // New list creation
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Set default list on mount or when lists change
  useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      const defaultList = lists.find(l => l.isDefault);
      setSelectedListId(String(defaultList?.id || lists[0].id));
    }
  }, [lists, selectedListId]);

  // Update address text when initialAddressText changes
  useEffect(() => {
    setAddressText(initialAddressText);
  }, [initialAddressText]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel('');
      setNote('');
      setError(null);
      setIsCreatingNewList(false);
      setNewListName('');
      // Refresh lists
      fetchLists();
    }
  }, [isOpen, fetchLists]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError('Please enter a name for this place');
      return;
    }

    if (!selectedListId) {
      setError('Please select a list');
      return;
    }

    const data: CreateAddressInput = {
      label: label.trim(),
      addressText: addressText.trim() || undefined,
      location: {
        type: 'Point',
        coordinates: coordinates,
      },
      note: note.trim() || undefined,
      addressList: selectedListId,
    };

    const result = await createAddress(data);

    if (result.success) {
      onSaved?.();
      onClose();
    } else {
      setError(result.error || 'Failed to save place');
    }
  }, [label, addressText, note, selectedListId, coordinates, createAddress, onSaved, onClose]);

  const handleCreateList = useCallback(async () => {
    if (!newListName.trim()) return;

    const result = await createList({ name: newListName.trim() });

    if (result.success && result.list) {
      setSelectedListId(String(result.list.id));
      setIsCreatingNewList(false);
      setNewListName('');
    }
  }, [newListName, createList]);

  const listOptions = lists.map(list => ({
    value: String(list.id),
    label: list.isDefault ? `${list.name} (Default)` : list.name,
  }));

  if (!isOpen) return null;

  const [lng, lat] = coordinates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Save Place
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Coordinates display */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400 font-mono">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Label */}
          <Input
            label="Name"
            placeholder="e.g., Dream Apartment, Office Location"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            maxLength={100}
          />

          {/* Address */}
          <Input
            as="textarea"
            label="Address"
            placeholder="Enter address or location description"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            rows={2}
          />

          {/* Note */}
          <Input
            as="textarea"
            label="Note"
            placeholder="Personal notes about this place..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />

          {/* List selection */}
          {!isCreatingNewList ? (
            <div className="space-y-2">
              <Select
                label="Save to list"
                options={listOptions}
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                placeholder="Select a list"
              />
              <button
                type="button"
                onClick={() => setIsCreatingNewList(true)}
                className="flex items-center gap-1 text-sm text-rose-600 dark:text-rose-400 hover:underline"
              >
                <Plus className="w-4 h-4" />
                Create new list
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                label="New list name"
                placeholder="e.g., Favorites, Work Area"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                maxLength={100}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreatingNewList(false);
                    setNewListName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                >
                  Create List
                </Button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCreatingAddress || !label.trim()}
              className="flex-1"
            >
              {isCreatingAddress ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Place'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
