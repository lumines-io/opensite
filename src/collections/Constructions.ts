import type { CollectionConfig } from 'payload';
import { invalidateConstructionCache } from '@/lib/cache';
import { cacheLogger } from '@/lib/persistent-logger';
import {
  lexicalEditor,
  UploadFeature,
  LinkFeature,
  BlocksFeature,
} from '@payloadcms/richtext-lexical';
import { CodeBlock } from '@/blocks/CodeBlock';
import { createAutoTranslateHooks } from '@/hooks/auto-translate';

// Auto-translate configuration for Constructions
const autoTranslateHooks = createAutoTranslateHooks({
  fields: ['title'],
  richTextFields: ['description'],
  immediate: false, // Process translations in background
});

export const Constructions: CollectionConfig = {
  slug: 'constructions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'constructionType', 'constructionStatus', 'progress', 'updatedAt'],
    group: 'Content',
    description: 'Public infrastructure projects (roads, highways, metro, bridges, etc.)',
  },
  access: {
    // Read access: anyone can read published constructions
    read: ({ req }) => {
      // Admins and moderators can read everything
      if (['admin', 'moderator'].includes(req.user?.role as string)) {
        return true;
      }
      // Public: can read only published constructions
      return {
        _status: { equals: 'published' },
      };
    },

    // Create access: only admin/moderator (contributors suggest via Suggestions)
    create: ({ req }) => {
      if (!req.user?._verified) return false;
      return ['admin', 'moderator'].includes(req.user?.role as string);
    },

    // Update access: only admin/moderator
    update: ({ req }) => {
      if (!req.user?._verified) return false;
      return ['admin', 'moderator'].includes(req.user?.role as string);
    },

    // Delete access: only admin
    delete: ({ req }) => {
      if (!req.user?._verified) return false;
      return req.user?.role === 'admin';
    },
  },
  versions: {
    drafts: true,
  },
  fields: [
    // ============================================
    // BASIC INFORMATION
    // ============================================
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data, value }) => {
            if (!value && data?.title) {
              return data.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          UploadFeature({
            collections: {
              media: {
                fields: [
                  {
                    name: 'caption',
                    type: 'text',
                    label: 'Caption',
                  },
                ],
              },
            },
          }),
          LinkFeature({
            enabledCollections: ['constructions'],
            fields: ({ defaultFields }) => [
              ...defaultFields,
              {
                name: 'rel',
                label: 'Rel Attribute',
                type: 'select',
                hasMany: true,
                options: ['noopener', 'noreferrer', 'nofollow'],
                admin: {
                  description: 'The rel attribute for external links',
                },
              },
            ],
          }),
          BlocksFeature({
            blocks: [CodeBlock],
          }),
        ],
      }),
      admin: {
        description: 'Rich description with support for images, links, and code blocks',
      },
    },

    // ============================================
    // CONSTRUCTION TYPE
    // ============================================
    {
      name: 'constructionType',
      type: 'select',
      required: true,
      defaultValue: 'road',
      options: [
        { label: 'Road Construction', value: 'road' },
        { label: 'Highway/Expressway', value: 'highway' },
        { label: 'Metro Line', value: 'metro' },
        { label: 'Bridge', value: 'bridge' },
        { label: 'Tunnel', value: 'tunnel' },
        { label: 'Interchange', value: 'interchange' },
        { label: 'Station', value: 'station' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },

    // ============================================
    // STATUS & PROGRESS
    // ============================================
    {
      name: 'constructionStatus',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: [
        { label: 'Planned', value: 'planned' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Paused', value: 'paused' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'progress',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Completion percentage (0-100)',
      },
    },

    // ============================================
    // GEOMETRY & LOCATION
    // ============================================
    {
      name: 'geometry',
      type: 'json',
      admin: {
        description: 'GeoJSON geometry (Point, LineString, or Polygon)',
        components: {
          Field: '/payload/components/fields/GeometryMapField#GeometryMapField',
        },
      },
    },
    {
      name: 'centroid',
      type: 'json',
      admin: {
        description: 'Center point [lng, lat] for map display',
      },
    },

    // ============================================
    // TIMELINE
    // ============================================
    {
      type: 'row',
      fields: [
        {
          name: 'announcedDate',
          type: 'date',
          label: 'Announced Date',
          admin: { width: '25%' },
        },
        {
          name: 'startDate',
          type: 'date',
          label: 'Start Date',
          admin: { width: '25%' },
        },
        {
          name: 'expectedEndDate',
          type: 'date',
          label: 'Expected End Date',
          admin: { width: '25%' },
        },
        {
          name: 'actualEndDate',
          type: 'date',
          label: 'Actual End Date',
          admin: { width: '25%' },
        },
      ],
    },

    // ============================================
    // PROJECT DETAILS
    // ============================================
    {
      name: 'details',
      type: 'group',
      fields: [
        {
          name: 'contractor',
          type: 'text',
          label: 'Contractor',
        },
        {
          name: 'budget',
          type: 'number',
          label: 'Budget (VND)',
        },
        {
          name: 'fundingSource',
          type: 'text',
          label: 'Funding Source',
        },
        {
          name: 'length',
          type: 'number',
          label: 'Length (km)',
          admin: {
            description: 'Total length for roads, highways, metro lines',
          },
        },
        {
          name: 'width',
          type: 'number',
          label: 'Width (m)',
          admin: {
            description: 'Road width or bridge width',
          },
        },
        {
          name: 'lanes',
          type: 'number',
          label: 'Number of Lanes',
        },
      ],
    },

    // ============================================
    // DETAIL POINTS (Stations, Exits, etc.)
    // ============================================
    {
      name: 'detailPoints',
      type: 'array',
      admin: {
        description: 'Points of interest along the construction (e.g., metro stations, freeway exits, bridge sections)',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          localized: true,
          admin: {
            description: 'Name of the point (e.g., "Ga Bến Thành", "Nút giao An Phú")',
          },
        },
        {
          name: 'location',
          type: 'json',
          admin: {
            description: 'GeoJSON Point [longitude, latitude]',
          },
        },
        {
          name: 'order',
          type: 'number',
          admin: {
            description: 'Order along the construction (for sorting)',
          },
        },
        {
          name: 'pointType',
          type: 'select',
          options: [
            // Metro/Transit
            { label: 'Station', value: 'station' },
            { label: 'Depot', value: 'depot' },
            { label: 'Transfer Point', value: 'transfer' },
            // Highway/Road
            { label: 'Entry/Exit', value: 'exit' },
            { label: 'Interchange', value: 'interchange' },
            { label: 'Toll Plaza', value: 'toll' },
            { label: 'Rest Area', value: 'rest_area' },
            // Bridge/Tunnel
            { label: 'Bridge Section', value: 'bridge_section' },
            { label: 'Tunnel Portal', value: 'tunnel_portal' },
            // General
            { label: 'Milestone', value: 'milestone' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'other',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Planned', value: 'planned' },
            { label: 'Under Construction', value: 'in-progress' },
            { label: 'Completed', value: 'completed' },
            { label: 'Operational', value: 'operational' },
          ],
          defaultValue: 'planned',
        },
        {
          name: 'progress',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 0,
        },
        {
          name: 'description',
          type: 'text',
          localized: true,
          admin: {
            description: 'Additional details (e.g., connected roads, facilities)',
          },
        },
        {
          name: 'openedAt',
          type: 'date',
          admin: {
            description: 'Date when this point became operational',
          },
        },
      ],
    },

    // Legacy: Metro stations (kept for backward compatibility)
    {
      name: 'metroStations',
      type: 'array',
      admin: {
        condition: (data) => data?.constructionType === 'metro',
        description: '(Legacy) Use detailPoints instead. Stations along the metro line.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'location',
          type: 'json',
          admin: {
            description: 'GeoJSON Point [longitude, latitude]',
          },
        },
        {
          name: 'stationOrder',
          type: 'number',
        },
        {
          name: 'stationStatus',
          type: 'select',
          options: [
            { label: 'Planned', value: 'planned' },
            { label: 'Under Construction', value: 'in-progress' },
            { label: 'Completed', value: 'completed' },
            { label: 'Operational', value: 'operational' },
          ],
          defaultValue: 'planned',
        },
        {
          name: 'stationProgress',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 0,
        },
        {
          name: 'openedAt',
          type: 'date',
        },
      ],
    },

    // ============================================
    // MEDIA
    // ============================================
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'caption',
          type: 'text',
          localized: true,
        },
        {
          name: 'takenAt',
          type: 'date',
        },
      ],
    },

    // ============================================
    // SOURCES
    // ============================================
    {
      name: 'sources',
      type: 'array',
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          localized: true,
        },
        {
          name: 'publishedAt',
          type: 'date',
        },
      ],
    },

    // ============================================
    // VERSION TRACKING
    // ============================================
    {
      name: 'currentVersion',
      type: 'number',
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation }) => {
        // Version tracking
        if (operation === 'update' && originalDoc) {
          data.currentVersion = (originalDoc.currentVersion || 0) + 1;
        }
        return data;
      },
      autoTranslateHooks.beforeChange,
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        const constructionName = doc.title || doc.slug || 'Unknown';
        cacheLogger.info(`Construction "${constructionName}" ${operation}d`, {
          constructionName,
          slug: doc.slug,
          operation,
          userName: req.user?.name,
          userEmail: req.user?.email,
          userRole: req.user?.role,
        });
        await invalidateConstructionCache(doc.slug);
        return doc;
      },
      autoTranslateHooks.afterChange,
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const constructionName = doc.title || doc.slug || 'Unknown';
        cacheLogger.info(`Construction "${constructionName}" deleted`, {
          constructionName,
          slug: doc.slug,
          operation: 'delete',
          userName: req.user?.name,
          userEmail: req.user?.email,
          userRole: req.user?.role,
        });
        await invalidateConstructionCache(doc.slug);
        return doc;
      },
    ],
  },
};
