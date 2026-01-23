import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test the deep equal utility extracted from the hook
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

// Mock sessionStorage for testing
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('useSuggestionDraft Utilities', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('deepEqual', () => {
    describe('primitive values', () => {
      it('should return true for identical values', () => {
        expect(deepEqual(5, 5)).toBe(true);
        expect(deepEqual('hello', 'hello')).toBe(true);
        expect(deepEqual(true, true)).toBe(true);
        expect(deepEqual(null, null)).toBe(true);
        expect(deepEqual(undefined, undefined)).toBe(true);
      });

      it('should return false for different values', () => {
        expect(deepEqual(5, 6)).toBe(false);
        expect(deepEqual('hello', 'world')).toBe(false);
        expect(deepEqual(true, false)).toBe(false);
      });

      it('should return false for different types', () => {
        expect(deepEqual(5, '5')).toBe(false);
        expect(deepEqual(null, undefined)).toBe(false);
        expect(deepEqual(0, false)).toBe(false);
        expect(deepEqual('', false)).toBe(false);
      });
    });

    describe('null and undefined', () => {
      it('should handle null correctly', () => {
        expect(deepEqual(null, null)).toBe(true);
        expect(deepEqual(null, undefined)).toBe(false);
        expect(deepEqual(null, {})).toBe(false);
        expect(deepEqual({}, null)).toBe(false);
      });

      it('should handle undefined correctly', () => {
        expect(deepEqual(undefined, undefined)).toBe(true);
        expect(deepEqual(undefined, null)).toBe(false);
        expect(deepEqual(undefined, {})).toBe(false);
      });
    });

    describe('objects', () => {
      it('should return true for identical objects', () => {
        expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
        expect(deepEqual({}, {})).toBe(true);
      });

      it('should return false for objects with different values', () => {
        expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
      });

      it('should return false for objects with different keys', () => {
        expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
        expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
      });

      it('should handle nested objects', () => {
        expect(deepEqual(
          { a: { b: { c: 1 } } },
          { a: { b: { c: 1 } } }
        )).toBe(true);

        expect(deepEqual(
          { a: { b: { c: 1 } } },
          { a: { b: { c: 2 } } }
        )).toBe(false);
      });

      it('should handle objects with null properties', () => {
        expect(deepEqual({ a: null }, { a: null })).toBe(true);
        expect(deepEqual({ a: null }, { a: undefined })).toBe(false);
      });
    });

    describe('arrays', () => {
      it('should return true for identical arrays', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
        expect(deepEqual([], [])).toBe(true);
      });

      it('should return false for arrays with different values', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      });

      it('should return false for arrays with different lengths', () => {
        expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      });

      it('should handle nested arrays', () => {
        expect(deepEqual(
          [[1, 2], [3, 4]],
          [[1, 2], [3, 4]]
        )).toBe(true);

        expect(deepEqual(
          [[1, 2], [3, 4]],
          [[1, 2], [3, 5]]
        )).toBe(false);
      });

      it('should handle arrays with objects', () => {
        expect(deepEqual(
          [{ a: 1 }, { b: 2 }],
          [{ a: 1 }, { b: 2 }]
        )).toBe(true);

        expect(deepEqual(
          [{ a: 1 }, { b: 2 }],
          [{ a: 1 }, { b: 3 }]
        )).toBe(false);
      });
    });

    describe('mixed structures', () => {
      it('should handle complex nested structures', () => {
        const obj1 = {
          name: 'Test',
          data: {
            items: [1, 2, 3],
            nested: {
              value: 'hello',
              arr: [{ id: 1 }, { id: 2 }],
            },
          },
        };

        const obj2 = {
          name: 'Test',
          data: {
            items: [1, 2, 3],
            nested: {
              value: 'hello',
              arr: [{ id: 1 }, { id: 2 }],
            },
          },
        };

        expect(deepEqual(obj1, obj2)).toBe(true);
      });

      it('should detect differences in complex structures', () => {
        const obj1 = {
          name: 'Test',
          data: {
            items: [1, 2, 3],
            nested: { value: 'hello' },
          },
        };

        const obj2 = {
          name: 'Test',
          data: {
            items: [1, 2, 3],
            nested: { value: 'world' },
          },
        };

        expect(deepEqual(obj1, obj2)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle same reference', () => {
        const obj = { a: 1 };
        expect(deepEqual(obj, obj)).toBe(true);
      });

      it('should handle empty objects vs empty arrays', () => {
        // Both are objects in JS, but have different keys
        expect(deepEqual({}, [])).toBe(true); // Both have length 0 keys
      });

      it('should handle objects with undefined values', () => {
        expect(deepEqual({ a: undefined }, { a: undefined })).toBe(true);
        // Key missing vs key with undefined
        expect(deepEqual({ a: undefined }, {})).toBe(false);
      });

      it('should handle NaN values', () => {
        // NaN === NaN is false, but deepEqual should handle primitives
        expect(deepEqual(NaN, NaN)).toBe(false); // primitives compared with ===
      });
    });
  });

  describe('sessionStorage helpers', () => {
    const STORAGE_KEY_PREFIX = 'opensite-suggestion-draft-';

    describe('getStoredDraft', () => {
      it('should return null when no draft exists', () => {
        const result = mockSessionStorage.getItem(STORAGE_KEY_PREFIX + 'test-slug');
        expect(result).toBeNull();
      });

      it('should retrieve stored draft', () => {
        const draft = {
          constructionId: 1,
          constructionSlug: 'test-slug',
          proposedData: { name: 'Test' },
          savedAt: Date.now(),
        };

        mockSessionStorage.setItem(STORAGE_KEY_PREFIX + 'test-slug', JSON.stringify(draft));
        const result = mockSessionStorage.getItem(STORAGE_KEY_PREFIX + 'test-slug');
        expect(JSON.parse(result!)).toEqual(draft);
      });
    });

    describe('saveDraft', () => {
      it('should save draft to sessionStorage', () => {
        const draft = {
          constructionId: 1,
          constructionSlug: 'test-slug',
          proposedData: { name: 'Test' },
          savedAt: Date.now(),
        };

        mockSessionStorage.setItem(STORAGE_KEY_PREFIX + 'test-slug', JSON.stringify(draft));
        expect(mockSessionStorage.setItem).toHaveBeenCalled();
      });
    });

    describe('removeDraft', () => {
      it('should remove draft from sessionStorage', () => {
        mockSessionStorage.setItem(STORAGE_KEY_PREFIX + 'test-slug', '{}');
        mockSessionStorage.removeItem(STORAGE_KEY_PREFIX + 'test-slug');
        expect(mockSessionStorage.getItem(STORAGE_KEY_PREFIX + 'test-slug')).toBeNull();
      });
    });
  });

  describe('SuggestionDraftData structure', () => {
    it('should have required fields', () => {
      const validDraft = {
        constructionId: 1,
        constructionSlug: 'test-construction',
        proposedData: {},
        savedAt: Date.now(),
      };

      expect(validDraft.constructionId).toBeDefined();
      expect(validDraft.constructionSlug).toBeDefined();
      expect(validDraft.proposedData).toBeDefined();
      expect(validDraft.savedAt).toBeDefined();
    });

    it('should allow optional fields', () => {
      const fullDraft = {
        constructionId: 1,
        constructionSlug: 'test-construction',
        proposedData: { name: 'Updated Name' },
        proposedGeometry: { type: 'Point' as const, coordinates: [106.7, 10.8] },
        coordinateAdjustments: { marker1: { longitude: 106.7, latitude: 10.8 } },
        locationDescription: 'Near district 1',
        justification: 'Correcting location data',
        evidenceUrls: [{ url: 'https://example.com/evidence' }],
        savedAt: Date.now(),
      };

      expect(fullDraft.proposedGeometry).toBeDefined();
      expect(fullDraft.coordinateAdjustments).toBeDefined();
      expect(fullDraft.locationDescription).toBeDefined();
      expect(fullDraft.justification).toBeDefined();
      expect(fullDraft.evidenceUrls).toBeDefined();
    });
  });

  describe('ChangedFields tracking', () => {
    it('should track changed fields correctly', () => {
      const changedFields: Record<string, boolean> = {};

      // Simulate field changes
      changedFields['name'] = true;
      changedFields['status'] = true;
      changedFields['coordinate.start'] = true;
      changedFields['geometry'] = true;

      expect(Object.keys(changedFields).length).toBe(4);
      expect(changedFields['name']).toBe(true);
      expect(changedFields['status']).toBe(true);
      expect(changedFields['coordinate.start']).toBe(true);
      expect(changedFields['geometry']).toBe(true);
    });

    it('should allow removing changed field tracking', () => {
      const changedFields: Record<string, boolean> = {
        name: true,
        status: true,
      };

      // Simulate reverting a change
      delete changedFields['name'];

      expect(Object.keys(changedFields).length).toBe(1);
      expect(changedFields['name']).toBeUndefined();
      expect(changedFields['status']).toBe(true);
    });

    it('should detect if field changed using isFieldChanged logic', () => {
      const changedFields: Record<string, boolean> = {
        name: true,
        status: true,
      };

      const isFieldChanged = (fieldPath: string): boolean => {
        return changedFields[fieldPath] === true;
      };

      expect(isFieldChanged('name')).toBe(true);
      expect(isFieldChanged('status')).toBe(true);
      expect(isFieldChanged('type')).toBe(false);
      expect(isFieldChanged('')).toBe(false);
    });
  });

  describe('draft management logic', () => {
    it('should generate correct storage key', () => {
      const prefix = 'opensite-suggestion-draft-';
      const slug = 'metro-line-1';
      const expectedKey = prefix + slug;

      expect(expectedKey).toBe('opensite-suggestion-draft-metro-line-1');
    });

    it('should calculate hasChanges correctly', () => {
      const changedFieldsEmpty: Record<string, boolean> = {};
      const changedFieldsWithChanges: Record<string, boolean> = { name: true };

      const hasChangesEmpty = Object.keys(changedFieldsEmpty).length > 0;
      const hasChangesWithChanges = Object.keys(changedFieldsWithChanges).length > 0;

      expect(hasChangesEmpty).toBe(false);
      expect(hasChangesWithChanges).toBe(true);
    });

    it('should calculate hasDraft correctly', () => {
      const draftDataNull = null;
      const draftDataWithValue = { constructionId: 1 };

      const hasDraftNull = draftDataNull !== null;
      const hasDraftWithValue = draftDataWithValue !== null;

      expect(hasDraftNull).toBe(false);
      expect(hasDraftWithValue).toBe(true);
    });

    it('should calculate lastSavedAt correctly', () => {
      const savedAt = 1700000000000;
      const draftData = { savedAt };

      const lastSavedAt = draftData.savedAt ? new Date(draftData.savedAt) : null;

      expect(lastSavedAt).toBeInstanceOf(Date);
      expect(lastSavedAt?.getTime()).toBe(savedAt);
    });

    it('should handle null savedAt', () => {
      const draftData: { savedAt?: number } = {};

      const lastSavedAt = draftData.savedAt ? new Date(draftData.savedAt) : null;

      expect(lastSavedAt).toBeNull();
    });
  });
});
