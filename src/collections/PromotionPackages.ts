import type { CollectionConfig } from 'payload';

export const PromotionPackages: CollectionConfig = {
  slug: 'promotion-packages',
  admin: {
    useAsTitle: 'name',
    group: 'Billing',
    defaultColumns: ['name', 'durationDays', 'costInCredits', 'isActive', 'sortOrder'],
    description: 'Available promotion packages that sponsors can purchase with credits',
  },
  access: {
    // Everyone can read active packages
    read: () => true,
    // Only admin can manage packages
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data, value }) => {
            if (!value && data?.name) {
              return data.name
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
      type: 'textarea',
      localized: true,
    },
    {
      name: 'durationDays',
      type: 'number',
      required: true,
      min: 1,
      admin: {
        description: 'Duration of the promotion in days',
      },
    },
    {
      name: 'costInCredits',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Cost in VND credits',
      },
    },
    {
      name: 'features',
      type: 'group',
      admin: {
        description: 'Features included in this package',
      },
      fields: [
        {
          name: 'priorityBoost',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Priority boost value (higher = more prominent)',
          },
        },
        {
          name: 'showFeaturedBadge',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Show featured badge on construction',
          },
        },
        {
          name: 'useCustomMarker',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Allow custom branded marker',
          },
        },
        {
          name: 'homepageSpotlight',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Feature on homepage spotlight section',
          },
        },
        {
          name: 'searchBoost',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Search results boost (higher = more prominent)',
          },
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Whether this package is available for purchase',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Display order (lower = first)',
      },
    },
    {
      name: 'badge',
      type: 'group',
      admin: {
        description: 'Optional badge to highlight this package',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          localized: true,
          admin: {
            description: 'Badge text (e.g., "Most Popular", "Best Value")',
          },
        },
        {
          name: 'color',
          type: 'text',
          admin: {
            description: 'Badge color (hex, e.g., #FF5500)',
          },
          validate: (value: string | null | undefined) => {
            if (!value) return true;
            const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!hexColorRegex.test(value)) {
              return 'Please enter a valid hex color (e.g., #FF5500)';
            }
            return true;
          },
        },
      ],
    },
    {
      name: 'autoRenewalDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Default auto-renewal setting for this package',
      },
    },
  ],
};
