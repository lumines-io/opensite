import type { CollectionConfig } from 'payload';

export const CronJobs: CollectionConfig = {
  slug: 'cron-jobs',
  admin: {
    useAsTitle: 'name',
    group: 'System',
    description: 'Configure and manage scheduled cron jobs',
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique identifier for the cron job',
      },
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
      admin: {
        description: 'Human-readable name',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'What this cron job does',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Enable or disable this cron job',
      },
    },
    {
      name: 'schedule',
      type: 'text',
      required: true,
      admin: {
        description: 'Cron schedule expression (e.g., "0 3 * * *" for daily at 3 AM)',
      },
    },
    {
      name: 'endpoint',
      type: 'text',
      required: true,
      admin: {
        description: 'API endpoint path (e.g., "/api/cron/translate")',
      },
    },
    {
      name: 'lastRunAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: {
          displayFormat: 'yyyy-MM-dd HH:mm:ss',
        },
      },
    },
    {
      name: 'lastRunStatus',
      type: 'select',
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
        { label: 'Running', value: 'running' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'config',
      type: 'json',
      admin: {
        description: 'Additional configuration for this cron job (JSON format)',
      },
    },
  ],
};
