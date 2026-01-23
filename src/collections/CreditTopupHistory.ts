import type { CollectionConfig, Where } from 'payload';

export const CreditTopupHistory: CollectionConfig = {
  slug: 'credit-topup-history',
  admin: {
    useAsTitle: 'id',
    group: 'Billing',
    defaultColumns: ['organization', 'amountPaid', 'creditsReceived', 'status', 'createdAt'],
    description: 'Stripe payment history for credit top-ups',
  },
  access: {
    // Admins see all, sponsors see their own organization's history
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
    // Only system can create
    create: ({ req }) => req.user?.role === 'admin',
    // Only admin can update (for refunds)
    update: ({ req }) => req.user?.role === 'admin',
    // No deletion allowed
    delete: () => false,
  },
  fields: [
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
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
        description: 'User who initiated the top-up',
      },
    },
    {
      name: 'amountPaid',
      type: 'number',
      required: true,
      admin: {
        readOnly: true,
        description: 'Amount paid in VND',
      },
    },
    {
      name: 'creditsReceived',
      type: 'number',
      required: true,
      admin: {
        readOnly: true,
        description: 'Total credits received (including bonus)',
      },
    },
    {
      name: 'bonusCredits',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Bonus credits received',
      },
    },
    {
      name: 'bonusPercentage',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Bonus percentage applied',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Expired', value: 'expired' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'stripeCheckoutSessionId',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'stripeReceiptUrl',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'creditTransaction',
      type: 'relationship',
      relationTo: 'credit-transactions',
      admin: {
        readOnly: true,
        description: 'Associated credit transaction record',
      },
    },
    {
      name: 'refundedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.status === 'refunded',
      },
    },
    {
      name: 'refundReason',
      type: 'text',
      admin: {
        condition: (data) => data?.status === 'refunded',
      },
    },
    {
      name: 'failureReason',
      type: 'text',
      admin: {
        readOnly: true,
        condition: (data) => data?.status === 'failed',
      },
    },
  ],
  timestamps: true,
};
