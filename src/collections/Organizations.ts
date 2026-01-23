import type { CollectionConfig, Where } from 'payload';
import { createAutoTranslateHooks } from '@/hooks/auto-translate';

// Auto-translate configuration for Organizations
const autoTranslateHooks = createAutoTranslateHooks({
  fields: ['name'],
  richTextFields: ['description'],
  immediate: false,
});

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: {
    useAsTitle: 'name',
    group: 'Sponsors',
    defaultColumns: ['name', 'status', 'businessType', 'tier', 'updatedAt'],
  },
  access: {
    // Public can see active organizations (for attribution on map)
    // Admins and moderators see all
    // Sponsor users see their own organization
    read: ({ req }): boolean | Where => {
      // Admins and moderators see all
      if (['admin', 'moderator'].includes(req.user?.role as string)) return true;

      // Sponsor users see their own organization
      if (
        ['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string) &&
        req.user?.organization
      ) {
        return {
          id: { equals: req.user.organization },
        };
      }

      // Public can see active organizations only
      return {
        status: { equals: 'active' },
      };
    },
    // Only admins can create organizations
    create: ({ req }) => req.user?.role === 'admin',
    // Admins can update any, sponsor_admin can update their own
    update: ({ req }): boolean | Where => {
      if (req.user?.role === 'admin') return true;

      // Sponsor admins can update their own organization
      if (req.user?.role === 'sponsor_admin' && req.user?.organization) {
        return {
          id: { equals: req.user.organization },
        };
      }

      return false;
    },
    // Only admins can delete
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    // Basic Info
    {
      name: 'name',
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
      type: 'richText',
      localized: true,
    },

    // Branding
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Organization logo (recommended: square, min 200x200px)',
      },
    },
    {
      name: 'brandColor',
      type: 'text',
      admin: {
        description: 'Hex color code for map markers (e.g., #FF5500)',
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

    // Contact Info
    {
      name: 'contactInfo',
      type: 'group',
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
        },
        {
          name: 'phone',
          type: 'text',
        },
        {
          name: 'website',
          type: 'text',
          admin: {
            description: 'Full URL including https://',
          },
        },
        {
          name: 'address',
          type: 'textarea',
          localized: true,
        },
      ],
    },

    // Verification & Status
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Verification', value: 'pending' },
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'businessLicense',
      type: 'text',
      admin: {
        description: 'Business registration number',
      },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'verifiedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },

    // Business Type
    {
      name: 'businessType',
      type: 'select',
      options: [
        { label: 'Real Estate Developer', value: 'developer' },
        { label: 'Construction Company', value: 'construction' },
        { label: 'Investment Group', value: 'investment' },
        { label: 'Property Management', value: 'property_management' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },

    // Subscription Tier
    {
      name: 'tier',
      type: 'select',
      defaultValue: 'basic',
      options: [
        { label: 'Basic', value: 'basic' },
        { label: 'Professional', value: 'professional' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Subscription tier determines available features',
      },
    },

    // Limits (based on tier)
    {
      name: 'limits',
      type: 'group',
      admin: {
        description: 'Feature limits based on subscription tier',
      },
      fields: [
        {
          name: 'maxUsers',
          type: 'number',
          defaultValue: 5,
          min: 1,
          admin: {
            description: 'Maximum team members allowed',
          },
        },
        {
          name: 'maxActiveProjects',
          type: 'number',
          defaultValue: 10,
          min: 1,
          admin: {
            description: 'Maximum active private constructions',
          },
        },
        {
          name: 'canUsePriorityPlacement',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Can use priority placement on map',
          },
        },
        {
          name: 'canUseCustomBranding',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Can use custom brand colors and markers',
          },
        },
        {
          name: 'canUseLeadCapture',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Can use lead capture forms',
          },
        },
      ],
    },

    // Billing & Credit System
    {
      name: 'billing',
      type: 'group',
      admin: {
        description: 'Credit balance and billing information',
      },
      fields: [
        {
          name: 'stripeCustomerId',
          type: 'text',
          admin: {
            readOnly: true,
            description: 'Stripe customer ID',
          },
        },
        {
          name: 'creditBalance',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Current credit balance (VND)',
          },
        },
        {
          name: 'totalCreditsLoaded',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Total credits ever loaded (VND)',
          },
        },
        {
          name: 'totalCreditsSpent',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Total credits ever spent (VND)',
          },
        },
        {
          name: 'billingEmail',
          type: 'email',
          admin: {
            description: 'Email for billing notifications',
          },
        },
        {
          name: 'lowBalanceAlertThreshold',
          type: 'number',
          defaultValue: 500000,
          admin: {
            description: 'Send alert when balance drops below this amount (VND)',
          },
        },
        {
          name: 'lowBalanceAlertEnabled',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Enable low balance email alerts',
          },
        },
        {
          name: 'lastLowBalanceAlertAt',
          type: 'date',
          admin: {
            readOnly: true,
            description: 'Last time a low balance alert was sent',
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req, operation }) => {
        // Set verifiedAt and verifiedBy when status changes to active
        if (
          operation === 'update' &&
          originalDoc &&
          data.status === 'active' &&
          originalDoc.status !== 'active'
        ) {
          data.verifiedAt = new Date().toISOString();
          data.verifiedBy = req.user?.id;
        }

        // Clear verification info if status changes from active
        if (
          operation === 'update' &&
          originalDoc &&
          data.status !== 'active' &&
          originalDoc.status === 'active'
        ) {
          data.verifiedAt = null;
          data.verifiedBy = null;
        }

        return data;
      },
      autoTranslateHooks.beforeChange,
    ],
    afterChange: [autoTranslateHooks.afterChange],
  },
};
