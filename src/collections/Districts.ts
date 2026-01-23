import type { CollectionConfig } from 'payload';
import { createAutoTranslateHooks } from '@/hooks/auto-translate';

// Auto-translate configuration for Districts
const autoTranslateHooks = createAutoTranslateHooks({
  fields: ['name'],
  immediate: false, // Process translations in background
});

export const Districts: CollectionConfig = {
  slug: 'districts',
  admin: {
    useAsTitle: 'name',
    group: 'Reference Data',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      label: 'Name',
    },
    {
      name: 'code',
      type: 'text',
      label: 'District Code',
      admin: {
        description: 'Official district code (e.g., Q1, Q2, BTH)',
      },
    },
    {
      name: 'geometry',
      type: 'json',
      label: 'Boundary (GeoJSON)',
      admin: {
        description: 'MultiPolygon GeoJSON for district boundary',
      },
    },
  ],
  hooks: {
    beforeChange: [autoTranslateHooks.beforeChange],
    afterChange: [autoTranslateHooks.afterChange],
  },
};
