'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY_PREFIX = 'opensite-suggestion-draft-';

export interface SuggestionDraftData {
  constructionId: number;
  constructionSlug: string;
  proposedData: Record<string, unknown>;
  proposedGeometry?: GeoJSON.Geometry | null;
  coordinateAdjustments?: Record<string, { longitude: number; latitude: number }>;
  locationDescription?: string;
  justification?: string;
  evidenceUrls?: { url: string }[];
  savedAt: number;
}

export interface ChangedFields {
  [key: string]: boolean;
}

interface UseSuggestionDraftOptions {
  constructionId: number;
  constructionSlug: string;
  initialData: Record<string, unknown>;
}

interface UseSuggestionDraftReturn {
  draftData: SuggestionDraftData | null;
  changedFields: ChangedFields;
  isFieldChanged: (fieldPath: string) => boolean;
  updateDraft: (updates: Partial<SuggestionDraftData>) => void;
  updateField: <T>(fieldPath: string, originalValue: T, newValue: T) => void;
  clearDraft: () => void;
  hasDraft: boolean;
  hasChanges: boolean;
  lastSavedAt: Date | null;
}

// Helper to safely get from sessionStorage
function getStoredDraft(constructionSlug: string): SuggestionDraftData | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_PREFIX + constructionSlug);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // sessionStorage not available or invalid data
  }
  return null;
}

// Helper to safely set to sessionStorage
function saveDraft(constructionSlug: string, data: SuggestionDraftData): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY_PREFIX + constructionSlug, JSON.stringify(data));
  } catch {
    // sessionStorage not available
  }
}

// Helper to clear draft from sessionStorage
function removeDraft(constructionSlug: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY_PREFIX + constructionSlug);
  } catch {
    // sessionStorage not available
  }
}

// Helper to clear all drafts except the current one
function clearOtherDrafts(currentSlug: string): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX) && key !== STORAGE_KEY_PREFIX + currentSlug) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // sessionStorage not available
  }
}

// Deep comparison utility
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }

  return true;
}

export function useSuggestionDraft({
  constructionId,
  constructionSlug,
  initialData,
}: UseSuggestionDraftOptions): UseSuggestionDraftReturn {
  const initialDataRef = useRef(initialData);

  // Lazy initialization from sessionStorage
  const [draftData, setDraftData] = useState<SuggestionDraftData | null>(() => {
    const stored = getStoredDraft(constructionSlug);
    // Validate that stored draft is for the same construction
    if (stored && stored.constructionId === constructionId) {
      return stored;
    }
    return null;
  });

  const [changedFields, setChangedFields] = useState<ChangedFields>({});

  // Clear drafts from other constructions when this hook initializes
  useEffect(() => {
    clearOtherDrafts(constructionSlug);
  }, [constructionSlug]);

  // Update initial data ref when it changes
  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  // Calculate changed fields from draft vs initial data
  useEffect(() => {
    if (!draftData?.proposedData) {
      setChangedFields({});
      return;
    }

    const changes: ChangedFields = {};
    const proposed = draftData.proposedData;
    const initial = initialDataRef.current;

    // Check each field in proposed data
    for (const key of Object.keys(proposed)) {
      const originalValue = initial[key];
      const newValue = proposed[key];

      if (!deepEqual(originalValue, newValue)) {
        changes[key] = true;
      }
    }

    // Check coordinate adjustments
    if (draftData.coordinateAdjustments) {
      for (const coordKey of Object.keys(draftData.coordinateAdjustments)) {
        changes[`coordinate.${coordKey}`] = true;
      }
    }

    // Check geometry
    if (draftData.proposedGeometry !== undefined) {
      const initialGeometry = initial.proposedGeometry;
      if (!deepEqual(initialGeometry, draftData.proposedGeometry)) {
        changes['geometry'] = true;
      }
    }

    // Check other fields
    if (draftData.locationDescription && draftData.locationDescription !== (initial.locationDescription || '')) {
      changes['locationDescription'] = true;
    }
    if (draftData.justification && draftData.justification !== (initial.justification || '')) {
      changes['justification'] = true;
    }
    if (draftData.evidenceUrls && draftData.evidenceUrls.length > 0) {
      changes['evidenceUrls'] = true;
    }

    setChangedFields(changes);
  }, [draftData]);

  const isFieldChanged = useCallback((fieldPath: string): boolean => {
    return changedFields[fieldPath] === true;
  }, [changedFields]);

  const updateDraft = useCallback((updates: Partial<SuggestionDraftData>) => {
    setDraftData(prev => {
      const newData: SuggestionDraftData = {
        constructionId,
        constructionSlug,
        proposedData: prev?.proposedData || {},
        savedAt: Date.now(),
        ...prev,
        ...updates,
      };
      saveDraft(constructionSlug, newData);
      return newData;
    });
  }, [constructionId, constructionSlug]);

  const updateField = useCallback(<T,>(fieldPath: string, originalValue: T, newValue: T) => {
    // Track whether field has changed
    const hasChanged = !deepEqual(originalValue, newValue);

    setChangedFields(prev => {
      if (hasChanged) {
        return { ...prev, [fieldPath]: true };
      } else {
        const { [fieldPath]: _, ...rest } = prev;
        return rest;
      }
    });

    // Update draft with new value
    setDraftData(prev => {
      const proposedData = { ...prev?.proposedData, [fieldPath]: newValue };
      const newData: SuggestionDraftData = {
        constructionId,
        constructionSlug,
        proposedData,
        coordinateAdjustments: prev?.coordinateAdjustments,
        proposedGeometry: prev?.proposedGeometry,
        locationDescription: prev?.locationDescription,
        justification: prev?.justification,
        evidenceUrls: prev?.evidenceUrls,
        savedAt: Date.now(),
      };
      saveDraft(constructionSlug, newData);
      return newData;
    });
  }, [constructionId, constructionSlug]);

  const clearDraft = useCallback(() => {
    removeDraft(constructionSlug);
    setDraftData(null);
    setChangedFields({});
  }, [constructionSlug]);

  const hasDraft = draftData !== null;
  const hasChanges = Object.keys(changedFields).length > 0;
  const lastSavedAt = draftData?.savedAt ? new Date(draftData.savedAt) : null;

  return {
    draftData,
    changedFields,
    isFieldChanged,
    updateDraft,
    updateField,
    clearDraft,
    hasDraft,
    hasChanges,
    lastSavedAt,
  };
}
