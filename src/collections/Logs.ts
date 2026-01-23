import type { CollectionConfig } from 'payload';

export const Logs: CollectionConfig = {
  slug: 'logs',
  admin: {
    useAsTitle: 'message',
    group: 'System',
    description: 'Application logs stored for debugging and monitoring',
    defaultColumns: ['level', 'category', 'message', 'createdAt'],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: () => true, // Allow system to create logs
    update: () => false, // Logs are immutable
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'level',
      type: 'select',
      required: true,
      options: [
        { label: 'Debug', value: 'debug' },
        { label: 'Info', value: 'info' },
        { label: 'Warn', value: 'warn' },
        { label: 'Error', value: 'error' },
      ],
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'API', value: 'api' },
        { label: 'Auth', value: 'auth' },
        { label: 'Database', value: 'database' },
        { label: 'Scraper', value: 'scraper' },
        { label: 'Cache', value: 'cache' },
        { label: 'Cron', value: 'cron' },
        { label: 'System', value: 'system' },
        { label: 'Workflow', value: 'workflow' },
      ],
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'message',
      type: 'text',
      required: true,
      admin: {
        description: 'Log message',
      },
    },
    {
      name: 'context',
      type: 'json',
      admin: {
        description: 'Additional context data (e.g., request info, user info, etc.)',
      },
    },
    {
      name: 'error',
      type: 'textarea',
      admin: {
        description: 'Error stack trace if applicable',
      },
    },
    {
      name: 'source',
      type: 'text',
      admin: {
        description: 'Source file or function where the log originated',
      },
    },
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'User associated with this log entry',
      },
    },
    {
      name: 'requestId',
      type: 'text',
      index: true,
      admin: {
        description: 'Request ID for correlating logs from the same request',
      },
    },
    {
      name: 'duration',
      type: 'number',
      admin: {
        description: 'Duration in milliseconds (for performance logs)',
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
