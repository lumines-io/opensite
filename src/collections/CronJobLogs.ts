import type { CollectionConfig } from 'payload';

export const CronJobLogs: CollectionConfig = {
  slug: 'cron-job-logs',
  admin: {
    useAsTitle: 'createdAt',
    group: 'System',
    description: 'Logs of cron job executions',
    defaultColumns: ['jobName', 'status', 'duration', 'createdAt'],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: () => true, // Allow system to create logs
    update: () => false, // Logs are immutable
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'jobName',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Name of the cron job',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
        { label: 'Running', value: 'running' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'triggeredBy',
      type: 'select',
      required: true,
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Manual', value: 'manual' },
      ],
      defaultValue: 'scheduled',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'triggeredByUser',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        description: 'User who manually triggered (if applicable)',
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
      admin: {
        date: {
          displayFormat: 'yyyy-MM-dd HH:mm:ss',
        },
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        date: {
          displayFormat: 'yyyy-MM-dd HH:mm:ss',
        },
      },
    },
    {
      name: 'duration',
      type: 'number',
      admin: {
        description: 'Duration in milliseconds',
      },
    },
    {
      name: 'summary',
      type: 'json',
      admin: {
        description: 'Summary of the job execution',
      },
    },
    {
      name: 'logs',
      type: 'array',
      admin: {
        description: 'Detailed log entries',
      },
      fields: [
        {
          name: 'level',
          type: 'select',
          options: [
            { label: 'Info', value: 'info' },
            { label: 'Warning', value: 'warning' },
            { label: 'Error', value: 'error' },
            { label: 'Debug', value: 'debug' },
          ],
          defaultValue: 'info',
        },
        {
          name: 'message',
          type: 'text',
        },
        {
          name: 'timestamp',
          type: 'date',
        },
        {
          name: 'data',
          type: 'json',
        },
      ],
    },
    {
      name: 'error',
      type: 'textarea',
      admin: {
        description: 'Error message if job failed',
      },
    },
  ],
  // Auto-delete old logs after 30 days
  hooks: {
    afterRead: [
      async ({ doc }) => {
        // Calculate duration if completedAt exists
        if (doc.startedAt && doc.completedAt && !doc.duration) {
          doc.duration = new Date(doc.completedAt).getTime() - new Date(doc.startedAt).getTime();
        }
        return doc;
      },
    ],
  },
};
