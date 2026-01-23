import type { CollectionConfig } from 'payload';
import { getConstructionCacheKey, deleteFromCache } from '@/lib/cache';
import { cacheLogger } from '@/lib/persistent-logger';

export const ConstructionChangelog: CollectionConfig = {
  slug: 'construction-changelog',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'construction', 'changeType', 'createdAt'],
    group: 'Content',
  },
  access: {
    read: () => true,
    // Only verified moderators and admins can create changelog entries
    create: ({ req }) => {
      if (!req.user?._verified) return false;
      return ['moderator', 'admin'].includes(req.user?.role as string);
    },
    // Only verified admins can update changelog entries
    update: ({ req }) => {
      if (!req.user?._verified) return false;
      return req.user?.role === 'admin';
    },
    // Only verified admins can delete changelog entries
    delete: ({ req }) => {
      if (!req.user?._verified) return false;
      return req.user?.role === 'admin';
    },
  },
  fields: [
    // Title (auto-generated summary)
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Brief summary of the change',
      },
    },

    // Related construction
    {
      name: 'construction',
      type: 'relationship',
      relationTo: 'constructions',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },

    // Change type
    {
      name: 'changeType',
      type: 'select',
      required: true,
      options: [
        { label: 'Status Change', value: 'status' },
        { label: 'Progress Update', value: 'progress' },
        { label: 'Timeline Update', value: 'timeline' },
        { label: 'Milestone', value: 'milestone' },
        { label: 'News/Announcement', value: 'news' },
        { label: 'Image Update', value: 'image' },
        { label: 'Budget Update', value: 'budget' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },

    // Description
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Detailed description of the change',
      },
    },

    // Status change specific fields
    {
      name: 'statusChange',
      type: 'group',
      admin: {
        condition: (data) => data?.changeType === 'status',
      },
      fields: [
        {
          name: 'previousStatus',
          type: 'select',
          options: [
            { label: 'Planned', value: 'planned' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Completed', value: 'completed' },
            { label: 'Paused', value: 'paused' },
            { label: 'Cancelled', value: 'cancelled' },
          ],
        },
        {
          name: 'newStatus',
          type: 'select',
          options: [
            { label: 'Planned', value: 'planned' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Completed', value: 'completed' },
            { label: 'Paused', value: 'paused' },
            { label: 'Cancelled', value: 'cancelled' },
          ],
        },
      ],
    },

    // Progress change specific fields
    {
      name: 'progressChange',
      type: 'group',
      admin: {
        condition: (data) => data?.changeType === 'progress',
      },
      fields: [
        {
          name: 'previousProgress',
          type: 'number',
          min: 0,
          max: 100,
        },
        {
          name: 'newProgress',
          type: 'number',
          min: 0,
          max: 100,
        },
      ],
    },

    // Timeline change specific fields
    {
      name: 'timelineChange',
      type: 'group',
      admin: {
        condition: (data) => data?.changeType === 'timeline',
      },
      fields: [
        {
          name: 'field',
          type: 'select',
          options: [
            { label: 'Start Date', value: 'startDate' },
            { label: 'Expected End Date', value: 'expectedEndDate' },
            { label: 'Actual End Date', value: 'actualEndDate' },
          ],
        },
        {
          name: 'previousDate',
          type: 'date',
        },
        {
          name: 'newDate',
          type: 'date',
        },
      ],
    },

    // Milestone specific fields
    {
      name: 'milestone',
      type: 'group',
      admin: {
        condition: (data) => data?.changeType === 'milestone',
      },
      fields: [
        {
          name: 'milestoneName',
          type: 'text',
          label: 'Milestone Name',
        },
        {
          name: 'milestoneDate',
          type: 'date',
        },
      ],
    },

    // Source/Reference
    {
      name: 'source',
      type: 'group',
      fields: [
        {
          name: 'url',
          type: 'text',
          label: 'Source URL',
        },
        {
          name: 'title',
          type: 'text',
          label: 'Source Title',
        },
      ],
    },

    // Images
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
        },
      ],
    },

    // Event date (when this change actually occurred)
    {
      name: 'eventDate',
      type: 'date',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'When this change/event occurred',
      },
    },

    // Author tracking
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ req, value }) => {
            if (!value && req.user) {
              return req.user.id;
            }
            return value;
          },
        ],
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        // Invalidate the parent construction's detail cache when changelog changes
        // The construction field contains either the ID or the populated document
        const constructionId = typeof doc.construction === 'object'
          ? doc.construction.id
          : doc.construction;

        if (constructionId) {
          // Fetch the construction to get its slug for cache invalidation
          const construction = await req.payload.findByID({
            collection: 'constructions',
            id: constructionId,
          });
          if (construction?.slug) {
            const constructionName = construction.title || construction.slug || 'Unknown';
            const cacheKey = getConstructionCacheKey(construction.slug);
            await deleteFromCache(cacheKey);
            cacheLogger.info(`Construction "${constructionName}" cache invalidated for changelog ${operation}`, {
              constructionName,
              slug: construction.slug,
              operation,
              changelogTitle: doc.title,
              changeType: doc.changeType,
              userName: req.user?.name,
              userEmail: req.user?.email,
              userRole: req.user?.role,
            });
          }
        }
        return doc;
      },
    ],
  },
};
