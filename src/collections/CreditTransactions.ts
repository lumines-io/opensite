import type { CollectionConfig, Where } from 'payload';

export const CreditTransactions: CollectionConfig = {
  slug: 'credit-transactions',
  admin: {
    useAsTitle: 'type',
    group: 'Billing',
    defaultColumns: ['organization', 'type', 'amount', 'balanceAfter', 'createdAt'],
    description: 'All credit movements (top-ups, spending, refunds, adjustments)',
  },
  access: {
    // Admins see all, sponsors see their own organization's transactions
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
    // Only system/admin can create transactions
    create: ({ req }) => req.user?.role === 'admin',
    // No manual updates allowed
    update: () => false,
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
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Top-up', value: 'topup' },
        { label: 'Promotion Purchase', value: 'promotion' },
        { label: 'Refund', value: 'refund' },
        { label: 'Adjustment', value: 'adjustment' },
        { label: 'Bonus', value: 'bonus' },
        { label: 'Auto-renewal', value: 'auto_renewal' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        readOnly: true,
        description: 'Positive for credit, negative for debit (VND)',
      },
    },
    {
      name: 'balanceBefore',
      type: 'number',
      required: true,
      admin: {
        readOnly: true,
        description: 'Balance before this transaction (VND)',
      },
    },
    {
      name: 'balanceAfter',
      type: 'number',
      required: true,
      admin: {
        readOnly: true,
        description: 'Balance after this transaction (VND)',
      },
    },
    {
      name: 'description',
      type: 'text',
      localized: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'reference',
      type: 'group',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Stripe Payment', value: 'stripe_payment' },
            { label: 'Promotion', value: 'promotion' },
            { label: 'Admin Adjustment', value: 'admin_adjustment' },
            { label: 'Auto-renewal', value: 'auto_renewal' },
          ],
        },
        {
          name: 'stripePaymentIntentId',
          type: 'text',
        },
        {
          name: 'stripeCheckoutSessionId',
          type: 'text',
        },
        {
          name: 'promotionId',
          type: 'relationship',
          relationTo: 'promotions',
        },
        {
          name: 'topupHistoryId',
          type: 'relationship',
          relationTo: 'credit-topup-history',
        },
      ],
    },
    {
      name: 'performedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        description: 'User who initiated the transaction',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Additional metadata',
      },
    },
  ],
  timestamps: true,
};
