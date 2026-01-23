import type { CollectionConfig, Where } from 'payload';

export const Promotions: CollectionConfig = {
  slug: 'promotions',
  admin: {
    useAsTitle: 'id',
    group: 'Billing',
    defaultColumns: ['construction', 'package', 'status', 'startDate', 'endDate', 'autoRenew'],
    description: 'Active and past promotions purchased by sponsors',
  },
  access: {
    // Admins see all, sponsors see their own organization's promotions
    read: ({ req }): boolean | Where => {
      if (['admin', 'moderator'].includes(req.user?.role as string)) return true;

      if (
        ['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string) &&
        req.user?.organization
      ) {
        return {
          organization: { equals: req.user.organization },
        };
      }

      return false;
    },
    // Only system can create promotions (via API)
    create: ({ req }) => req.user?.role === 'admin',
    // Sponsors can update auto-renew setting, admins can update anything
    update: ({ req }): boolean | Where => {
      if (req.user?.role === 'admin') return true;

      if (
        ['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string) &&
        req.user?.organization
      ) {
        return {
          organization: { equals: req.user.organization },
        };
      }

      return false;
    },
    // No deletion allowed
    delete: () => false,
  },
  fields: [
    {
      name: 'construction',
      type: 'relationship',
      relationTo: 'constructions',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'package',
      type: 'relationship',
      relationTo: 'promotion-packages',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Expired', value: 'expired' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Renewed', value: 'renewed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'creditTransaction',
      type: 'relationship',
      relationTo: 'credit-transactions',
      admin: {
        readOnly: true,
        description: 'Original purchase transaction',
      },
    },
    {
      name: 'creditsSpent',
      type: 'number',
      required: true,
      admin: {
        readOnly: true,
        description: 'Credits spent on this promotion',
      },
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    // Auto-renewal settings
    {
      name: 'autoRenew',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Automatically renew when promotion expires',
      },
    },
    {
      name: 'renewalCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Number of times this promotion has been renewed',
      },
    },
    {
      name: 'previousPromotion',
      type: 'relationship',
      relationTo: 'promotions',
      admin: {
        readOnly: true,
        description: 'Previous promotion if this is a renewal',
      },
    },
    {
      name: 'renewedByPromotion',
      type: 'relationship',
      relationTo: 'promotions',
      admin: {
        readOnly: true,
        description: 'The promotion that renewed this one',
      },
    },
    // Analytics snapshot
    {
      name: 'analytics',
      type: 'group',
      admin: {
        readOnly: true,
        description: 'Analytics during the promotion period',
      },
      fields: [
        {
          name: 'impressionsAtStart',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'clicksAtStart',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'impressionsGained',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'clicksGained',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'impressionsAtEnd',
          type: 'number',
        },
        {
          name: 'clicksAtEnd',
          type: 'number',
        },
      ],
    },
    // Cancellation info
    {
      name: 'cancelledAt',
      type: 'date',
      admin: {
        readOnly: true,
        condition: (data) => data?.status === 'cancelled',
      },
    },
    {
      name: 'cancelledBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        condition: (data) => data?.status === 'cancelled',
      },
    },
    {
      name: 'cancellationReason',
      type: 'text',
      admin: {
        condition: (data) => data?.status === 'cancelled',
      },
    },
    {
      name: 'creditsRefunded',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Prorated credits refunded on cancellation',
        condition: (data) => data?.status === 'cancelled',
      },
    },
    {
      name: 'refundTransaction',
      type: 'relationship',
      relationTo: 'credit-transactions',
      admin: {
        readOnly: true,
        condition: (data) => data?.status === 'cancelled',
      },
    },
    // Alert settings for auto-renewal
    {
      name: 'renewalAlertSent',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: 'Whether the renewal reminder has been sent',
      },
    },
    {
      name: 'expirationAlertSent',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: 'Whether the expiration warning has been sent',
      },
    },
  ],
  timestamps: true,
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        // Update construction displayOptions when promotion status changes
        if (operation === 'create' || operation === 'update') {
          const payload = req.payload;

          // Get the promotion package details
          const pkg =
            typeof doc.package === 'object' ? doc.package : await payload.findByID({
              collection: 'promotion-packages',
              id: doc.package,
            });

          // Get the construction
          const constructionId =
            typeof doc.construction === 'object' ? doc.construction.id : doc.construction;

          if (doc.status === 'active') {
            // Apply promotion features to construction
            await payload.update({
              collection: 'constructions',
              id: constructionId,
              data: {
                activePromotion: doc.id,
                promotionExpiresAt: doc.endDate,
                displayOptions: {
                  featured: pkg.features?.showFeaturedBadge ?? true,
                  priority: pkg.features?.priorityBoost ?? 0,
                  useCustomMarker: pkg.features?.useCustomMarker ?? false,
                  showSponsoredBadge: true,
                },
              },
            });
          } else if (['expired', 'cancelled', 'renewed'].includes(doc.status)) {
            // Check if there's another active promotion for this construction
            const activePromotions = await payload.find({
              collection: 'promotions',
              where: {
                and: [
                  { construction: { equals: constructionId } },
                  { status: { equals: 'active' } },
                  { id: { not_equals: doc.id } },
                ],
              },
              limit: 1,
            });

            if (activePromotions.docs.length === 0) {
              // Reset construction displayOptions
              await payload.update({
                collection: 'constructions',
                id: constructionId,
                data: {
                  activePromotion: null,
                  promotionExpiresAt: null,
                  displayOptions: {
                    featured: false,
                    priority: 0,
                    useCustomMarker: false,
                    showSponsoredBadge: true,
                  },
                },
              });
            }
          }
        }

        return doc;
      },
    ],
  },
};
