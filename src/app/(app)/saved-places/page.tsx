'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/Auth';
import { ContentPageTemplate } from '@/components/layout';
import { useSavedPlaces } from '@/components/SavedPlaces';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Map,
  FolderOpen,
  MoreVertical,
  Star,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AddressList, SavedAddress } from '@/components/SavedPlaces/types';

function SavedPlacesContent() {
  const router = useRouter();
  const {
    lists,
    addresses,
    isLoading,
    selectedListId,
    selectList,
    fetchAddresses,
    createList,
    updateList,
    deleteList,
    deleteAddress,
    getAddressCount,
  } = useSavedPlaces();

  // UI State
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | number | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);
  const [deleteAddressId, setDeleteAddressId] = useState<string | number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch addresses when list selection changes
  useEffect(() => {
    fetchAddresses(selectedListId);
  }, [selectedListId, fetchAddresses]);

  const handleCreateList = useCallback(async () => {
    if (!newListName.trim()) return;

    const result = await createList({ name: newListName.trim() });
    if (result.success) {
      setNewListName('');
      setIsCreatingList(false);
      setMessage({ type: 'success', text: 'List created successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to create list' });
    }
    setTimeout(() => setMessage(null), 3000);
  }, [newListName, createList]);

  const handleUpdateList = useCallback(async (id: string | number) => {
    if (!editingListName.trim()) return;

    const result = await updateList(id, { name: editingListName.trim() });
    if (result.success) {
      setEditingListId(null);
      setMessage({ type: 'success', text: 'List updated successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update list' });
    }
    setTimeout(() => setMessage(null), 3000);
  }, [editingListName, updateList]);

  const handleSetDefault = useCallback(async (id: string | number) => {
    const result = await updateList(id, { isDefault: true });
    if (result.success) {
      setMessage({ type: 'success', text: 'Default list updated' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update default list' });
    }
    setTimeout(() => setMessage(null), 3000);
  }, [updateList]);

  const handleDeleteList = useCallback(async (id: string | number) => {
    const result = await deleteList(id);
    if (result.success) {
      setDeleteConfirmId(null);
      setMessage({ type: 'success', text: 'List deleted successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete list' });
    }
    setTimeout(() => setMessage(null), 3000);
  }, [deleteList]);

  const handleDeleteAddress = useCallback(async (id: string | number) => {
    const result = await deleteAddress(id);
    if (result.success) {
      setDeleteAddressId(null);
      setMessage({ type: 'success', text: 'Place deleted successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete place' });
    }
    setTimeout(() => setMessage(null), 3000);
  }, [deleteAddress]);

  const handleShowOnMap = useCallback((address: SavedAddress) => {
    const [lng, lat] = address.location.coordinates;
    router.push(`/?lng=${lng}&lat=${lat}&zoom=15`);
  }, [router]);

  const totalCount = getAddressCount();

  return (
    <ContentPageTemplate pageTitle="Saved Places" maxWidth="6xl" showFullFooter={false}>
      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar - Lists */}
        <div className="md:col-span-1">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Lists header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-foreground">Lists</h3>
              <button
                onClick={() => setIsCreatingList(true)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Create new list"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* New list form */}
            {isCreatingList && (
              <div className="p-3 border-b border-border bg-muted/30">
                <Input
                  placeholder="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingList(false);
                      setNewListName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleCreateList}
                    disabled={!newListName.trim()}
                  >
                    Create
                  </Button>
                </div>
              </div>
            )}

            {/* All places option */}
            <button
              onClick={() => selectList(null)}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors ${
                selectedListId === null ? 'bg-muted' : ''
              }`}
            >
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-left text-sm">All Places</span>
              <span className="text-xs text-muted-foreground">{totalCount}</span>
            </button>

            {/* Lists */}
            <div className="divide-y divide-border">
              {lists.map((list) => (
                <ListItem
                  key={list.id}
                  list={list}
                  isSelected={selectedListId === list.id}
                  isEditing={editingListId === list.id}
                  editingName={editingListName}
                  deleteConfirm={deleteConfirmId === list.id}
                  onSelect={() => selectList(list.id)}
                  onStartEdit={() => {
                    setEditingListId(list.id);
                    setEditingListName(list.name);
                  }}
                  onCancelEdit={() => setEditingListId(null)}
                  onSaveEdit={() => handleUpdateList(list.id)}
                  onEditingNameChange={setEditingListName}
                  onSetDefault={() => handleSetDefault(list.id)}
                  onDeleteClick={() => setDeleteConfirmId(list.id)}
                  onDeleteConfirm={() => handleDeleteList(list.id)}
                  onDeleteCancel={() => setDeleteConfirmId(null)}
                />
              ))}
            </div>

            {lists.length === 0 && !isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No lists yet. Create your first list!
              </div>
            )}
          </div>
        </div>

        {/* Main content - Addresses */}
        <div className="md:col-span-3">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-foreground">
                {selectedListId
                  ? lists.find((l) => l.id === selectedListId)?.name || 'Saved Places'
                  : 'All Places'}
              </h3>
              <span className="text-sm text-muted-foreground">
                {addresses.length} {addresses.length === 1 ? 'place' : 'places'}
              </span>
            </div>

            {/* Addresses list */}
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : addresses.length > 0 ? (
              <div className="divide-y divide-border">
                {addresses.map((address) => (
                  <AddressItem
                    key={address.id}
                    address={address}
                    deleteConfirm={deleteAddressId === address.id}
                    onShowOnMap={() => handleShowOnMap(address)}
                    onDeleteClick={() => setDeleteAddressId(address.id)}
                    onDeleteConfirm={() => handleDeleteAddress(address.id)}
                    onDeleteCancel={() => setDeleteAddressId(null)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No saved places yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Right-click on the map to save a location
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ContentPageTemplate>
  );
}

// List item component
interface ListItemProps {
  list: AddressList;
  isSelected: boolean;
  isEditing: boolean;
  editingName: string;
  deleteConfirm: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditingNameChange: (name: string) => void;
  onSetDefault: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function ListItem({
  list,
  isSelected,
  isEditing,
  editingName,
  deleteConfirm,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditingNameChange,
  onSetDefault,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: ListItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (isEditing) {
    return (
      <div className="px-4 py-3 bg-muted/30">
        <Input
          value={editingName}
          onChange={(e) => onEditingNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={onCancelEdit}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={onSaveEdit}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (deleteConfirm) {
    return (
      <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300 mb-2">
          Delete &ldquo;{list.name}&rdquo;? This will also delete all addresses in this list.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDeleteCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="danger" onClick={onDeleteConfirm}>
            Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-center hover:bg-muted/50 transition-colors ${
        isSelected ? 'bg-muted' : ''
      }`}
    >
      <button
        onClick={onSelect}
        className="flex-1 px-4 py-3 flex items-center gap-3 text-left"
      >
        <MapPin className="w-4 h-4 text-rose-500" />
        <span className="flex-1 text-sm truncate">{list.name}</span>
        {list.isDefault && (
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
        )}
        <span className="text-xs text-muted-foreground">{list.addressCount || 0}</span>
      </button>

      {/* Actions menu */}
      <div className="relative pr-2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onStartEdit();
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
              >
                <Pencil className="w-3 h-3" /> Rename
              </button>
              {!list.isDefault && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onSetDefault();
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <Star className="w-3 h-3" /> Set as default
                </button>
              )}
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDeleteClick();
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-red-600 dark:text-red-400 flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Address item component
interface AddressItemProps {
  address: SavedAddress;
  deleteConfirm: boolean;
  onShowOnMap: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function AddressItem({
  address,
  deleteConfirm,
  onShowOnMap,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: AddressItemProps) {
  const listName = typeof address.addressList === 'object' ? address.addressList.name : null;

  if (deleteConfirm) {
    return (
      <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300 mb-2">
          Delete &ldquo;{address.label}&rdquo;?
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDeleteCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="danger" onClick={onDeleteConfirm}>
            Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground truncate">{address.label}</h4>
            {listName && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {listName}
              </span>
            )}
          </div>
          {address.addressText && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {address.addressText}
            </p>
          )}
          {address.note && (
            <p className="text-sm text-muted-foreground/70 italic truncate mt-0.5">
              &ldquo;{address.note}&rdquo;
            </p>
          )}
          {address.tags && address.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {address.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
                >
                  {t.tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onShowOnMap}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="Show on map"
          >
            <Map className="w-4 h-4" />
          </button>
          <button
            onClick={onDeleteClick}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SavedPlacesPage() {
  return (
    <ProtectedRoute>
      <SavedPlacesContent />
    </ProtectedRoute>
  );
}
