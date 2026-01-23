import type { CollectionConfig, Where } from 'payload';
import { logScraperActivity } from '@/lib/logger';
import {
  lexicalEditor,
  UploadFeature,
  LinkFeature,
  BlocksFeature,
} from '@payloadcms/richtext-lexical';
import { CodeBlock } from '@/blocks/CodeBlock';
import { createAutoTranslateHooks } from '@/hooks/auto-translate';

// Auto-translate configuration for Suggestions
const autoTranslateHooks = createAutoTranslateHooks({
  fields: ['title', 'locationDescription'],
  richTextFields: ['justification'],
  immediate: false, // Process translations in background
});

export const Suggestions: CollectionConfig = {
  slug: 'suggestions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'suggestionType', 'status', 'sourceType', 'createdAt'],
    group: 'Workflow',
  },
  access: {
    read: ({ req }): boolean | Where => {
      // Admin and moderator can see all suggestions
      if (['moderator', 'admin'].includes(req.user?.role as string)) return true;

      if (!req.user) return false;

      // Sponsor users can see their own suggestions
      // Note: They shouldn't normally be creating suggestions since they directly edit private constructions
      if (['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string)) {
        return {
          submittedBy: {
            equals: req.user.id,
          },
        };
      }

      // Contributors can only see their own suggestions
      return {
        submittedBy: {
          equals: req.user.id,
        },
      };
    },

    // Only verified contributors can create suggestions
    // Suggestions are for PUBLIC constructions only
    // Sponsor users should edit their private constructions directly, not via suggestions
    create: ({ req }) => {
      // Must be verified
      if (!req.user?._verified) return false;
      // Contributors can create suggestions (will be validated in beforeChange hook)
      if (req.user?.role === 'contributor') return true;
      // Admin and moderator can create suggestions too
      if (['admin', 'moderator'].includes(req.user?.role as string)) return true;
      // Sponsor users should not create suggestions - they edit directly
      return false;
    },

    update: ({ req }) => ['moderator', 'admin'].includes(req.user?.role as string),
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'suggestionType',
      type: 'select',
      required: true,
      options: [
        { label: 'New Project', value: 'create' },
        { label: 'Update Existing', value: 'update' },
        { label: 'Mark Completed', value: 'complete' },
        { label: 'Report Correction', value: 'correction' },
      ],
    },
    {
      name: 'construction',
      type: 'relationship',
      relationTo: 'constructions',
      admin: {
        condition: (data) => data?.suggestionType !== 'create',
      },
    },
    {
      name: 'proposedData',
      type: 'json',
      required: true,
      admin: {
        description: 'Proposed changes in JSON format',
      },
    },
    {
      name: 'proposedGeometry',
      type: 'json',
      admin: {
        description: 'Proposed geometry (GeoJSON)',
      },
    },
    {
      name: 'locationDescription',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Text description of the location',
      },
    },
    {
      name: 'justification',
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
        description: 'Why are you suggesting this change? Supports images, links, and code blocks.',
      },
    },
    {
      name: 'evidenceUrls',
      type: 'array',
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },

    // Workflow
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Changes Requested', value: 'changes_requested' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Merged', value: 'merged' },
        { label: 'Superseded', value: 'superseded' },
      ],
      admin: {
        position: 'sidebar',
      },
    },

    // Source tracking
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      defaultValue: 'community',
      options: [
        { label: 'Community', value: 'community' },
        { label: 'News Scraper', value: 'scraper' },
        { label: 'Official API', value: 'api' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: {
        condition: (data) => data?.sourceType !== 'community',
      },
    },
    {
      name: 'sourceConfidence',
      type: 'number',
      min: 0,
      max: 1,
      admin: {
        condition: (data) => data?.sourceType === 'scraper',
        description: 'Confidence score (0-1) for scraped data',
      },
    },
    {
      name: 'contentHash',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'For deduplication',
      },
    },

    // User relations
    {
      name: 'submittedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'reviewNotes',
      type: 'textarea',
    },
    {
      name: 'moderatorNotes',
      type: 'textarea',
      admin: {
        description: 'Internal notes for moderators (includes scraper metadata)',
      },
    },

    // Merge tracking
    {
      name: 'mergedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'mergedVersion',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req, operation }) => {
        // Set submittedBy on create
        if (!originalDoc && req.user) {
          data.submittedBy = req.user.id;
        }

        // Validate that suggestions for existing constructions are only for PUBLIC ones
        // Contributors should not be able to suggest changes to private constructions
        if (operation === 'create' && data.construction && data.suggestionType !== 'create') {
          // Need to check if the construction is public
          const payload = req.payload;
          const construction = await payload.findByID({
            collection: 'constructions',
            id: data.construction,
            depth: 0,
          });

          if (construction && construction.constructionCategory === 'private') {
            // Allow admin/moderator to create suggestions for private too
            if (!['admin', 'moderator'].includes(req.user?.role as string)) {
              throw new Error('Suggestions can only be submitted for public constructions. Private constructions are managed directly by their sponsors.');
            }
          }
        }

        // Set reviewedBy and reviewedAt on status change to approved/rejected
        if (originalDoc && data.status !== originalDoc.status) {
          if (['approved', 'rejected'].includes(data.status)) {
            data.reviewedBy = req.user?.id;
            data.reviewedAt = new Date().toISOString();
          }
        }
        return data;
      },
      autoTranslateHooks.beforeChange,
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        // Log scraper activity when suggestions from scrapers are created or updated
        if (doc.sourceType === 'scraper') {
          const suggestionTitle = doc.title || 'Unknown';
          logScraperActivity({
            source: 'news-scraper',
            action: operation === 'create' ? 'save' : 'save',
            url: doc.sourceUrl || undefined,
            itemsProcessed: 1,
            metadata: {
              suggestionTitle,
              suggestionType: doc.suggestionType,
              operation,
              userName: req.user?.name,
              userEmail: req.user?.email,
              userRole: req.user?.role,
            },
          });
        }
      },
      autoTranslateHooks.afterChange,
    ],
  },
};
