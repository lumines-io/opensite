import type { CollectionConfig, Where } from 'payload';

export const Addresses: CollectionConfig = {
  slug: 'addresses',
  admin: {
    useAsTitle: 'label',
    group: 'User Data',
    defaultColumns: ['label', 'addressText', 'addressList', 'user', 'createdAt'],
    description: 'Saved addresses/locations for users to track places of interest',
  },
  access: {
    // Users can only read their own addresses; admins can read all
    read: ({ req }): boolean | Where => {
      if (!req.user) return false;
      if (['admin', 'moderator'].includes(req.user.role as string)) return true;
      return {
        user: {
          equals: req.user.id,
        },
      };
    },
    // Only verified users can create addresses
    create: ({ req }) => {
      if (!req.user?._verified) return false;
      return true;
    },
    // Users can only update their own addresses; admins can update all
    update: ({ req }): boolean | Where => {
      if (!req.user?._verified) return false;
      if (req.user?.role === 'admin') return true;
      return {
        user: {
          equals: req.user.id,
        },
      };
    },
    // Users can only delete their own addresses; admins can delete all
    delete: ({ req }): boolean | Where => {
      if (!req.user?._verified) return false;
      if (req.user?.role === 'admin') return true;
      return {
        user: {
          equals: req.user.id,
        },
      };
    },
  },
  fields: [
    // Basic identification
    {
      name: 'label',
      type: 'text',
      required: true,
      maxLength: 100,
      admin: {
        description: 'A name for this saved place (e.g., "Dream Apartment", "Office Near Metro")',
      },
    },

    // Address text (human-readable address)
    {
      name: 'addressText',
      type: 'textarea',
      admin: {
        description: 'Full address text (street, ward, district, city)',
      },
    },

    // Location - GeoJSON Point for map pin
    {
      name: 'location',
      type: 'json',
      required: true,
      admin: {
        description: 'GeoJSON Point representing the pinned location { type: "Point", coordinates: [lng, lat] }',
        components: {
          Field: '/payload/components/fields/GeometryMapField#GeometryMapField',
        },
      },
    },

    // User notes
    {
      name: 'note',
      type: 'textarea',
      admin: {
        description: 'Personal notes about this place (e.g., "Great view, close to metro", "Check price in Q2")',
      },
    },

    // Relationships
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Owner of this saved address',
      },
      hooks: {
        beforeChange: [
          ({ req, operation, value }) => {
            // On create, always set to current user (unless admin is creating for someone)
            if (operation === 'create' && req.user) {
              if (req.user.role !== 'admin' || !value) {
                return req.user.id;
              }
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'addressList',
      type: 'relationship',
      relationTo: 'address-lists',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'The list this address belongs to',
      },
      // Filter to show only user's own lists
      filterOptions: ({ user }) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return {
          user: {
            equals: user.id,
          },
        };
      },
    },

    // Optional reference to a construction
    {
      name: 'construction',
      type: 'relationship',
      relationTo: 'constructions',
      admin: {
        position: 'sidebar',
        description: 'Link to a construction project (optional)',
      },
    },

    // Tags for categorization
    {
      name: 'tags',
      type: 'array',
      admin: {
        description: 'Tags for organizing and filtering addresses',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
          maxLength: 50,
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Ensure user is set on create
        if (operation === 'create' && req.user && !data.user) {
          data.user = req.user.id;
        }

        // If no addressList is specified, use the user's default list
        if (operation === 'create' && req.payload && !data.addressList) {
          const userId = data.user || req.user?.id;
          if (userId) {
            const defaultList = await req.payload.find({
              collection: 'address-lists',
              where: {
                and: [
                  { user: { equals: userId } },
                  { isDefault: { equals: true } },
                ],
              },
              limit: 1,
            });

            if (defaultList.docs.length > 0) {
              data.addressList = defaultList.docs[0].id;
            }
          }
        }

        return data;
      },
    ],
    beforeValidate: [
      async ({ data, req }) => {
        // Validate that the addressList belongs to the same user
        if (data?.addressList && req.payload) {
          const list = await req.payload.findByID({
            collection: 'address-lists',
            id: data.addressList,
          });

          const userId = data.user || req.user?.id;
          const listUserId = typeof list?.user === 'object' ? list.user.id : list?.user;

          // Allow admins to assign addresses to any list
          if (req.user?.role !== 'admin' && listUserId !== userId) {
            throw new Error('You can only save addresses to your own address lists');
          }
        }

        return data;
      },
    ],
  },
};
