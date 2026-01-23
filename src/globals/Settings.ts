import type { GlobalConfig } from 'payload';

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Site Settings',
  admin: {
    group: 'System',
  },
  access: {
    read: () => true,
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Error Modal',
          description: 'Configure the error modal behavior',
          fields: [
            {
              name: 'errorModal',
              type: 'group',
              fields: [
                {
                  name: 'countdownDuration',
                  type: 'number',
                  label: 'Countdown Duration (seconds)',
                  defaultValue: 10,
                  min: 3,
                  max: 60,
                  admin: {
                    description: 'Time in seconds before the error modal automatically closes',
                  },
                },
                {
                  name: 'enableAutoClose',
                  type: 'checkbox',
                  label: 'Enable Auto-close',
                  defaultValue: true,
                  admin: {
                    description: 'If disabled, users must manually close error modals',
                  },
                },
                {
                  name: 'showErrorId',
                  type: 'checkbox',
                  label: 'Show Error ID',
                  defaultValue: true,
                  admin: {
                    description: 'Display the error ID in the modal for debugging',
                  },
                },
                {
                  name: 'showStackTrace',
                  type: 'checkbox',
                  label: 'Show Stack Trace (Dev Only)',
                  defaultValue: true,
                  admin: {
                    description: 'Show detailed error stack trace (only in development)',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Analytics',
          description: 'Configure analytics settings',
          fields: [
            {
              name: 'analytics',
              type: 'group',
              fields: [
                {
                  name: 'trackChangelogs',
                  type: 'checkbox',
                  label: 'Track Changelog Events',
                  defaultValue: true,
                  admin: {
                    description: 'Track when changelog entries are created or modified',
                  },
                },
                {
                  name: 'trackSuggestions',
                  type: 'checkbox',
                  label: 'Track Suggestion Events',
                  defaultValue: true,
                  admin: {
                    description: 'Track when suggestions are submitted or reviewed',
                  },
                },
                {
                  name: 'retentionDays',
                  type: 'number',
                  label: 'Analytics Retention (days)',
                  defaultValue: 90,
                  min: 7,
                  max: 365,
                  admin: {
                    description: 'Number of days to keep analytics data',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
