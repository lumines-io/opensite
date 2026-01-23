import type { CollectionConfig } from 'payload';

export const AnalyticsEvents: CollectionConfig = {
  slug: 'analytics-events',
  admin: {
    useAsTitle: 'eventType',
    defaultColumns: ['eventType', 'entityType', 'entityId', 'createdAt'],
    group: 'System',
    description: 'Track changes and suggestions for analytics',
  },
  access: {
    read: ({ req }) => ['moderator', 'admin'].includes(req.user?.role as string),
    create: () => true, // System can create
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        // Changelog events
        { label: 'Changelog Created', value: 'changelog_created' },
        { label: 'Changelog Updated', value: 'changelog_updated' },
        { label: 'Changelog Deleted', value: 'changelog_deleted' },
        // Suggestion events
        { label: 'Suggestion Submitted', value: 'suggestion_submitted' },
        { label: 'Suggestion Reviewed', value: 'suggestion_reviewed' },
        { label: 'Suggestion Approved', value: 'suggestion_approved' },
        { label: 'Suggestion Rejected', value: 'suggestion_rejected' },
        { label: 'Suggestion Merged', value: 'suggestion_merged' },
        // Construction events
        { label: 'Construction Created', value: 'construction_created' },
        { label: 'Construction Updated', value: 'construction_updated' },
        { label: 'Construction Published', value: 'construction_published' },
        // User events
        { label: 'User Login', value: 'user_login' },
        { label: 'User Registered', value: 'user_registered' },
      ],
      index: true,
    },
    {
      name: 'entityType',
      type: 'select',
      required: true,
      options: [
        { label: 'Changelog', value: 'changelog' },
        { label: 'Suggestion', value: 'suggestion' },
        { label: 'Construction', value: 'construction' },
        { label: 'User', value: 'user' },
      ],
      index: true,
    },
    {
      name: 'entityId',
      type: 'text',
      index: true,
      admin: {
        description: 'ID of the related entity',
      },
    },
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'User who triggered this event',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional event metadata',
      },
    },
    {
      name: 'previousValue',
      type: 'json',
      admin: {
        description: 'Previous state before change (for updates)',
      },
    },
    {
      name: 'newValue',
      type: 'json',
      admin: {
        description: 'New state after change',
      },
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
};
